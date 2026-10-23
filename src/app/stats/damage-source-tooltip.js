// The Stats damage path's source tooltips (apps/web/src/features/stats/DamageSourceTooltip.tsx): the card of the gear,
// slate, Kismet, hero trait, memory, skill or support a source names (each domain's own query), else a breakdown of what
// feeds the source. Query only (src/app/bridge/planner-queries.js); read from the build, never from the page.
import {
  allProfessionTalentCatalogue,
  collectNormalizedGearModifiers,
  equipmentSlots,
  kismetCatalog,
  orderedPactspiritNodes,
  pactspiritEffectsAtLevel,
  pactspiritTrees,
  resolveTalentCandidate,
  selenaScorchingBeamPacts,
  selenaScorchingBeamTalentSetup,
} from "#engine";
import { displayTexts } from "../bridge/display-text.ts";
import { heroTraitTarget } from "../bridge/hero-traits-view-model.ts";
import { pactsView } from "../bridge/pacts-view-model.ts";
import { plannerQueries } from "../bridge/planner-queries.js";
import { selectedPactspiritLevel } from "../pacts/pacts-controller.js";
import { currentPlanner, equippedSlateIds, plannerState, slatesForBoard, withRenderPass } from "../planner/session.js";
import { effectLabel, formatEffect } from "../talents/talent-labels.js";

export const damageSourceQueries = {
  // A damage path source ({ source, category }): its card, or the breakdown of what feeds it.
  damageSourceTooltip: (target) => withRenderPass(() => damageSourceTooltip(target)),
};

const summary = (title, body) => ({ kind: "summary", ...displayTexts({ title, body }) });
const card = (kind, view) => (view ? { kind, view } : null);

// The stat a source's row is about, from its name and category (the first that matches).
const STAT_PATTERNS = [
  [/base ignite/i, "baseIgniteDamage"],
  [/fire damage over time/i, "fireDamageOverTimePercent"],
  [/damage over time/i, "damageOverTimePercent"],
  [/elemental damage/i, "elementalDamagePercent"],
  [/ailment damage enhancement/i, "ailmentDamageEnhancementPercent"],
  [/intelligence/i, "intelligence"],
  [/fire infiltration/i, "inflictsFireInfiltrationAgainstIgnited"],
  [/additional ignite/i, "additionalIgniteDamagePercent"],
  [/additional fire/i, "additionalFireDamagePercent"],
  [/affliction effect/i, "afflictionEffectPercent"],
  [/reaping recovery/i, "reapingRecoverySpeedPercent"],
  [/reaping duration/i, "reapingDurationPercent"],
  [/damage/i, "damagePercent"],
];
const ADDITIONAL_DAMAGE = /^\+[\d.]+% additional damage$/i;
const slotLabel = (slot) => equipmentSlots.find(([key]) => key === slot)?.[1] || slot;

function damageSourceTooltip({ source, category = "" }) {
  return namedCard(source) || breakdown(source, category);
}

/** The card of what the source names, or a fixed explanation; null when it names nothing with a card. */
function namedCard(source) {
  const queries = plannerQueries();
  const planner = currentPlanner();
  if (source === "Total Intelligence (0.5% per point)") {
    const memory = planner.heroMemories?.totals?.["intelligence:flat"] || 0;
    const gear = planner.equipment?.candidate?.["intelligence:flat"] || 0;
    return summary(
      "Intelligence damage bonus",
      `Hero memories: ${memory}\nEquipment: ${gear}\nModeled total: ${memory + gear} Intelligence\nOne additional damage factor: +${(memory + gear) * 0.5}%`,
    );
  }
  if (source === "Slates: additional Max Damage")
    return summary(
      "Additional Max Damage",
      "Raises the upper roll of Scorching Beam hits. The lower roll is unchanged. The equipped Fallen Starlight value already includes Judgment's increase; Prairie does not copy this affix. Ignite uses a separate base-damage attribute.",
    );
  if (source.startsWith("Core talent: ")) {
    const name = source.slice("Core talent: ".length);
    const core = Object.values(allProfessionTalentCatalogue)
      .flatMap((panel) => panel.coreTalents || [])
      .find((entry) => entry.name === name);
    return summary(name, core?.description || "Core talent contribution");
  }
  if (source.startsWith("Hero memor")) {
    const memories = planner.heroMemories;
    const line = memories.lines.find(
      (entry) => source === `${entry.source}: ${entry.text}` || source === `${entry.source}: Intelligence`,
    );
    return (
      (line && card("memory", queries.heroMemoryTooltip({ inventoryId: line.memoryId }))) ||
      summary(
        source,
        memories.lines
          .filter((entry) => entry.stat === "intelligence")
          .map((entry) => `${entry.source}: ${entry.text}`)
          .join("\n"),
      )
    );
  }
  const support = source.startsWith("Support: ")
    ? source.slice(9)
    : /Disintegrate/.test(source)
      ? "Scorching Beam: Disintegrate (Noble)"
      : source.endsWith(" support")
        ? source.slice(0, -8)
        : null;
  if (support) return card("skill", queries.skillTooltip({ skill: "Scorching Beam", support }));
  if (source.startsWith("Aura: ")) {
    const family = source.slice(6);
    const setup = planner.activation.setups.find(
      (entry) =>
        planner.activation.activeNames.has(entry.name) &&
        (entry.name === family || entry.name === `Precise: ${family}`),
    );
    if (setup) return card("skill", queries.skillTooltip({ skill: setup.name }));
  }
  const skill = planner.activation.setups.find(
    (entry) =>
      source === entry.name || source.startsWith(`${entry.name} level `) || source.startsWith(`${entry.name} average `),
  );
  if (skill) return card("skill", queries.skillTooltip({ skill: skill.name }));
  const traitName = /Selena level 10|Bard state|Tide effect|Enemy On the Tide/.test(source)
    ? "Sing with the Tide"
    : source.startsWith("Idyll of the Tide")
      ? "Idyll of the Tide"
      : source;
  const trait = heroTraitTarget(plannerState.hero, traitName);
  if (trait) return card("trait", queries.heroTraitTooltip(trait));
  const namedGear = planner.equipment.candidateItems.filter(
    (item) => source === item.name || source.startsWith(`${item.name}:`),
  );
  if (namedGear.length === 1) return card("gear", queries.gearTooltip({ slot: namedGear[0].slot }));
  const namedSlate = slatesForBoard().find((item) => source === item.name);
  if (namedSlate) return card("slate", queries.slateTooltip(namedSlate.id));
  if (source.startsWith("Kismet: ")) {
    const name = source.slice(8);
    const slot = Object.entries(plannerState.pacts.kismetSlots || {}).find(
      ([, item]) => item.name === source || item.name === name,
    );
    if (slot)
      return card(
        "pact",
        queries.pactNodeTooltip({
          spirit: null,
          key: slot[0],
          name: "Equipped Kismet",
          effect: "",
          ring: "",
          icon: "",
          allocated: false,
          extra: false,
        }),
      );
    const kismet = kismetCatalog.find((item) => item.name === source || item.name === name);
    if (kismet) return summary(name, (kismet.affixes || []).join("\n"));
  }
  return null;
}

/** What feeds a source's row: the gear, talent nodes, slates or pacts lines of its stat, else what the row is. */
function breakdown(source, category) {
  const planner = currentPlanner();
  const stat = STAT_PATTERNS.find(([pattern]) => pattern.test(`${source} ${category}`))?.[1];
  const namedGear = planner.equipment.candidateItems.filter(
    (item) => source === item.name || source.startsWith(`${item.name}:`),
  );
  const contributors = [];
  if (/^Equipment|^Equipped gear/.test(source) && stat) {
    for (const item of collectNormalizedGearModifiers(planner.equipment.candidateItems).filter(
      (entry) => entry.stat === stat,
    ))
      contributors.push(`${item.source} (${slotLabel(item.slot)})\n${item.text}`);
  } else if (namedGear.length > 1) {
    for (const item of namedGear)
      contributors.push(`${item.name} (${slotLabel(item.slot)})\n${(item.modifiers || []).join("\n")}`);
  } else if (/^Talent/.test(source) && stat) {
    const candidate = resolveTalentCandidate(
      selenaScorchingBeamTalentSetup,
      allProfessionTalentCatalogue,
      planner.state.talentRanks,
      planner.state.talents,
    );
    for (const panel of candidate.setup.panels)
      for (const node of panel.allocatedNodes) {
        const value =
          (node.effectsPerRank?.[stat] || node.effects?.[stat] || 0) * (node.effectsPerRank ? node.rank : 1);
        if (node.rank > 0 && value)
          contributors.push(
            `${panel.name} · node ${node.coordinate} · rank ${node.rank}\n${formatEffect(stat, value)}`,
          );
      }
  } else if (/^Divinity Slate/.test(source)) {
    const words = stat
      ? effectLabel(stat)
          .replace(/percent|flat/gi, "")
          .trim()
      : category;
    for (const slate of slatesForBoard().filter((item) => equippedSlateIds.has(item.id))) {
      const affixes = [
        ...(slate.fixed || slate.affixes || []),
        ...(slate.brands || []),
        ...(slate.copiedTalents || []),
      ].filter((line) => words && line.toLowerCase().includes(words.toLowerCase()));
      if (affixes.length) contributors.push(`${slate.name}\n${affixes.join("\n")}`);
    }
  } else if (/^Pacts/.test(source)) contributors.push(...pactContributors(source, category, stat));
  return summary(
    source,
    contributors.length
      ? contributors.join("\n\n")
      : `${category || "Damage source"}\nThis row combines the selected planner sources. Its contribution is shown in the damage path.`,
  );
}

/** The pact lines of a Pacts row: the allocated nodes' effects (slot mode), the spirits' level bonuses, Fate nodes. */
function pactContributors(source, category, stat) {
  const pacts = plannerState.pacts;
  const additional = /additional damage/i.test(source);
  const words = additional ? "additional damage" : stat ? effectLabel(stat) : category;
  const lines = [];
  const view = pactsView(pacts);
  if (view.slotMode)
    for (const node of view.slots.flatMap((slot) => slot.nodes).filter((entry) => entry.allocated)) {
      const effect = node.effect || "";
      const matches = additional
        ? ADDITIONAL_DAMAGE.test(effect.trim())
        : words && effect.toLowerCase().includes(words.toLowerCase());
      if (matches) lines.push(`${node.name}\n${effect}`);
    }
  if (pacts.kismetSlotMode && additional)
    for (const name of pacts.selectedSpirits || []) {
      if (!name || pacts.activeSpirits[name] === false) continue;
      const sequence = orderedPactspiritNodes(pactspiritTrees[name] || []);
      const outer = sequence.findIndex((node) => node.ring === "outer");
      if (pacts.nativeNodeQuantities[`${name}:${outer}`] !== 1) continue;
      const effects = pactspiritEffectsAtLevel(name, selectedPactspiritLevel(name)).filter((line) =>
        ADDITIONAL_DAMAGE.test(line),
      );
      if (effects.length) lines.push(`${name}\n${effects.join("\n")}`);
    }
  if (!pacts.kismetSlotMode)
    for (const spirit of selenaScorchingBeamPacts.pactspirits) {
      if (pacts.activeSpirits[spirit.name] === false) continue;
      for (const node of spirit.unreplacedNativeNodes) {
        const quantity = pacts.nativeNodeQuantities[`${spirit.name}:${node.name}`] ?? node.quantity;
        if (quantity && node.effectsPerNode[stat])
          lines.push(
            `${spirit.name} · ${node.name} ×${quantity}\n${formatEffect(stat, node.effectsPerNode[stat] * quantity)}`,
          );
      }
      if (additional) {
        const effects = pactspiritEffectsAtLevel(spirit.name, selectedPactspiritLevel(spirit.name)).filter((line) =>
          ADDITIONAL_DAMAGE.test(line),
        );
        if (effects.length) lines.push(`${spirit.name}\n${effects.join("\n")}`);
      }
    }
  if (/reaping duration/i.test(category))
    lines.push(`Reaping Duration Fate nodes ×${pacts.reapingDurationQuantity ?? 5}\n+12% Reaping Duration per node`);
  return lines;
}

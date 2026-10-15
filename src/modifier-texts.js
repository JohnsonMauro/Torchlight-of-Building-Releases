import { effectiveGearModifierTexts } from "./engine.js";
import { normalizePercentageText } from "./percentage-text.js";
import { activeKismetEffects } from "./kismet-effects.js";
import { orderedPactspiritNodes, pactspiritEffectsAtLevel, pactspiritLevel } from "./pactspirit-levels.js";
import { pactspiritTreesSs13 } from "./data/pacts/pactspirit-trees-ss13.js";
import { selenaScorchingBeamPactsSs13 } from "./data/pacts/selena-scorching-beam-ss13.js";
import { prismAreaBounds, prismMutationCoreEffects, prismMutationDownside, prismNodeAffixes } from "./prism-crafting.js";
import { grantedCoreLine } from "./granted-core-lines.js";
import { NAMED_GEAR_AFFIX_LINES } from "./named-gear-affixes.js";
import { migrateSlateTalentText } from "./talent-text-migrations.js";

// One flat list of every text modifier the build carries, tagged by origin.
// `multiplier` scales numbers in `text` (talent ranks, Inverse Image ranges).
// Specialised models (block, blur, curses, resistances) keep their own parsers;
// this list feeds the generic ailment and Reaping ledgers.
// Named gear affixes whose gear line is only the name (Silent Avowal, Vorax Hands donors): the table lives in
// src/named-gear-affixes.js; its effect lines are added after the name line.
export { NAMED_GEAR_AFFIX_LINES };

// Ethereal Prism cores whose effect is plain text for the shared readers (Fervor, 2026-10-14: Unmatched Valor's "Has 130
// point(s) of fixed Fervor Rating", read by src/combat-states.js). The prism grants its base as a core talent
// (src/candidate-sources.js: points on the panel, not Haze / Phantasmagoria), replacing the panel's core or, with the
// mutated-core legendary affix, adding to it. Other prism cores are read by name (src/core-talent-model.js) and stay out.
const TEXT_PRISM_CORES = new Set(["Unmatched Valor"]);

const splitClauses = (text) => normalizePercentageText(String(text || ""))
  .split(/\n|\s\|\s|\s·\s/)
  .map((part) => part.trim())
  .filter(Boolean);

export function collectModifierTexts({ equipment, disabledSlots = [], talents = [], slates = [], talentState = {}, pactState = {}, heroMemories = { lines: [] } } = {}) {
  const lines = [];
  const push = (text, source, origin, multiplier = 1, slot = undefined) => {
    // Pactspirit level effects join two stats with "; " ("+7% additional damage; +7% additional Minion Damage", Cloudgatherer -
    // Violet): one clause each (frost-terra audit 2026-10-13; before, the joined line matched no reader).
    if (origin === "pact") text = String(text || "").replace(/;\s*(?=[+-]\d)/g, "\n");
    for (const clause of splitClauses(text)) {
      // "[Core name] effect" (gear-pact batch G2): the body is the line; dedicated bracket names keep their text
      // (src/granted-core-lines.js), so [Stealth Stab] / [Divine Grace] / [Poisoned Relief] still count once.
      const granted = grantedCoreLine(clause);
      // Gear lines keep their slot ("when equipped in the left Ring slot" lines; residual batch).
      const where = slot ? { slot } : {};
      lines.push(granted ? { text: granted.body, source, origin, multiplier, grantedCore: granted.name, bracketText: clause, ...where } : { text: clause, source, origin, multiplier, ...where });
    }
  };
  for (const item of equipment?.candidateItems || []) {
    if (disabledSlots.includes(item.slot)) continue;
    for (const text of effectiveGearModifierTexts(item)) {
      push(text, item.name, "gear", 1, item.slot);
      for (const line of NAMED_GEAR_AFFIX_LINES[String(text).trim()] || []) push(line, item.name, "gear", 1, item.slot);
    }
  }
  for (const panel of talents) {
    for (const node of panel.allocatedNodes || []) {
      if (!(node.rank > 0) || node.replacedBy) continue;
      push(node.description, `${panel.name} talent (${node.coordinate})`, "talent", node.rank * (node.inverseEffectMultiplier ?? 1));
    }
    for (const core of panel.activeCores || []) push(core.description, `${panel.name} core: ${core.name}`, "core");
    const prism = talentState.prismInventory?.find((item) => item.id === talentState.installedPrisms?.[panel.name]);
    const coordinate = talentState.installedPrismNodes?.[panel.name];
    if (prism && coordinate && prism.type !== "inverse") {
      // A mutated-core legendary affix carries one downside line on the installed prism.
      const downside = prismMutationDownside(prism);
      if (downside) push(downside, `${panel.name} · ${prism.base} mutated core downside`, "prism");
      // The granted core's own text: the mutated-core affix's "[Core] effect" clause when it carries one, else the catalog copy.
      const points = (panel.allocatedNodes || []).reduce((sum, node) => sum + (node.rank > 0 ? node.rank : 0), 0);
      if (prism.type === "ethereal" && TEXT_PRISM_CORES.has(prism.base) && points > 0) {
        const tag = `[${prism.base}]`;
        const affix = String(prism.legendaryAffix || "");
        const fromAffix = affix.includes(tag) ? affix.slice(affix.indexOf(tag)).split(/\n|;\s*/)[0].trim() : "";
        const effect = prismMutationCoreEffects.get(prism.base);
        const text = fromAffix || (effect ? `${tag} ${effect}` : "");
        if (text) push(text, `${panel.name} core: ${prism.base} (Ethereal Prism)`, "core");
      }
      const bounds = prismAreaBounds(prism, coordinate);
      const covered = (panel.allocatedNodes || []).filter((node) => {
        const [column, row] = String(node.coordinate).split(",").map(Number);
        return node.rank > 0 && !node.replacedBy && String(node.coordinate) !== String(coordinate)
          && column >= bounds.left && column < bounds.left + bounds.width && row >= bounds.top && row < bounds.top + bounds.height;
      });
      const legendaryCount = covered.filter((node) => node.type === "legendary").length;
      const seen = new Set();
      for (const node of covered) for (const affix of prismNodeAffixes(prism, node.type, node.rank, legendaryCount)) {
        if (!affix.active) continue;
        const text = affix.effect.replace(/^When activating 2 Legendary Medium Talent within the area,\s*/, "");
        if (text !== affix.effect) { if (seen.has(text)) continue; seen.add(text); }
        push(text.replace(/;\s*/g, "\n"), `${panel.name} · ${prism.base || "Prism"} (${node.coordinate})`, "prism");
      }
    }
  }
  for (const slate of slates) {
    for (const affix of [...(slate.fixed || []), ...(slate.brands || []), ...(slate.copiedTalents || [])]) {
      // A "Class: <Talent type>: " prefix ends at its own colon, so an effect with a colon of its own ("… on hit. Cooldown: 0.3 s",
      // Centralize) keeps its text; other affixes keep the last-colon split.
      const talentPrefix = String(affix).match(/^[^:·|]+:\s*[^:·|]*Talent[^:·|]*:\s*/i);
      const separator = String(affix).lastIndexOf(": ");
      // Slate core talents read "Name — effect"; keep the effect text.
      const effect = (talentPrefix ? affix.slice(talentPrefix[0].length) : separator < 0 ? affix : affix.slice(separator + 2)).replace(/^[A-Z][\w' ]+ — /, "");
      // Stale catalog wordings (Nether King "per recent Critical Strike" → "non-Critical Strike", 2026-10-15).
      push(migrateSlateTalentText(effect), slate.name, "slate");
    }
  }
  for (const line of activeKismetEffects(pactState)) push(line.text, line.source, "kismet");
  // Captured-pact builds (kismetSlotMode off, e.g. defaultPlannerState) carry the four captured Volcano
  // Kismets as fixed rolls toggled by `volcanoEnabled` (engine.js reads them into pact.totals). They are
  // listed here with the catalog wording so the text list matches the pact totals, as in slot mode.
  if (!pactState.kismetSlotMode) {
    const volcano = selenaScorchingBeamPactsSs13.kismets.find((kismet) => kismet.name === "Kismet: Volcano");
    (volcano?.rolls || []).forEach((roll, index) => {
      if (Array.isArray(pactState.volcanoEnabled) && pactState.volcanoEnabled[index] === false) return;
      push(`${roll.chanceToIgniteTargetsPercent}% chance to Ignite targets\n${roll.additionalIgniteDurationPercent}% additional Ignite Duration\n+${roll.igniteLimit} Ignite limit`, `Kismet: Volcano (captured roll ${index + 1})`, "kismet");
    });
    // The captured Micro Fates, with engine.js's toggles: Reaping Duration × reapingDurationQuantity (0–5, each
    // totalPercent / quantity = 12%), Spell Block rolls by spellBlockEnabled, Attack Block rolls by attackBlockEnabled.
    const fate = (name) => selenaScorchingBeamPactsSs13.microFates.find((item) => item.name === name);
    const reaping = fate("Micro Fate: Reaping Duration");
    if (reaping) {
      const count = Math.max(0, Math.min(reaping.quantity, Number(pactState.reapingDurationQuantity ?? reaping.quantity) || 0));
      for (let index = 0; index < count; index++) push(`+${reaping.totalPercent / reaping.quantity}% Reaping Duration`, `Micro Fate: Reaping Duration (captured ${index + 1})`, "kismet");
    }
    for (const [name, label, enabled] of [["Micro Fate: Spell Block Chance", "Spell", pactState.spellBlockEnabled], ["Micro Fate: Attack Block Chance", "Attack", pactState.attackBlockEnabled]]) {
      (fate(name)?.valuesPercent || []).forEach((value, index) => {
        if (Array.isArray(enabled) && enabled[index] === false) return;
        push(`+${value}% ${label} Block Chance`, `${name} (captured ${index + 1})`, "kismet");
      });
    }
  }
  // Captured-pact builds: the captured pact spirits, read with engine.js calculatePactCandidate's rules (every
  // captured spirit unless `activeSpirits` turns it off; outer effects at pactspiritLevel(name, spiritLevels,
  // captured rank); each unreplaced native node `quantity` times, overridable by nativeNodeQuantities
  // "<spirit>:<node name>"). Sources match slot mode ("<spirit> node" / "<spirit>") so the consumers that skip
  // lines pact.totals already counts (damage-line-classifier.js alreadyCountedBy, affix-attributes.js) treat
  // both modes alike. Node text is the pact tree's wording for that node name.
  if (!pactState.kismetSlotMode) {
    for (const spirit of selenaScorchingBeamPactsSs13.pactspirits) {
      if (pactState.activeSpirits?.[spirit.name] === false) continue;
      const levelEffects = pactspiritEffectsAtLevel(spirit.name, pactspiritLevel(spirit.name, pactState.spiritLevels, spirit.rank));
      for (const text of levelEffects.length ? levelEffects : spirit.effectsAtRank) push(text, spirit.name, "pact");
      const treeNodes = orderedPactspiritNodes(pactspiritTreesSs13[spirit.name]);
      for (const node of spirit.unreplacedNativeNodes || []) {
        const effect = treeNodes.find((item) => item.name === node.name)?.effect;
        const quantity = Math.max(0, Math.min(node.quantity, pactState.nativeNodeQuantities?.[`${spirit.name}:${node.name}`] ?? node.quantity));
        if (effect) for (let index = 0; index < quantity; index++) push(effect, `${spirit.name} node`, "pact");
      }
    }
  }
  for (const spirit of pactState.kismetSlotMode ? pactState.selectedSpirits || [] : []) {
    if (!spirit || pactState.activeSpirits?.[spirit] === false) continue;
    const nodes = orderedPactspiritNodes(pactspiritTreesSs13[spirit]);
    nodes.forEach((node, index) => {
      if (pactState.nativeNodeQuantities?.[`${spirit}:${index}`] !== 1) return;
      if (["inner", "mid"].includes(node.ring) && !pactState.kismetSlots?.[`${spirit}:${index}`] && node.effect) push(node.effect, `${spirit} node`, "pact");
      if (node.ring === "outer") for (const text of pactspiritEffectsAtLevel(spirit, pactspiritLevel(spirit, pactState.spiritLevels))) push(text, spirit, "pact");
    });
  }
  // Every memory clause (gear-pact batch G10): the whitelisted stats (heroMemories.lines, also in the memory totals) and the
  // clauses the totals do not read (heroMemories.intakeOnly), which only the generic engines see.
  for (const line of [...(heroMemories.lines || []), ...(heroMemories.intakeOnly || [])]) if (line.enabled !== false) push(line.text, line.source, "memory");
  return lines;
}

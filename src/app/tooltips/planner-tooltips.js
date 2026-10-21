// The planner tooltip: which elements have one, the content of the rest, showing it and its events.
import { tliArt } from "../../data/assets/tli-art.js";
import { equipmentSlots } from "../../data/gear/crafting-catalog-ss13.js";
import { allHeroTraitsSs13 } from "../../data/heroes/all-hero-traits-ss13.generated.js";
import { heroById } from "../../data/heroes/hero-catalog-ss13.js";
import { kismetCatalogSs13 } from "../../data/pacts/kismet-catalog-ss13.js";
import { pactspiritCatalogSs13 } from "../../data/pacts/pactspirit-catalog-ss13.js";
import { pactspiritTreesSs13 } from "../../data/pacts/pactspirit-trees-ss13.js";
import { selenaScorchingBeamPactsSs13 } from "../../data/pacts/selena-scorching-beam-ss13.js";
import { selenaScorchingBeamSlatesSs13 } from "../../data/slates/selena-scorching-beam-ss13.js";
import { allProfessionTalentCatalogueSs13 } from "../../data/talents/all-profession-trees-ss13.generated.js";
import { selenaScorchingBeamTalentSetupSs13 } from "../../data/talents/selena-scorching-beam-ss13.js";
import { resolveTalentCandidate } from "../../engine/candidate-sources.js";
import { collectNormalizedGearModifiers } from "../../engine/engine.js";
import { baseTraitDescriptionForLevel, withoutArtificialMoonLines } from "../../engine/heroes/hero-memory-rules.js";
import { heroTreeSelections, treeRowLevelKey } from "../../engine/heroes/hero-trait-tree.js";
import { kismetAffixesWithRolls, kismetKindForRing } from "../../engine/pacts/kismet-crafting.js";
import { microFateEffectScale, starTrailNote } from "../../engine/pacts/kismet-effects.js";
import { orderedPactspiritNodes, pactspiritEffectsAtLevel } from "../../engine/pacts/pactspirit-levels.js";
import { modeledCoreTalents } from "../../engine/talents/core-talent-model.js";
import {
  inverseImageEffectMultiplier,
  inverseImageRoll,
  prismAreaBounds,
  prismBaseEffect,
  prismNodeAffixes,
  prismReplacesCore,
} from "../../engine/talents/prism-crafting.js";
import { talentEffectText } from "../../engine/talents/talent-rules.js";
import { dazeStatus, refineCoverage } from "../../engine/text/line-coverage.js";
import {
  coverageBadge,
  heroTraitCoverage,
  heroTraitCoverageReason,
  prismAffixCoverage,
  prismAffixCoverageReason,
  talentEffectCoverage,
  talentLineCoverage,
} from "../planner/calculation-coverage.js";
import { followerSkillTooltipHtml, followerTooltipHtml, followerTooltipRarity } from "../hero/follower-panel.js";
import { EXTRA_ROW_NOTE, treeExtraRowTooltipHtml } from "../hero/hero-trait-tree-markup.js";
import { escapeHtml } from "../html.js";
import { boostedKismetAffixHtml } from "../pacts/kismet-markup.js";
import { kismetAffixCoverage, pactEffectCoverage } from "../pacts/pact-coverage.js";
import { selectedPactspiritLevel } from "../pacts/pacts-controller.js";
import { curseBadge } from "../planner/curse-notes.js";
import { $, titleCase } from "../planner/page.js";
import {
  currentEditedSetups,
  currentPlanner,
  equippedSlateIds,
  plannerState,
  slatesForBoard,
  talentRanks,
  withRenderPass,
} from "../planner/session.js";
import { prismIcon, prismName } from "../talents/prism-icons.js";
import { qolHelpTooltipHtml } from "./qol-help.js";
import { skillRoleLabels } from "../skills/skill-board.js";
import { effectLabel, formatEffect, nodeTitle } from "../talents/talent-labels.js";
import { prismTooltipHtml } from "../talents/prism-controller.js";
import { currentTalentPanel, talentDisplayNodes } from "../talents/talent-trees.js";
import { traitKeywordDetailsHtml, traitKeywordTextHtml } from "../hero/trait-keyword-markup.js";
import { gearTooltipContent } from "./gear-tooltips.js";
import { heroMemoryTooltipContent, heroTraitTooltipLevel, sageScentTooltipContent } from "./hero-tooltips.js";
import { skillTooltipContent } from "./skill-tooltips.js";
import { slateTooltipContent } from "./slate-tooltips.js";
import {
  cancelTooltipHide,
  hidePlannerTooltip,
  hidePlannerTooltipSoon,
  positionPlannerTooltip,
  scheduleTooltipPosition,
  setRevivalAltDetails,
  setTooltipAnchor,
  tooltipAnchorElement,
} from "./tooltip-host.js";

const tooltipSelector =
  "[data-damage-source],.talent-node,.core-talent,.equipment-item,.inventory-item,.skill-setup,.support-card:not(.add-support-card),[data-skill-tooltip],[data-support-tooltip],.skill-primary-socket:not(.empty-skill-slot),[data-hero-trait-support-id],[data-hero-trait-tooltip],[data-tree-extra-row-tooltip],[data-sage-scent-tooltip],.hero-memory-socket.filled,.hero-memory-item,.pactspirit,.kismet-toggle,.micro-quantity,.slate-chip,.slate-piece,.crafted-slate-item,[data-pactspirit-name],[data-pact-node-tooltip],[data-follower-skill-tooltip],[data-follower-tooltip],[data-qol-help]";
function damageSourceTooltipContent(element) {
  const source = element.dataset.damageSource;
  const category = element.dataset.damageCategory || "";
  if (source === "Total Intelligence (0.5% per point)") {
    const planner = currentPlanner();
    const memory = planner.heroMemories?.totals?.["intelligence:flat"] || 0;
    const gear = planner.equipment?.candidate?.["intelligence:flat"] || 0;
    return {
      title: "Intelligence damage bonus",
      body:
        "Hero memories: " +
        memory +
        "\nEquipment: " +
        gear +
        "\nModeled total: " +
        (memory + gear) +
        " Intelligence\nOne additional damage factor: +" +
        (memory + gear) * 0.5 +
        "%",
    };
  }
  if (source === "Slates: additional Max Damage")
    return {
      title: "Additional Max Damage",
      body: "Raises the upper roll of Scorching Beam hits. The lower roll is unchanged. The equipped Fallen Starlight value already includes Judgment's increase; Prairie does not copy this affix. Ignite uses a separate base-damage attribute.",
    };
  if (source.startsWith("Core talent: ")) {
    const name = source.slice("Core talent: ".length);
    const core = Object.values(allProfessionTalentCatalogueSs13)
      .flatMap((panel) => panel.coreTalents || [])
      .find((core) => core.name === name);
    return { title: name, body: core?.description || "Core talent contribution" };
  }
  if (source.startsWith("Hero memor")) {
    const memories = currentPlanner().heroMemories;
    const line = memories.lines.find(
      (line) => source === line.source + ": " + line.text || source === line.source + ": Intelligence",
    );
    if (line) return heroMemoryTooltipContent({ dataset: { memoryInventoryId: line.memoryId } });
    return {
      title: source,
      body: memories.lines
        .filter((line) => line.stat === "intelligence")
        .map((line) => line.source + ": " + line.text)
        .join("\n"),
    };
  }
  const planner = currentPlanner();
  const proxy = (className, dataset) => {
    const target = document.createElement("span");
    target.className = className;
    Object.assign(target.dataset, dataset);
    return plannerTooltipContent(target);
  };
  const support = source.startsWith("Support: ")
    ? source.slice(9)
    : /Disintegrate/.test(source)
      ? "Scorching Beam: Disintegrate (Noble)"
      : source.endsWith(" support")
        ? source.slice(0, -8)
        : null;
  if (support) return proxy("", { supportTooltip: support, parentSkill: "Scorching Beam" });
  if (source.startsWith("Aura: ")) {
    const family = source.slice(6);
    const setup = planner.activation.setups.find(
      (entry) =>
        planner.activation.activeNames.has(entry.name) &&
        (entry.name === family || entry.name === `Precise: ${family}`),
    );
    if (setup) return proxy("", { skillTooltip: setup.name });
  }
  const skill = planner.activation.setups.find(
    (entry) =>
      source === entry.name || source.startsWith(`${entry.name} level `) || source.startsWith(`${entry.name} average `),
  );
  if (skill) return proxy("", { skillTooltip: skill.name });
  const traitName = /Selena level 10|Bard state|Tide effect|Enemy On the Tide/.test(source)
    ? "Sing with the Tide"
    : source.startsWith("Idyll of the Tide")
      ? "Idyll of the Tide"
      : source;
  const trait = [...document.querySelectorAll("[data-hero-trait-tooltip]")].find(
    (entry) => entry.dataset.heroTraitTooltip === traitName,
  );
  if (trait) return plannerTooltipContent(trait);
  const heroTrait = allHeroTraitsSs13[plannerState.hero.selectedHeroId]?.traits.find(
    (entry) => entry.name === traitName,
  );
  const treeRow = heroTreeSelections(plannerState.hero).indexOf(traitName);
  if (heroTrait)
    return proxy("", {
      heroTraitTooltip: traitName,
      heroTraitLevelKey:
        heroTrait.level <= 1
          ? "base"
          : treeRow >= 0
            ? treeRowLevelKey(plannerState.hero.selectedHeroId, treeRow)
            : `level${heroTrait.level}`,
    });
  const namedGear = planner.equipment.candidateItems.filter(
    (item) => source === item.name || source.startsWith(`${item.name}:`),
  );
  if (namedGear.length === 1) return proxy("equipment-item", { equipmentSlot: namedGear[0].slot });
  const namedSlate = slatesForBoard().find((item) => source === item.name);
  if (namedSlate) return proxy("slate-piece", { slateId: namedSlate.id });
  if (source.startsWith("Kismet: ")) {
    const name = source.slice(8);
    const slot = Object.entries(plannerState.pacts.kismetSlots || {}).find(
      ([, item]) => item.name === source || item.name === name,
    );
    if (slot) return proxy("", { pactNodeTooltip: "", kismetNode: slot[0], nodeName: "Equipped Kismet" });
    const kismet = kismetCatalogSs13.find((item) => item.name === source || item.name === name);
    if (kismet) return { title: name, body: (kismet.affixes || []).join("\n") };
  }
  const keyMap = [
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
  const stat = keyMap.find(([pattern]) => pattern.test(`${source} ${category}`))?.[1];
  const contributors = [];
  if (/^Equipment|^Equipped gear/.test(source) && stat) {
    const rows = collectNormalizedGearModifiers(planner.equipment.candidateItems).filter((item) => item.stat === stat);
    contributors.push(
      ...rows.map(
        (item) =>
          `${item.source} (${equipmentSlots.find(([slot]) => slot === item.slot)?.[1] || item.slot})\n${item.text}`,
      ),
    );
  } else if (namedGear.length > 1) {
    contributors.push(
      ...namedGear.map(
        (item) =>
          `${item.name} (${equipmentSlots.find(([slot]) => slot === item.slot)?.[1] || item.slot})\n${(item.modifiers || []).join("\n")}`,
      ),
    );
  } else if (/^Talent/.test(source) && stat) {
    const candidate = resolveTalentCandidate(
      selenaScorchingBeamTalentSetupSs13,
      allProfessionTalentCatalogueSs13,
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
  } else if (/^Pacts/.test(source)) {
    const words = /additional damage/i.test(source) ? "additional damage" : stat ? effectLabel(stat) : category;
    for (const node of document.querySelectorAll("[data-pact-node-tooltip]")) {
      if (node.getAttribute("aria-pressed") !== "true") continue;
      const effect = node.dataset.nodeEffect || "";
      const matches = /additional damage/i.test(source)
        ? /^\+[\d.]+% additional damage$/i.test(effect.trim())
        : words && effect.toLowerCase().includes(words.toLowerCase());
      if (matches) contributors.push(`${node.dataset.nodeName}\n${effect}`);
    }
    if (planner.state.pacts.kismetSlotMode && /additional damage/i.test(source))
      for (const name of planner.state.pacts.selectedSpirits || []) {
        if (!name || planner.state.pacts.activeSpirits[name] === false) continue;
        const sequence = orderedPactspiritNodes(pactspiritTreesSs13[name] || []);
        const outer = sequence.findIndex((node) => node.ring === "outer");
        if (planner.state.pacts.nativeNodeQuantities[`${name}:${outer}`] !== 1) continue;
        const effects = pactspiritEffectsAtLevel(name, selectedPactspiritLevel(name)).filter((line) =>
          /^\+[\d.]+% additional damage$/i.test(line),
        );
        if (effects.length) contributors.push(`${name}\n${effects.join("\n")}`);
      }
    if (!planner.state.pacts.kismetSlotMode)
      for (const spirit of selenaScorchingBeamPactsSs13.pactspirits) {
        if (planner.state.pacts.activeSpirits[spirit.name] === false) continue;
        for (const node of spirit.unreplacedNativeNodes) {
          const quantity = planner.state.pacts.nativeNodeQuantities[`${spirit.name}:${node.name}`] ?? node.quantity;
          if (quantity && node.effectsPerNode[stat])
            contributors.push(
              `${spirit.name} · ${node.name} ×${quantity}\n${formatEffect(stat, node.effectsPerNode[stat] * quantity)}`,
            );
        }
        if (/additional damage/i.test(source)) {
          const effects = pactspiritEffectsAtLevel(spirit.name, selectedPactspiritLevel(spirit.name)).filter((line) =>
            /^\+[\d.]+% additional damage$/i.test(line),
          );
          if (effects.length) contributors.push(`${spirit.name}\n${effects.join("\n")}`);
        }
      }
    if (/reaping duration/i.test(category))
      contributors.push(
        `Reaping Duration Fate nodes ×${planner.state.pacts.reapingDurationQuantity ?? 5}\n+12% Reaping Duration per node`,
      );
  }
  return {
    title: source,
    body: contributors.length
      ? contributors.join("\n\n")
      : `${category || "Damage source"}\nThis row combines the selected planner sources. Its contribution is shown in the damage path.`,
  };
}

function plannerTooltipContent(element) {
  if (element.matches("[data-tree-extra-row-tooltip]")) return { traitHtml: treeExtraRowTooltipHtml() };
  if (element.matches("[data-qol-help]")) return { qolHtml: qolHelpTooltipHtml(element.dataset.qolHelp) };
  if (element.matches("[data-damage-source]")) return damageSourceTooltipContent(element);
  if (element.matches("[data-sage-scent-tooltip]")) return sageScentTooltipContent(element);
  if (element.matches(".core-talent")) {
    const panel = currentTalentPanel(),
      isPrism = element.classList.contains("prism");
    const installed = isPrism
      ? (plannerState.talents.prismInventory || []).find(
          (item) => item.id === plannerState.talents.installedPrisms?.[panel.name],
        )
      : null;
    const threshold = Number(element.dataset.coreSlot || 0);
    const selectedName = plannerState.talents.coreSelections[`${panel.name}:${threshold}`];
    const core = isPrism
      ? null
      : panel.coreTalents.find((item) => item.unlockPoints === threshold && item.name === selectedName);
    if (isPrism && !installed) return null;
    const title = isPrism ? installed.base : core?.name || `${threshold}-point Core Talent`;
    const icon = isPrism ? prismIcon(installed) : core && (tliArt.coreTalents[core.name] || core.icon);
    const description = isPrism
      ? prismBaseEffect(installed.type, installed.base, installed.legendaryAffix)
      : core?.description || "Choose a core talent to view its effects.";
    const lines = description
      .split(/\s*\|\s*|\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const label = isPrism
      ? prismReplacesCore(installed)
        ? "Prism core override"
        : "Separate prism effect"
      : `Core talent · ${threshold} points`;
    const badge = isPrism ? "Prism" : core ? "Selected" : element.classList.contains("locked") ? "Locked" : "Open";
    const footer = isPrism
      ? "Base prism effect"
      : core
        ? "Selected · Click to change"
        : element.classList.contains("locked")
          ? `Requires ${threshold} points in ${panel.name}`
          : "Click to select a core talent";
    const coreStatus =
      core?.name === "Subtle Impact" && !currentPlanner().conditions.blur
        ? currentPlanner().blurSources.some((source) => source.available)
          ? "Inactive"
          : "Missing Blur source"
        : !core && !installed
          ? "Not selected"
          : isPrism
            ? prismAffixCoverage(installed, "base")
            : core?.name === "Daze"
              ? dazeStatus(currentPlanner())
              : modeledCoreTalents.includes(core?.name)
                ? "In calc"
                : refineCoverage("Not independently modeled", lines.join("\n"));
    return {
      talentType: isPrism ? "prism-core" : "core",
      basicTalentHtml: `<div class="basic-talent-head"><span class="basic-talent-icon">${icon ? `<img src="${escapeHtml(icon)}" alt="">` : "✦"}</span><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(title)}</strong></div><b>${escapeHtml(badge)}</b></div><div class="basic-talent-body core-talent-body">${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}${coverageBadge(coreStatus, isPrism ? prismAffixCoverageReason(installed, "base") : "")}${core?.name === "Subtle Impact" ? `<p>Damage over time only · Requires a Blur grant in the build and Blur enabled in Configuration. Conditional uptime is assumed.</p>` : core?.name === "Fueling" ? `<p>Nearby target assumed · Fire Resistance fixed at 0%.</p>` : core?.name === "True Flame" ? `<p>Fire hits only · Requires a modeled Ignite source and uses configured average Affliction.</p>` : ""}</div><footer>${escapeHtml(footer)}</footer>`,
    };
  }
  if (element.matches("[data-pact-node-tooltip]")) {
    const { nodeName, nodeEffect, nodeRing, nodeIcon } = element.dataset;
    const equipped = plannerState.pacts.kismetSlots?.[element.dataset.kismetNode],
      kismet = kismetCatalogSs13.find((item) => item.name === equipped?.name),
      kismetBoost = kismet ? microFateEffectScale(plannerState.pacts, element.dataset.kismetNode) : null;
    if (kismet)
      return {
        rarity: kismet.rarity.toLowerCase(),
        pactHtml: `<div class="pact-tooltip-head"><img src="${kismet.icon}" alt=""><div><strong>${escapeHtml(kismet.name)}</strong><small>${kismet.rarity} · ${kismet.kind} Kismet${starTrailNote(kismetBoost) ? ` · ${starTrailNote(kismetBoost)}` : ""}</small></div></div><ul class="pact-tooltip-rewards">${kismetAffixesWithRolls(
          kismet,
          equipped.rolls,
        )
          .map(
            (affix) =>
              `<li>${boostedKismetAffixHtml(affix, kismetBoost)} ${curseBadge(kismetAffixCoverage(affix, { key: element.dataset.kismetNode }), affix)}</li>`,
          )
          .join(
            "",
          )}</ul><footer>${plannerState.pacts.kismetSlotMode ? (element.classList.contains("pact-tree-extra") ? "Right-click to edit or clear" : "Left-click to allocate · Right-click to edit or clear") : "Click to edit · Right-click to remove"} · Replaces ${escapeHtml(nodeName)}</footer>`,
      };
    const spiritName = element.closest(".pact-slot")?.querySelector("[data-pactspirit-name]")?.dataset.pactspiritName;
    const level = spiritName ? selectedPactspiritLevel(spiritName) : 1;
    const rewards = nodeRing === "outer" && spiritName ? pactspiritEffectsAtLevel(spiritName, level) : [];
    const spiritRarity = pactspiritCatalogSs13.find((spirit) => spirit.name === spiritName)?.rarity.toLowerCase();
    return {
      rarity: spiritRarity,
      pactHtml: `<div class="pact-tooltip-head">${nodeIcon ? `<img src="${nodeIcon}" alt="">` : ""}<div><strong>${escapeHtml(nodeName)}</strong><small>${nodeRing === "inner" ? "Micro node" : nodeRing === "mid" ? "Medium node" : nodeRing === "outer" ? "Outer node" : "Fate slot"}</small></div></div>${rewards.length ? `<h4>Level ${level} bonuses</h4><ul class="pact-tooltip-rewards">${rewards.map((effect) => `<li>${escapeHtml(effect)} ${curseBadge(pactEffectCoverage(effect), effect)}</li>`).join("")}</ul>` : nodeEffect ? `<p>${escapeHtml(nodeEffect)} ${curseBadge(pactEffectCoverage(nodeEffect), nodeEffect)}</p>` : ""}<footer>${plannerState.pacts.kismetSlotMode ? `Left-click to ${element.getAttribute("aria-pressed") === "true" ? "refund" : "allocate"}${nodeRing === "destiny" ? " · Right-click to configure Fate slots" : kismetKindForRing(nodeRing) ? " · Right-click to add a Kismet" : ""}` : nodeRing === "destiny" ? "Click to unlock extra Fate slots · Right-click to remove them" : kismetKindForRing(nodeRing) ? "Click to craft a Kismet · Right-click to remove" : "TLIDB · outer node"}</footer>`,
    };
  }
  if (element.matches("[data-pactspirit-name]")) {
    const entry = pactspiritCatalogSs13.find((spirit) => spirit.name === element.dataset.pactspiritName);
    if (!entry) return null;
    const outer = pactspiritTreesSs13[entry.name]?.find((node) => node.ring === "outer");
    const level = selectedPactspiritLevel(entry.name),
      rewards = pactspiritEffectsAtLevel(entry.name, level);
    return {
      rarity: entry.rarity.toLowerCase(),
      pactHtml: `<div class="pact-tooltip-head"><img src="${entry.icon}" alt=""><div><strong>${escapeHtml(entry.name)}</strong><small>${entry.category} · ${entry.rarity} · Level ${level}</small></div></div><h4>Pactspirit overview</h4><p>${escapeHtml(entry.description)}</p>${entry.rarity !== "Magic" ? `<p>Unlock ${entry.rarity === "Legendary" ? 2 : 1} Pact Node${entry.rarity === "Legendary" ? "s" : ""} in advance</p>` : ""}${outer ? `<section class="pact-tooltip-feature"><img src="${outer.icon}" alt=""><strong>${escapeHtml(outer.name)}</strong></section>` : ""}<h4>Level ${level} bonuses</h4>${rewards.length ? `<ul class="pact-tooltip-rewards">${rewards.map((effect) => `<li>${escapeHtml(effect)}</li>`).join("")}</ul>` : "<p>No level bonus listed.</p>"}<footer>Click to change · Right-click to remove</footer>`,
    };
  }
  if (element.matches(".hero-memory-socket.filled,.hero-memory-item")) return heroMemoryTooltipContent(element);
  if (element.matches(".slate-piece,.crafted-slate-item")) return slateTooltipContent(element);
  if (element.matches("[data-follower-skill-tooltip]")) {
    const traitHtml = followerSkillTooltipHtml(element.dataset.followerSkillTooltip, {
      state: plannerState,
      planner: currentPlanner(),
    });
    return traitHtml
      ? {
          traitHtml,
          rarity: followerTooltipRarity({ state: plannerState, skillName: element.dataset.followerSkillTooltip }),
          followerTooltip: true,
        }
      : null;
  }
  if (element.matches("[data-follower-tooltip]")) {
    const rarityId = element.dataset.followerTooltipRarity || null,
      traitHtml = followerTooltipHtml(element.dataset.followerTooltip, {
        state: plannerState,
        planner: currentPlanner(),
        rarityId,
      });
    return traitHtml
      ? {
          traitHtml,
          rarity: followerTooltipRarity({ state: plannerState, followerId: element.dataset.followerTooltip, rarityId }),
          followerTooltip: true,
        }
      : null;
  }
  if (element.matches("[data-hero-trait-tooltip]")) {
    const hero = heroById(plannerState.hero.selectedHeroId),
      trait = hero && allHeroTraitsSs13[hero.id]?.traits.find((item) => item.name === element.dataset.heroTraitTooltip);
    if (!trait) return null;
    const levelKey = element.dataset.heroTraitLevelKey || "base";
    const traitLevel = heroTraitTooltipLevel(levelKey);
    const emphasize = (line) => {
      const progression = /\(([^()]*(?:\/)[^()]*)\)(%?)/g;
      let html = "",
        offset = 0;
      for (const match of line.matchAll(progression)) {
        html += traitKeywordTextHtml(hero.id, line.slice(offset, match.index));
        const values = match[1].split("/"),
          activeIndex = Math.min(values.length - 1, traitLevel - 1);
        html += `<span class="trait-progression">(${values.map((value, index) => `<${index === activeIndex ? "b" : "span"} class="${index === activeIndex ? "trait-current-value" : "trait-other-value"}">${escapeHtml(value.trim())}</${index === activeIndex ? "b" : "span"}>`).join('<span class="trait-separator">/</span>')})${escapeHtml(match[2])}</span>`;
        offset = match.index + match[0].length;
      }
      return html + traitKeywordTextHtml(hero.id, line.slice(offset));
    };
    const description =
      levelKey === "base" ? baseTraitDescriptionForLevel(hero.id, trait.description) : trait.description;
    const descriptionLines = description.split("\n").filter(Boolean);
    const visibleLines = withoutArtificialMoonLines(hero.id, descriptionLines);
    const selected = element.getAttribute("aria-pressed") === "true";
    return {
      traitHtml: `<div class="hero-trait-tooltip-head"><strong>${escapeHtml(trait.name)}</strong>${coverageBadge(heroTraitCoverage(hero.id, trait.name, visibleLines, selected), heroTraitCoverageReason(hero.id, trait.name, descriptionLines, selected))}<em>Level ${traitLevel}</em></div><small class="hero-trait-unlock">Unlocks at hero level ${trait.level}</small><div class="hero-trait-effects">${visibleLines.map((line) => `<p>${emphasize(line)}</p>`).join("")}${String(levelKey).endsWith(":extra") ? `<p>${escapeHtml(EXTRA_ROW_NOTE)}</p>` : ""}${trait.name === "Sing with the Tide" ? `<p>Damage effects use the current base trait level. Bard state is assumed; bubbles, movement, Tide duration and state switching are excluded from this tag.</p>` : trait.name === "Murmurs of the Distant Tide" ? `<p>Additional Tide Effect scales the Tide damage bonuses in the stat sheet and damage path. Bard state is assumed; reduced Tide duration is ignored.</p>` : trait.name === "Idyll of the Tide" ? `<p>Stat sheet and damage path use the Idyll stack count set in Combat, defaulting to 15. Stack buildup and loss are not simulated.</p>` : trait.name === "Wave Aria" ? `<p>Damage component is included in calculations. Tide placement and duration are outside this badge’s scope.</p>` : ""}</div>${traitKeywordDetailsHtml(hero.id, visibleLines)}<small class="hero-trait-source">TLIDB · CURRENT TRAIT LEVEL ${traitLevel}</small>`,
    };
  }
  if (element.matches(".skill-primary-socket,.skill-support-socket,[data-skill-tooltip],[data-support-tooltip]"))
    return skillTooltipContent(element);
  if (element.matches(".talent-node")) {
    const panel = currentTalentPanel(),
      installed = (plannerState.talents.prismInventory || []).find(
        (item) => item.id === plannerState.talents.installedPrisms?.[panel.name],
      );
    const prismCoordinate = plannerState.talents.installedPrismNodes?.[panel.name];
    if (installed && prismCoordinate === element.dataset.coordinate) return { prismHtml: prismTooltipHtml(installed) };
    const nodes = talentDisplayNodes(panel),
      node = nodes.find((item) => item.coordinate.join(",") === element.dataset.coordinate);
    if (!node) return null;
    const rank = talentRanks.get(panel.name + ":" + node.coordinate) || 0;
    const effects = node.effectsPerRank || node.effects || {};
    const type = node.type || "micro",
      max = node.maxRank || (node.effectsPerRank ? 3 : 1),
      title = node.placeholder ? `${titleCase(type)} Talent` : nodeTitle(node);
    const icon = element.querySelector(".talent-node-art")?.getAttribute("src");
    const inverseMultiplier = node.reflectedFrom ? inverseImageEffectMultiplier(installed, type) : 1;
    const effectRows = Object.entries(effects)
      .map(
        ([key, value]) =>
          `<div class="basic-talent-effect"><span>${escapeHtml(effectLabel(key))}</span><strong>${escapeHtml(formatEffect(key, typeof value === "number" ? value * (node.effectsPerRank ? rank : 1) * inverseMultiplier : value))}</strong>${coverageBadge(talentEffectCoverage(key, value, rank))}</div>`,
      )
      .join("");
    let prismEffects = "";
    if (installed && prismCoordinate && element.classList.contains("prism-affected-node")) {
      if (installed.type === "inverse") {
        const roll = inverseImageRoll(
          installed,
          type === "legendary" ? "legendary" : type === "medium" ? "medium" : "micro",
        );
        prismEffects = node.reflectedFrom
          ? `<section class="basic-talent-prism"><h4>Inverse Image <span>Reflected from ${escapeHtml(node.reflectedFrom)}</span></h4><div class="talent-prism-affix ${rank > 0 ? "active" : "inactive"}"><b>Fixed affix</b><p>${escapeHtml(titleCase(type))} Talent Effect Range: ${roll > 0 ? "+" : ""}${roll}%</p><small>${rank > 0 ? "Active on this reflected talent" : "Allocate this reflected talent to activate"}</small></div></section>`
          : "";
      } else {
        const bounds = prismAreaBounds(installed, prismCoordinate);
        const activeLegendaryCount = nodes.filter(
          (candidate) =>
            candidate.type === "legendary" &&
            candidate.coordinate.join(",") !== prismCoordinate &&
            candidate.coordinate[0] >= bounds.left &&
            candidate.coordinate[0] < bounds.left + bounds.width &&
            candidate.coordinate[1] >= bounds.top &&
            candidate.coordinate[1] < bounds.top + bounds.height &&
            (talentRanks.get(`${panel.name}:${candidate.coordinate}`) || 0) > 0,
        ).length;
        const affixes = prismNodeAffixes(installed, node.type, rank, activeLegendaryCount);
        prismEffects = `<section class="basic-talent-prism"><h4>Prism effects <span>${escapeHtml(prismName(installed))}</span></h4>${affixes.length ? affixes.map((affix) => `<div class="talent-prism-affix ${affix.active ? "active" : "inactive"}"><b>${affix.tier} affix</b><p>${escapeHtml(affix.effect)} ${coverageBadge(affix.active ? prismAffixCoverage(installed, affix.tier === "Rare" ? "rareAffix" : "legendaryAffix") : "Inactive")}</p><small>${escapeHtml(affix.reason)}</small></div>`).join("") : '<p class="talent-prism-none">No node-specific affix applies to this talent.</p>'}</section>`;
      }
    }
    return {
      basicTalentHtml: `<div class="basic-talent-head"><span class="basic-talent-icon">${icon ? `<img src="${escapeHtml(icon)}" alt="">` : "✦"}</span><div><small>${escapeHtml(type === "legendary" ? "Legendary Medium Talent" : `${titleCase(type)} Talent`)}</small><strong>${escapeHtml(title)}</strong></div><b>${rank}/${max}</b></div><div class="basic-talent-body">${effectRows || `<p>${escapeHtml(node.description ? talentEffectText(node.description, rank, inverseMultiplier) : "Profession-tree node")}</p>${coverageBadge(talentLineCoverage(node.description || "", rank > 0))}`}</div>${prismEffects}<footer>${rank > 0 ? "Allocated" : element.classList.contains("locked") ? "Locked · prerequisites not met" : "Click to allocate"}</footer>`,
    };
  }
  if (element.matches(".equipment-item,.inventory-item")) return gearTooltipContent(element);
  if (element.matches(".skill-setup")) {
    const skill = currentEditedSetups()[Number(element.dataset.skillIndex)];
    return {
      title: skill.name + " · Lv." + skill.effectiveLevel,
      body: [
        skillRoleLabels[skill.role],
        "Energy: " + skill.energyCost,
        ...skill.supports.map((support) => (support.enabled ? "● " : "○ ") + support.name + " Lv." + support.level),
      ].join("\n"),
    };
  }
  if (element.matches(".slate-chip")) {
    const slate = selenaScorchingBeamSlatesSs13.slates.find((item) => item.id === element.dataset.slateId);
    return {
      title: slate.name + " · Lv." + slate.level,
      body: [
        slate.authority,
        ...(slate.fixed || []),
        ...(slate.brands || []),
        ...(slate.copiedTalents || []),
        slate.copyRule,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }
  const title = element.querySelector("h2,h3,strong")?.textContent?.trim() || "Planner detail";
  const body = element.textContent.replace(/\s+/g, " ").trim();
  return { title, body };
}
function showPlannerTooltip(element, x, y) {
  cancelTooltipHide();
  if (!document.body.classList.contains("unified-planner") && !element.matches("[data-damage-source],[data-qol-help]"))
    return;
  const content = withRenderPass(() => plannerTooltipContent(element));
  if (!content) return hidePlannerTooltip();
  const actionHint = element.getAttribute("title") || element.dataset.tooltipHint;
  if (element.hasAttribute("title")) {
    element.dataset.tooltipHint = actionHint;
    element.removeAttribute("title");
  }
  setTooltipAnchor(element);
  const tooltip = $("#planner-tooltip");
  const host = element.closest("#slate-inventory,#hero-memory-selector,#follower-selector") || document.body;
  if (tooltip.parentElement !== host) host.appendChild(tooltip);
  if (content.rarity) tooltip.dataset.rarity = content.rarity;
  else delete tooltip.dataset.rarity;
  tooltip.classList.toggle("six-affix", Boolean(content.sixAffix));
  tooltip.classList.toggle("priceless-item", Boolean(content.priceless));
  tooltip.classList.toggle("item-level-100", Boolean(content.itemLevel100));
  tooltip.classList.toggle("gear-tooltip", Boolean(content.html));
  tooltip.classList.toggle("skill-tooltip", Boolean(content.skillHtml));
  tooltip.classList.toggle("support-tooltip", Boolean(content.supportTooltip));
  tooltip.classList.toggle("aura-tooltip", Boolean(content.auraTooltip));
  tooltip.classList.toggle("sage-scent-tooltip", Boolean(content.scentHtml));
  tooltip.classList.toggle("hero-trait-tooltip", Boolean(content.traitHtml));
  tooltip.classList.toggle("memory-tooltip", Boolean(content.memoryHtml));
  tooltip.classList.toggle("follower-tooltip", Boolean(content.followerTooltip));
  tooltip.classList.toggle("slate-tooltip", Boolean(content.slateHtml));
  tooltip.classList.toggle("pact-tooltip", Boolean(content.pactHtml));
  tooltip.classList.toggle("qol-help-tooltip", Boolean(content.qolHtml));
  tooltip.classList.toggle("prism-tooltip", Boolean(content.prismHtml));
  tooltip.classList.toggle("basic-talent-tooltip", Boolean(content.basicTalentHtml));
  tooltip.classList.toggle("damage-source-tooltip", element.matches("[data-damage-source]"));
  const sourceSummary =
    element.matches("[data-damage-source]") &&
    !Object.keys(content).some((key) => key.endsWith("Html") || key === "html");
  tooltip.classList.toggle("source-summary-tooltip", sourceSummary);
  tooltip.dataset.talentType = content.basicTalentHtml ? content.talentType || element.dataset.nodeType || "micro" : "";
  tooltip.innerHTML =
    content.qolHtml ||
    content.basicTalentHtml ||
    content.prismHtml ||
    content.pactHtml ||
    content.slateHtml ||
    content.memoryHtml ||
    content.html ||
    content.skillHtml ||
    content.traitHtml ||
    content.scentHtml ||
    `<strong>${escapeHtml(content.title)}</strong><span>${escapeHtml(content.body)}</span><small>${sourceSummary ? "Source breakdown · scroll for more" : "Click to edit"}</small>`;
  if (actionHint)
    tooltip.insertAdjacentHTML(
      "beforeend",
      `<small class="planner-tooltip-action-hint">${escapeHtml(actionHint)}</small>`,
    );
  tooltip.setAttribute("aria-hidden", "false");
  tooltip.classList.add("visible");
  positionPlannerTooltip(x, y);
}
// The planner tooltip follows the pointer and keyboard focus; Alt shows revived memory details; a scroll hides it.
export function installPlannerTooltipEvents() {
  window.addEventListener("keydown", (event) => {
    if (event.key === "Alt") setRevivalAltDetails(true);
  });
  window.addEventListener("keyup", (event) => {
    if (event.key === "Alt") setRevivalAltDetails(false);
  });
  window.addEventListener("blur", () => setRevivalAltDetails(false));
  window.addEventListener(
    "scroll",
    (event) => {
      if (event.target instanceof Element && event.target.closest("#planner-tooltip")) return;
      tooltipScrollQuietUntil = performance.now() + 160;
      hidePlannerTooltip();
    },
    { passive: true, capture: true },
  );
  document.addEventListener("pointerover", (event) => {
    if (performance.now() < tooltipScrollQuietUntil) return;
    const target = event.target.closest(tooltipSelector);
    if (
      target &&
      !target.contains(event.relatedTarget) &&
      !(event.pointerType === "touch" && target.matches("[data-qol-help]"))
    )
      showPlannerTooltip(target, event.clientX, event.clientY);
  });
  document.addEventListener("pointermove", (event) => {
    if (event.target.closest("#planner-tooltip.damage-source-tooltip")) return;
    if ($("#planner-tooltip").classList.contains("visible")) scheduleTooltipPosition(event.clientX, event.clientY);
  });
  document.addEventListener("pointerout", (event) => {
    const target = event.target.closest(tooltipSelector);
    if (
      target &&
      !target.contains(event.relatedTarget) &&
      !(event.pointerType === "touch" && target.matches("[data-qol-help]"))
    ) {
      if (target.matches("[data-damage-source]")) hidePlannerTooltipSoon();
      else hidePlannerTooltip();
    }
  });
  $("#planner-tooltip").addEventListener("pointerenter", cancelTooltipHide);
  $("#planner-tooltip").addEventListener("pointerleave", (event) => {
    if (!tooltipAnchorElement?.contains(event.relatedTarget)) hidePlannerTooltip();
  });
  document.addEventListener("focusin", (event) => {
    const target = event.target.closest(tooltipSelector);
    if (target) {
      const box = target.getBoundingClientRect();
      showPlannerTooltip(target, box.right, box.top);
    }
  });
  document.addEventListener("focusout", (event) => {
    if (event.target.closest(tooltipSelector)) hidePlannerTooltip();
  });
  document.addEventListener(
    "pointerdown",
    (event) => {
      const button = event.target.closest?.("[data-qol-help]");
      qolHelpOpenAtPointerDown = button
        ? event.pointerType !== "mouse" &&
          tooltipAnchorElement === button &&
          $("#planner-tooltip").classList.contains("visible")
        : null;
    },
    true,
  );
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-qol-help]");
    if (!button) return;
    event.preventDefault();
    const open =
      qolHelpOpenAtPointerDown ??
      (tooltipAnchorElement === button && $("#planner-tooltip").classList.contains("visible"));
    qolHelpOpenAtPointerDown = null;
    if (open) hidePlannerTooltip();
    else {
      const box = button.getBoundingClientRect();
      showPlannerTooltip(button, box.right, box.top);
    }
  });
}

let tooltipScrollQuietUntil = 0;
// Section "?" help: hover and keyboard focus show it (above); a tap, pen click or Enter / Space toggles it
// (a mouse click only shows it, since hovering already did). Whether it was open is read at pointerdown.
let qolHelpOpenAtPointerDown = null;

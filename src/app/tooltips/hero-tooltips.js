// Tooltips of the hero panel: memories, Sage's scents and the trait level they show.
import { heroMemoryFixedT0AffixesSs13 } from "../../data/heroes/hero-memory-fixed-t0-ss13.js";
import { heroMemoryTierAffixesSs13 } from "../../data/heroes/hero-memory-tiers-ss13.js";
import {
  equippedBaseTraitSlot,
  lunarPhaseRevivedAffixesSs13,
  normalizeRevivedAffix,
} from "../../data/heroes/memory-revival-ss13.js";
import { sageScentIngredientsSs13 } from "../../data/heroes/sage-scent-options-ss13.js";
import { sageElixirsSs13 } from "../../data/heroes/sage-scent-ss13.generated.js";
import { heroTraitLevelBonus } from "../../engine/character-stats.js";
import { catsNightSafariStatus } from "../../engine/heroes/erika-wind-stalker.js";
import { heroMemoryLineCoverage, revivedAffixCoverage } from "../../engine/heroes/hero-memory-model.js";
import {
  artificialMoonGate,
  baseTraitLevelForMemory,
  memoryMaxEnhancementForRarity,
  memoryScaledBaseStat,
  nonBaseTraitLevelExtras,
  reduceBaseTraitMemoryStat,
  slotTraitLevel,
  traitLevelBonusForEnhancement,
} from "../../engine/heroes/hero-memory-rules.js";
import { EXTRA_PICK_LEVEL } from "../../engine/heroes/hero-trait-tree.js";
import { coverageBadge } from "../calculation-coverage.js";
import { affixTierBadge } from "../gear/gear-items.js";
import { heroMemoryIcon } from "../hero-memory-display.js";
import {
  baseTraitMemory,
  baseTraitReduction,
  memoryAffixKey,
  memoryRevivalBadge,
  memoryRevivedAffixMarkup,
  memoryRollRange,
  rolledMemoryAffix,
} from "../hero/hero-memory-controller.js";
import { escapeHtml } from "../html.js";
import { titleCase } from "../planner/page.js";
import { currentPlanner, plannerState } from "../planner/session.js";

// Trait level the tooltip shows, the rule src/engine/character-stats.js heroTraitStatLines and the planner apply (user-stated rule
// 2026-10-13; src/engine/heroes/hero-memory-rules.js): a memory gives 1 (any), 2 (enhancement 30+), 3 (Ultimate 50), plus its own "+N to
// Hero Trait Level". Base trait: that of the base-slot memory (1 without one, open). A 45/60/75 trait: 0 (inactive) with no
// memory in its slot, else that of its slot memory + the planner's non-memory "+N" lines; max 5.
export function heroTraitTooltipLevel(levelKey = "base") {
  const bonus = heroTraitLevelBonus((currentPlanner().modifierTexts || []).filter((line) => line.origin !== "trait"));
  if (levelKey === "base")
    return Math.max(1, Math.min(5, baseTraitLevelForMemory(baseTraitReduction() === null ? null : baseTraitMemory())));
  if (String(levelKey).endsWith(":extra")) return EXTRA_PICK_LEVEL; // Youga's fourth tree row: max level (src/engine/heroes/hero-trait-tree.js)
  const tier = String(levelKey).match(/level\d+/)?.[0];
  return slotTraitLevel(
    plannerState.hero,
    [levelKey, tier],
    (bonus.all || 0) + (bonus.nonBase || 0),
    nonBaseTraitLevelExtras(plannerState.hero.selectedHeroId, artificialMoonGate(plannerState.hero).active),
  ); // Bing's sixth rank (Q-H2)
}
function savedMemoryAffix(memory, group, index) {
  const effect = memory[group]?.[index];
  if (!effect) return "";
  const fixed = group === "fixedAffixes",
    tier = memory[fixed ? "fixedTiers" : "randomTiers"]?.[index],
    roll = memory[fixed ? "fixedRolls" : "randomRolls"]?.[index];
  const catalog = fixed && tier === 0 ? heroMemoryFixedT0AffixesSs13 : heroMemoryTierAffixesSs13;
  const match = catalog.find(
    (entry) =>
      entry.type === memory.type &&
      entry.kind === (fixed ? "Fixed Affix" : "Random Affix") &&
      entry.tier === tier &&
      memoryAffixKey(entry.baseEffect || entry.effect) === memoryAffixKey(effect),
  );
  const tierEffect = match?.effect || effect,
    range = memoryRollRange(tierEffect);
  return rolledMemoryAffix(
    tierEffect,
    range && Number.isFinite(roll) ? Math.max(range.min, Math.min(range.max, roll)) : roll,
  );
}
function memoryAffixRowContent(effect, tier) {
  return `${Number.isInteger(tier) ? affixTierBadge(`T${tier}`) : ""}<span>${escapeHtml(effect)}</span>`;
}
export function heroMemoryTooltipContent(element) {
  const id =
    element.dataset.memoryInventoryId ||
    (element.dataset.memoryTier === "base"
      ? plannerState.hero.baseTraitMemoryId
      : plannerState.hero.equippedMemoryIds?.[element.dataset.memoryTier]);
  const memory = plannerState.hero.memoryInventory?.find((item) => item.id === id);
  if (!memory) return null;
  const baseSlotted = plannerState.hero.baseTraitMemoryId === id,
    reduction = baseSlotted ? baseTraitReduction() : null;
  const memoryModel = currentPlanner().heroMemories;
  const equipped =
    Object.values(plannerState.hero.equippedMemoryIds || {}).includes(id) || (baseSlotted && reduction !== null);
  const status = (text) => heroMemoryLineCoverage(memoryModel, id, text, equipped);
  const section = (label, entries) =>
    entries.length
      ? `<section${label === "Implicit" ? ` class="memory-implicit ${memory.waxAndWane ? "wax-applied" : ""}"` : ""}><h4>${label}</h4>${entries.map((entry) => (typeof entry === "string" ? `<p>${escapeHtml(entry)} ${coverageBadge(status(entry))}</p>` : `<div class="memory-affix-row">${memoryAffixRowContent(entry.effect, entry.tier)} ${coverageBadge(entry.status || status(entry.effect))}</div>`)).join("")}</section>`
      : "";
  const fixed = (memory.fixedAffixes || [])
    .map((_, index) => ({ effect: savedMemoryAffix(memory, "fixedAffixes", index), tier: memory.fixedTiers?.[index] }))
    .filter((entry) => entry.effect);
  const random = (memory.randomAffixes || [])
    .map((_, index) => ({
      effect: savedMemoryAffix(memory, "randomAffixes", index),
      tier: memory.randomTiers?.[index],
    }))
    .filter((entry) => entry.effect)
    .map((entry) => ({
      ...entry,
      effect: reduction === null ? entry.effect : reduceBaseTraitMemoryStat(entry.effect, reduction),
    }));
  const implicitText = memoryScaledBaseStat(
    memory.baseStat,
    memory.type,
    memory.enhancementLevel,
    memory.waxAndWane,
    memory.rarity,
  );
  const implicit = reduction === null ? implicitText : reduceBaseTraitMemoryStat(implicitText, reduction);
  const revival = [
    memory.waxAndWane ? "Wax and Wane · +30% base stat" : "",
    memory.risingMoon ? "Rising Moon · fixed affix tier increased" : "",
  ].filter(Boolean);
  return {
    memoryHtml: `<div class="memory-tooltip-head"><img src="${heroMemoryIcon(memory.type)}" alt=""><div><strong>${escapeHtml(memory.name || memory.type)}</strong><small>${escapeHtml(memory.rarity || "normal").toUpperCase()} · HERO MEMORY</small></div></div>${memoryRevivalBadge(memory)}<div class="memory-tooltip-body"><p>Enhancement Level <b>${memory.enhancementLevel}/${memoryMaxEnhancementForRarity(memory.rarity)}</b></p><p>Trait Level <b>+${traitLevelBonusForEnhancement(memory.enhancementLevel)}</b></p>${reduction === null ? "" : `<p>Base Trait Slot <b>${reduction}% to base stats and random affixes</b></p>`}${section("Implicit", [implicit])}${section(
      "Memory Revival",
      revival.map((effect) => ({ effect, status: equipped ? "Applied to rolls" : "Not equipped" })),
    )}${memory.revivedAffix ? `<section><h4>Revived Affix${lunarPhaseRevivedAffixesSs13.includes(normalizeRevivedAffix(memory.revivedAffix)) ? " · Lunar Phase" : ""}</h4>${memoryRevivedAffixMarkup(memory)}${memory.revivedAffix === "Ceaseless Tide" ? `<p>When equipped on Sing with the Tide: +80% additional Tide Effect and ×0.8 cast speed while in Bard. Movement is not simulated.</p>` : ""}${coverageBadge(!equipped ? "Not equipped" : memory.revivedAffix === "Ceaseless Tide" && memoryModel.ceaselessTide ? "In calc" : equippedBaseTraitSlot(plannerState.hero)?.source.id === memory.id ? "Enables base slot" : (catsNightSafariStatus(currentPlanner(), memory) || revivedAffixCoverage(currentPlanner(), memory))?.status || "Not modeled", (catsNightSafariStatus(currentPlanner(), memory) || revivedAffixCoverage(currentPlanner(), memory))?.reason || "")}</section>` : ""}${section("Fixed Affixes", fixed)}${section("Random Affixes", random)}</div><small>${element.dataset.memoryInventoryId ? "Right-click to equip or unequip" : "Right-click to unequip"}</small>`,
    rarity: memory.rarity || "normal",
  };
}
export function sageScentTooltipContent(element) {
  const kind = element.dataset.sageScentTooltip;
  const name = plannerState.hero.sageScent?.[kind];
  const entry =
    kind === "elixir"
      ? sageElixirsSs13.find((item) => item.name === name)
      : sageScentIngredientsSs13[kind]?.find((item) => item.name === name);
  if (!entry) return null;
  const label = kind === "elixir" ? "Elixir Skill" : `${titleCase(kind)} Ingredient`;
  const tags = kind === "elixir" ? entry.tags || [] : [];
  const lines = (entry.description || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    scentHtml: `<div class="sage-tooltip-head"><img src="${escapeHtml(entry.icon)}" alt=""><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(entry.name)}</strong></div></div>${tags.length ? `<div class="sage-tooltip-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}<div class="sage-tooltip-effects">${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div><small class="sage-tooltip-hint">Click to change</small>`,
  };
}

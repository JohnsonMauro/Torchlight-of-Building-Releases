// The hero panel's tooltips: a hero trait at its level in this build (src/app/bridge/trait-tooltip-view.ts), a hero
// memory and a Sage's scent (src/app/bridge/memory-tooltip-view.ts). Queries only (src/app/bridge/planner-queries.js);
// apps/web/src/features/hero renders them.
import {
  allHeroTraitsSs14,
  artificialMoonGate,
  baseTraitLevelForMemory,
  catsNightSafariStatus,
  equippedBaseTraitSlot,
  EXTRA_PICK_LEVEL,
  heroById,
  heroMemoryFixedT0AffixesSs14,
  heroMemoryLineCoverage,
  heroMemoryTierAffixesSs14,
  heroTraitLevelBonus,
  lunarPhaseRevivedAffixesSs14,
  memoryMaxEnhancementForRarity,
  memoryScaledBaseStat,
  nonBaseTraitLevelExtras,
  normalizeRevivedAffix,
  reduceBaseTraitMemoryStat,
  revivedAffixCoverage,
  sageElixirsSs14,
  sageScentIngredientsSs14,
  slotTraitLevel,
  traitLevelBonusForEnhancement,
} from "#engine";
import { coverageView } from "../bridge/gear-item-view.ts";
import { memoryTooltipView, scentTooltipView } from "../bridge/memory-tooltip-view.ts";
import { heroTraitTooltipView } from "../bridge/trait-tooltip-view.ts";
import { heroTraitCoverage, heroTraitCoverageReason } from "../planner/calculation-coverage.js";
import { currentPlanner, plannerState, withRenderPass } from "../planner/session.js";
import { heroMemoryIcon, heroMemoryIsRevived } from "./hero-memory-display.js";
import {
  baseTraitMemory,
  baseTraitReduction,
  memoryAffixKey,
  memoryRevivedEffectView,
  memoryRollRange,
  rolledMemoryAffix,
} from "./hero-memory-controller.js";

export const heroTooltipQueries = {
  // A hero trait ({ name, levelKey, selected }) at its level in this build.
  heroTraitTooltip: (target) => withRenderPass(() => heroTraitTooltip(target)),
  // A memory in the inventory ({ inventoryId }) or in a slot ({ tier }: "base", "level45"…).
  heroMemoryTooltip: (target) => withRenderPass(() => heroMemoryTooltip(target)),
  // The scent ingredient or elixir in a slot ("elixir", or the ingredient kind).
  sageScentTooltip: (kind) => sageScentTooltip(kind),
};

// Trait level the tooltip shows, the rule packages/engine/src/character-stats.js heroTraitStatLines and the planner apply (user-stated rule
// 2026-10-13; packages/engine/src/heroes/hero-memory-rules.js): a memory gives 1 (any), 2 (enhancement 30+), 3 (Ultimate 50), plus its own "+N to
// Hero Trait Level". Base trait: that of the base-slot memory (1 without one, open). A 45/60/75 trait: 0 (inactive) with no
// memory in its slot, else that of its slot memory + the planner's non-memory "+N" lines; max 5.
export function heroTraitTooltipLevel(levelKey = "base") {
  const bonus = heroTraitLevelBonus((currentPlanner().modifierTexts || []).filter((line) => line.origin !== "trait"));
  if (levelKey === "base")
    return Math.max(1, Math.min(5, baseTraitLevelForMemory(baseTraitReduction() === null ? null : baseTraitMemory())));
  if (String(levelKey).endsWith(":extra")) return EXTRA_PICK_LEVEL; // Youga's fourth tree row: max level (packages/engine/src/heroes/hero-trait-tree.js)
  const tier = String(levelKey).match(/level\d+/)?.[0];
  return slotTraitLevel(
    plannerState.hero,
    [levelKey, tier],
    (bonus.all || 0) + (bonus.nonBase || 0),
    nonBaseTraitLevelExtras(plannerState.hero.selectedHeroId, artificialMoonGate(plannerState.hero).active),
  ); // Bing's sixth rank (Q-H2)
}

function heroTraitTooltip({ name, levelKey = "base", selected = false }) {
  const hero = heroById(plannerState.hero.selectedHeroId),
    trait = hero && allHeroTraitsSs14[hero.id]?.traits.find((item) => item.name === name);
  if (!trait) return null;
  return heroTraitTooltipView({
    heroId: hero.id,
    trait,
    levelKey,
    level: heroTraitTooltipLevel(levelKey),
    coverage: (shown, description) =>
      coverageView(
        heroTraitCoverage(hero.id, trait.name, shown, selected),
        heroTraitCoverageReason(hero.id, trait.name, description, selected),
      ),
  });
}

// A saved memory affix at its tier and roll (the tier's own text, the roll kept in its range).
export function savedMemoryAffix(memory, group, index) {
  const effect = memory[group]?.[index];
  if (!effect) return "";
  const fixed = group === "fixedAffixes",
    tier = memory[fixed ? "fixedTiers" : "randomTiers"]?.[index],
    roll = memory[fixed ? "fixedRolls" : "randomRolls"]?.[index];
  const catalog = fixed && tier === 0 ? heroMemoryFixedT0AffixesSs14 : heroMemoryTierAffixesSs14;
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

function heroMemoryTooltip(target) {
  const id =
    target.inventoryId ||
    (target.tier === "base" ? plannerState.hero.baseTraitMemoryId : plannerState.hero.equippedMemoryIds?.[target.tier]);
  const memory = plannerState.hero.memoryInventory?.find((item) => item.id === id);
  if (!memory) return null;
  const baseSlotted = plannerState.hero.baseTraitMemoryId === id,
    reduction = baseSlotted ? baseTraitReduction() : null;
  const planner = currentPlanner(),
    model = planner.heroMemories;
  const equipped =
    Object.values(plannerState.hero.equippedMemoryIds || {}).includes(id) || (baseSlotted && reduction !== null);
  const covered = (line) => coverageView(heroMemoryLineCoverage(model, id, line, equipped));
  const affixes = (group, tiers, reduce) =>
    (memory[group] || [])
      .map((_, index) => ({ text: savedMemoryAffix(memory, group, index), tier: memory[tiers]?.[index] }))
      .filter((entry) => entry.text)
      .map((entry) => {
        const line = reduce && reduction !== null ? reduceBaseTraitMemoryStat(entry.text, reduction) : entry.text;
        return { text: line, tier: Number.isInteger(entry.tier) ? entry.tier : null, coverage: covered(line) };
      });
  const implicitText = memoryScaledBaseStat(
    memory.baseStat,
    memory.type,
    memory.enhancementLevel,
    memory.waxAndWane,
    memory.rarity,
  );
  const implicit = reduction === null ? implicitText : reduceBaseTraitMemoryStat(implicitText, reduction);
  const revivalStatus = equipped ? "Applied to rolls" : "Not equipped";
  const revivedStatus = catsNightSafariStatus(planner, memory) || revivedAffixCoverage(planner, memory);
  return memoryTooltipView({
    memory,
    icon: heroMemoryIcon(memory.type),
    revived: heroMemoryIsRevived(memory),
    maxEnhancement: memoryMaxEnhancementForRarity(memory.rarity),
    traitBonus: traitLevelBonusForEnhancement(memory.enhancementLevel),
    reduction,
    implicit: { text: implicit, coverage: covered(implicit), wax: Boolean(memory.waxAndWane) },
    revival: [
      memory.waxAndWane ? "Wax and Wane · +30% base stat" : "",
      memory.risingMoon ? "Rising Moon · fixed affix tier increased" : "",
    ]
      .filter(Boolean)
      .map((text) => ({ text, coverage: coverageView(revivalStatus) })),
    revivedAffix: memory.revivedAffix
      ? {
          lunar: lunarPhaseRevivedAffixesSs14.includes(normalizeRevivedAffix(memory.revivedAffix)),
          effect: memoryRevivedEffectView(memory),
          note:
            memory.revivedAffix === "Ceaseless Tide"
              ? "When equipped on Sing with the Tide: +80% additional Tide Effect and ×0.8 cast speed while in Bard. Movement is not simulated."
              : "",
          coverage: coverageView(
            !equipped
              ? "Not equipped"
              : memory.revivedAffix === "Ceaseless Tide" && model.ceaselessTide
                ? "In calc"
                : equippedBaseTraitSlot(plannerState.hero)?.source.id === memory.id
                  ? "Enables base slot"
                  : revivedStatus?.status || "Not modeled",
            revivedStatus?.reason || "",
          ),
        }
      : null,
    fixed: affixes("fixedAffixes", "fixedTiers", false),
    random: affixes("randomAffixes", "randomTiers", true),
    inventory: Boolean(target.inventoryId),
  });
}

function sageScentTooltip(kind) {
  const name = plannerState.hero.sageScent?.[kind];
  const entry =
    kind === "elixir"
      ? sageElixirsSs14.find((item) => item.name === name)
      : sageScentIngredientsSs14[kind]?.find((item) => item.name === name);
  return entry ? scentTooltipView({ kind, entry }) : null;
}

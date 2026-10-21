// A hero memory's tooltip as the legacy tooltip's HTML. The hero panel and the memory selector show theirs with React
// (apps/web/src/features/hero/MemoryTooltip.tsx, from src/app/bridge/memory-tooltip-view.ts); only a damage path source
// naming a memory still comes here (planner-tooltips.js damageSourceTooltipContent), until the Stats tooltips move.
// Delete this file then.
import {
  equippedBaseTraitSlot,
  lunarPhaseRevivedAffixesSs13,
  normalizeRevivedAffix,
} from "../../data/heroes/memory-revival-ss13.js";
import { catsNightSafariStatus } from "../../engine/heroes/erika-wind-stalker.js";
import { heroMemoryLineCoverage, revivedAffixCoverage } from "../../engine/heroes/hero-memory-model.js";
import {
  memoryMaxEnhancementForRarity,
  memoryScaledBaseStat,
  reduceBaseTraitMemoryStat,
  traitLevelBonusForEnhancement,
} from "../../engine/heroes/hero-memory-rules.js";
import { coverageBadge } from "../planner/calculation-coverage.js";
import { affixTierBadge } from "../gear/gear-items.js";
import { heroMemoryIcon } from "../hero/hero-memory-display.js";
import { baseTraitReduction, memoryRevivalBadge, memoryRevivedAffixMarkup } from "../hero/hero-memory-controller.js";
import { escapeHtml } from "../html.js";
import { savedMemoryAffix } from "../hero/hero-tooltip-queries.js";
import { currentPlanner, plannerState } from "../planner/session.js";
import { memoryClasses as mc } from "./tooltip-kind-classes.js";

function memoryAffixRowContent(effect, tier) {
  return `${Number.isInteger(tier) ? affixTierBadge(`T${tier}`) : ""}<span class="${mc.affixText}">${escapeHtml(effect)}</span>`;
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
      ? `<section class="${label === "Implicit" ? `memory-implicit ${memory.waxAndWane ? "wax-applied" : ""}` : ""} ${mc.section}"><h4 class="${mc.heading}">${label}</h4>${entries.map((entry) => (typeof entry === "string" ? `<p class="${label === "Implicit" && memory.waxAndWane ? mc.lineWax : mc.line}">${escapeHtml(entry)} ${coverageBadge(status(entry))}</p>` : `<div class="memory-affix-row ${mc.affix}">${memoryAffixRowContent(entry.effect, entry.tier)} ${coverageBadge(entry.status || status(entry.effect))}</div>`)).join("")}</section>`
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
    memoryHtml: `<div class="memory-tooltip-head ${mc.head}"><img src="${heroMemoryIcon(memory.type)}" alt=""><div><strong class="${mc.title}">${escapeHtml(memory.name || memory.type)}</strong><small class="${mc.kicker}">${escapeHtml(memory.rarity || "normal").toUpperCase()} · HERO MEMORY</small></div></div>${memoryRevivalBadge(memory)}<div class="memory-tooltip-body ${mc.body}"><p class="${mc.stat}">Enhancement Level <b>${memory.enhancementLevel}/${memoryMaxEnhancementForRarity(memory.rarity)}</b></p><p class="${mc.statValue}">Trait Level <b>+${traitLevelBonusForEnhancement(memory.enhancementLevel)}</b></p>${reduction === null ? "" : `<p class="${mc.stat}">Base Trait Slot <b>${reduction}% to base stats and random affixes</b></p>`}${section("Implicit", [implicit])}${section(
      "Memory Revival",
      revival.map((effect) => ({ effect, status: equipped ? "Applied to rolls" : "Not equipped" })),
    )}${memory.revivedAffix ? `<section class="${mc.section}"><h4 class="${mc.heading}">Revived Affix${lunarPhaseRevivedAffixesSs13.includes(normalizeRevivedAffix(memory.revivedAffix)) ? " · Lunar Phase" : ""}</h4>${memoryRevivedAffixMarkup(memory)}${memory.revivedAffix === "Ceaseless Tide" ? `<p class="${mc.line}">When equipped on Sing with the Tide: +80% additional Tide Effect and ×0.8 cast speed while in Bard. Movement is not simulated.</p>` : ""}${coverageBadge(!equipped ? "Not equipped" : memory.revivedAffix === "Ceaseless Tide" && memoryModel.ceaselessTide ? "In calc" : equippedBaseTraitSlot(plannerState.hero)?.source.id === memory.id ? "Enables base slot" : (catsNightSafariStatus(currentPlanner(), memory) || revivedAffixCoverage(currentPlanner(), memory))?.status || "Not modeled", (catsNightSafariStatus(currentPlanner(), memory) || revivedAffixCoverage(currentPlanner(), memory))?.reason || "")}</section>` : ""}${section("Fixed Affixes", fixed)}${section("Random Affixes", random)}</div><small class="${mc.footer}">${element.dataset.memoryInventoryId ? "Right-click to equip or unequip" : "Right-click to unequip"}</small>`,
    rarity: memory.rarity || "normal",
  };
}

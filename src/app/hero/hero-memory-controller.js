// Hero memories: the sockets, the memory inventory dialog and the memory crafter.
import {
  clampMemoryEnhancement,
  closestMemoryTier,
  equippedBaseTraitSlot,
  heroMemoryAffixesSs14,
  heroMemoryFixedT0AffixesSs14,
  heroMemoryTierAffixesSs14,
  lunarPhaseRevivedAffixDetailsSs14,
  lunarPhaseRevivedAffixesSs14,
  memoryBaseStatLabel,
  memoryFitsBaseTraitSlot,
  memoryMaxEnhancementForRarity,
  memoryScaledBaseStat,
  memoryTierNumericValue,
  normalizeRevivedAffix,
  regularRevivedAffixesSs14,
  regularRevivedAffixNamesSs14,
  revivedAffixForMemoryType,
  revivedAffixRollRange,
  revivedAffixTiers,
  traitLevelBonusForEnhancement,
} from "#engine";
import { displayTexts } from "../bridge/display-text.ts";
import { openDialog } from "../bridge/dialogs.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { heroMemoryIcon, heroMemoryIsRevived, memoryTypesByTier } from "./hero-memory-display.js";
import { showToast } from "../planner/page.js";
import { persistPlannerState, plannerState } from "../planner/session.js";
import { renderHeroTraitTree } from "./hero-controller.js";

let activeHeroMemoryTier = "";
let memoryDraft = null;
let editingMemoryId = null;
// "inventory" or "craft": what the hero memory dialog shows.
let heroMemoryMode = "inventory";
export const heroMemoryCommands = {
  openMemorySocket,
  // Hero memory dialog (apps/web/src/features/hero/HeroMemorySelectorDialog.tsx).
  toggleCraftedMemory,
  toggleBaseMemory,
  clearBaseMemory,
  clearHeroMemorySlot: () => unequipHeroMemory(activeHeroMemoryTier),
  memoryContextMenu,
  copyCraftedMemory,
  editCraftedMemory,
  deleteCraftedMemory,
  startMemoryCraft: () => startHeroMemoryCraft(),
  cancelMemoryCraft,
  saveMemoryCraft,
  setMemoryField,
  setMemoryType,
  setMemoryRarity,
  setRevivedTier,
  setMemoryAffixTier,
  setMemoryTierPosition,
  setMemoryTierValue,
  removeMemory,
};
export const heroMemoryViewSources = {
  // The hero memory dialog.
  heroMemory: heroMemorySource,
};
function openMemorySocket(tier) {
  activeHeroMemoryTier = tier;
  renderHeroMemoryInventory();
  openDialog("hero-memory-selector");
}
// Right-click on a memory socket: takes its memory off; false when it holds none.
function removeMemory(tier) {
  if (tier === "base") {
    if (!plannerState.hero.baseTraitMemoryId) return false;
    plannerState.hero.baseTraitMemoryId = "";
    plannerState.hero.baseTraitMemoryRoll = null;
    persistPlannerState();
    renderHeroTraitTree();
    return true;
  }
  if (!plannerState.hero.equippedMemoryIds?.[tier]) return false;
  unequipHeroMemory(tier);
  return true;
}

function heroMemoryTypeForTier(tier) {
  return memoryTypesByTier[
    String(tier || "")
      .split(":")
      .pop()
  ];
}
function heroMemoryTierForType(type) {
  const levelTier = Object.keys(memoryTypesByTier).find((tier) => memoryTypesByTier[tier] === type);
  if (!levelTier) return null;
  const heroId = plannerState.hero.selectedHeroId;
  return heroId && heroId !== "selena-sing-with-the-tide" ? `${heroId}:${levelTier}` : levelTier;
}
export function baseTraitMemory() {
  return plannerState.hero.memoryInventory?.find((memory) => memory.id === plannerState.hero.baseTraitMemoryId) || null;
}
function canEquipBaseTraitMemory(memory) {
  return (
    memoryFitsBaseTraitSlot(
      memory,
      equippedBaseTraitSlot(plannerState.hero),
      Object.values(plannerState.hero.equippedMemoryIds || {}),
    ) && !heroMemoryIsRevived(memory)
  );
}
export function baseTraitReduction() {
  const slot = equippedBaseTraitSlot(plannerState.hero),
    target = baseTraitMemory();
  if (
    !target ||
    !memoryFitsBaseTraitSlot(target, slot, Object.values(plannerState.hero.equippedMemoryIds || {})) ||
    heroMemoryIsRevived(target)
  )
    return null;
  const range = slot.reductionRange;
  return Math.max(range.min, Math.min(range.max, plannerState.hero.baseTraitMemoryRoll ?? range.max));
}
function clearInvalidBaseTraitMemory() {
  if (plannerState.hero.baseTraitMemoryId && baseTraitReduction() === null) {
    plannerState.hero.baseTraitMemoryId = "";
    plannerState.hero.baseTraitMemoryRoll = null;
  }
}
// A revived affix as the crafter's preview and the memory tooltip show it: its tier, effect, and a Lunar Phase affix's
// details (its effects and hero trait exclusive) for Alt.
export function memoryRevivedEffectView(memory) {
  const name = normalizeRevivedAffix(memory.revivedAffix),
    special = lunarPhaseRevivedAffixesSs14.includes(name);
  const effect = revivedAffixForMemoryType(memory.revivedAffix, memory.type, memory.revivedTier, memory.revivedRoll);
  const tier = revivedAffixTiers(name).length ? memory.revivedTier : null;
  const rawDetails = lunarPhaseRevivedAffixDetailsSs14[name];
  const details = name?.startsWith("Artificial Moon:")
    ? rawDetails?.replace(
        /\s*Reduces the Base Stats and Random Affixes of Memories installed in this slot by \d+%/i,
        "",
      )
    : rawDetails;
  const lines = (details || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const exclusive = lines.find((line) => /^Hero Trait Exclusive:/i.test(line));
  return {
    tierBadge: Number.isInteger(tier) ? `T${tier}` : null,
    effect,
    special,
    details: details
      ? {
          effects: lines.filter((line) => !/^Hero Trait Exclusive:/i.test(line)),
          exclusive: exclusive
            ? exclusive
                .replace(/^Hero Trait Exclusive:\s*/i, "")
                .split(/\s*\|\s*/)
                .filter(Boolean)
                .join(" · ")
            : null,
        }
      : null,
  };
}
function otherEquippedRevivedMemory(memory) {
  const equippedIds = [
    ...Object.values(plannerState.hero.equippedMemoryIds || {}),
    plannerState.hero.baseTraitMemoryId,
  ];
  return (
    heroMemoryIsRevived(memory) &&
    equippedIds.some(
      (id) =>
        id &&
        id !== memory.id &&
        heroMemoryIsRevived(plannerState.hero.memoryInventory?.find((item) => item.id === id)),
    )
  );
}
function unequipHeroMemory(tier) {
  if (!tier || !plannerState.hero.equippedMemoryIds?.[tier]) return;
  plannerState.hero.memories[tier] = "";
  plannerState.hero.memoryTraitLevels[tier] = 0;
  delete plannerState.hero.equippedMemoryIds[tier];
  clearInvalidBaseTraitMemory();
  persistPlannerState();
  renderHeroTraitTree();
  renderHeroMemoryInventory();
  showToast("Hero memory unequipped");
}
function equipHeroMemory(memory) {
  const tier = heroMemoryTierForType(memory?.type);
  if (!tier) return;
  if (otherEquippedRevivedMemory(memory)) {
    showToast("Only one revived memory can be equipped");
    return;
  }
  plannerState.hero.equippedMemoryIds ||= {};
  // The game-log import keys a memory by its level alone ("level45"), the planner by hero ("<hero>:level45"), and the
  // calculation counts every key: the level's other key goes, so one memory sits at a level.
  const level = tier.replace(/^.*:/, "");
  for (const key of [level, `${plannerState.hero.selectedHeroId}:${level}`])
    if (key !== tier && plannerState.hero.equippedMemoryIds[key]) {
      delete plannerState.hero.equippedMemoryIds[key];
      plannerState.hero.memories[key] = "";
      plannerState.hero.memoryTraitLevels[key] = 0;
    }
  plannerState.hero.equippedMemoryIds[tier] = memory.id;
  plannerState.hero.memories[tier] = memory.name;
  plannerState.hero.memoryTraitLevels[tier] = traitLevelBonusForEnhancement(memory.enhancementLevel);
  clearInvalidBaseTraitMemory();
  persistPlannerState();
  renderHeroTraitTree();
  renderHeroMemoryInventory();
  showToast(`${memory.name} equipped`);
}
function openHeroMemorySlot(memory, preferBase = false) {
  const baseOpen = !plannerState.hero.baseTraitMemoryId && canEquipBaseTraitMemory(memory);
  const tier = heroMemoryTierForType(memory?.type);
  const regularOpen = Boolean(
    tier &&
    !plannerState.hero.equippedMemoryIds?.[tier] &&
    !plannerState.hero.memories?.[tier] &&
    !otherEquippedRevivedMemory(memory),
  );
  if (preferBase && baseOpen) return "base";
  if (regularOpen) return tier;
  return baseOpen ? "base" : null;
}
// The hero memory dialog (apps/web/src/features/hero/HeroMemorySelectorDialog.tsx) shows the "heroMemory" source: the
// inventory, or the crafter while a draft is open.
function renderHeroMemoryInventory() {
  heroMemoryMode = "inventory";
  viewSourceChanged("heroMemory");
}
function heroMemorySource() {
  return heroMemoryMode === "craft" && memoryDraft ? heroMemoryCrafterView() : heroMemoryInventoryView();
}
// A level socket lists the memories of its type only (Origin at 45, Discipline at 60, Progress at 75); the base trait
// slot lists every memory, the ones that do not fit it disabled.
function heroMemoryInventoryView() {
  const equipped = plannerState.hero.equippedMemoryIds || {};
  const baseMode = activeHeroMemoryTier === "base";
  const socketType = baseMode ? null : heroMemoryTypeForTier(activeHeroMemoryTier);
  const inventory = (plannerState.hero.memoryInventory || []).filter(
    (memory) => !socketType || memory.type === socketType,
  );
  return {
    mode: "inventory",
    title: baseMode ? "Hero Memories · Base Trait Slot" : `Hero Memories · ${socketType || "All"}`,
    empty: socketType ? `No ${socketType} crafted yet` : "No memories crafted yet",
    baseType: baseMode
      ? displayTexts(equippedBaseTraitSlot(plannerState.hero)?.memoryType?.replace(/^Memory of /, "") || "")
      : null,
    items: inventory.map((memory) => {
      const tier = Object.keys(equipped).find((key) => equipped[key] === memory.id),
        baseEquipped = plannerState.hero.baseTraitMemoryId === memory.id,
        compatible = canEquipBaseTraitMemory(memory),
        disabled = Boolean(baseMode ? !compatible && !baseEquipped : !tier && otherEquippedRevivedMemory(memory));
      return {
        id: memory.id,
        icon: heroMemoryIcon(memory.type),
        available: Boolean(tier || baseEquipped || openHeroMemorySlot(memory, baseMode)),
        ...displayTexts({
          name: memory.name,
          rarity: memory.rarity,
          detail: `${memory.type} · ${memory.rarity}${tier ? ` · Equipped at Lv.${tier.match(/level(\d+)$/)?.[1]}` : ""}${baseEquipped ? " · Base trait slot" : ""}`,
        }),
        action: {
          label: baseMode
            ? baseEquipped
              ? "Unequip"
              : compatible
                ? "Equip"
                : "Unavailable"
            : tier
              ? "Unequip"
              : "Equip",
          disabled,
          title: !disabled
            ? null
            : baseMode
              ? "Only a matching, unequipped memory fits this base trait slot"
              : "Only one revived memory can be equipped",
        },
      };
    }),
    unequipSlot: Boolean(
      baseMode ? plannerState.hero.baseTraitMemoryId : plannerState.hero.memories?.[activeHeroMemoryTier],
    ),
  };
}
function startHeroMemoryCraft(memory = null) {
  editingMemoryId = memory?.id || null;
  memoryDraft = memory
    ? structuredClone(memory)
    : {
        id: "",
        name: "",
        type:
          activeHeroMemoryTier === "base"
            ? equippedBaseTraitSlot(plannerState.hero)?.memoryType || "Memory of Origin"
            : heroMemoryTypeForTier(activeHeroMemoryTier),
        rarity: "",
        baseStat: "",
        enhancementLevel: 1,
        waxAndWane: false,
        risingMoon: false,
        revivedAffix: "",
        revivedTier: 1,
        revivedRoll: null,
        fixedAffixes: ["", ""],
        randomAffixes: ["", ""],
        fixedTiers: [1, 1],
        randomTiers: [0, 0],
        fixedRolls: [null, null],
        randomRolls: [null, null],
        traitLevelBonus: 1,
      };
  memoryDraft.name = memoryDraft.type;
  const oldRevivedEntry = regularRevivedAffixesSs14.find((entry) => entry.effect === memoryDraft.revivedAffix);
  memoryDraft.revivedTier = memoryDraft.revivedTier ?? oldRevivedEntry?.tier ?? 1;
  memoryDraft.revivedRoll =
    memoryDraft.revivedRoll ?? (oldRevivedEntry ? revivedAffixRollRange(oldRevivedEntry.effect)?.max : null) ?? null;
  memoryDraft.revivedAffix =
    memoryDraft.revivedAffix === "Artificial Moon"
      ? `Artificial Moon: ${memoryDraft.type.replace(/^Memory of /, "")}`
      : normalizeRevivedAffix(memoryDraft.revivedAffix);
  if (memoryDraft.revivedAffix.startsWith("Artificial Moon:")) memoryDraft.revivedRoll = null;
  delete memoryDraft.revivalMethod;
  memoryDraft.risingMoon = Boolean(memoryDraft.risingMoon || memoryDraft.fixedTiers?.includes(0));
  memoryDraft.enhancementLevel = clampMemoryEnhancement(memoryDraft.enhancementLevel, memoryDraft.rarity);
  memoryDraft.traitLevelBonus = traitLevelBonusForEnhancement(memoryDraft.enhancementLevel);
  memoryDraft.fixedTiers ||= [1, 1];
  memoryDraft.randomTiers ||= [0, 0];
  memoryDraft.fixedRolls ||= [null, null];
  memoryDraft.randomRolls ||= [null, null];
  renderHeroMemoryCraft();
}
export function memoryRollRange(effect) {
  const match = effect.match(/\((-?\d+)[–-](-?\d+)\)/);
  return match ? { min: Number(match[1]), max: Number(match[2]) } : null;
}
export function rolledMemoryAffix(effect, roll) {
  const range = memoryRollRange(effect);
  return range && Number.isFinite(roll) ? effect.replace(/\(-?\d+[–-]-?\d+\)/, String(roll)) : effect;
}
export const memoryAffixKey = (effect) =>
  effect
    .replace(/[-+%()–\d.]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
function memoryTierOptions(group, effect) {
  if (!effect) return [];
  const kind = group === "fixedAffixes" ? "Fixed Affix" : "Random Affix",
    key = memoryAffixKey(effect);
  const tiers = heroMemoryTierAffixesSs14.filter(
    (entry) => entry.type === memoryDraft.type && entry.kind === kind && memoryAffixKey(entry.effect) === key,
  );
  if (group === "fixedAffixes" && memoryDraft.risingMoon)
    tiers.push(
      ...heroMemoryFixedT0AffixesSs14.filter(
        (entry) => entry.type === memoryDraft.type && memoryAffixKey(entry.baseEffect) === key,
      ),
    );
  return tiers.sort((a, b) => b.tier - a.tier);
}
function memoryResolvedAffix(group, index) {
  const effect = memoryDraft[group][index];
  if (!effect) return "";
  const tierGroup = group === "fixedAffixes" ? "fixedTiers" : "randomTiers",
    rollGroup = group === "fixedAffixes" ? "fixedRolls" : "randomRolls";
  const selectedTier = memoryDraft[tierGroup][index];
  const tierEffect = memoryTierOptions(group, effect).find((entry) => entry.tier === selectedTier)?.effect || effect;
  const range = memoryRollRange(tierEffect),
    roll = memoryDraft[rollGroup][index];
  return rolledMemoryAffix(
    tierEffect,
    range && Number.isFinite(roll) ? Math.max(range.min, Math.min(range.max, roll)) : roll,
  );
}
function memoryAffixLineView(group, index, value, entries, label) {
  const tierGroup = group === "fixedAffixes" ? "fixedTiers" : "randomTiers",
    rollGroup = group === "fixedAffixes" ? "fixedRolls" : "randomRolls",
    tiers = memoryTierOptions(group, value),
    activeTier = memoryDraft[tierGroup][index],
    activeEffect = tiers.find((entry) => entry.tier === activeTier)?.effect || value,
    range = memoryRollRange(activeEffect),
    roll = memoryDraft[rollGroup]?.[index] ?? range?.max;
  const numericTiers =
    !range &&
    tiers.length > 1 &&
    tiers.every((entry) => memoryTierNumericValue(entry.effect) !== null) &&
    new Set(tiers.map((entry) => memoryTierNumericValue(entry.effect))).size === tiers.length;
  const tierValues = numericTiers ? tiers.map((entry) => memoryTierNumericValue(entry.effect)) : [];
  const tierIndex = Math.max(
    0,
    tiers.findIndex((entry) => entry.tier === activeTier),
  );
  return {
    group,
    index,
    label,
    value,
    options: entries.map((entry) => entry.effect),
    tiers: tiers.length > 1 ? tiers.map((entry) => ({ tier: entry.tier, active: entry.tier === activeTier })) : [],
    roll: range ? { min: range.min, max: range.max, value: roll } : null,
    tierValue: numericTiers
      ? {
          index: tierIndex,
          count: tiers.length,
          value: tierValues[tierIndex],
          min: Math.min(...tierValues),
          max: Math.max(...tierValues),
        }
      : null,
  };
}
function memoryRevivedControlsView(draft) {
  const known =
    regularRevivedAffixNamesSs14.includes(draft.revivedAffix) ||
    lunarPhaseRevivedAffixesSs14.includes(draft.revivedAffix);
  const tiers = revivedAffixTiers(draft.revivedAffix),
    active = tiers.find((entry) => entry.tier === draft.revivedTier) || tiers[0],
    range = revivedAffixRollRange(active?.effect);
  return {
    value: draft.revivedAffix,
    regular: regularRevivedAffixNamesSs14.map((name) => ({ name, description: revivedAffixTiers(name)[0].effect })),
    lunar: [...lunarPhaseRevivedAffixesSs14],
    saved: Boolean(draft.revivedAffix && !known),
    tiers: active ? tiers.map((entry) => ({ tier: entry.tier, active: entry.tier === active.tier })) : null,
    roll: range
      ? {
          min: range.min,
          max: range.max,
          value: Math.max(range.min, Math.min(range.max, draft.revivedRoll ?? range.max)),
        }
      : null,
  };
}
function renderHeroMemoryCraft() {
  heroMemoryMode = "craft";
  viewSourceChanged("heroMemory");
}
function heroMemoryCrafterView() {
  const draft = memoryDraft,
    maxEnhancement = memoryMaxEnhancementForRarity(draft.rarity),
    pool = (kind) => {
      const base = heroMemoryAffixesSs14.filter((entry) => entry.type === draft.type && entry.kind === kind);
      return kind === "Fixed Affix" && draft.risingMoon
        ? [
            ...base,
            ...heroMemoryFixedT0AffixesSs14
              .filter(
                (entry) =>
                  entry.type === draft.type &&
                  !base.some((item) => memoryAffixKey(item.effect) === memoryAffixKey(entry.baseEffect)),
              )
              .map((entry) => ({ ...entry, effect: entry.baseEffect })),
          ]
        : base;
    },
    previewRows = (group) =>
      draft[group].flatMap((value, index) => {
        const tier = draft[group === "fixedAffixes" ? "fixedTiers" : "randomTiers"][index];
        return value
          ? [{ index, tier: Number.isInteger(tier) ? tier : null, text: memoryResolvedAffix(group, index) }]
          : [];
      });
  return displayTexts({
    mode: "craft",
    title: editingMemoryId ? "Edit Memory" : "Craft Memory",
    types: Object.values(memoryTypesByTier).map((type) => ({
      type,
      icon: heroMemoryIcon(type),
      active: draft.type === type,
    })),
    rarities: ["Normal", "Magic", "Epic", "Legendary", "Ultimate"].map((label) => ({
      value: label.toLowerCase(),
      label,
      active: draft.rarity === label.toLowerCase(),
    })),
    baseStat: draft.baseStat,
    baseStats: pool("Base Stats").map((entry) => ({ value: entry.effect, label: memoryBaseStatLabel(entry.effect) })),
    enhancement: { level: draft.enhancementLevel, max: maxEnhancement },
    waxAndWane: Boolean(draft.waxAndWane),
    risingMoon: Boolean(draft.risingMoon),
    revived: memoryRevivedControlsView(draft),
    fixed: draft.fixedAffixes.map((value, index) =>
      memoryAffixLineView("fixedAffixes", index, value, pool("Fixed Affix"), `Fixed ${index + 1}`),
    ),
    random: draft.randomAffixes.map((value, index) =>
      memoryAffixLineView("randomAffixes", index, value, pool("Random Affix"), `Random ${index + 1}`),
    ),
    preview: draft.baseStat
      ? {
          type: draft.type,
          icon: heroMemoryIcon(draft.type),
          rarity: draft.rarity || "normal",
          revived: heroMemoryIsRevived(draft),
          enhancement: `Enhancement Level ${draft.enhancementLevel}/${maxEnhancement}`,
          traitBonus: draft.traitLevelBonus,
          implicit: memoryScaledBaseStat(
            draft.baseStat,
            draft.type,
            draft.enhancementLevel,
            draft.waxAndWane,
            draft.rarity,
          ),
          waxAndWane: Boolean(draft.waxAndWane),
          revivedAffix: draft.revivedAffix
            ? {
                lunar: lunarPhaseRevivedAffixesSs14.includes(draft.revivedAffix),
                effect: memoryRevivedEffectView(draft),
              }
            : null,
          fixed: previewRows("fixedAffixes"),
          random: previewRows("randomAffixes"),
        }
      : null,
    previewRarity: draft.rarity || "normal",
    canSave: Boolean(draft.rarity && draft.baseStat),
    saveLabel: editingMemoryId ? "Save Changes" : "Craft",
  });
}
// A crafter control's new value: a checkbox's boolean, a slider's or number's number, a select's text.
function updateMemoryDraftField(field, value) {
  if (!memoryDraft) return;
  if (/^(fixedAffixes|randomAffixes|fixedRolls|randomRolls)\./.test(field || "")) {
    const [group, indexText] = field.split("."),
      index = Number(indexText);
    if (group === "fixedRolls" || group === "randomRolls") {
      const affixGroup = group === "fixedRolls" ? "fixedAffixes" : "randomAffixes",
        tierGroup = group === "fixedRolls" ? "fixedTiers" : "randomTiers",
        tiers = memoryTierOptions(affixGroup, memoryDraft[affixGroup][index]);
      const effect =
          tiers.find((entry) => entry.tier === memoryDraft[tierGroup][index])?.effect || memoryDraft[affixGroup][index],
        range = memoryRollRange(effect);
      memoryDraft[group][index] = range ? Math.max(range.min, Math.min(range.max, value)) : value;
    } else {
      memoryDraft[group][index] = value;
      const rollGroup = group === "fixedAffixes" ? "fixedRolls" : "randomRolls",
        tierGroup = group === "fixedAffixes" ? "fixedTiers" : "randomTiers";
      memoryDraft[tierGroup][index] =
        group === "fixedAffixes" && memoryTierOptions(group, value).some((entry) => entry.tier === 1) ? 1 : 0;
      memoryDraft[rollGroup][index] = memoryRollRange(value)?.max ?? null;
    }
  } else if (field === "revivedAffix") {
    memoryDraft.revivedAffix = value;
    memoryDraft.revivedTier = 1;
    memoryDraft.revivedRoll = revivedAffixRollRange(revivedAffixTiers(value)[0]?.effect)?.max ?? null;
  } else if (field === "revivedRoll") {
    const effect = revivedAffixTiers(memoryDraft.revivedAffix).find(
      (entry) => entry.tier === memoryDraft.revivedTier,
    )?.effect;
    const range = revivedAffixRollRange(effect);
    memoryDraft.revivedRoll = range ? Math.max(range.min, Math.min(range.max, value)) : null;
  } else memoryDraft[field] = field === "enhancementLevel" ? clampMemoryEnhancement(value, memoryDraft.rarity) : value;
  if (field === "risingMoon" && !value) {
    memoryDraft.fixedAffixes = memoryDraft.fixedAffixes.map((effect) =>
      effect &&
      !heroMemoryTierAffixesSs14.some(
        (entry) =>
          entry.type === memoryDraft.type &&
          entry.kind === "Fixed Affix" &&
          memoryAffixKey(entry.effect) === memoryAffixKey(effect),
      )
        ? ""
        : effect,
    );
    memoryDraft.fixedTiers = memoryDraft.fixedTiers.map((tier) => (tier === 0 ? 1 : tier));
  }
  if (field === "enhancementLevel")
    memoryDraft.traitLevelBonus = traitLevelBonusForEnhancement(memoryDraft.enhancementLevel);
}
// ---- Hero memory dialog commands (apps/web/src/features/hero/HeroMemorySelectorDialog.tsx and HeroMemoryCrafter.tsx).
const findMemory = (id) => plannerState.hero.memoryInventory?.find((item) => item.id === id);
// Equip / Unequip of a memory in the inventory.
function toggleCraftedMemory(id) {
  const memory = findMemory(id);
  if (!memory) return;
  const tier = Object.keys(plannerState.hero.equippedMemoryIds || {}).find(
    (key) => plannerState.hero.equippedMemoryIds[key] === memory.id,
  );
  if (tier) unequipHeroMemory(tier);
  else equipHeroMemory(memory);
}
// Equip / Unequip of a memory in the base trait slot's mode.
function toggleBaseMemory(id) {
  const memory = findMemory(id),
    slot = equippedBaseTraitSlot(plannerState.hero);
  if (!slot || (!canEquipBaseTraitMemory(memory) && plannerState.hero.baseTraitMemoryId !== memory?.id)) return;
  if (plannerState.hero.baseTraitMemoryId === memory.id) {
    plannerState.hero.baseTraitMemoryId = "";
    plannerState.hero.baseTraitMemoryRoll = null;
  } else {
    plannerState.hero.baseTraitMemoryId = memory.id;
    plannerState.hero.baseTraitMemoryRoll = slot.reductionRange.max;
  }
  persistPlannerState();
  renderHeroTraitTree();
  renderHeroMemoryInventory();
}
function clearBaseMemory() {
  plannerState.hero.baseTraitMemoryId = "";
  plannerState.hero.baseTraitMemoryRoll = null;
  persistPlannerState();
  renderHeroTraitTree();
  renderHeroMemoryInventory();
}
// A right-click on a memory: unequips it, or equips it into an open compatible slot (the base trait slot first in that
// slot's mode).
function memoryContextMenu(id) {
  const memory = findMemory(id);
  if (!memory) return;
  const tier = Object.keys(plannerState.hero.equippedMemoryIds || {}).find(
    (key) => plannerState.hero.equippedMemoryIds[key] === id,
  );
  if (tier) {
    unequipHeroMemory(tier);
    return;
  }
  if (plannerState.hero.baseTraitMemoryId === id) {
    plannerState.hero.baseTraitMemoryId = "";
    plannerState.hero.baseTraitMemoryRoll = null;
    persistPlannerState();
    renderHeroTraitTree();
    renderHeroMemoryInventory();
    showToast("Base trait memory unequipped");
    return;
  }
  const openSlot = openHeroMemorySlot(memory, activeHeroMemoryTier === "base");
  if (openSlot === "base") {
    const slot = equippedBaseTraitSlot(plannerState.hero);
    plannerState.hero.baseTraitMemoryId = id;
    plannerState.hero.baseTraitMemoryRoll = slot.reductionRange.max;
    persistPlannerState();
    renderHeroTraitTree();
    renderHeroMemoryInventory();
    showToast(`${memory.name} equipped in base trait slot`);
  } else if (openSlot) equipHeroMemory(memory);
  else showToast("No open compatible memory slot");
}
function copyCraftedMemory(id) {
  const original = findMemory(id);
  if (!original) return;
  const copy = {
    ...structuredClone(original),
    id: globalThis.crypto?.randomUUID?.() || `memory-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
  plannerState.hero.memoryInventory.push(copy);
  persistPlannerState();
  renderHeroMemoryInventory();
  showToast(`${original.name} copied`);
}
function editCraftedMemory(id) {
  const memory = findMemory(id);
  if (memory) startHeroMemoryCraft(memory);
}
function deleteCraftedMemory(id) {
  plannerState.hero.memoryInventory = (plannerState.hero.memoryInventory || []).filter((memory) => memory.id !== id);
  for (const [tier, equippedId] of Object.entries(plannerState.hero.equippedMemoryIds || {}))
    if (equippedId === id) {
      delete plannerState.hero.equippedMemoryIds[tier];
      plannerState.hero.memories[tier] = "";
      plannerState.hero.memoryTraitLevels[tier] = 0;
    }
  clearInvalidBaseTraitMemory();
  persistPlannerState();
  renderHeroTraitTree();
  renderHeroMemoryInventory();
  showToast("Memory deleted");
}
function cancelMemoryCraft() {
  memoryDraft = null;
  editingMemoryId = null;
  renderHeroMemoryInventory();
}
function setMemoryField(field, value) {
  if (!memoryDraft) return;
  updateMemoryDraftField(field, value);
  renderHeroMemoryCraft();
}
function setMemoryType(type) {
  if (!memoryDraft || memoryDraft.type === type) return;
  memoryDraft.type = type;
  memoryDraft.name = type;
  memoryDraft.baseStat = "";
  renderHeroMemoryCraft();
}
function setMemoryRarity(rarity) {
  if (!memoryDraft) return;
  memoryDraft.rarity = rarity;
  memoryDraft.enhancementLevel = clampMemoryEnhancement(memoryDraft.enhancementLevel, memoryDraft.rarity);
  memoryDraft.traitLevelBonus = traitLevelBonusForEnhancement(memoryDraft.enhancementLevel);
  renderHeroMemoryCraft();
}
// A revived affix's tier: its roll goes to the tier's best.
function setRevivedTier(tier) {
  if (!memoryDraft) return;
  memoryDraft.revivedTier = tier;
  memoryDraft.revivedRoll =
    revivedAffixRollRange(revivedAffixTiers(memoryDraft.revivedAffix).find((entry) => entry.tier === tier)?.effect)
      ?.max ?? null;
  renderHeroMemoryCraft();
}
// An affix line's tier button: its roll goes to the tier's best.
function setMemoryAffixTier(group, index, tier) {
  if (!memoryDraft) return;
  const tierGroup = group === "fixedAffixes" ? "fixedTiers" : "randomTiers",
    rollGroup = group === "fixedAffixes" ? "fixedRolls" : "randomRolls";
  memoryDraft[tierGroup][index] = tier;
  memoryDraft[rollGroup][index] =
    memoryRollRange(
      memoryTierOptions(group, memoryDraft[group][index]).find((entry) => entry.tier === tier)?.effect || "",
    )?.max ?? null;
  renderHeroMemoryCraft();
}
// A line whose tiers differ by a number only: its tier slider (a position among the tiers, best last)…
function setMemoryTierPosition(group, index, position) {
  if (!memoryDraft) return;
  const entry = memoryTierOptions(group, memoryDraft[group][index])[position];
  if (!entry) return;
  memoryDraft[group === "fixedAffixes" ? "fixedTiers" : "randomTiers"][index] = entry.tier;
  memoryDraft[group === "fixedAffixes" ? "fixedRolls" : "randomRolls"][index] = null;
  renderHeroMemoryCraft();
}
// …or a typed value (the closest tier).
function setMemoryTierValue(group, index, text) {
  if (!memoryDraft) return;
  const entry = closestMemoryTier(memoryTierOptions(group, memoryDraft[group][index]), text);
  if (entry) memoryDraft[group === "fixedAffixes" ? "fixedTiers" : "randomTiers"][index] = entry.tier;
  renderHeroMemoryCraft();
}
function saveMemoryCraft() {
  if (!memoryDraft?.rarity || !memoryDraft.baseStat) return;
  if (
    editingMemoryId &&
    (Object.values(plannerState.hero.equippedMemoryIds || {}).includes(editingMemoryId) ||
      plannerState.hero.baseTraitMemoryId === editingMemoryId) &&
    otherEquippedRevivedMemory(memoryDraft)
  ) {
    showToast("Only one revived memory can be equipped");
    return;
  }
  plannerState.hero.memoryInventory ||= [];
  const enhancementLevel = clampMemoryEnhancement(memoryDraft.enhancementLevel, memoryDraft.rarity),
    memory = {
      ...memoryDraft,
      enhancementLevel,
      traitLevelBonus: traitLevelBonusForEnhancement(enhancementLevel),
      id: editingMemoryId || globalThis.crypto?.randomUUID?.() || `memory-${Date.now()}`,
      name: memoryDraft.type,
    };
  const index = plannerState.hero.memoryInventory.findIndex((item) => item.id === memory.id);
  if (index >= 0) plannerState.hero.memoryInventory[index] = memory;
  else plannerState.hero.memoryInventory.push(memory);
  for (const [tier, equippedId] of Object.entries(plannerState.hero.equippedMemoryIds || {}))
    if (equippedId === memory.id) {
      if (memory.type !== heroMemoryTypeForTier(tier)) {
        delete plannerState.hero.equippedMemoryIds[tier];
        plannerState.hero.memories[tier] = "";
        plannerState.hero.memoryTraitLevels[tier] = 0;
      } else {
        plannerState.hero.memories[tier] = memory.name;
        plannerState.hero.memoryTraitLevels[tier] = traitLevelBonusForEnhancement(memory.enhancementLevel);
      }
    }
  clearInvalidBaseTraitMemory();
  memoryDraft = null;
  editingMemoryId = null;
  persistPlannerState();
  renderHeroTraitTree();
  renderHeroMemoryInventory();
  showToast(`${memory.name} saved`);
}

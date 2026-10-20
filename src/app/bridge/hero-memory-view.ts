// What the hero memory dialog shows (src/app/app.js heroMemorySource; apps/web/src/shell/dialogs/
// HeroMemorySelectorDialog.tsx and HeroMemoryCrafter.tsx): the inventory of crafted memories, or the crafter.
// Types only.

/** A crafted memory in the inventory. */
export interface MemoryItemView {
  id: string;
  name: string;
  rarity: string;
  icon: string;
  /** "Memory of Origin · legendary · Equipped at Lv.45" */
  detail: string;
  /** False when it has no slot to go to (drawn as incompatible). */
  available: boolean;
  /** Equip / Unequip (the base trait slot's mode: Equip, Unequip or Unavailable). */
  action: { label: string; disabled: boolean; title: string | null };
}
export interface MemoryInventoryView {
  mode: "inventory";
  title: string;
  /** The base trait slot's mode: the memory type it accepts. */
  baseType: string | null;
  items: MemoryItemView[];
  /** The socket holds a memory (Unequip slot). */
  unequipSlot: boolean;
}

/** A roll's range and value (a slider and a number). */
export interface MemoryRollView {
  min: number;
  max: number;
  value: number;
}
/** A fixed or random affix line of the crafter. */
export interface MemoryAffixLineView {
  group: "fixedAffixes" | "randomAffixes";
  index: number;
  /** "Fixed 1" */
  label: string;
  value: string;
  options: string[];
  /** Its tiers, best first, when it has more than one. */
  tiers: { tier: number; active: boolean }[];
  roll: MemoryRollView | null;
  /** Tiers that differ by a number only: a slider over the tiers and the active tier's number. */
  tierValue: { index: number; count: number; value: number; min: number; max: number } | null;
}
export interface MemoryRevivedEffectView {
  tierBadge: string | null;
  effect: string;
  special: boolean;
  details: { effects: string[]; exclusive: string | null } | null;
}
export interface MemoryPreviewView {
  type: string;
  icon: string;
  rarity: string;
  revived: boolean;
  enhancement: string;
  traitBonus: number;
  implicit: string;
  waxAndWane: boolean;
  revivedAffix: { lunar: boolean; effect: MemoryRevivedEffectView } | null;
  fixed: { index: number; tier: number | null; text: string }[];
  random: { index: number; tier: number | null; text: string }[];
}
export interface MemoryCrafterView {
  mode: "craft";
  title: string;
  types: { type: string; icon: string; active: boolean }[];
  rarities: { value: string; label: string; active: boolean }[];
  baseStat: string;
  baseStats: { value: string; label: string }[];
  enhancement: { level: number; max: number };
  waxAndWane: boolean;
  risingMoon: boolean;
  revived: {
    value: string;
    regular: { name: string; description: string }[];
    lunar: string[];
    /** A saved effect no list knows. */
    saved: boolean;
    tiers: { tier: number; active: boolean }[] | null;
    roll: MemoryRollView | null;
  };
  fixed: MemoryAffixLineView[];
  random: MemoryAffixLineView[];
  /** Null until a base stat is chosen. */
  preview: MemoryPreviewView | null;
  /** The preview's rarity class. */
  previewRarity: string;
  canSave: boolean;
  saveLabel: string;
}
export type HeroMemoryView = MemoryInventoryView | MemoryCrafterView;

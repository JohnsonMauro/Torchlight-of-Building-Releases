import { voraxCrafting } from "../../data/gear/vorax-crafting.generated.js";

// A Vorax limb has two base affix slots, both rolled from the base's own base-affix pool.
export const VORAX_BASE_AFFIX_SLOTS = 2;

export function voraxBaseAffixPool(type) {
  return voraxCrafting.baseAffixes[type] || [];
}

export function voraxBaseAffixSlotPool(type, slot) {
  return slot >= 0 && slot < VORAX_BASE_AFFIX_SLOTS ? voraxBaseAffixPool(type) : [];
}

// Which gear slot silhouette (apps/web/src/ui/GearSlotIcon.tsx) stands for an equipment slot or a crafter's gear group:
// an empty slot shows its own, a group card the one of what it holds.
export type GearSlotIconKind =
  "helmet" | "chest" | "necklace" | "gloves" | "belt" | "boots" | "ring" | "weapon" | "shield";

const SLOT_ICONS: Readonly<Record<string, GearSlotIconKind>> = {
  helmet: "helmet",
  chest: "chest",
  necklace: "necklace",
  gloves: "gloves",
  belt: "belt",
  boots: "boots",
  leftRing: "ring",
  rightRing: "ring",
  mainHand: "weapon",
  secondaryHand: "shield",
};
const GROUP_ICONS: Readonly<Record<string, GearSlotIconKind>> = {
  helmet: "helmet",
  "chest-armor": "chest",
  gloves: "gloves",
  boots: "boots",
  shield: "shield",
  trinket: "necklace",
  "one-handed": "weapon",
  "two-handed": "weapon",
};

/** An equipment slot's silhouette (packages/engine/data/gear/crafting-catalog-ss14.js slot keys); null for an unknown slot. */
export const slotIconKind = (slot: string): GearSlotIconKind | null => SLOT_ICONS[slot] ?? null;
/** A gear group's silhouette (packages/engine/data/gear/gear-groups-ss14.js ids); null for an unknown group. */
export const groupIconKind = (group: string): GearSlotIconKind | null => GROUP_ICONS[group] ?? null;

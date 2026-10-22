// The Inventory's Sort order button, as the game sorts its bag: one-handed weapons, two-handed weapons, shields, then
// helmet, chest armor, gloves, boots, belt, necklace and rings (owner, 2026-10-21, from the game's bag). The sort is
// stable: items of one kind keep the order they had.
import { gearGroupsSs13 } from "../../data/gear/gear-groups-ss13.js";

interface SortableItem {
  slot?: string;
  /** The item type ("Wand", "STR Shield") or a base named after it ("Cleric Wand"). */
  base?: string;
}

const KINDS = ["one-handed", "two-handed", "shield", "helmet", "chest", "gloves", "boots", "belt", "necklace", "ring"];
const SLOT_KINDS: Readonly<Record<string, string>> = {
  helmet: "helmet",
  chest: "chest",
  gloves: "gloves",
  boots: "boots",
  belt: "belt",
  necklace: "necklace",
  leftRing: "ring",
  rightRing: "ring",
  secondaryHand: "shield",
};
const HAND_GROUPS = (gearGroupsSs13 as { id: string; entries: { type: string }[] }[]).filter((group) =>
  ["one-handed", "two-handed", "shield"].includes(group.id),
);

/** An item's place in the sort: its weapon group (the type its base names), else its slot's; unknown kinds last. */
function kindRank(item: SortableItem): number {
  const base = (item.base || "").toLowerCase();
  const group = HAND_GROUPS.find((entry) => entry.entries.some(({ type }) => base.includes(type.toLowerCase())));
  const kind = group?.id ?? SLOT_KINDS[item.slot || ""] ?? (item.slot === "mainHand" ? "one-handed" : "");
  const rank = KINDS.indexOf(kind);
  return rank < 0 ? KINDS.length : rank;
}

/** The items in the game's bag order (a new array; the input is left as it is). Array sorts are stable (ES2019). */
export function sortedInventory<T extends SortableItem>(items: readonly T[]): T[] {
  return items.toSorted((a, b) => kindRank(a) - kindRank(b));
}

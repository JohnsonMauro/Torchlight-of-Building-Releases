// The Inventory's Sort order (src/app/gear/inventory-sort.ts): the game's bag order, stable within a kind.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sortedInventory } from "../../src/app/gear/inventory-sort.ts";

test("weapons (one-handed, two-handed, shields), then helmet, chest, gloves, boots, belt, necklace and rings", () => {
  const items = [
    { name: "ring", slot: "leftRing", base: "Ring" },
    { name: "necklace", slot: "necklace" },
    { name: "two-handed", slot: "mainHand", base: "Two-Handed Sword" },
    { name: "belt", slot: "belt" },
    { name: "one-handed", slot: "mainHand", base: "Cleric Wand" },
    { name: "shield", slot: "secondaryHand", base: "STR Shield" },
    { name: "helmet", slot: "helmet" },
    { name: "spirit ring", slot: "leftRing", base: "Spirit Ring" },
    { name: "boots", slot: "boots" },
    { name: "chest", slot: "chest" },
    { name: "gloves", slot: "gloves" },
  ];
  const sorted = sortedInventory(items);
  assert.deepEqual(
    sorted.map((item) => item.name),
    [
      "one-handed",
      "two-handed",
      "shield",
      "helmet",
      "chest",
      "gloves",
      "boots",
      "belt",
      "necklace",
      "ring",
      "spirit ring",
    ],
  );
  assert.equal(items[0].name, "ring", "the input stays as it was");
});

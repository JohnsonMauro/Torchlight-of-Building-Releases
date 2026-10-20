// What the Gear section shows (src/app/bridge/equipment-view-model.ts), on a small hand-made build: the planner's looks,
// curse limit and Inventory links are stubbed, so the test sees only what the view model decides.
import { test } from "node:test";
import assert from "node:assert/strict";
import { equipmentView, gearDropAllowed } from "../../src/app/bridge/equipment-view-model.ts";

const slots = [
  ["helmet", "Helmet"],
  ["leftRing", "Ring 1"],
  ["rightRing", "Ring 2"],
  ["mainHand", "Weapon 1"],
];
const helm = { id: "gear-helm", slot: "helmet", name: "Blind Vision", level: 94 };
const ring = { id: "gear-ring", slot: "leftRing", name: "Restless Glacier", base: "Ring" };
const wand = { id: "gear-wand", slot: "mainHand", name: "Headless Cleric Wand", base: "Cleric Wand" };

function view(overrides = {}) {
  return equipmentView({
    slots,
    // Ring 2 holds the ring (made for Ring 1); the weapon slot is unequipped.
    items: [helm, { ...ring, slot: "rightRing" }, wand],
    disabled: new Set(["mainHand"]),
    selectedSlot: "leftRing",
    inventory: [helm, ring, wand],
    look: (item) => ({ rarityClass: `rarity-${item.id}`, icon: `${item.id}.webp` }),
    curseOffReason: (item) => (item.name === "Blind Vision" ? "curse limit reached" : ""),
    isEquipped: (item) => item.id !== "gear-wand",
    slotDragItem: (slot) => (slot === "rightRing" ? ring : slot === "helmet" ? helm : null),
    ...overrides,
  });
}

test("a slot shows its item, or is empty when nothing is there or it is unequipped", () => {
  const result = view();
  assert.equal(result.equippedCount, 2);
  assert.equal(result.slotCount, 4);
  assert.deepEqual(
    result.slots.map((slot) => [slot.slot, slot.label, slot.selected, slot.item?.name ?? null]),
    [
      ["helmet", "Helmet", false, "Blind Vision"],
      ["leftRing", "Ring 1", true, null],
      ["rightRing", "Ring 2", false, "Restless Glacier"],
      ["mainHand", "Weapon 1", false, null],
    ],
  );
  const [helmet] = result.slots;
  assert.equal(helmet.item.level, "Lv.94");
  assert.equal(helmet.item.icon, "gear-helm.webp");
  assert.equal(helmet.item.curseOffReason, "curse limit reached");
  assert.equal(result.slots[2].item.level, "Lv.100");
});

test("a slot's classes add the base's icon class to the item's rarity", () => {
  const result = view({ disabled: new Set() });
  assert.equal(result.slots[0].item.classes, "rarity-gear-helm");
  assert.equal(result.slots[3].item.classes, "rarity-gear-wand wand-icon");
  const scepter = view({ items: [{ ...wand, base: "Dark Gaze Scepter" }], disabled: new Set() });
  assert.equal(scepter.slots[3].item.classes, "rarity-gear-wand scepter-icon");
});

test("a slot's drag carries its Inventory entry, made for its own slot", () => {
  const result = view({ disabled: new Set() });
  assert.deepEqual(result.slots[2].item.drag, {
    itemId: "gear-ring",
    itemSlot: "leftRing",
    name: "Restless Glacier",
    icon: "gear-ring.webp",
  });
  // No Inventory entry: the slot cannot be dragged.
  assert.equal(result.slots[3].item.drag, null);
});

test("the Inventory cards show base and level, or the slot's name, and whether they are equipped", () => {
  assert.deepEqual(
    view().inventory.map((card) => [card.id, card.detail, card.itemSlot, card.equipped, card.rarityClass]),
    [
      ["gear-helm", "Helmet · Lv.94", "helmet", true, "rarity-gear-helm"],
      ["gear-ring", "Ring · Lv.100", "leftRing", true, "rarity-gear-ring"],
      ["gear-wand", "Cleric Wand · Lv.100", "mainHand", false, "rarity-gear-wand"],
    ],
  );
  assert.equal(view({ inventory: [{ ...ring, base: undefined }] }).inventory[0].detail, "Left Ring · Lv.100");
});

test("rings go in either ring slot, weapons in either weapon slot, the rest only in their own", () => {
  assert.equal(gearDropAllowed("leftRing", "rightRing"), true);
  assert.equal(gearDropAllowed("rightRing", "leftRing"), true);
  assert.equal(gearDropAllowed("mainHand", "secondaryHand"), true);
  assert.equal(gearDropAllowed("helmet", "helmet"), true);
  assert.equal(gearDropAllowed("helmet", "chest"), false);
  assert.equal(gearDropAllowed("leftRing", "mainHand"), false);
});

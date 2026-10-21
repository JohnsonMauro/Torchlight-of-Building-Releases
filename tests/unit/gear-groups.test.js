// The game's gear groups (src/data/gear/gear-groups-ss13.js): every craftable item type in exactly one group, the
// weapons split by hands as the calculation splits them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { craftItemTypes } from "../../src/data/gear/crafting-catalog-ss13.js";
import { gearGroupOfType, gearGroupsSs13 } from "../../src/data/gear/gear-groups-ss13.js";
import {
  ONE_HANDED_WEAPON_TYPES,
  SHIELD_TYPES,
  TWO_HANDED_WEAPON_TYPES,
} from "../../src/engine/skills/weapon-damage-model.js";

const typesOf = (id) => gearGroupsSs13.find((group) => group.id === id).entries.map((entry) => entry.type);

test("every craftable item type sits in exactly one group", () => {
  const grouped = gearGroupsSs13.flatMap((group) => group.entries.map((entry) => entry.type));
  assert.equal(new Set(grouped).size, grouped.length);
  assert.deepEqual([...grouped].sort(), craftItemTypes.map(([type]) => type).sort());
});

test("weapons by hands and shields match the calculation's lists", () => {
  assert.deepEqual(typesOf("one-handed"), [...ONE_HANDED_WEAPON_TYPES]);
  assert.deepEqual(typesOf("two-handed"), [...TWO_HANDED_WEAPON_TYPES]);
  assert.deepEqual(typesOf("shield"), [...SHIELD_TYPES]);
  assert.deepEqual(gearGroupOfType("DEX Gloves"), {
    group: gearGroupsSs13.find((group) => group.id === "gloves"),
    entry: { label: "DEX", type: "DEX Gloves" },
  });
  assert.equal(gearGroupOfType("Vorax Limb: Head"), undefined);
});

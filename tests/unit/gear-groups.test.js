// The game's gear groups (packages/engine/data/gear/gear-groups.js): every craftable item type in exactly one group, the
// weapons split by hands as the calculation splits them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { craftItemTypes } from "../../packages/engine/data/gear/crafting-catalog.js";
import { gearGroupOfType, gearGroups } from "../../packages/engine/data/gear/gear-groups.js";
import {
  ONE_HANDED_WEAPON_TYPES,
  SHIELD_TYPES,
  TWO_HANDED_WEAPON_TYPES,
} from "../../packages/engine/src/skills/weapon-damage-model.js";

const typesOf = (id) => gearGroups.find((group) => group.id === id).entries.map((entry) => entry.type);

test("every craftable item type sits in exactly one group", () => {
  const grouped = gearGroups.flatMap((group) => group.entries.map((entry) => entry.type));
  assert.equal(new Set(grouped).size, grouped.length);
  assert.deepEqual([...grouped].sort(), craftItemTypes.map(([type]) => type).sort());
});

test("weapons by hands and shields match the calculation's lists", () => {
  assert.deepEqual(typesOf("one-handed"), [...ONE_HANDED_WEAPON_TYPES]);
  assert.deepEqual(typesOf("two-handed"), [...TWO_HANDED_WEAPON_TYPES]);
  assert.deepEqual(typesOf("shield"), [...SHIELD_TYPES]);
  assert.deepEqual(gearGroupOfType("DEX Gloves"), {
    group: gearGroups.find((group) => group.id === "gloves"),
    entry: { label: "DEX", type: "DEX Gloves" },
  });
  assert.equal(gearGroupOfType("Vorax Limb: Head"), undefined);
});

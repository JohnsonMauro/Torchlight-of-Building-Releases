// Item rows TLIDB prints as one line that hold several of the game's lines (packages/engine/src/gear/gear-unique-modules.js
// expandScriptedItemLine): each reaches the readers as its own line.
import { test } from "node:test";
import assert from "node:assert/strict";
import { expandScriptedItemLine } from "../../packages/engine/src/gear/gear-unique-modules.js";
import { resolveCombatStates } from "../../packages/engine/src/combat-states.js";
import { legendaryGear } from "../../packages/engine/data/gear/legendary-gear.generated.js";

const graspOfTruthRow = legendaryGear
  .find((item) => item.name === "Grasp of Truth")
  .modifiers.find((text) => text.startsWith("[Penetrating]"));

test("Grasp of Truth's [Penetrating] row is the keyword's two lines and the +12% additional Spell Damage line", () => {
  assert.deepEqual(expandScriptedItemLine("Grasp of Truth", graspOfTruthRow), [
    "When dealing Fire, Lightning, or Cold Damage, inflicts Fire Infiltration, Lightning Infiltration, or Cold Infiltration respectively.",
    "Upon inflicting damage, +8% additional Elemental Damage for each type of Infiltration Effect the enemy has",
    "+12% additional Spell Damage",
  ]);
});

test("a Lightning build with Grasp of Truth holds Lightning Infiltration and gains +8% additional Elemental Damage", () => {
  const lines = expandScriptedItemLine("Grasp of Truth", graspOfTruthRow).map((text) => ({
    text,
    source: "Grasp of Truth",
    origin: "gear",
    multiplier: 1,
  }));
  const { derived } = resolveCombatStates(lines, { dealtTypes: new Set(["Lightning"]), dealsSpellDamage: true });
  assert.deepEqual(derived.map((line) => line.text).sort(), [
    "+13% additional Lightning Damage taken",
    "+8% additional Elemental Damage",
  ]);
});

test("[Penetrating] inflicts only the Infiltrations of the damage types the build deals, not the Ignite ledger's default Fire", () => {
  const lines = expandScriptedItemLine("Grasp of Truth", graspOfTruthRow).map((text) => ({
    text,
    source: "Grasp of Truth",
    origin: "gear",
    multiplier: 1,
  }));
  // packages/engine/src/planner.js: dealtTypes always carries Fire; dealtDamageTypes holds what the build deals.
  const { derived } = resolveCombatStates(lines, {
    dealtTypes: new Set(["Fire", "Lightning"]),
    dealtDamageTypes: new Set(["Lightning"]),
    dealsSpellDamage: true,
  });
  assert.deepEqual(derived.map((line) => line.text).sort(), [
    "+13% additional Lightning Damage taken",
    "+8% additional Elemental Damage",
  ]);
});

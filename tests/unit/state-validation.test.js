import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clampCombatNumber, validatePlannerState } from "../../src/state-validation.ts";
import { defaultPlannerState } from "../../src/planner-state.ts";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const rejects = (state, path) =>
  assert.throws(() => validatePlannerState(state), { name: "TypeError", message: `Invalid build field: ${path}` });

test("accepts the default build and a real imported build, returning the same object", () => {
  const state = structuredClone(defaultPlannerState);
  assert.equal(validatePlannerState(state), state);
  assert.equal(validatePlannerState(youga), youga);
});

test("every field is optional; an empty object is a valid stored build", () => {
  assert.deepEqual(validatePlannerState({}), {});
});

test("rejects unknown keys, with the path of the first bad field", () => {
  rejects({ unexpected: 1 }, "build.unexpected");
  rejects({ hero: { nickname: "x" } }, "build.hero.nickname");
});

test("rejects wrong types and out-of-range numbers", () => {
  rejects({ schemaVersion: 2 }, "build.schemaVersion");
  rejects({ hero: { characterLevel: 101 } }, "build.hero.characterLevel");
  rejects({ hero: { characterLevel: 1.5 } }, "build.hero.characterLevel");
  rejects({ combat: { conditionMode: "always" } }, "build.combat.conditionMode");
  rejects({ talents: { useCapturedRanks: "yes" } }, "build.talents.useCapturedRanks");
  rejects({ pacts: { selectedSpirits: ["a", "b", "c", "d"] } }, "build.pacts.selectedSpirits");
  rejects({ talentRanks: { "Lich:1,1": 4 } }, "build.talentRanks.Lich:1,1");
});

test("rejects oversized text, non-plain objects and prototype keys", () => {
  rejects({ hero: { selectedHeroId: "x".repeat(10001) } }, "build.hero.selectedHeroId");
  rejects({ hero: [] }, "build.hero");
  rejects({ hero: new Map() }, "build.hero");
  rejects(JSON.parse('{"hero": {"__proto__": {}}}'), "build.hero");
});

test("checks the special cases: custom supports, slate rotation, follower skills, defenses", () => {
  const support = { name: "Mine", level: 1, manaCostMultiplierPercent: 100, effects: [], custom: true };
  assert.doesNotThrow(() => validatePlannerState({ skills: { customSupports: { Setup: [support] } } }));
  rejects(
    { skills: { customSupports: { Setup: [{ ...support, custom: false }] } } },
    "build.skills.customSupports.Setup[0].custom",
  );
  rejects({ skills: { customSupports: { Setup: [{ level: 1 }] } } }, "build.skills.customSupports.Setup[0].name");
  rejects({ slates: { placements: { a: { column: 1, row: 1, rotation: 45 } } } }, "build.slates.placements.a");
  assert.doesNotThrow(() =>
    validatePlannerState({ slates: { placements: { a: { column: 1, row: 6, rotation: 90 } } } }),
  );
  // Unlike other shapes, a placement needs its column and row.
  rejects({ slates: { placements: { a: { rotation: 90 } } } }, "build.slates.placements.a");
  assert.doesNotThrow(() =>
    validatePlannerState({ followers: { skills: ["Name", null, { name: "N", tier: "T", affixes: [null] }] } }),
  );
  rejects({ followers: { skills: [{ name: "N", level: 3 }] } }, "build.followers.skills[0].level");
  rejects({ equipmentInventory: [{ defenses: { "bad key": 1 } }] }, "build.equipmentInventory[0].defenses");
});

test("combat numbers the Config tab writes are part of the stored build, within their limits", () => {
  assert.doesNotThrow(() => validatePlannerState({ combat: { aimBattleStacks: 2, firesAllureScorchStacks: 6 } }));
  rejects({ combat: { aimBattleStacks: 4 } }, "build.combat.aimBattleStacks");
  rejects({ combat: { idyllStacks: 1.5 } }, "build.combat.idyllStacks");
});

test("clampCombatNumber keeps a typed number within what the stored build accepts", () => {
  assert.equal(clampCombatNumber("idyllStacks", 1.5), 1);
  assert.equal(clampCombatNumber("auraAffectedAllies", 9), 7);
  assert.equal(clampCombatNumber("extraMaxChanneledStacks", -30), -20);
  assert.equal(clampCombatNumber("targetFireResistancePercent", 12.5), 12.5);
  assert.equal(clampCombatNumber("afflictionPeak", Number.NaN), 0);
  for (const value of [-1000, -1.5, 0, 0.5, 2.75, 1000])
    assert.doesNotThrow(() =>
      validatePlannerState({ combat: { aimBattleStacks: clampCombatNumber("aimBattleStacks", value) } }),
    );
});

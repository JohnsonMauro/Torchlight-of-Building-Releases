// The Energy the character level gives (src/engine/engine.js characterLevelEnergy, read by calculatePlanner): +1 per level
// over a base of 4, as the game's Energy panel shows "+98 Character level" at level 94.
import { test } from "node:test";
import assert from "node:assert/strict";
import { characterLevelEnergy } from "../../src/engine/engine.js";
import { calculatePlanner } from "../../src/engine/planner.js";
import { defaultPlannerState } from "../../src/engine/state/planner-state.ts";

const levelEnergy = (characterLevel) => {
  const state = structuredClone(defaultPlannerState);
  if (characterLevel != null) state.hero.characterLevel = characterLevel;
  return calculatePlanner(state).activation.energy.nonEquipmentEnergy;
};

test("level 94 gives the 98 Energy the game shows", () => {
  assert.equal(characterLevelEnergy(94), 98);
  assert.equal(levelEnergy(94), 98);
});

test("the build's level moves its Energy; a build with no level reads the default level 100", () => {
  assert.equal(levelEnergy(60), 64);
  assert.equal(levelEnergy(null), 104);
});

// Selena – Dance of the Deep's Red Shoes of Cruelty revival (packages/engine/src/heroes/selena/badges.js): while the Main Terra
// Skill is active the dummy inside its area takes 38% of the Movement Speed bonus as additional damage taken, up to 75%; the
// True Damage the character takes is defensive.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveHeroModules } from "../../packages/engine/src/heroes/hero-trait-modules.js";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { normalizePlannerState } from "../../packages/engine/src/state/planner-state.ts";
import { switchHeroLoadout } from "../../packages/engine/src/heroes/hero-loadouts.js";
import { revivedAffixLineCoverage } from "../../packages/engine/src/heroes/hero-memory-model.js";
import { exclusiveRevivalLines } from "../../packages/engine/src/heroes/hero-exclusive-revivals.js";

const SELENA = "selena-dance-of-the-deep";
const [SELF_DAMAGE, TAKEN] = exclusiveRevivalLines("Red Shoes of Cruelty");
const memoryLine = (text) => ({ text, source: "Red Shoes of Cruelty", origin: "memory", multiplier: 1 });

test("the dummy in the Main Terra Skill's area takes 38% of the Movement Speed bonus", () => {
  const { entries, derived } = resolveHeroModules([memoryLine(TAKEN)], {
    heroId: SELENA,
    mainIsTerra: true,
    movementSpeedPercent: 50,
  });
  assert.equal(entries[0].status, "In calc");
  assert.deepEqual(
    derived.map((line) => line.text),
    ["+19% additional damage taken"],
  );
});

test("the damage taken stops at 75%", () => {
  const { derived } = resolveHeroModules([memoryLine(TAKEN)], {
    heroId: SELENA,
    mainIsTerra: true,
    movementSpeedPercent: 300,
  });
  assert.deepEqual(
    derived.map((line) => line.text),
    ["+75% additional damage taken"],
  );
});

test("without an active Main Terra Skill nothing holds", () => {
  const { entries, derived } = resolveHeroModules([memoryLine(TAKEN)], {
    heroId: SELENA,
    mainIsTerra: false,
    movementSpeedPercent: 50,
  });
  assert.equal(entries[0].status, "Inactive");
  assert.equal(derived.length, 0);
});

test("the True Damage the character takes is defensive", () => {
  const { entries, derived } = resolveHeroModules([memoryLine(SELF_DAMAGE)], {
    heroId: SELENA,
    mainIsTerra: true,
    movementSpeedPercent: 50,
  });
  assert.equal(entries[0].status, "No DPS effect");
  assert.equal(derived.length, 0);
});

test("the revived memory's lines carry the module's badges in the planner", () => {
  const state = JSON.parse(
    readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
  );
  // A loadout keeps its own equipped memories: the new one starts with none, so one of the inventory goes in.
  state.hero = switchHeroLoadout(state.hero, SELENA);
  const memory = state.hero.memoryInventory.find((item) => item.type === "Memory of Origin");
  state.hero.equippedMemoryIds = { level45: memory.id };
  for (const item of state.hero.memoryInventory) item.revivedAffix = "";
  memory.revivedAffix = "Red Shoes of Cruelty";
  memory.revivalMethod = "lunarPhase";
  const planner = calculatePlanner(normalizePlannerState(state));
  for (const line of [SELF_DAMAGE, TAKEN]) {
    const badge = revivedAffixLineCoverage(planner, memory, line);
    assert.notEqual(badge.status, "Not modeled", `${line}: ${badge.reason}`);
  }
});

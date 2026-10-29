// Rosa – High Court Chariot's Between the Holy Land and Hell revival (packages/engine/src/heroes/rosa/badges.js): Repent to the
// Light attacks the character for Block Ratio stacks (TLIDB keyword), so the line is read and moves no damage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveHeroModules } from "../../packages/engine/src/heroes/hero-trait-modules.js";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { normalizePlannerState } from "../../packages/engine/src/state/planner-state.ts";
import { switchHeroLoadout } from "../../packages/engine/src/heroes/hero-loadouts.js";
import { revivedAffixLineCoverage } from "../../packages/engine/src/heroes/hero-memory-model.js";
import { exclusiveRevivalLines } from "../../packages/engine/src/heroes/hero-exclusive-revivals.js";

const ROSA = "rosa-high-court-chariot";
const [REPENT] = exclusiveRevivalLines("Between the Holy Land and Hell");

test("Repent to the Light is defensive: No DPS effect, nothing derived", () => {
  const { entries, derived } = resolveHeroModules(
    [{ text: REPENT, source: "Between the Holy Land and Hell", origin: "memory", multiplier: 1 }],
    { heroId: ROSA },
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].status, "No DPS effect");
  assert.match(entries[0].conditionText, /Block Ratio/);
  assert.equal(derived.length, 0);
});

test("the revived memory's line carries the module's badge in the planner", () => {
  const state = JSON.parse(
    readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
  );
  // A loadout keeps its own equipped memories: the new one starts with none, so one of the inventory goes in.
  state.hero = switchHeroLoadout(state.hero, ROSA);
  const memory = state.hero.memoryInventory.find((item) => item.type === "Memory of Origin");
  state.hero.equippedMemoryIds = { level45: memory.id };
  for (const item of state.hero.memoryInventory) item.revivedAffix = "";
  memory.revivedAffix = "Between the Holy Land and Hell";
  memory.revivalMethod = "lunarPhase";
  const badge = revivedAffixLineCoverage(calculatePlanner(normalizePlannerState(state)), memory, REPENT);
  assert.equal(badge.status, "No DPS effect", badge.reason);
});

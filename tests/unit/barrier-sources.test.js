// Barrier sources (packages/engine/src/defense/barrier-sources.js): one list the Blessing gains, the Barrier Burst
// requirement and the Energy Shield pool all read. A movement Barrier ("100% chance to gain a Barrier for every 5 m you
// move", Imprisoned Darkness Ring) always holds: the build that carries it moves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { normalizePlannerState } from "../../packages/engine/src/state/planner-state.ts";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const MOVEMENT_BARRIER = "100% chance to gain a Barrier for every 5 m you move";
const TENACITY_ON_BARRIER = "Gains 1 stack(s) of Tenacity Blessing every 1 s when having Barrier";

function withBarrierRing({ moving = true } = {}) {
  const state = structuredClone(youga);
  const ring = state.equipmentOverrides.leftRing;
  state.equipmentOverrides.leftRing = {
    ...ring,
    modifiers: [...ring.modifiers, MOVEMENT_BARRIER, TENACITY_ON_BARRIER],
  };
  state.combat = {
    ...state.combat,
    conditionMode: "manual",
    bestCaseOverrides: { ...state.combat?.bestCaseOverrides, moving },
  };
  return calculatePlanner(normalizePlannerState(state));
}

const tenacityGain = (planner) =>
  planner.blessings.entries
    .find((blessing) => blessing.name === "Tenacity")
    .gainSources.find((source) => /when having Barrier/.test(source.text));

test("a movement Barrier on gear is a Barrier source", () => {
  const planner = withBarrierRing();
  const source = planner.barrierSources.find((item) => item.text === MOVEMENT_BARRIER);
  assert.ok(source, "the ring's line is listed as a Barrier source");
  assert.equal(source.source, youga.equipmentOverrides.leftRing.name);
  assert.equal(source.available, true);
});

test("Tenacity Blessing's 'when having Barrier' gain reads the movement Barrier", () => {
  const gain = tenacityGain(withBarrierRing());
  assert.equal(gain.available, true);
  assert.match(gain.condition, new RegExp(youga.equipmentOverrides.leftRing.name));
});

// Owner, 2026-10-29: a build that carries a movement Barrier moves to gain it; the item line is the rule, not the Moving
// condition.
test("the movement Barrier holds with the Moving condition off", () => {
  const planner = withBarrierRing({ moving: false });
  assert.equal(planner.barrierSources.find((item) => item.text === MOVEMENT_BARRIER).available, true);
  assert.equal(tenacityGain(planner).available, true);
});

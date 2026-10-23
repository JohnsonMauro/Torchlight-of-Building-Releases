// The ailments' crit is the main skill hit's (packages/engine/src/planner.js ailmentCritical), never the inert Scorching Beam
// stub's spell crit that every build carried until 2026-10-23 (5% chance, 0.15 crits per second on an empty build).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { defaultPlannerState, normalizePlannerState } from "../../packages/engine/src/state/planner-state.ts";
import { versusAilmentCriticalDamageSources } from "../../packages/engine/src/skills/spell-critical.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const close = (actual, expected) => Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected));

test("the ailments read the main skill hit's crit chance and its crit hits per second", () => {
  const planner = calculatePlanner(youga);
  const main = planner.skillHits.find((hit) => hit.modeled && hit.name === "Homing Frost Bolt");
  assert.ok(main);
  assert.equal(planner.ailmentCritical.criticalChancePercent, main.crit.chancePercent);
  assert.ok(close(planner.ailmentCritical.critsPerSecond, (main.rate.hitsPerSecond * main.crit.chancePercent) / 100));
  const versusAilment = planner.ailmentCritical.versusAilmentSources.reduce((sum, line) => sum + line.value, 0);
  assert.ok(
    close(planner.ailmentCritical.combatCriticalDamagePercent, main.crit.combatCriticalDamagePercent + versusAilment),
  );
});

test("a build without a modeled main hit gives its ailments no crit", () => {
  const planner = calculatePlanner(normalizePlannerState(structuredClone(defaultPlannerState)));
  assert.deepEqual(planner.ailmentCritical, {});
});

test("Critical Strike Damage against enemies affected by Ailments counts for the ailments", () => {
  assert.deepEqual(
    versusAilmentCriticalDamageSources([
      { source: "Gear", text: "+30% Critical Strike Damage against enemies affected by Ailments", multiplier: 1 },
      { source: "Gear", text: "+30% Critical Strike Damage", multiplier: 1 },
    ]),
    [{ source: "Gear", text: "+30% Critical Strike Damage against enemies affected by Ailments", value: 30 }],
  );
});

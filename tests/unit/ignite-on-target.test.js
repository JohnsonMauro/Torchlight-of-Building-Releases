// States that need Ignite on the dummy (2026-10-23): before, only the deleted Scorching Beam path switched them on, so
// every other build kept Fire Infiltration, Fire's Allure and the Ignited Blessing gains off.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { collectEnemyAilments } from "../../packages/engine/src/ailments/enemy-ailments.js";

const fireBurst = JSON.parse(
  readFileSync(new URL("../golden/fixtures/fire-burst-ignite-warlord.state.json", import.meta.url), "utf8"),
);
const close = (actual, expected) => Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected));

test("an Aura's base Ignite (Flame Focus) puts Ignite on the dummy", () => {
  const types = (igniteBase) =>
    collectEnemyAilments({
      activeNames: new Set(["Fire Burst"]),
      mainName: "Fire Burst",
      auraChance: { ailment: 0, ignite: 10, igniteBase },
    }).types.map((type) => type.name);
  assert.deepEqual(types(true), ["Ignite"]);
  assert.deepEqual(types(false), []);
});

test("Warlord [5,2]'s Fire Infiltration reaches the Fire hits and Ignite once each, and the Config switch removes it", () => {
  const on = calculatePlanner(fireBurst);
  const offState = structuredClone(fireBurst);
  offState.combat.conditionMode = "manual";
  offState.combat.conditions = { ...on.conditions, fireInfiltration: false };
  const off = calculatePlanner(offState);
  assert.equal(on.conditions.fireInfiltration, true);
  assert.ok(on.mechanics.enemyAilments.types.some((type) => type.name === "Ignite"));
  const hit = (planner) => planner.skillHits.find((item) => item.name === "Fire Burst").combat.dps;
  assert.ok(close(hit(on) / hit(off), 1.13));
  assert.ok(close(on.ailments.ignite.combat.factor / off.ailments.ignite.combat.factor, 1.13));
});

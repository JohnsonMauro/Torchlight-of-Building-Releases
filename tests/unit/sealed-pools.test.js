// The Skills board's Sealed Mana / Life are shares of the build's own Max Mana and Max Life (planner.aura.pools, the stat sheet
// the line conditions read), not a captured build's 525 / 2150 (src/app/bridge/skills-view-model.ts reservationView).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { skillsView } from "../../src/app/bridge/skills-view-model.ts";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);

test("the aura ledger carries the build's Max Mana and Max Life", () => {
  const planner = calculatePlanner(youga);
  assert.equal(planner.aura.pools.maxMana, planner.lineEffects.state.stats.maxMana);
  assert.equal(planner.aura.pools.maxLife, planner.lineEffects.state.stats.maxLife);
  assert.notEqual(planner.aura.pools.maxMana, 525);
});

test("Sealed Mana and Life on the Skills board are shown against those pools", () => {
  const planner = calculatePlanner(youga);
  const { mana, life } = skillsView(planner, youga.skills, "auras").reservation;
  const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  assert.ok(mana.sealed.endsWith(` / ${fmt.format(planner.aura.pools.maxMana)}`));
  assert.ok(life.sealed.endsWith(` / ${fmt.format(planner.aura.pools.maxLife)}`));
});

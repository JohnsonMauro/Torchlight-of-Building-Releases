// Main stats (packages/engine/src/skills/main-stats.js): 0.5% additional damage per stat-sheet point of each of a skill's main
// stats, added together, on its hits and on the ailments it inflicts. Until 2026-10-23 Intelligence was a pooled hero memory
// + gear total that every ailment took whatever skill inflicted it (the Scorching Beam hit ledger's reading).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { mainStatParts, mainStatsOf } from "../../packages/engine/src/skills/main-stats.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);

test("a skill's main stats are its Strength, Dexterity and Intelligence tags, 0.5% per point each", () => {
  assert.deepEqual(mainStatsOf(["Spell", "Fire", "Strength", "Intelligence"]), ["Strength", "Intelligence"]);
  assert.deepEqual(mainStatParts(["Strength", "Intelligence"], { strength: 40, dexterity: 99, intelligence: 0 }), [
    { stat: "Strength", value: 20 },
  ]);
  assert.deepEqual(mainStatParts(["Intelligence"], null), []);
});

test("the main skill's hits and its Ignite ledger line read the stat sheet's Intelligence", () => {
  const planner = calculatePlanner(youga);
  const intelligence = planner.lineEffects.state.stats.intelligence;
  const hit = planner.skillHits.find((item) => item.modeled && item.name === "Homing Frost Bolt");
  assert.deepEqual(hit.mainStatParts, [{ stat: "Intelligence", value: 0.5 * intelligence }]);
  const line = planner.igniteLedger.ledger.find((item) => item.category === "Additional main-stat damage");
  assert.equal(line.source, "Homing Frost Bolt main stats (Intelligence; 0.5% per point)");
  assert.equal(line.value, 0.5 * intelligence);
  assert.equal(line.mainSkillScoped, true);
});

test("each inflicting skill's ailments take its own main stats, Intelligence included", () => {
  const planner = calculatePlanner(youga);
  const applier = planner.igniteAppliers.find((item) => item.name === "Homing Frost Bolt");
  const own = applier.scaleSources.find((item) => item.source === "Homing Frost Bolt main stats");
  assert.equal(own.factor, 1 + (0.5 * planner.lineEffects.state.stats.intelligence) / 100);
});

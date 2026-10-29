// Rosa – Unsullied Blade's Mercury Purged revival (packages/engine/src/heroes/rosa/badges.js): each line grants its Baptism
// while the build inflicts that ailment on the dummy (TLIDB keywords Baptism: Impassive / Rage / Indolent).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveHeroModules } from "../../packages/engine/src/heroes/hero-trait-modules.js";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { normalizePlannerState } from "../../packages/engine/src/state/planner-state.ts";
import { switchHeroLoadout } from "../../packages/engine/src/heroes/hero-loadouts.js";
import { revivedAffixLineCoverage } from "../../packages/engine/src/heroes/hero-memory-model.js";
import { exclusiveRevivalLines } from "../../packages/engine/src/heroes/hero-exclusive-revivals.js";

const ROSA = "rosa-unsullied-blade";
const memoryLine = (text) => ({ text, source: "Mercury Purged", origin: "memory", multiplier: 1 });
const IGNITE = "When inflicting Ignite, gains Baptism: Rage for 8s";
const FROSTBITE = "When inflicting Frostbite, gains Baptism: Impassive for 8s";
const NUMBED = "When inflicting Numbed, gains Baptism: Indolent for 8s";

test("Baptism: Rage holds while the build Ignites the dummy", () => {
  const { entries, derived } = resolveHeroModules([memoryLine(IGNITE)], { heroId: ROSA, enemyAilments: ["Ignite"] });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].status, "In calc");
  // The Baptism's "-30% additional Fire Damage taken" is the character's: a derived "damage taken" line would land on the
  // dummy (the hero modules' derive), so only the offensive half joins the build.
  assert.deepEqual(
    derived.map((line) => line.text),
    ["+30% additional damage on Critical Strike"],
  );
  assert.match(entries[0].conditionText, /-30% additional Fire Damage taken/);
});

test("Ignite from the Ignite ledger (igniteOnTarget) holds Baptism: Rage too", () => {
  const { entries } = resolveHeroModules([memoryLine(IGNITE)], {
    heroId: ROSA,
    enemyAilments: [],
    igniteOnTarget: true,
  });
  assert.equal(entries[0].status, "In calc");
});

test("each Baptism needs its own ailment on the dummy", () => {
  const { entries, derived } = resolveHeroModules([memoryLine(FROSTBITE), memoryLine(NUMBED)], {
    heroId: ROSA,
    enemyAilments: ["Frostbite"],
  });
  assert.deepEqual(
    entries.map((entry) => entry.status),
    ["In calc", "Inactive"],
  );
  assert.deepEqual(
    derived.map((line) => line.text),
    ["+60% Skill Area"],
  );
});

test("another loadout does not read Mercury Purged", () => {
  const { entries } = resolveHeroModules([memoryLine(IGNITE)], {
    heroId: "rosa-high-court-chariot",
    enemyAilments: ["Ignite"],
  });
  assert.equal(entries.length, 0);
});

test("the revived memory's lines carry the module's badges in the planner", () => {
  const state = JSON.parse(
    readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
  );
  // A loadout keeps its own equipped memories: the new one starts with none, so one of the inventory goes in.
  state.hero = switchHeroLoadout(state.hero, ROSA);
  const memory = state.hero.memoryInventory.find((item) => item.type === "Memory of Origin");
  state.hero.equippedMemoryIds = { level45: memory.id };
  for (const item of state.hero.memoryInventory) item.revivedAffix = "";
  memory.revivedAffix = "Mercury Purged";
  memory.revivalMethod = "lunarPhase";
  const planner = calculatePlanner(normalizePlannerState(state));
  const lines = exclusiveRevivalLines("Mercury Purged");
  assert.deepEqual(lines, [FROSTBITE, IGNITE, NUMBED]);
  for (const line of lines) {
    const badge = revivedAffixLineCoverage(planner, memory, line);
    assert.notEqual(badge.status, "Not modeled", `${line}: ${badge.reason}`);
  }
});

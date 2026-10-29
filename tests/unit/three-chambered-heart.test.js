// Gemma – Ice-Fire Fusion's Three-Chambered Heart revival: "The Main Skill is supported by a Lv. 40 Advanced Elemental Impact"
// (an item-granted support, packages/engine/data/catalogs/tlidb.js). Its written effect, "+12% additional damage for 2 other types
// of Elemental Damage if the supported skill recently dealt 1 type of Elemental Damage", reaches each Elemental type the Main
// Skill deals while it deals another one (packages/engine/src/supports/support-effects.js otherElementalAdditional).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { normalizePlannerState } from "../../packages/engine/src/state/planner-state.ts";
import { switchHeroLoadout } from "../../packages/engine/src/heroes/hero-loadouts.js";
import { revivedAffixLineCoverage } from "../../packages/engine/src/heroes/hero-memory-model.js";
import { exclusiveRevivalLines } from "../../packages/engine/src/heroes/hero-exclusive-revivals.js";
import { setCoverageContext } from "../../packages/engine/src/text/line-coverage.js";

const GEMMA = "gemma-ice-fire-fusion";
const [GRANT] = exclusiveRevivalLines("Three-Chambered Heart");

function plannerWith({ revived = true, addedFire = false } = {}) {
  const state = JSON.parse(
    readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
  );
  // A loadout keeps its own equipped memories: the new one starts with none, so one of the inventory goes in.
  state.hero = switchHeroLoadout(state.hero, GEMMA);
  const memory = state.hero.memoryInventory.find((item) => item.type === "Memory of Origin");
  state.hero.equippedMemoryIds = { level45: memory.id };
  for (const item of state.hero.memoryInventory) item.revivedAffix = "";
  if (revived) {
    memory.revivedAffix = "Three-Chambered Heart";
    memory.revivalMethod = "lunarPhase";
  }
  if (addedFire) {
    const ring = state.equipmentOverrides.leftRing;
    state.equipmentOverrides.leftRing = {
      ...ring,
      modifiers: [...ring.modifiers, "Adds 100 - 200 Fire Damage to Spells"],
    };
  }
  return { planner: calculatePlanner(normalizePlannerState(state)), memory };
}
const impactLines = (planner) =>
  planner.skillHits[0].ledger.additional.filter((line) => /Advanced Elemental Impact/.test(line.source));

test("a Main Skill dealing Cold and Fire takes +12% additional damage on both", () => {
  const { planner } = plannerWith({ addedFire: true });
  const lines = impactLines(planner);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].value, 12);
  assert.deepEqual([...lines[0].scopeTypes].sort(), ["Cold", "Fire"]);
});

test("a Main Skill dealing one Elemental type gets nothing", () => {
  const { planner } = plannerWith();
  assert.deepEqual(planner.skillHits[0].dealtTypes, ["Cold"]);
  assert.equal(impactLines(planner).length, 0);
});

test("without the revival there is no Advanced Elemental Impact", () => {
  assert.equal(impactLines(plannerWith({ revived: false, addedFire: true }).planner).length, 0);
});

test("the revived line reads In calc when the Main Skill deals two Elemental types", () => {
  const { planner, memory } = plannerWith({ addedFire: true });
  // The app sets the coverage context before it reads a badge (src/app/planner/session.js).
  setCoverageContext(planner);
  try {
    assert.equal(revivedAffixLineCoverage(planner, memory, GRANT).status, "In calc");
  } finally {
    setCoverageContext(null);
  }
});

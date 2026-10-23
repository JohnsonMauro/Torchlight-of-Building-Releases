// The Ignite ledger's skill-scoped lines belong to the build's main skill (packages/engine/src/planner.js ledgerMain), not to the
// inert Lv.20 Scorching Beam stub every build carried until 2026-10-23, and the main skill's supports are counted once: through
// their clauses (build-mechanics.js) and each inflicting skill's applier, never again by the ledger itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { defaultPlannerState, normalizePlannerState } from "../../packages/engine/src/state/planner-state.ts";
import { isMainSkillScoped } from "../../packages/engine/src/ailments/ailment-shared.js";
import {
  tlidbSkillCatalogGenerated,
  tlidbSupportCatalogGenerated,
} from "../../packages/engine/data/catalogs/tlidb-skills-generated.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);

// An empty build with a Fire Burst main skill (the given supports, Lv.20) and Flame Focus (base Ignite and Ignite chance).
function fireBurstBuild(supportNames) {
  const state = structuredClone(defaultPlannerState);
  const setup = (instanceId, name) => {
    const entry = tlidbSkillCatalogGenerated.find((item) => item.name === name);
    return {
      instanceId,
      role: entry.role,
      name,
      baseLevel: 20,
      addedLevels: 0,
      supports: [],
      enabledSupportSlots: 0,
      source: entry.source,
      custom: true,
      ...(entry.sealedManaPercent ? { sealedManaPercent: entry.sealedManaPercent } : {}),
    };
  };
  state.skills.customSetups = [setup("main-1", "Fire Burst"), setup("aura-1", "Flame Focus")];
  state.skills.boardSlots = { skills: ["main-1"], auras: ["aura-1"] };
  state.skills.supportOrder = {
    "main-1": [...supportNames, "", "", "", "", ""].slice(0, 5),
    "aura-1": ["", "", "", "", ""],
  };
  state.skills.customSupports = {
    "main-1": supportNames.map((name) => {
      const entry = tlidbSupportCatalogGenerated.find((item) => item.name === name);
      return {
        name,
        level: 20,
        manaCostMultiplierPercent: entry.manaCostMultiplierPercent,
        effects: structuredClone(entry.effects),
        custom: true,
      };
    }),
  };
  for (const name of supportNames) state.skills.supportEnabled[`main-1:${name}`] = true;
  return calculatePlanner(normalizePlannerState(state));
}

test("the main skill's level past 20 is in the Ignite ledger, marked as the main skill's", () => {
  const line = calculatePlanner(youga).igniteLedger.ledger.find((item) => item.source === "Homing Frost Bolt level 26");
  assert.ok(line);
  assert.equal(line.mainSkillScoped, true);
  assert.ok(isMainSkillScoped(line));
});

test("Additional Ignite's extra stack is counted once, by the main skill's applier", () => {
  const planner = fireBurstBuild(["Additional Ignite"]);
  const ignite = planner.ailments.ignite;
  assert.ok(ignite?.modeled);
  assert.equal(planner.igniteLedger.totals.additionalInflictedStacks, 0);
  assert.equal(ignite.appliers.find((applier) => applier.name === "Fire Burst").extraStacks, 1);
});

test("a Cataclysm on the main skill reaches the Affliction effect of its damage over time", () => {
  const line = fireBurstBuild(["Cataclysm"]).igniteLedger.ledger.find((item) => item.source === "Support: Cataclysm");
  assert.equal(line?.category, "Additional Affliction effect");
  assert.ok(line.value > 0);
});

test("no support line reaches the Ignite ledger twice", () => {
  for (const planner of [
    calculatePlanner(youga),
    fireBurstBuild(["Additional Ignite", "Cataclysm", "Control Spell"]),
  ]) {
    const supportLines = planner.igniteLedger.ledger.filter((line) => /^Support: /.test(line.source));
    const keys = supportLines.map((line) => `${line.category}|${line.source}|${line.text ?? ""}`);
    assert.deepEqual(keys, [...new Set(keys)]);
  }
});

test("a line is the main skill's when it is marked so or comes from a support", () => {
  assert.equal(isMainSkillScoped({ source: "Wilting Beam level 24", mainSkillScoped: true }), true);
  assert.equal(isMainSkillScoped({ source: "Support: Guard" }), true);
  assert.equal(isMainSkillScoped({ source: "Talents" }), false);
});

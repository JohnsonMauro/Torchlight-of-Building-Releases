// Scorch (TLIDB Scorch, read 2026-10-26): "a special Ignite status" that lowers all of the target's Resistances, by 20% in
// Profound and by 30% in Deep Space. Fire's Allure (TLIDB; the game's 引火上身): "Nearby enemies within 10m -10% Fire
// Resistance for each stack of Scorch on them".
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateFiresAllure } from "../../packages/engine/src/skills/fires-allure.js";

const allure = (extra) =>
  calculateFiresAllure({ active: true, limit: 1, canApply: true, baseResistance: 30, ...extra });

test("Scorch lowers the target's resistance by 20 (Profound) unless the Config tab says otherwise", () => {
  const result = allure();
  assert.equal(result.scorchBaseResistanceReductionPercent, 20);
  assert.equal(result.allureFireResistanceReductionPercent, 10);
  assert.equal(result.effectiveResistancePercent, 0);
});

test("Deep Space's Scorch lowers it by 30", () => {
  const result = allure({ scorchResistanceReductionPercent: 30 });
  assert.equal(result.scorchBaseResistanceReductionPercent, 30);
  assert.equal(result.resistanceReductionPercent, 40);
  assert.equal(result.effectiveResistancePercent, -10);
});

test("no Scorch on the target, no reduction", () => {
  assert.equal(allure({ stacks: 0, scorchResistanceReductionPercent: 30 }).resistanceReductionPercent, 0);
});

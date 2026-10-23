// An Ethereal Prism base affix that adds an effect to the panel's core (Haze in the 2026-10-22 game log): the prism keeps the
// line (src/engine/talents/prism-crafting.js prismAddedCoreEffect), it joins the core lines of the panel the prism sits in,
// and its "+1% additional Damage per +5% Movement Speed, up to +12%" reads the Movement Speed total
// (src/engine/text/line-conditions.js perMovementSpeed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { gameIdMapSs14 } from "../../src/data/game-id-map-ss14.generated.js";
import { prismAddedCoreEffect, prismBaseAffixesForBase } from "../../src/engine/talents/prism-crafting.js";
import { resolveLineCondition, splitCondition } from "../../src/engine/text/line-conditions.js";

const HAZE = {
  id: "p1",
  type: "ethereal",
  base: "Haze",
  radiusAffix: "The Effect Area expands to 4x3 Rectangle",
  rareAffix: "",
  legendaryAffix: "",
  baseAffix:
    "Adds an additional effect to the Core Talent on the Any Advanced Talent Panel:\n+1% additional Damage per +5% Movement Speed, up to +12%",
};

test("the added core effect is the base affix's line after the panel; none without one", () => {
  assert.equal(prismAddedCoreEffect(HAZE), "+1% additional Damage per +5% Movement Speed, up to +12%");
  assert.equal(prismAddedCoreEffect({ ...HAZE, baseAffix: "" }), "");
  assert.equal(prismAddedCoreEffect({ ...HAZE, type: "inverse" }), "");
});

test("+1% additional Damage per +5% Movement Speed reads the Movement Speed total, rounded down and capped at +12%", () => {
  const { bodies, condition } = splitCondition(prismAddedCoreEffect(HAZE));
  assert.deepEqual(bodies, ["+1% additional Damage"]);
  assert.equal(resolveLineCondition(condition, { movementSpeedPercent: 42.7 }).factor, 8);
  assert.equal(resolveLineCondition(condition, { movementSpeedPercent: 80 }).factor, 12);
  assert.equal(resolveLineCondition(condition, { movementSpeedPercent: 3 }).active, false);
});

test("a Haze's base affix choices are the id map's added-core-effect base affixes, as the importer stores them", () => {
  // The importer keeps the id map's text with its "\\n" read as a line break (src/game-log/game-log-import.js).
  const imported = Object.values(gameIdMapSs14.affixes)
    .filter(([, text]) => /^Adds an additional effect to the Core Talent/.test(text))
    .map(([, text]) => text.replace(/\\n/g, "\n"));
  assert.deepEqual(prismBaseAffixesForBase("Haze"), imported);
  assert.ok(
    prismBaseAffixesForBase("Haze").every((affix) => prismAddedCoreEffect({ type: "ethereal", baseAffix: affix })),
  );
  assert.deepEqual(prismBaseAffixesForBase("Phantasmagoria"), []);
});

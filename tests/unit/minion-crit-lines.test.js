// Minion crit lines named before the noun ("+10% Minion Critical Strike Rating": talent nodes and the Ethereal Prism "also
// gain" affixes; packages/engine/src/minions/minion-damage-model.js), read like the "… for Minions" wording, and reaching a modeled Magus.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyMinionLine } from "../../packages/engine/src/minions/minion-damage-model.js";
import { calculatePlanner } from "../../packages/engine/src/planner.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);

test("Minion Critical Strike Rating and Damage read as the Minion's crit lines", () => {
  assert.deepEqual(classifyMinionLine("+10% Minion Critical Strike Rating"), {
    kind: "critRating",
    value: 10,
    additional: false,
  });
  assert.deepEqual(classifyMinionLine("+20% Minion Critical Strike Damage"), {
    kind: "critDamage",
    value: 20,
    additional: false,
  });
});

test("the Thunder Magus of the golden Youga build takes the talent nodes' Minion Critical Strike Rating", () => {
  const magus = calculatePlanner(youga).minions.find((minion) => minion.name === "Thunder Magus");
  assert.ok(magus?.modeled);
  assert.ok(magus.lines.critRating.some((line) => /Minion Critical Strike Rating$/.test(line.text)));
});

// Hare's Agility (Ethereal Prism core): "When exiting Stand Still, gains 1 stack of buff that lasts for 2s, up to 5 time(s);
// +14% additional damage dealt to enemies in proximity for each stack of this buff" (game keyword 80000500). One stack per exit
// and 2 s each: walking without stopping holds 1 stack, so the planner holds 1 unless the Config tab says otherwise
// (owner, 2026-10-26; it held the cap of 5 before).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculatePlanner } from "../../packages/engine/src/planner.js";

const fireBurst = JSON.parse(
  readFileSync(new URL("../golden/fixtures/fire-burst-ignite-warlord.state.json", import.meta.url), "utf8"),
);
const close = (actual, expected) => Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected));

function withHaresAgility(stacks) {
  const state = structuredClone(fireBurst);
  const prism = {
    id: "hare",
    type: "ethereal",
    base: "Hare's Agility",
    radiusAffix: "",
    rareAffix: "",
    legendaryAffix: "",
    baseAffix: "",
  };
  state.talents.prismInventory = [prism];
  state.talents.installedPrisms = { Warlord: prism.id };
  state.talents.installedPrismNodes = { Warlord: "2,0" };
  if (stacks !== undefined) state.combat.exitStandStillStacks = stacks;
  return calculatePlanner(state);
}
// Fire Burst is a Spell, so the buff's "+8% Attack Speed" leaves its hits alone and the ratio is the damage term alone.
const fireBurstDps = (planner) => planner.skillHits.find((item) => item.name === "Fire Burst").combat.dps;

test("Hare's Agility holds 1 stack by default: +14% additional damage over none", () => {
  const held = withHaresAgility();
  const none = withHaresAgility(0);
  assert.deepEqual(held.exitStandStill, { maxStacks: 5, heldStacks: 1 });
  assert.ok(close(fireBurstDps(held) / fireBurstDps(none), 1.14));
});

test("Hare's Agility holds the stacks the Config tab sets, up to the line's 5", () => {
  const none = fireBurstDps(withHaresAgility(0));
  assert.ok(close(fireBurstDps(withHaresAgility(5)) / none, 1.7));
  const over = withHaresAgility(9);
  assert.equal(over.exitStandStill.heldStacks, 5);
  assert.ok(close(fireBurstDps(over) / none, 1.7));
});

test("a build without a line that grants the stacks reports none", () => {
  assert.deepEqual(calculatePlanner(structuredClone(fireBurst)).exitStandStill, { maxStacks: 0, heldStacks: 0 });
});

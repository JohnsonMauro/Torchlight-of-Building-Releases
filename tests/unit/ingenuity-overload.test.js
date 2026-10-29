// Bing – Creative Genius's Ingenuity Overload (packages/engine/src/heroes/bing/creative-genius.js, packages/engine/src/skills/skill-hit-model.js;
// owner 2026-10-29: the written text, provisional): 25 Ingenuity per Whimsy Explosion, an Overload at 100, each triggering the
// Main Skill with +200% additional Max Spell Burst charged to the max; Genius Idea Generator's revived line adds +1 Max Spell
// Burst and +60% additional Spell Damage to the triggered cast.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bingState } from "../../packages/engine/src/heroes/bing/creative-genius.js";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { normalizePlannerState } from "../../packages/engine/src/state/planner-state.ts";
import { switchHeroLoadout } from "../../packages/engine/src/heroes/hero-loadouts.js";

const BING = "bing-creative-genius";
const trait = (text) => ({ text, source: "Creative Genius", origin: "trait", multiplier: 1 });
const BASE = [
  "Gains 2 Inspiration Machines that can be powered by Whimsy Essence and Ingenuity Essence respectively. Starts with 0 Whimsy Essence and Ingenuity Essence with an upper limit of 100. Restores 20 Whimsy Essence per second",
  "When Whimsy Essence reaches 100, dealing Spell Damage to an enemy causes Inspiration Machines to use a Whimsy Explosion, inflicting Whimsy Signal on affected enemies",
  "When Ingenuity Essence reaches 100, clicking the Trait Skill causes Inspiration Machines to use Ingenuity Overload",
].map(trait);
const GENIUS = {
  text: "+1 to Max Spell Burst and +60% additional Spell Damage for Spells triggered by Ingenuity Overload",
  source: "Genius Idea Generator",
  origin: "memory",
  multiplier: 1,
};
const overload = (lines, extra = {}) =>
  bingState({ heroId: BING, modifierTexts: lines, dealsSpell: true, maxSpellBurst: 2, ...extra }).overload;

test("one Overload every 20 s: 0.2 Whimsy Explosions per second × 25 Ingenuity ÷ 100", () => {
  const o = overload(BASE);
  assert.equal(o.trigger, "click");
  assert.equal(o.perSecond, 0.05);
});

test("Ingenious Chaos Principle and Law of Ingenuity raise the rate", () => {
  const o = overload([
    ...BASE,
    trait("+20% Ingenuity Essence restoration per Max Spell Burst"),
    trait("Ingenuity Overload has a 45% chance to not consume Ingenuity Essence"),
  ]);
  // 0.2 × 25 × (1 + 20% × 2) ÷ (100 × 0.55)
  assert.ok(Math.abs(o.perSecond - (0.2 * 25 * 1.4) / 55) < 1e-4, String(o.perSecond));
});

test("without the Trait Skill switch only Auto-Ingenuity Program uses it", () => {
  const off = { requestedConditions: { traitSkillOnCooldown: false } };
  assert.equal(overload(BASE, off).perSecond, 0);
  const auto = overload([...BASE, trait("When Ingenuity Essence reaches 100, triggers Ingenuity Overload")], off);
  assert.equal(auto.trigger, "auto");
  assert.equal(auto.perSecond, 0.05);
});

test("Genius Idea Generator's second line is read from the revived memory", () => {
  const o = overload([...BASE, GENIUS]);
  assert.equal(o.maxSpellBurstBonus, 1);
  assert.equal(o.additionalPercent, 60);
});

function bingPlanner({ traitSkill = true, genius = false } = {}) {
  const state = JSON.parse(
    readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
  );
  // A loadout keeps its own equipped memories: the new one starts with none, so one of the inventory goes in.
  state.hero = switchHeroLoadout(state.hero, BING);
  const memory = state.hero.memoryInventory.find((item) => item.type === "Memory of Origin");
  state.hero.equippedMemoryIds = { level45: memory.id };
  for (const item of state.hero.memoryInventory) item.revivedAffix = "";
  if (genius) {
    memory.revivedAffix = "Genius Idea Generator";
    memory.revivalMethod = "lunarPhase";
  }
  state.combat = {
    ...state.combat,
    conditionMode: "manual",
    bestCaseOverrides: { ...state.combat?.bestCaseOverrides, traitSkillOnCooldown: traitSkill },
  };
  return calculatePlanner(normalizePlannerState(state));
}
const mainHit = (planner) =>
  planner.skillHits.find((hit) => hit.name === planner.mainSkill?.name) || planner.skillHits[0];

test("the Overload's casts raise the Main Skill's uses and damage", () => {
  const on = mainHit(bingPlanner());
  const off = mainHit(bingPlanner({ traitSkill: false }));
  assert.ok(on.rate.spellBurst?.overload, "the Overload reaches the Main Skill's Spell Burst");
  assert.ok(on.rate.usesPerSecond > off.rate.usesPerSecond);
  assert.ok(on.combat.dps > off.combat.dps);
});

test("Genius Idea Generator adds +1 Max Spell Burst to the Overload and +60% on the triggered cast", () => {
  const plain = mainHit(bingPlanner()).rate.spellBurst.overload;
  const genius = mainHit(bingPlanner({ genius: true }));
  assert.equal(genius.rate.spellBurst.overload.stacks, plain.stacks + 3);
  assert.ok(genius.ledger.additional.some((line) => line.source === "Genius Idea Generator"));
});

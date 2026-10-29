// Bing – Blast Nova's bombs and Bing's Big Bang Pack (packages/engine/src/heroes/bing/blast-nova.js, packages/engine/src/skills/skill-hit-model.js;
// owner 2026-10-29: the written text, provisional).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { blastNovaBombState } from "../../packages/engine/src/heroes/bing/blast-nova.js";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { normalizePlannerState } from "../../packages/engine/src/state/planner-state.ts";
import { switchHeroLoadout } from "../../packages/engine/src/heroes/hero-loadouts.js";

const BLAST = "bing-blast-nova";
const trait = (text) => ({ text, source: "Blast Nova", origin: "trait", multiplier: 1 });
const BASE = [
  "When using a Non-channeling or Non-Sentry Main Attack Projectile Skill, throw 2 bombs instead",
  "There can be up to 10 undetonated bombs at the same time. Exceeding the limit will detonate the bomb that landed first",
  "Base Bomb Throwing Speed is 1 time per second.",
  "100% of the bonus and additional bonus to Attack Speed is also applied to Bomb Throwing Speed",
  "+20 % additional Bomb Damage",
].map(trait);
const SPARE = {
  text: "When bombs deal damage, they can generate 3 additional Spare Bomb(s), with a chance equal to 35% of the bomb's Critical Strike Chance. -60% additional Spare Bomb Damage",
  source: "Bing's Big Bang Pack",
  origin: "memory",
  multiplier: 1,
};

test("Blast Nova's bomb lines: 2 bombs per throw at 1 per second, +20% additional Bomb Damage", () => {
  const bombs = blastNovaBombState({ heroId: BLAST, modifierTexts: BASE });
  assert.equal(bombs.bombsPerThrow, 2);
  assert.equal(bombs.throwsPerSecondBase, 1);
  assert.equal(bombs.throwFactor, 1);
  assert.deepEqual(
    bombs.additional.map((line) => line.value),
    [20],
  );
});

test("the picks: Blast Barrage's extra bombs, the throwing speed lines, the capped per-bomb bonuses", () => {
  const bombs = blastNovaBombState({
    heroId: BLAST,
    moving: true,
    modifierTexts: [
      ...BASE,
      trait("40% chance to +2 Bomb Quantity when throwing Bombs"),
      trait("+40% additional Bomb Throwing Speed"),
      trait("-27% additional Bomb Throwing Speed while moving"),
      trait("+3% additional Bomb Damage for each bomb recently thrown, up to 27%"),
      trait(
        "+6% additional damage for every bomb on the battlefield when the bombs detonate, up to +60% additional damage.",
      ),
      trait("+55% additional damage to enemies within 10 m around a bomb when it detonates"),
    ],
  });
  assert.equal(bombs.bombsPerThrow, 2.8);
  assert.equal(bombs.throwFactor, Math.round(1.4 * 0.73 * 10000) / 10000);
  assert.deepEqual(
    bombs.additional.map((line) => line.value),
    [20, 27, 60, 55],
  );
  const still = blastNovaBombState({
    heroId: BLAST,
    moving: false,
    modifierTexts: [...BASE, trait("-27% additional Bomb Throwing Speed while moving")],
  });
  assert.equal(still.throwFactor, 1);
});

test("Bing's Big Bang Pack is read from the revived memory", () => {
  const bombs = blastNovaBombState({ heroId: BLAST, modifierTexts: [...BASE, SPARE] });
  assert.deepEqual(
    { count: bombs.spare.count, share: bombs.spare.critSharePercent, additional: bombs.spare.additionalPercent },
    { count: 3, share: 35, additional: -60 },
  );
});

// The golden Youga build's gear with an Attack Projectile Main Skill (Ice Shot) and a Bow in place of its wands.
function iceShot(heroId, { bigBang = false } = {}) {
  const state = JSON.parse(
    readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
  );
  state.hero = switchHeroLoadout(state.hero, heroId);
  const memory = state.hero.memoryInventory.find((item) => item.type === "Memory of Origin");
  state.hero.equippedMemoryIds = { level45: memory.id };
  for (const item of state.hero.memoryInventory) item.revivedAffix = "";
  if (bigBang) {
    memory.revivedAffix = "Bing's Big Bang Pack";
    memory.revivalMethod = "lunarPhase";
  }
  state.skills.customSetups[0] = { ...state.skills.customSetups[0], name: "Ice Shot", source: "" };
  const bow = ["100 - 200 Physical Damage", "500 Critical Strike Rating", "1.5 Attack Speed"];
  // The wand's art does not belong to a Bow: the icon goes.
  const wand = { ...state.equipmentOverrides.mainHand };
  delete wand.icon;
  state.equipmentOverrides.mainHand = {
    ...wand,
    name: "Test Bow",
    base: "Bow",
    baseId: "Bow-Rottenwood-Bow-1-0",
    implicitModifiers: bow,
    modifiers: bow,
    prefixModifiers: [],
    suffixModifiers: [],
    craftAffixFamilyIds: [],
    craftAffixTierIds: [],
    craftAffixLegendary: [],
  };
  delete state.equipmentOverrides.secondaryHand;
  return calculatePlanner(normalizePlannerState(state)).skillHits.find((hit) => hit.name === "Ice Shot");
}

test("the Main Skill's uses are its bombs: 1 throw per second × its Attack Speed bonus × 2", () => {
  const plain = iceShot("youga-the-ultimate-one");
  const bombs = iceShot(BLAST);
  // The Attack Speed bonus is the skill's speed over its weapon's base (1.5 attacks per second).
  assert.ok(Math.abs(bombs.rate.usesPerSecond - (plain.rate.usesPerSecond / 1.5) * 2) < 1e-6);
});

test("Bing's Big Bang Pack adds its Spare Bombs from the bomb's crit chance", () => {
  const hit = iceShot(BLAST, { bigBang: true });
  const spare = hit.ledger.additional.find((line) => line.text.startsWith("Spare Bombs:"));
  const crit = hit.crit.chancePercent / 100;
  assert.ok(Math.abs(spare.value - 3 * Math.min(1, 0.35 * crit) * 0.4 * 100) < 1e-9);
  assert.ok(hit.combat.dps > iceShot(BLAST).combat.dps);
});

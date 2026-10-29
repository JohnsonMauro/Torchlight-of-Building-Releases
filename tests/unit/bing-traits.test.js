// Bing – Creative Genius's Whimsy side (packages/engine/src/heroes/bing-traits.js, hero trait audit B12 first part): the Whimsy
// Explosion cadence, Whimsy Signal on the dummy, Whimsy stacks, and Genius Idea Generator's Whimsy line, read through the hero
// module (packages/engine/src/heroes/hero-trait-modules.js). Trait texts as the game data prints them (the " ," spacing included).
import { test } from "node:test";
import assert from "node:assert/strict";
import { BING_CREATIVE, bingState } from "../../packages/engine/src/heroes/bing-traits.js";
import { resolveHeroModules } from "../../packages/engine/src/heroes/hero-trait-modules.js";
import { exclusiveRevivalState } from "../../packages/engine/src/heroes/hero-exclusive-revivals.js";

const line = (text, source, origin = "trait") => ({ text, source, origin, multiplier: 1 });
const BASE = [
  line(
    "Gains 2 Inspiration Machines that can be powered by Whimsy Essence and Ingenuity Essence respectively. Starts with 0 Whimsy Essence and Ingenuity Essence with an upper limit of 100. Restores 20 Whimsy Essence per second",
    "Hero trait: Creative Genius (Lv 1)",
  ),
  line(
    "When Whimsy Essence reaches 100, dealing Spell Damage to an enemy causes Inspiration Machines to use a Whimsy Explosion , inflicting Whimsy Signal on affected enemies",
    "Hero trait: Creative Genius (Lv 1)",
  ),
  line(
    "When Ingenuity Essence reaches 100, clicking the Trait Skill causes Inspiration Machines to use Ingenuity Overload",
    "Hero trait: Creative Genius (Lv 1)",
  ),
];
const MIND_DOMAIN = line(
  "Whimsy Explosion spawns an energy field. Gains 1 stack of Whimsy for every 0.5s staying in the energy field. Stacks up to 5 time(s)",
  "Hero trait: Mind Domain (Lv 3)",
);
const GENIUS = line(
  "+2 to Whimsy Explosion Projectile Quantity, +100% Whimsy Effect, +40% Whimsy Signal Effect",
  "Hero memory: Memory of Origin",
  "memory",
);
const state = (modifierTexts, extra = {}) =>
  bingState({ heroId: BING_CREATIVE, modifierTexts, dealsSpell: true, mainUsesPerSecond: null, ...extra });

test("Whimsy Signal: 20% × (1 + Whimsy Signal Effect), held when a Whimsy Explosion comes every 5 s", () => {
  const bing = state([...BASE, GENIUS]);
  assert.equal(bing.explosionsPerSecond, 0.2);
  assert.equal(bing.signal.percent, 28);
  assert.equal(bing.signal.uptime, 1);
  assert.equal(bing.signal.value, 28);
});

test("a slower Whimsy Essence recovery lowers the Signal's uptime; Trouble Maker sets its base", () => {
  const slow = state([
    ...BASE,
    line("-10% Whimsy Essence Recovery Speed", "Hero trait: Auto-Ingenuity Program (Lv 1)"),
  ]);
  assert.equal(slow.essencePerSecond, 18);
  assert.equal(slow.signal.uptime, 0.9);
  assert.equal(slow.signal.value, 18);
  const enhanced = state([
    ...BASE,
    line("Effect of Whimsy Signal enhanced to: +65% additional Spell Damage taken", "Hero trait: Trouble Maker (Lv 3)"),
  ]);
  assert.equal(enhanced.signal.percent, 65);
});

test("Whimsy stacks multiply: 5 stacks of 5% × (1 + 100% Whimsy Effect) = +61.051%, off with the energy-field switch", () => {
  const bing = state([...BASE, MIND_DOMAIN, GENIUS]);
  assert.equal(bing.whimsy.stackPercent, 10);
  assert.equal(bing.whimsy.percent, 61.051);
  assert.equal(bing.whimsy.value, 61.051);
  const off = state([...BASE, MIND_DOMAIN, GENIUS], { requestedConditions: { bingInEnergyField: false } });
  assert.equal(off.whimsy.value, 0);
});

test("Flash of Brilliance adds 1 ÷ (interval + 1 ÷ (chance × Main Skill uses)) explosions; no Spell Damage, no explosions", () => {
  const flash = line(
    "Casting a Main Skill has a 25% chance to trigger Whimsy Explosion without consuming Whimsy Essence. Interval: 3 s",
    "Hero trait: Flash of Brilliance (Lv 2)",
  );
  const bing = state([...BASE, flash], { mainUsesPerSecond: 7 });
  assert.equal(bing.flashExplosions, 0.28);
  assert.equal(bing.explosionsPerSecond, 0.48);
  assert.equal(bing.needsRates, true);
  const silent = state([...BASE, flash], { dealsSpell: false, mainUsesPerSecond: 7 });
  assert.equal(silent.explosionsPerSecond, 0);
  assert.equal(silent.signal.value, 0);
});

test("the hero module derives the dummy's Whimsy Signal and your Whimsy, and badges Genius Idea Generator's Whimsy line", () => {
  const modifierTexts = [...BASE, MIND_DOMAIN, GENIUS];
  const { entries, derived } = resolveHeroModules(modifierTexts, {
    heroId: BING_CREATIVE,
    bing: state(modifierTexts),
    requestedConditions: {},
  });
  assert.deepEqual(
    derived.map((item) => [item.text, item.origin]),
    [
      ["+28% additional Spell Damage taken", "derived"],
      ["+61.051% additional Spell Damage", "trait"],
    ],
  );
  const status = (start) => entries.find((item) => item.text.startsWith(start))?.status;
  assert.equal(status("When Whimsy Essence reaches 100"), "In calc");
  assert.equal(status("Whimsy Explosion spawns an energy field"), "In calc");
  assert.equal(status("When Ingenuity Essence reaches 100"), "Not modeled");
  assert.equal(status("+2 to Whimsy Explosion Projectile Quantity"), "Partly modeled");
});

test("Genius Idea Generator: its Whimsy line joins the intake, its Ingenuity Overload line waits for that engine", () => {
  const hero = {
    selectedHeroId: BING_CREATIVE,
    equippedMemoryIds: { level45: "m1" },
    memoryInventory: [{ id: "m1", revivedAffix: "Genius Idea Generator" }],
  };
  const revival = exclusiveRevivalState(hero, hero.memoryInventory[0]);
  assert.deepEqual(revival.intake, [
    "+2 to Whimsy Explosion Projectile Quantity, +100% Whimsy Effect, +40% Whimsy Signal Effect",
  ]);
  assert.equal(revival.lines.find((item) => item.moduleRead)?.text.startsWith("+2 to Whimsy"), true);
  assert.match(revival.lines.find((item) => item.pending)?.pending.engine, /Ingenuity Overload/);
});

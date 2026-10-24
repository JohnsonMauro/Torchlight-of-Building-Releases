// The build's Max Spell Burst (packages/engine/src/skills/max-spell-burst.js) and the Movement Speed that hangs on it, checked
// against a Bing build's character sheet (owner, 2026-10-24): Max Spell Burst 5 and a +44% Movement Speed Bonus.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveMaxSpellBurst } from "../../packages/engine/src/skills/max-spell-burst.js";
import { characterStatTotals } from "../../packages/engine/src/character-stats.js";

const line = (text, source, origin = "gear", multiplier = 1) => ({ text, source, origin, multiplier });
const frozenRipples = [
  line("+11% Movement Speed", "Frozen Ripples"),
  line("+5% Movement Speed per stack of Max Spell Burst , up to +29%", "Frozen Ripples"),
  line("+1 Max Spell Burst when Movement Speed is not higher than 200% of base", "Frozen Ripples"),
];
const bing = [
  line("+2 Max Spell Burst", "Goddess of Knowledge core: Beacon", "core"),
  line("+1 Max Spell Burst", "Hero trait: Creative Genius (Lv 1)", "trait"),
  line(
    "For every 2 Empower or Defensive Skill(s) affecting you, +1 Max Spell Burst . Stacks up to 1 time(s)",
    "Hero trait: Multi-Coupling Equation (Lv 1)",
    "trait",
  ),
  ...frozenRipples,
];

test("Max Spell Burst counts Frozen Ripples while Movement Speed stays at or under 200% of base, and Multi-Coupling per 2 Empower skills", () => {
  // Movement Speed without the per-stack line: +11% − 30% (Necklace of Firebird) + 18% talents + 4% slate + 15.8% memory.
  const result = resolveMaxSpellBurst({ modifierTexts: bing, movementSpeedPercent: 18.8, empowerOrDefensiveSkills: 2 });
  assert.equal(result.total, 5);
  assert.equal(Math.round(result.movementSpeedPercent * 10) / 10, 43.8);
  // One Empower skill: Multi-Coupling gives nothing.
  assert.equal(
    resolveMaxSpellBurst({ modifierTexts: bing, movementSpeedPercent: 18.8, empowerOrDefensiveSkills: 1 }).total,
    4,
  );
});

test("past 200% of base Movement Speed, Frozen Ripples' +1 Max Spell Burst goes and the speed is settled without it", () => {
  const result = resolveMaxSpellBurst({ modifierTexts: bing, movementSpeedPercent: 80, empowerOrDefensiveSkills: 2 });
  // With the line: 5 stacks → 80 + 25 = 105% bonus = 205% of base, over the limit; without it: 4 stacks → 100% = 200%.
  assert.equal(result.total, 4);
  assert.equal(result.movementSpeedPercent, 100);
  assert.equal(result.sources.find((entry) => /200% of base/.test(entry.text)).active, false);
});

test("the stat sheet reads a per-stack-of-Max-Spell-Burst line at the build's total, capped", () => {
  const sheet = (maxSpellBurst) =>
    characterStatTotals({ modifierTexts: frozenRipples, state: {} }, { maxSpellBurst }).byKey.movementSpeed?.value;
  assert.equal(sheet(5), 36);
  assert.equal(sheet(9), 40, "capped at +29%");
  assert.equal(sheet(null), 11, "without a known total the line is left out, as before");
});

import { allSkillEffectsSs13 } from "./data/skills/all-skill-effects-ss13.generated.js";
import { normalizePercentageText } from "./percentage-text.js";

// One table for the curses whose effect on the dummy is "+X% additional <Type> Damage taken by Cursed enemies"
// (gear-pact batch G3 / G5, research/gear-pact-batch-2026-10-12.md §7.2). Read from each curse skill's TLIDB Lv.20 text
// (src/data/skills/all-skill-effects-ss13.generated.js), in either published wording:
//   Timid        — "+39% additional Hit Damage taken by Cursed enemies"
//   Electrocute  — "+39% additional Lightning Damage taken by Cursed enemies"
//   Vulnerability — "+39% additional Physical Damage taken by Cursed enemies" (game data 2026-10-10: char_buff 16060,
//                   affix 200000309 attr 5003 mod 4, GetLevel {1: 20, 21: 40, 41: 50} × GetEffectScale)
//   Biting Cold  — "Cursed enemies +39% additional Cold Damage taken."
//   Corruption   — "Cursed enemies +39% additional Erosion Damage taken."
// The value is scaled by (1 + Curse Effect), as the Vulnerability game record shows (GetEffectScale). Only the Lv.20
// value is sourced (no level table is published for these curses), so other levels use it with a note.
// Scorch (Fire, with its Ignite chance on you) and Entangled Pain (Damage Over Time) keep their dedicated models;
// Ominous (Ill Omen needs enemy Max Life) has no effect on the dummy.
const TAKEN_PATTERNS = [
  /^\+(\d+(?:\.\d+)?)% additional (Hit|Physical|Fire|Cold|Lightning|Erosion) Damage taken by Cursed enemies\.?$/i,
  /^Cursed enemies \+(\d+(?:\.\d+)?)% additional (Hit|Physical|Fire|Cold|Lightning|Erosion) Damage taken\.?$/i
];
export const DEDICATED_CURSE_MODELS = new Set(["Scorch", "Entangled Pain"]);
export const NO_DUMMY_EFFECT_CURSES = { Ominous: "Ill Omen needs enemy Max Life; the dummy has none (the curse still uses a curse slot)" };

/** The "+X% additional <Type> Damage taken" a curse applies (Lv.20 TLIDB text), or null. */
export function curseTakenEffect(name, effects = allSkillEffectsSs13[name] || []) {
  if (DEDICATED_CURSE_MODELS.has(name)) return null;
  for (const line of effects.join("\n").split(/\r?\n/)) {
    const text = normalizePercentageText(line).trim();
    for (const pattern of TAKEN_PATTERNS) {
      const match = text.match(pattern);
      if (match) return { name, value: Number(match[1]), type: match[2][0].toUpperCase() + match[2].slice(1).toLowerCase(), sourceText: text };
    }
  }
  return null;
}

/** The derived enemy-side line for a curse at a Curse Effect, e.g. "+41.34% additional Erosion Damage taken". */
export function curseTakenLine(effect, curseEffectPercent = 0) {
  const value = Math.round(effect.value * (1 + curseEffectPercent / 100) * 100) / 100;
  return { value, text: `+${value}% additional ${effect.type} Damage taken` };
}

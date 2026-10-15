// Named gear affixes whose gear line is only the name (Silent Avowal, and the Vorax Hands donor that copies it): the effect
// lines from the TLIDB keyword tooltips (research/tlidb-legendary-gear.html, research/tlidb-vorax-hands.html), added after the
// name line (frost-terra audit 2026-10-13; before, only the name reached the planner and nothing read it). Its own module (no
// imports) so the block model, the modifier list and the tooltip keyword display share it without an import cycle.
export const NAMED_GEAR_AFFIX_LINES = Object.freeze({
  "Castling": ["Block Chance equals Block Ratio. The Block Ratio for a corresponding damage type equals its Block Chance", "Blocking is not guaranteed"],
  "Cause Without Effect": ["+30% Block Ratio when Attack Block Chance equals Spell Block Chance", "When they differ, the higher one gains Lucky Block"],
  "Wield My Sword": ["+10% Block Ratio and Block Ratio Upper Limit", "+1% additional damage for you and your Minions for every +4% Attack or Spell Block Chance"],
  "Absolve My Sin": ["+10% Block Ratio and Block Ratio Upper Limit", "-1% additional Damage Over Time taken for every +2% Block Ratio owned"]
});

/** The effect lines of a named gear affix line ("Wield My Sword"), or [] when `text` is not one. */
export function namedGearAffixLines(text) {
  return NAMED_GEAR_AFFIX_LINES[String(text ?? "").trim()] || [];
}

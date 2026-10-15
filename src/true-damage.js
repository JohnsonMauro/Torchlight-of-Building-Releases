// True Damage and "damage dealt to Life" bonuses.
//
// Patch notes 2026-10-15: "Most True Damage in the game is no longer affected by bonuses that increase damage dealt to
// Life" (Rotted Taboo, Agony of Lost Self, Thornfield, Thornfield: Retribution, on-kill explosions). In this planner a Reap
// settles the DoT on the dummy as True Damage (CLAUDE.md, Reaping), so the DoT figure a Reap settles drops its
// "+X% additional damage applied to Life" layers; the DoT's own ticks keep them. Ill Omen and Deterioration already take no
// such line. The planner models none of the named items or skills' True Damage (Thornfield is not a modeled hit).
//
// Each "additional damage applied to Life" ledger line is one multiplier in the DoT (the additional layer multiplies line by
// line, src/theoretical-damage.js), so the settled figure is the DoT ÷ Π(1 + value / 100) over those lines.

const DAMAGE_TO_LIFE = /additional damage applied to Life/i;

/** A ledger line that raises damage dealt to Life (talent / slate totals, gear and memory lines, condition "Target Life"). */
export function isDamageToLifeLine(line) {
  if (!line) return false;
  if (line.category && !/^Additional damage$/i.test(line.category)) return false;
  return line.condition === "Target Life" || DAMAGE_TO_LIFE.test(String(line.source || "")) || DAMAGE_TO_LIFE.test(String(line.text || ""));
}

/**
 * The factor a Reap (True Damage) applies to the DoT it settles: 1 ÷ Π(1 + value / 100) over the DoT ledger's
 * "damage applied to Life" lines.
 * @returns {{ scale: number, factor: number, sources: Array<{ source, value }> }}
 */
export function trueDamageSettleScale(ledgerLines = []) {
  const sources = ledgerLines.filter((line) => isDamageToLifeLine(line) && Number(line.value)).map((line) => ({ source: line.source, text: line.text, value: Number(line.value) }));
  const factor = sources.reduce((product, line) => product * (1 + line.value / 100), 1);
  return { scale: factor > 0 ? 1 / factor : 1, factor, sources };
}

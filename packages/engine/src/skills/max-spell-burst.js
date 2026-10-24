// The build's Max Spell Burst and the lines that hang on it. Every reader (the Spell Burst model in skill-hit-model.js, the
// line conditions, the supports, Terra Charges) takes this one total.
//
// - "+N Max Spell Burst" adds N.
// - "+N Max Spell Burst when Movement Speed is not higher than P% of base" (Frozen Ripples) holds while the character's
//   Movement Speed (6.5 m/s × (1 + bonus), game manual) stays at or under P% of the base: (1 + bonus%) ≤ P%.
// - "For every K Empower or Defensive Skill(s) affecting you, +N Max Spell Burst. Stacks up to M time(s)" (Bing's
//   Multi-Coupling Equation) counts the active Empower and Defensive skills (each one up affects you: provisional).
// - "+X% <stat> per stack of Max Spell Burst, up to +Y%" (Frozen Ripples' Movement Speed) reads the total; the Movement Speed
//   it gives can switch the Frozen Ripples line, so the total is settled with the lines that need slow movement on, and
//   those lines go when the speed they allow is passed.
// Checked on a Bing build (owner's character sheet, 2026-10-24): Beacon +2, Creative Genius +1, Frozen Ripples +1 and
// Multi-Coupling +1 make 5, and 5 stacks of Frozen Ripples' +5% Movement Speed close the sheet's +44% Movement Speed Bonus.

const PLAIN = /^\+(\d+) Max Spell Burst$/i;
const WHILE_SLOW = /^\+(\d+) Max Spell Burst when Movement Speed is not higher than (\d+(?:\.\d+)?)% of base$/i;
const PER_SKILLS =
  /^For every (\d+) Empower or Defensive Skill\(s\) affecting you, \+(\d+) Max Spell Burst ?\. Stacks up to (\d+) time\(s\)$/i;
/** "+X% <stat> per stack of Max Spell Burst, up to +Y%": [, X, stat, Y]. */
export const PER_MAX_SPELL_BURST =
  /^\+(\d+(?:\.\d+)?)% (.+?) per stack of Max Spell Burst ?, up to \+?(\d+(?:\.\d+)?)%$/i;

const squash = (text) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .replace(/ %/g, "%")
    .trim();
const times = (line) => (Number.isFinite(line.multiplier) ? line.multiplier : 1);

/** A "per stack of Max Spell Burst" line's bonus at `stacks` stacks, capped: { stat, percent } or null. */
export function perMaxSpellBurstBonus(text, stacks) {
  const match = squash(text).match(PER_MAX_SPELL_BURST);
  if (!match) return null;
  return { stat: match[2], percent: Math.min(Number(match[1]) * Math.max(0, stacks), Number(match[3])) };
}

/**
 * The build's Max Spell Burst: { total, sources: [{ source, text, value, active, reason }], movementSpeedPercent }.
 * @param {object} p
 * @param {object[]} p.modifierTexts the build's lines
 * @param {number} p.movementSpeedPercent the Movement Speed bonus without the "per stack of Max Spell Burst" lines
 * @param {number} p.empowerOrDefensiveSkills active Empower and Defensive skills
 */
export function resolveMaxSpellBurst({
  modifierTexts = [],
  movementSpeedPercent = 0,
  empowerOrDefensiveSkills = 0,
} = {}) {
  const sources = [];
  const slow = [];
  const perStackMovement = [];
  for (const line of modifierTexts) {
    if (line?.origin === "derived") continue;
    const text = squash(line.text);
    let match;
    if ((match = text.match(PLAIN))) {
      sources.push({ source: line.source, text, value: Number(match[1]) * times(line), active: true, reason: "" });
    } else if ((match = text.match(WHILE_SLOW))) {
      slow.push({ line, text, value: Number(match[1]) * times(line), limitPercent: Number(match[2]) });
    } else if ((match = text.match(PER_SKILLS))) {
      const stacks = Math.min(Math.floor(empowerOrDefensiveSkills / Number(match[1])), Number(match[3]));
      sources.push({
        source: line.source,
        text,
        value: stacks * Number(match[2]) * times(line),
        active: stacks > 0,
        reason: `${empowerOrDefensiveSkills} active Empower or Defensive skill(s) (affecting you while up: provisional)`,
      });
    } else if (/^Movement Speed$/i.test(perMaxSpellBurstBonus(text, 0)?.stat || "")) {
      perStackMovement.push(text);
    }
  }
  const base = sources.reduce((sum, entry) => sum + entry.value, 0);
  const speedAt = (total) =>
    movementSpeedPercent +
    perStackMovement.reduce((sum, text) => sum + (perMaxSpellBurstBonus(text, total)?.percent || 0), 0);
  // The slow-movement lines on first; one whose limit the resulting speed passes goes, and the speed is settled again.
  let held = slow;
  for (;;) {
    const speed = speedAt(base + held.reduce((sum, entry) => sum + entry.value, 0));
    const kept = held.filter((entry) => 100 + speed <= entry.limitPercent);
    if (kept.length === held.length) break;
    held = kept;
  }
  const total = base + held.reduce((sum, entry) => sum + entry.value, 0);
  const speed = speedAt(total);
  for (const entry of slow) {
    const active = held.includes(entry);
    sources.push({
      source: entry.line.source,
      text: entry.text,
      value: active ? entry.value : 0,
      active,
      reason: `Movement Speed ${100 + speed}% of base (${active ? "not higher than" : "higher than"} ${entry.limitPercent}%)`,
    });
  }
  return { total, sources, movementSpeedPercent: speed };
}

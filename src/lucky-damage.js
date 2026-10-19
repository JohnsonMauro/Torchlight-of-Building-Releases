// Lucky Damage (game manual "Lucky & Unlucky": a random check or roll is made twice and the more favourable result is kept;
// Very Lucky: three times). One reader for every engine that rolls a damage range: Escalating Affliction's 0.1%–3% per point
// (src/combat-states.js), skill hits' min–max roll (src/skill-hit-model.js) and a skill's own random damage roll such as
// Voltaic Ripple's Voltage "changes randomly between 50% and 150%" (src/skill-dot-model.js, profile.randomRoll).
//
// Scope: the plain lines ("Lucky Damage", "Your damage gains Lucky", "Very Lucky Damage") reach every damage roll. A scoped
// line ("Lucky Lightning Damage", "Lucky Spell Damage", "Hit Damage is Lucky", "Lightning Damage gains Lucky") reaches only
// rolls of that damage type / skill kind; a Hit scope never reaches damage over time.

const TYPES = "Physical|Fire|Cold|Lightning|Erosion";
const KINDS = `${TYPES}|Spell|Attack|Hit`;

export const LUCKY_DAMAGE_PATTERNS = Object.freeze({
  luckyDamage: /^(?:Lucky Damage|Your and Minions' damage gains Lucky|Your damage gains Lucky)$/i,
  veryLuckyDamage: /^Very Lucky Damage$/i,
  luckyCrit: /^Lucky Critical Strike$/i,
  luckyVsNumbed: /^You and Minions deal Lucky Damage against Numbed enemies$/i,
  scopedLuckyDamage: new RegExp(`^(?:(Very )?Lucky (${KINDS}) Damage|(?:Your )?(${KINDS}) Damage (?:is|becomes|gains) (Very )?Lucky)$`, "i")
});

const title = (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

/** The scope of a scoped Lucky line, or null. { kind: "Lightning" | "Spell" | "Attack" | "Hit" | …, rolls: 2 | 3 }. */
export function scopedLuckyLine(text) {
  const match = String(text ?? "").trim().match(LUCKY_DAMAGE_PATTERNS.scopedLuckyDamage);
  if (!match) return null;
  return { kind: title(match[2] || match[3]), rolls: match[1] || match[4] ? 3 : 2 };
}

/**
 * Reads the Lucky lines of a build. `lines` carry `clean` (normalized text); `numbed` says the dummy is Numbed.
 * damageRolls: the unscoped roll count (1 none, 2 Lucky, 3 Very Lucky); scoped: [{ line, kind, rolls }].
 */
export function readLuckyDamage(lines = [], { numbed = false } = {}) {
  const find = (pattern) => lines.filter((line) => pattern.test(line.clean));
  const luckyLines = find(LUCKY_DAMAGE_PATTERNS.luckyDamage), veryLucky = find(LUCKY_DAMAGE_PATTERNS.veryLuckyDamage);
  const luckyCritLines = find(LUCKY_DAMAGE_PATTERNS.luckyCrit), luckyNumbed = find(LUCKY_DAMAGE_PATTERNS.luckyVsNumbed);
  const scoped = lines.map((line) => { const scope = scopedLuckyLine(line.clean); return scope ? { line, ...scope } : null; }).filter(Boolean);
  const damageRolls = veryLucky.length ? 3 : luckyLines.length || (luckyNumbed.length && numbed) ? 2 : 1;
  return { damageRolls, critRolls: luckyCritLines.length ? 2 : 1, luckyLines, veryLucky, luckyCritLines, luckyNumbed, scoped };
}

/**
 * The roll count for one damage roll: the unscoped count, raised by a scoped line whose kind matches.
 * @param {{ damageRolls?: number, scoped?: { kind: string, rolls: number }[] }} lucky the build's Lucky state
 * @param {{ damageType?: string, tags?: string[], hit?: boolean }} target the rolled damage
 */
export function luckyRollsFor(lucky, { damageType = null, tags = [], hit = true } = {}) {
  let rolls = Math.max(1, Number(lucky?.damageRolls) || 1);
  const tagSet = new Set(tags);
  for (const scope of lucky?.scoped || []) {
    const matches = scope.kind === "Hit" ? hit : scope.kind === "Spell" || scope.kind === "Attack" ? tagSet.has(scope.kind) : scope.kind === damageType;
    if (matches) rolls = Math.max(rolls, scope.rolls);
  }
  return rolls;
}

/** Expected value of the best of `rolls` uniform rolls on [min, max]: min + (max − min) × rolls / (rolls + 1). */
export function luckyRollAverage(min, max, rolls = 1) {
  return min + (max - min) * rolls / (rolls + 1);
}

/** Crit chance with Lucky Critical Strike: 1 − (1 − p)^rolls. */
export function luckyCritChance(percent, rolls = 1) {
  const p = Math.max(0, Math.min(1, percent / 100));
  return (1 - (1 - p) ** rolls) * 100;
}

/**
 * A random "X%–Y%" damage roll: the expected value over the midpoint the listed damage already stands for (the plain average).
 * Without Lucky ×1; Lucky on 50%–150% is (50 + 100 × 2/3) ÷ 100 = ×1.1667; Very Lucky ×1.25.
 */
export function randomRollFactor(minPercent, maxPercent, rolls = 1) {
  const midpoint = (minPercent + maxPercent) / 2;
  return midpoint > 0 ? luckyRollAverage(minPercent, maxPercent, rolls) / midpoint : 1;
}

/** One working line for a random roll: the factor and how it was reached. */
export function randomRollNote(label, minPercent, maxPercent, rolls = 1) {
  const factor = randomRollFactor(minPercent, maxPercent, rolls);
  const range = `${label} ${minPercent}–${maxPercent}%`;
  if (rolls <= 1) return { factor, text: `${range}: average ${(minPercent + maxPercent) / 2}% (no Lucky)` };
  return { factor, text: `${range}: ${rolls === 3 ? "Very Lucky → best of three" : "Lucky → best of two"}, ×${Math.round(factor * 10000) / 10000}` };
}

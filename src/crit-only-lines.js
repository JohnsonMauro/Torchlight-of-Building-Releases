import { normalizePercentageText } from "./percentage-text.js";

// "+X% additional damage on Critical Strike" (tower sequences, slates; residual batch A-2): additional damage that only the
// critical hits get, the build-wide form of the supports' crit-only family (research/support-batch-2026-10-12.md B1). It
// multiplies the crit share of a hit: E = (1 - c) + c × critDamage × Π(1 + X%). Hits only: ailments and DoTs never crit
// (user-confirmed 2026-10-09). A skill-type word ("Projectile", "Spell", "Attack", "Melee") scopes it to skills with that tag.
const CRIT_ONLY = /^\+(\d+(?:\.\d+)?)% additional damage on (?:(Projectile|Spell|Attack|Melee|Ranged) )?Critical Strikes?$/i;

/** The rule a line follows ({ value, tag }) or null. */
export function classifyCritOnlyLine(text) {
  const match = normalizePercentageText(String(text ?? "")).replace(/\s+/g, " ").trim().match(CRIT_ONLY);
  return match ? { value: Number(match[1]), tag: match[2] ? match[2][0].toUpperCase() + match[2].slice(1).toLowerCase() : null } : null;
}

/** Crit-only additional lines that reach a hit of a skill with `tags`: [{ source, text, value }]. */
export function critOnlyLinesFor(modifierTexts = [], tags = []) {
  const tagSet = new Set(tags);
  const out = [];
  for (const line of modifierTexts) {
    const rule = classifyCritOnlyLine(line.text);
    if (!rule || (rule.tag && !tagSet.has(rule.tag))) continue;
    const value = rule.value * (line.multiplier ?? 1);
    if (value) out.push({ source: line.source, text: `${line.text} (crit hits only)`, value });
  }
  return out;
}

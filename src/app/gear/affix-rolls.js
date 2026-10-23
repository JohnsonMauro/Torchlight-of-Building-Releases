// Rolled modifier lines: a template's "(min–max)" ranges, the value a roll control starts at, a line resolved with its
// rolls, and the rolls read back from a resolved line. Shared by the equipment crafter (src/app/gear/equipment-craft.ts),
// the item editor and the tooltips (src/app/gear/gear-controller.js). Pure.
import { legendaryModifierSignature } from "#engine";

const RANGE = /\((-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)\)/;
const RANGES = new RegExp(RANGE.source, "g");

export function modifierRollRange(text) {
  const match = text.match(RANGE);
  return match ? { min: Number(match[1]), max: Number(match[2]) } : null;
}
export function modifierRollRanges(text) {
  return [...text.matchAll(RANGES)].map((match) => ({
    min: Number(match[1]),
    max: Number(match[2]),
    token: match[0],
  }));
}
export function modifierRollStep(range) {
  const decimals = Math.max(String(range.min).split(".")[1]?.length || 0, String(range.max).split(".")[1]?.length || 0);
  return decimals ? 1 / 10 ** decimals : 1;
}
export function preferredModifierRoll(range) {
  return range.max <= 0 ? range.min : range.max;
}
export function negativeRollFill(range, value) {
  return range.max === range.min ? 100 : ((range.max - Number(value)) / (range.max - range.min)) * 100;
}
/**
 * The value a range input of `range` holds once set to `value` (the browser's sanitizing: clamped, then snapped to the
 * nearest step from the minimum, the larger one on a tie).
 */
export function snappedModifierRoll(range, value) {
  const step = modifierRollStep(range),
    decimals = String(step).split(".")[1]?.length || 0,
    clamped = Math.min(range.max, Math.max(range.min, Number(value))),
    snapped = range.min + Math.round((clamped - range.min) / step) * step,
    bounded = snapped > range.max ? snapped - step : snapped;
  return Number(bounded.toFixed(decimals));
}
export function resolveModifierRolls(template, values) {
  let index = 0;
  return template
    .replace(RANGES, (match, low, high, offset, whole) => {
      const value = String(values[index++]);
      /* a clause-leading range that spans zero ("(-1–1) Main Skill Level") carries no sign of its own: a positive roll is written "+N" so the signed readers see it */ return Number(
        low,
      ) <= 0 &&
        Number(value) > 0 &&
        !/^[+-]/.test(value) &&
        (offset === 0 || /\n\s*$/.test(whole.slice(0, offset)))
        ? `+${value}`
        : value;
    })
    .replace(/(\d)\s+%/g, "$1%");
}
/** A template resolved at each range's preferred roll. */
export function preferredModifierText(template) {
  const ranges = modifierRollRanges(template);
  return ranges.length ? resolveModifierRolls(template, ranges.map(preferredModifierRoll)) : template;
}
export function resolvedRollValues(template, resolved) {
  const range = new RegExp(RANGE.source, "g"),
    escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"),
    parts = [];
  let cursor = 0,
    match;
  while ((match = range.exec(template))) {
    parts.push(escape(template.slice(cursor, match.index)), "(-?\\d+(?:\\.\\d+)?)");
    cursor = match.index + match[0].length;
  }
  const result = String(resolved || "").match(new RegExp(`^${parts.join("")}${escape(template.slice(cursor))}$`, "i"));
  return result ? result.slice(1).map(Number) : [];
}
export function tierMatchesResolved(tier, resolved) {
  const ranges = modifierRollRanges(tier.template);
  if (!ranges.length)
    return (
      String(tier.template).replace(/\s+/g, " ").trim().toLowerCase() ===
      String(resolved).replace(/\s+/g, " ").trim().toLowerCase()
    );
  const values = resolvedRollValues(tier.template, resolved);
  return (
    legendaryModifierSignature(tier.template) === legendaryModifierSignature(resolved) &&
    values.length === ranges.length &&
    values.every((value, index) => Number.isFinite(value) && value >= ranges[index].min && value <= ranges[index].max)
  );
}
/** A corrosion implicit at `percent` of its roll (its "min" and "max" texts hold the numbers at 0 and 100). */
export function interpolateCorrosionRoll(entry, percent = 100) {
  if (entry.min === entry.max) return entry.min;
  const highs = [...entry.max.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  let i = 0;
  return entry.min.replace(/-?\d+(?:\.\d+)?/g, (raw) => {
    const lo = Number(raw),
      hi = highs[i] ?? lo;
    i += 1;
    const value = lo + (hi - lo) * (Number(percent) / 100);
    return Number.isInteger(lo) && Number.isInteger(hi)
      ? String(Math.round(value))
      : String(Math.round(value * 10) / 10);
  });
}

// Large figures as the planner prints them: full integers like the game meter, and truncated values with a unit word. Pure
// (no DOM), so the calculation's own texts and the panels' markup share them.

export const DASH = "—";

const integerFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
/** Full integer with thousands separators, like the game meter (3,288,448,334,928). */
export function formatRecountInteger(value) {
  return Number.isFinite(value) ? integerFormat.format(Math.round(value)) : DASH;
}

const magnitudes = [
  [1e15, "Quadrillion"],
  [1e12, "Trillion"],
  [1e9, "Billion"],
  [1e6, "Million"],
];
/** Magnitude word shown to the right of a large value (14,913,986,413,374 → "Trillion"); "" below a million. */
export function formatRecountMagnitude(value) {
  if (!Number.isFinite(value)) return "";
  const entry = magnitudes.find(([size]) => Math.abs(value) >= size);
  return entry ? entry[1] : "";
}

const shortUnits = [
  [1e15, "Quadrillion"],
  [1e12, "Trillion"],
  [1e9, "Billion"],
  [1e6, "Million"],
  [1e3, "Thousand"],
];
const shortFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/**
 * Truncated large number: 2 decimals and a unit word (21,839,169,754,254 → "21.84 Trillion"); below 1,000
 * the plain rounded number. A value that rounds up to 1,000 of a unit moves to the next unit (999,999 → "1.00 Million").
 */
export function formatShortNumber(value) {
  if (!Number.isFinite(value)) return DASH;
  const index = shortUnits.findIndex(([size]) => Math.abs(value) >= size);
  if (index < 0) {
    const rounded = Math.round(value);
    return Math.abs(rounded) >= 1000 ? formatShortNumber(Math.sign(value) * 1000) : integerFormat.format(rounded);
  }
  const [size, word] = shortUnits[index];
  const mantissa = (Math.sign(value) * Math.round(Math.abs(value / size) * 100)) / 100;
  if (Math.abs(mantissa) >= 1000 && index > 0)
    return `${shortFormat.format(mantissa / 1000)} ${shortUnits[index - 1][1]}`;
  return `${shortFormat.format(mantissa)} ${word}`;
}

// A cell of a skill or support progression table (TLIDB level columns, src/data/skills): the numbers it holds. Pure, no
// imports: support, aura, Aim and Aegis of Fire readings share it.

/** One progression cell → its numbers ("a/b" fractions, "a,b" pairs), or null when the cell is not numeric. */
export function parseProgressionCell(raw) {
  if (raw == null) return null;
  const parts = String(raw)
    .replace(/−/g, "-")
    .split(",")
    .map((part) => part.trim());
  const values = parts.map((part) => {
    if (!/^[+-]?\d+(?:\.\d+)?(?:\/[+-]?\d+(?:\.\d+)?)?$/.test(part)) return NaN;
    const [top, bottom] = part.split("/").map(Number);
    return bottom ? top / bottom : top;
  });
  return values.length && values.every(Number.isFinite) ? values : null;
}

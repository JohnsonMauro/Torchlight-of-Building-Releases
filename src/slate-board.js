export const SLATE_BOARD_ROWS = [
  [3, 4],
  [2, 3, 4, 5],
  [1, 2, 3, 4, 5, 6],
  [1, 2, 3, 4, 5, 6],
  [2, 3, 4, 5],
  [3, 4],
];
const key = (column, row) => `${column},${row}`;
export const SLATE_BOARD_CELLS = new Set(
  SLATE_BOARD_ROWS.flatMap((columns, row) => columns.map((column) => key(column, row + 1))),
);
export function slateTransformRules(slate) {
  const name = typeof slate === "string" ? slate : slate?.template || slate?.name;
  if (name === "Space Rift" || name === "Residence of Stars") return { rotate: false, flip: false };
  if (name === "Pedigree of Gods") return { rotate: false, flip: true };
  return { rotate: true, flip: true };
}
export function slateOffsets(slate, rotation = 0, flipX = 1, flipY = 1) {
  let cells = (
    slate.shape ||
    Array.from({ length: slate.size?.[1] || 1 }, (_, row) =>
      Array.from({ length: slate.size?.[0] || 1 }, (_, column) => [column, row]),
    ).flat()
  ).map(([column, row]) => [column, row]);
  const turns = (((rotation % 360) + 360) % 360) / 90;
  for (let turn = 0; turn < turns; turn += 1) cells = cells.map(([column, row]) => [-row, column]);
  cells = cells.map(([column, row]) => [column * flipX, row * flipY]);
  const minColumn = Math.min(...cells.map(([column]) => column));
  const minRow = Math.min(...cells.map(([, row]) => row));
  return cells.map(([column, row]) => [column - minColumn, row - minRow]);
}
export function slateSize(slate, rotation = 0, flipX = 1, flipY = 1) {
  const cells = slateOffsets(slate, rotation, flipX, flipY);
  return [Math.max(...cells.map(([column]) => column)) + 1, Math.max(...cells.map(([, row]) => row)) + 1];
}
export function slateCells(slate, placement) {
  if (!placement) return [];
  return slateOffsets(slate, placement.rotation || 0, placement.flipX || 1, placement.flipY || 1).map(
    ([column, row]) => ({ column: placement.column + column, row: placement.row + row }),
  );
}
export function canPlaceSlate(slate, placement, placements, slates) {
  const cells = slateCells(slate, placement);
  if (!cells.length || cells.some((cell) => !SLATE_BOARD_CELLS.has(key(cell.column, cell.row)))) return false;
  if (slate.overlay) return true;
  const occupied = new Set();
  for (const other of slates)
    if (other.id !== slate.id && !other.overlay && placements[other.id])
      for (const cell of slateCells(other, placements[other.id])) occupied.add(key(cell.column, cell.row));
  return cells.every((cell) => !occupied.has(key(cell.column, cell.row)));
}
export function adjacentSlateIds(slate, placements, slates) {
  const own = slateCells(slate, placements[slate.id]);
  if (!own.length) return [];
  const ownKeys = new Set(own.map((cell) => key(cell.column, cell.row)));
  const rule = slate.copyRule || "";
  const direction = rule.includes("above")
    ? "above"
    : rule.includes("below")
      ? "below"
      : rule.includes("on the left")
        ? "left"
        : rule.includes("on the right")
          ? "right"
          : null;
  return slates
    .filter((other) => other.id !== slate.id && placements[other.id])
    .filter((other) =>
      slateCells(other, placements[other.id]).some((cell) => {
        if (direction === "above") return ownKeys.has(key(cell.column, cell.row + 1));
        if (direction === "below") return ownKeys.has(key(cell.column, cell.row - 1));
        if (direction === "left") return ownKeys.has(key(cell.column + 1, cell.row));
        if (direction === "right") return ownKeys.has(key(cell.column - 1, cell.row));
        if (rule)
          return (
            ownKeys.has(key(cell.column - 1, cell.row)) ||
            ownKeys.has(key(cell.column + 1, cell.row)) ||
            ownKeys.has(key(cell.column, cell.row - 1)) ||
            ownKeys.has(key(cell.column, cell.row + 1))
          );
        for (let dc = -1; dc <= 1; dc += 1)
          for (let dr = -1; dr <= 1; dr += 1)
            if ((dc || dr) && ownKeys.has(key(cell.column + dc, cell.row + dr))) return true;
        return false;
      }),
    )
    .map((other) => other.id);
}
// Slates whose effect copies talents from adjacent slates (their tooltip lists the copied affixes).
export const COPY_SLATE_TEMPLATES = ["Sparks of Moth Fire", "When Sparks Set the Prairie Ablaze", "Space Rift"];
export const isCopySlate = (slate) => COPY_SLATE_TEMPLATES.includes(slate?.template || slate?.name);
// Space Rift copies "the Medium Talents, Legendary Medium Talents, and Ultimate Nether King Talents" on the adjacent
// slate on its left (or right, per its rolled rule). Slate talent lines read "Tree: Talent type: effect"; Nether King
// Medium / Legendary Medium nodes count as Medium / Legendary Medium (provisional). Micro, Core and untyped lines
// (captured slates without a talent type) are not copied.
const spaceRiftEligible =
  /^[^:]+:\s*(?:Medium Talent|Legendary Medium Talent|Ultimate Nether King Talent Node|Medium Nether King Talent Node|Legendary Medium Nether King Talent Node):/i;
export const isSpaceRiftCopyable = (affix) => !!affix && !/^Copies?\b/i.test(affix) && spaceRiftEligible.test(affix);
export function copiedSlateAffixes(
  slate,
  placements,
  slates,
  affixesForSlate = (item) => item.fixed || item.affixes || [],
) {
  const template = slate.template || slate.name;
  if (template === "Space Rift") {
    // A copy slate's own copied lines are not "on" it; only its own talents are copied (provisional).
    const neighbors = new Set(adjacentSlateIds(slate, placements, slates));
    return slates
      .filter((item) => neighbors.has(item.id))
      .flatMap((source) =>
        (affixesForSlate(source) || []).filter(isSpaceRiftCopyable).map((affix) => ({ source: source.name, affix })),
      );
  }
  if (template !== "Sparks of Moth Fire" && template !== "When Sparks Set the Prairie Ablaze") return [];
  const lastTalent = (source, visited) => {
    if (visited.has(source.id)) return null;
    const nextVisited = new Set([...visited, source.id]);
    const affix = (affixesForSlate(source) || []).filter(Boolean).at(-1);
    if (affix && !/^Copies?\b/i.test(affix)) return /\bCore Talent\b/i.test(affix) ? null : affix;
    if (!source.copyRule) return null;
    // User-confirmed 2026-10-13: Prairie copies the last talent on an adjacent Space Rift, i.e. the last of Space Rift's
    // own copied list (the list order follows the slate order; the in-game order is unconfirmed).
    if ((source.template || source.name) === "Space Rift") {
      const last = copiedSlateAffixes(source, placements, slates, affixesForSlate).at(-1)?.affix;
      return last && !/\bCore Talent\b/i.test(last) ? last : null;
    }
    const neighbors = new Set(adjacentSlateIds(source, placements, slates));
    return (
      slates
        .filter((item) => neighbors.has(item.id))
        .map((item) => lastTalent(item, nextVisited))
        .filter(Boolean)
        .at(-1) || null
    );
  };
  const neighbors = new Set(adjacentSlateIds(slate, placements, slates));
  return slates
    .filter((item) => neighbors.has(item.id))
    .flatMap((source) => {
      const affix = lastTalent(source, new Set([slate.id]));
      return affix ? [{ source: source.name, affix }] : [];
    });
}

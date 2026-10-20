// Where a dragged or waiting slate lands, from the pointer and the board's rectangles (the planner's rules, moved here with
// the board): the grid has 6 columns of equal cells; a slate released over the grid goes to the cell under its top-left;
// one released beside the grid is parked, kept inside the stage and pushed off the grid's rectangle.
import type { SlatePose } from "@legacy/app/bridge/slates-view-model.ts";

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}
export interface SlateDrop {
  placement: ({ column: number; row: number } & SlatePose) | null;
  parked: ({ x: number; y: number } & SlatePose) | null;
}

const GRID_COLUMNS = 6;
const inside = (rect: Rect, x: number, y: number) =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));
const percent = (value: number, of: number) => Math.round((value / of) * 10000) / 100;

/**
 * A dragged slate let go at (x, y): its top-left started at (originLeft, originTop) and moved with the pointer from
 * (startX, startY). `size` is its width and height in cells in `pose`.
 */
export function dragDrop(
  {
    x,
    y,
    startX,
    startY,
    originLeft,
    originTop,
  }: Record<"x" | "y" | "startX" | "startY" | "originLeft" | "originTop", number>,
  pose: SlatePose,
  size: [number, number],
  board: Rect,
  stage: Rect,
): SlateDrop {
  const cell = board.width / GRID_COLUMNS,
    dx = x - startX,
    dy = y - startY;
  if (inside(board, x, y))
    return {
      placement: {
        column: Math.round((originLeft + dx - board.left) / cell) + 1,
        row: Math.round((originTop + dy - board.top) / cell) + 1,
        ...pose,
      },
      parked: null,
    };
  if (!inside(stage, x, y)) return { placement: null, parked: null };
  const pieceWidth = size[0] * cell,
    pieceHeight = size[1] * cell;
  let left = clamp(originLeft + dx - stage.left, stage.width - pieceWidth),
    top = clamp(originTop + dy - stage.top, stage.height - pieceHeight);
  const boardLeft = board.left - stage.left,
    boardTop = board.top - stage.top;
  if (
    left < boardLeft + board.width &&
    left + pieceWidth > boardLeft &&
    top < boardTop + board.height &&
    top + pieceHeight > boardTop
  ) {
    const alternatives: [number, number][] = [];
    if (boardLeft >= pieceWidth) alternatives.push([boardLeft - pieceWidth, top]);
    if (stage.width - boardLeft - board.width >= pieceWidth) alternatives.push([boardLeft + board.width, top]);
    if (boardTop >= pieceHeight) alternatives.push([left, boardTop - pieceHeight]);
    if (stage.height - boardTop - board.height >= pieceHeight) alternatives.push([left, boardTop + board.height]);
    alternatives.sort((a, b) => (a[0] - left) ** 2 + (a[1] - top) ** 2 - (b[0] - left) ** 2 - (b[1] - top) ** 2);
    if (alternatives.length) [left, top] = alternatives[0];
  }
  return { placement: null, parked: { x: percent(left, stage.width), y: percent(top, stage.height), ...pose } };
}

/** A waiting slate placed by a click at (x, y): the slate is centred on the pointer. */
export function pendingDrop(
  x: number,
  y: number,
  pose: SlatePose,
  size: [number, number],
  board: Rect,
  stage: Rect,
): SlateDrop {
  const cell = board.width / GRID_COLUMNS,
    width = size[0] * cell,
    height = size[1] * cell;
  if (inside(board, x, y))
    return {
      placement: {
        column: Math.round((x - board.left - width / 2) / cell) + 1,
        row: Math.round((y - board.top - height / 2) / cell) + 1,
        ...pose,
      },
      parked: null,
    };
  if (!inside(stage, x, y)) return { placement: null, parked: null };
  return {
    placement: null,
    parked: {
      x: percent(clamp(x - stage.left - width / 2, stage.width - width), stage.width),
      y: percent(clamp(y - stage.top - height / 2, stage.height - height), stage.height),
      ...pose,
    },
  };
}

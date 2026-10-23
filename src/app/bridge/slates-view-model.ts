// What the Divinity Slates board shows: the statue grid's cells, each equipped slate on it and each slate parked beside it,
// with the geometry the CSS lays them out by, the Judgment and copy links, and the board's interaction state (the selected
// slate and its tools, Move mode, a transformed slate waiting to be placed). Pure; the React board
// (apps/web/src/features/slates) renders it and src/app/slates/slates-controller.js publishes it (src/app/bridge/view-sources.ts "slates").
import {
  adjacentSlateIds,
  isJudgmentSlate,
  judgmentAffectedSlateIds,
  SLATE_BOARD_ROWS,
  slateOffsets,
  slateSize,
  slateTransformRules,
} from "#engine";

/** A slate as the planner lists it for the board (src/app/planner/session.js slatesForBoard). Other fields are not read here. */
export interface BoardSlate {
  id: string;
  name: string;
  template?: string;
  copyRule?: string;
  icon?: string;
  cellIcon?: string;
  /** Cells of the slate as [column, row] offsets, or its rectangle size [columns, rows]. */
  shape?: [number, number][];
  size?: [number, number];
}
export interface GridPlacement {
  column: number;
  row: number;
  rotation?: number;
  flipX?: number;
  flipY?: number;
}
/** A parked slate's top-left corner, in percent of the stage. */
export interface ParkedPlacement {
  x: number;
  y: number;
  rotation?: number;
  flipX?: number;
  flipY?: number;
}
export interface SlateBoardUi {
  selectedId: string | null;
  /** Where the tools open (the click that selected the slate, in stage pixels). */
  toolsPosition: { x: number; y: number } | null;
  /** Move mode: the next board cell click places `placementTarget`. */
  editMode: boolean;
  /** A rotated or flipped slate that no longer fit, following the pointer until a click places it. */
  pendingId: string | null;
}
export interface SlatePose {
  rotation: number;
  flipX: number;
  flipY: number;
}
/** Which sides of a tile are on the outline of its slate (where the Judgment glow is drawn). */
export interface TileOutline {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}
export interface SlateTileView {
  column: number;
  row: number;
  outline: TileOutline;
}
export interface SlatePieceView {
  id: string;
  name: string;
  label: string;
  /** Equipped pieces: 1, 2, … in board order; parked pieces: null. */
  number: number | null;
  /** Grid cell of the top-left corner (equipped) or stage position in percent (parked). */
  at: { column: number; row: number } | { x: number; y: number };
  pose: SlatePose;
  width: number;
  height: number;
  baseWidth: number;
  baseHeight: number;
  tiles: SlateTileView[];
  icon: string | null;
  cellIcon: string | null;
  overlay: boolean;
  copy: boolean;
  /** Copy slates: how many slates touch it. */
  adjacentCount: number | null;
  judgmentAffected: boolean;
  copiedByNeighbor: boolean;
  selected: boolean;
  pending: boolean;
  rules: { rotate: boolean; flip: boolean };
  /** The slate's shape, for the live outline while it is dragged (rotated or flipped). */
  shape: Pick<BoardSlate, "shape" | "size">;
}
export interface SlateToolsView {
  id: string;
  name: string;
  x: number;
  y: number;
  rules: { rotate: boolean; flip: boolean };
}
export interface SlatesView {
  cells: { column: number; row: number }[];
  pieces: SlatePieceView[];
  parked: SlatePieceView[];
  tools: SlateToolsView | null;
  editMode: boolean;
}

export interface SlatesViewInput {
  slates: BoardSlate[];
  placements: Record<string, GridPlacement>;
  parked: Record<string, ParkedPlacement>;
  equipped: ReadonlySet<string>;
  ui: SlateBoardUi;
}

const poseOf = (placement: { rotation?: number; flipX?: number; flipY?: number }): SlatePose => ({
  rotation: placement.rotation || 0,
  flipX: placement.flipX || 1,
  flipY: placement.flipY || 1,
});

/** The tiles of a slate in a pose, each with the sides on the slate's outline. */
export function slateTiles(slate: Pick<BoardSlate, "shape" | "size">, pose: SlatePose): SlateTileView[] {
  const offsets = slateOffsets(slate, pose.rotation, pose.flipX, pose.flipY) as [number, number][];
  const occupied = new Set(offsets.map(([column, row]) => `${column},${row}`));
  const free = (column: number, row: number) => !occupied.has(`${column},${row}`);
  return offsets.map(([column, row]) => ({
    column,
    row,
    outline: {
      top: free(column, row - 1),
      right: free(column + 1, row),
      bottom: free(column, row + 1),
      left: free(column - 1, row),
    },
  }));
}

/** Width and height in cells of a slate in a pose. */
export function slateExtent(slate: Pick<BoardSlate, "shape" | "size">, pose: SlatePose): [number, number] {
  return slateSize(slate, pose.rotation, pose.flipX, pose.flipY) as [number, number];
}

export function slatesView({ slates, placements, parked, equipped, ui }: SlatesViewInput): SlatesView {
  const judgment = judgmentAffectedSlateIds(slates, placements, equipped) as Set<string>;
  const copiedByNeighbor = new Set(
    slates
      .filter((slate) => slate.copyRule && placements[slate.id])
      .flatMap((slate) => adjacentSlateIds(slate, placements, slates) as string[]),
  );
  const piece = (slate: BoardSlate, placement: GridPlacement | ParkedPlacement, number: number | null) => {
    const pose = poseOf(placement);
    const [width, height] = slateExtent(slate, pose);
    const [baseWidth, baseHeight] = slateExtent(slate, { rotation: 0, flipX: 1, flipY: 1 });
    const isParked = number === null;
    const rules = slateTransformRules(slate) as { rotate: boolean; flip: boolean };
    return {
      id: slate.id,
      name: slate.name,
      label: isParked
        ? `${slate.name}: parked outside the grid; drag onto the grid to equip`
        : `${slate.name}: hover for affixes`,
      number,
      at: "x" in placement ? { x: placement.x, y: placement.y } : { column: placement.column, row: placement.row },
      pose,
      width,
      height,
      baseWidth,
      baseHeight,
      tiles: slateTiles(slate, pose),
      icon: slate.icon || null,
      cellIcon: slate.cellIcon || null,
      overlay: !isParked && isJudgmentSlate(slate),
      copy: Boolean(slate.copyRule),
      adjacentCount:
        !isParked && slate.copyRule ? (adjacentSlateIds(slate, placements, slates) as string[]).length : null,
      judgmentAffected: !isParked && judgment.has(slate.id),
      copiedByNeighbor: !isParked && copiedByNeighbor.has(slate.id),
      selected: !isParked && ui.selectedId === slate.id,
      pending: ui.pendingId === slate.id,
      rules,
      shape: { shape: slate.shape, size: slate.size },
    } satisfies SlatePieceView;
  };
  const pieces = slates
    .filter((slate) => equipped.has(slate.id) && placements[slate.id])
    .map((slate, index) => piece(slate, placements[slate.id], index + 1));
  const parkedPieces = slates
    .filter((slate) => parked[slate.id] && !equipped.has(slate.id))
    .map((slate) => piece(slate, parked[slate.id], null));
  const selected = slates.find((slate) => slate.id === ui.selectedId);
  const tools =
    selected && (placements[selected.id] || parked[selected.id]) && (equipped.has(selected.id) || parked[selected.id])
      ? {
          id: selected.id,
          name: selected.name,
          x: ui.toolsPosition?.x ?? 8,
          y: ui.toolsPosition?.y ?? 8,
          rules: slateTransformRules(selected) as { rotate: boolean; flip: boolean },
        }
      : null;
  return {
    cells: SLATE_BOARD_ROWS.flatMap((columns: number[], row: number) =>
      columns.map((column) => ({ column, row: row + 1 })),
    ),
    pieces,
    parked: parkedPieces,
    tools,
    editMode: ui.editMode,
  };
}

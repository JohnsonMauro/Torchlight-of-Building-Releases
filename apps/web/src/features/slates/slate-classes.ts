// The Divinity Slates pieces' drawing as utility class lists, picked from each piece's data: its box on the stage, its
// tiles (a warm block per cell without art, a thin frame over the art with it), Judgment's edge, the art and the labels.
// Sizes count in --cell (set on .slate-stage); positions come from the custom properties SlateBoard.tsx writes on the
// piece and its tiles.
import type { SlatePieceView } from "@legacy/app/bridge/slates-view-model.ts";

/** The board panel: the workspace art, veiled in the surface colour so the board reads in both themes. */
export const SLATE_PANEL_ART =
  "bg-surface bg-[image:var(--veil),url(../../../../src/assets/slate-workspace-background.png)] " +
  "bg-[length:auto_calc(100%+240px)] bg-top bg-no-repeat";

/** What a piece looks like right now: its data plus the drag in progress. */
export interface PieceLook {
  piece: SlatePieceView;
  parked: boolean;
  dragged: boolean;
}

// Lifted (dragged, or waiting for a click to place it): above everything, slightly see-through.
const LIFTED = "cursor-grabbing opacity-90";

/** The piece: a box of whole cells, transparent to the pointer except on its tiles. */
export function pieceClasses({ piece, parked, dragged }: PieceLook, stateClasses: string) {
  const place = parked
    ? "left-(--park-x) top-(--park-y)"
    : "left-[calc((var(--slate-column)-1)*var(--cell))] top-[calc((var(--slate-row)-1)*var(--cell))]";
  const layer = piece.pending
    ? "z-24"
    : dragged
      ? "z-20"
      : piece.overlay
        ? "z-6"
        : piece.selected
          ? "z-4"
          : parked
            ? "z-5"
            : "z-2";
  return (
    `${stateClasses} pointer-events-none absolute ${place} ${layer} h-[calc(var(--slate-height)*var(--cell))] ` +
    "w-[calc(var(--slate-width)*var(--cell))] touch-none text-on-accent select-none will-change-transform " +
    (piece.pending || dragged ? LIFTED : "cursor-grab")
  );
}

const JUDGMENT_ART = /nether-king-judgment\.png$/;

/** One tile of the piece (its <i>). */
export function tileClasses({ piece, parked }: PieceLook) {
  const selected = piece.selected ? " outline-2 outline-offset-1 outline-info" : "";
  const copied = piece.copiedByNeighbor && !piece.judgmentAffected ? " ring-2 ring-grade-priceless" : "";
  if (piece.icon) {
    // With art: a thin frame over the cell (pink for a copy or Judgment); the art is drawn once over the whole piece.
    const frame = piece.copy || JUDGMENT_ART.test(piece.icon) ? "border-grade-priceless" : "border-accent/60";
    return (
      "pointer-events-auto absolute top-[calc(var(--piece-row)*var(--cell))] left-[calc(var(--piece-column)*var(--cell))] " +
      `z-2 size-(--cell) border ${frame}${copied}${selected}`
    );
  }
  // Without art: an inset block per cell, warm (pink for a copy, line-edged when parked).
  const look = piece.copy
    ? "border-grade-priceless bg-grade-priceless"
    : `${parked ? "border-line-strong" : "border-accent"} bg-accent-strong`;
  return (
    "pointer-events-auto absolute top-[calc(var(--piece-row)*var(--cell)+3px)] left-[calc(var(--piece-column)*var(--cell)+3px)] " +
    `size-[calc(var(--cell)-6px)] border-2 ${look}${copied}${selected}`
  );
}

// Judgment's reach: an info edge on the sides of an affected tile that face away from the slate.
const EDGE = {
  top: ["after:top-1.5 after:border-t-2", "after:top-0"],
  right: ["after:right-1.5 after:border-r-2", "after:right-0"],
  bottom: ["after:bottom-1.5 after:border-b-2", "after:bottom-0"],
  left: ["after:left-1.5 after:border-l-2", "after:left-0"],
} as const;
const EDGE_BASE =
  "after:pointer-events-none after:absolute after:border-0 after:border-solid after:border-info after:content-['']";

/** The Judgment edge classes of a tile, from the sides of it that face away from the slate. */
export function judgmentEdge(outline: Record<keyof typeof EDGE, boolean>) {
  const sides = (Object.keys(EDGE) as (keyof typeof EDGE)[]).map((side) => EDGE[side][outline[side] ? 0 : 1]);
  return `${EDGE_BASE} ${sides.join(" ")}`;
}

/** The art drawn once over the whole piece, posed by the piece's custom properties. */
export const PIECE_ART =
  "pointer-events-none absolute top-1/2 left-1/2 z-1 h-(--slate-art-height) w-(--slate-art-width) max-w-none object-fill " +
  "[transform:translate(-50%,-50%)_scale(var(--slate-flip-x,1),var(--slate-flip-y,1))_rotate(var(--slate-rotation))]";

export const CELL_ART = "pointer-events-none block size-full object-cover";

/** The labels of a piece without art: its number, name and adjacency count. */
export const LABEL_NUMBER =
  "pointer-events-none absolute top-1.5 left-1.5 z-2 grid size-4.5 place-items-center rounded-full bg-surface " +
  "text-[10px]/none font-black text-text";
export const LABEL_NAME =
  "pointer-events-none absolute top-1/2 right-2 left-2 z-2 -translate-y-1/2 text-center text-[10px]/tight font-semibold";
export const LABEL_COUNT = "pointer-events-none absolute right-2 bottom-1.5 left-2 z-2 text-[10px]/[normal] opacity-80";

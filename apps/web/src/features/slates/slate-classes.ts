// The Divinity Slates pieces' drawing as utility class lists, picked from each piece's data: its box on the stage, its
// tiles (an amber block per cell without art, a thin frame over the art with it), Judgment's glowing edge, the art and
// the labels. Sizes count in --cell (set on .slate-stage); positions come from the custom properties SlateBoard.tsx
// writes on the piece and its tiles.
import type { SlatePieceView } from "@legacy/app/bridge/slates-view-model.ts";

/** The board panel: the workspace art, darkened, behind the board. */
export const SLATE_PANEL_ART =
  "bg-[#0b1c2b] bg-[linear-gradient(rgb(3_8_14/0.48),rgb(3_8_14/0.48)),url(../../../../src/assets/slate-workspace-background.png)] " +
  "bg-[length:auto_calc(100%+240px)] bg-top bg-no-repeat";

/** What a piece looks like right now: its data plus the drag in progress. */
export interface PieceLook {
  piece: SlatePieceView;
  parked: boolean;
  dragged: boolean;
}

// Lifted (dragged, or waiting for a click to place it): above everything, with a drop shadow.
const LIFTED = "cursor-grabbing opacity-92 drop-shadow-[0_12px_16px_rgb(0_0_0/0.6)]";

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
    "w-[calc(var(--slate-width)*var(--cell))] touch-none text-[#fff4df] select-none will-change-transform " +
    (piece.pending || dragged ? LIFTED : "cursor-grab")
  );
}

const JUDGMENT_ART = /nether-king-judgment\.png$/;

/** One tile of the piece (its <i>). */
export function tileClasses({ piece, parked }: PieceLook) {
  const selected = piece.selected;
  if (piece.icon) {
    // With art: a thin frame over the cell; the art is drawn once over the whole piece.
    const pink = piece.copy || JUDGMENT_ART.test(piece.icon);
    const plainShadow =
      !JUDGMENT_ART.test(piece.icon) && !piece.judgmentAffected && !selected && !piece.copiedByNeighbor;
    return (
      "pointer-events-auto absolute top-[calc(var(--piece-row)*var(--cell))] left-[calc(var(--piece-column)*var(--cell))] " +
      "z-2 size-(--cell) border " +
      (pink ? "border-[#d24bc9] " : "border-[rgb(106_70_19/0.95)] ") +
      (!plainShadow
        ? ""
        : piece.copy
          ? "shadow-[inset_0_0_0_1px_rgb(248_93_238/0.22)]"
          : "shadow-[inset_0_0_0_1px_rgb(255_184_58/0.18)]")
    );
  }
  // Without art: an inset block per cell, amber (pink for a copy, grey-edged when parked).
  const look = piece.copy
    ? "border-[#ef50e6] bg-[linear-gradient(145deg,#59244f,#211522)]"
    : `${parked ? "border-[#718394]" : "border-[#d88727]"} bg-[linear-gradient(145deg,rgb(240_139_32/0.9),rgb(91_44_10/0.97))]`;
  const glow = piece.judgmentAffected
    ? ""
    : piece.copiedByNeighbor
      ? "shadow-[inset_0_0_20px_rgb(241_80_230/0.4),0_0_0_2px_rgb(241_80_230/0.5),0_0_18px_rgb(241_80_230/0.45)]"
      : parked
        ? "shadow-[inset_0_0_12px_rgb(255_255_255/0.12),0_5px_16px_#0008]"
        : "shadow-[inset_0_0_18px_rgb(255_198_72/0.28),0_4px_14px_rgb(0_0_0/0.35)]";
  return (
    "pointer-events-auto absolute top-[calc(var(--piece-row)*var(--cell)+3px)] left-[calc(var(--piece-column)*var(--cell)+3px)] " +
    `size-[calc(var(--cell)-6px)] border-2 ${look} ${glow}` +
    (selected ? " outline-2 outline-offset-1 outline-[#61e5ec]" : "")
  );
}

// Judgment's reach: a glowing cyan edge on the sides of an affected tile that face away from the slate.
const EDGE = {
  top: ["after:top-1.5 after:border-t-2", "after:top-0"],
  right: ["after:right-1.5 after:border-r-2", "after:right-0"],
  bottom: ["after:bottom-1.5 after:border-b-2", "after:bottom-0"],
  left: ["after:left-1.5 after:border-l-2", "after:left-0"],
} as const;
const EDGE_BASE =
  "after:pointer-events-none after:absolute after:border-0 after:border-solid after:border-[#8bf2ff] after:content-[''] " +
  "after:[filter:drop-shadow(0_0_3px_#4bd9f4)_drop-shadow(0_0_5px_rgb(69_222_250/0.65))]";

/** The Judgment edge classes of a tile, from the sides of it that face away from the slate. */
export function judgmentEdge(outline: Record<keyof typeof EDGE, boolean>) {
  const sides = (Object.keys(EDGE) as (keyof typeof EDGE)[]).map((side) => EDGE[side][outline[side] ? 0 : 1]);
  return `${EDGE_BASE} ${sides.join(" ")}`;
}

/** The art drawn once over the whole piece, posed by the piece's custom properties. */
export const pieceArt = (piece: SlatePieceView) =>
  "pointer-events-none absolute top-1/2 left-1/2 z-1 h-(--slate-art-height) w-(--slate-art-width) max-w-none object-fill " +
  "[transform:translate(-50%,-50%)_scale(var(--slate-flip-x,1),var(--slate-flip-y,1))_rotate(var(--slate-rotation))] " +
  (piece.copy || piece.copiedByNeighbor
    ? "drop-shadow-[0_0_3px_rgb(220_66_210/0.9)]"
    : "drop-shadow-[0_0_2px_rgb(255_167_38/0.9)]");

export const CELL_ART = "pointer-events-none block size-full object-cover";

/** The labels of a piece without art: its number, name and adjacency count. */
export const LABEL_NUMBER =
  "pointer-events-none absolute top-1.5 left-1.75 z-2 grid size-4.5 place-items-center rounded-full bg-[#ffc14d] " +
  "text-[0.62rem]/none font-[850] text-[#211306]";
export const LABEL_NAME =
  "pointer-events-none absolute top-1/2 right-2 left-2 z-2 -translate-y-1/2 text-center text-[0.62rem]/[1.12] " +
  "[text-shadow:0_1px_3px_#000]";
export const LABEL_COUNT =
  "pointer-events-none absolute right-2 bottom-1.75 left-2 z-2 text-[0.55rem]/[normal] text-[#ffd7fa]";

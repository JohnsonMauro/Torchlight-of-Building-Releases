// Where the tooltip sits, kept inside the window: below and right of the point it opened at (or the pointer it follows),
// left of it when its width does not fit on the right; or beside its element (left of it when it fits, else right),
// level with its top. The keywords' explanations shown beside it while Alt is held sit on its side away from the pointer.
import type { TooltipRequest } from "./tooltip-store";

const POINTER_GAP = 18,
  BESIDE_GAP = 12,
  MARGIN = 10,
  BOTTOM_MARGIN = 12;

/** Places `tooltip` for `request`, the pointer being at (x, y). */
export function placeTooltip(tooltip: HTMLElement, request: TooltipRequest, x: number, y: number): void {
  const [left, top] = request.placement === "beside" ? besideAnchor(tooltip, request.anchor) : byPointer(tooltip, x, y);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function byPointer(tooltip: HTMLElement, x: number, y: number): [number, number] {
  // Its own width (each kind has its own): right of the pointer when it fits, else left of it.
  const width = tooltip.offsetWidth;
  const left =
    x + POINTER_GAP + width <= window.innerWidth - MARGIN
      ? x + POINTER_GAP
      : Math.min(x - POINTER_GAP - width, window.innerWidth - width - MARGIN);
  const top = Math.min(window.innerHeight - tooltip.offsetHeight - BOTTOM_MARGIN, y + POINTER_GAP);
  return [Math.max(MARGIN, left), Math.max(MARGIN, top)];
}

function besideAnchor(tooltip: HTMLElement, anchor: HTMLElement): [number, number] {
  const box = anchor.getBoundingClientRect(),
    width = tooltip.offsetWidth;
  const left =
    box.left - width - BESIDE_GAP >= MARGIN
      ? box.left - width - BESIDE_GAP
      : Math.min(window.innerWidth - width - MARGIN, box.right + BESIDE_GAP);
  const top = Math.min(
    Math.max(MARGIN, box.top),
    Math.max(MARGIN, window.innerHeight - tooltip.offsetHeight - BOTTOM_MARGIN),
  );
  return [Math.max(MARGIN, left), top];
}

/** Places the keywords' explanations (`notes`) beside the placed `tooltip`, the pointer being at x. */
export function placeBesideTooltip(notes: HTMLElement, tooltip: HTMLElement, x: number): void {
  const box = tooltip.getBoundingClientRect();
  notes.style.left = `${besideTooltipLeft(box, notes.offsetWidth, x, window.innerWidth)}px`;
  notes.style.top = `${Math.max(MARGIN, Math.min(box.top, window.innerHeight - notes.offsetHeight - BOTTOM_MARGIN))}px`;
}

/**
 * The left edge of a `width` wide panel beside a tooltip spanning `main`: on the tooltip's far side from the pointer (x)
 * when it fits there, else on its near side, else as far that way as the window allows.
 */
export function besideTooltipLeft(
  main: { left: number; right: number },
  width: number,
  x: number,
  viewportWidth: number,
): number {
  const right = main.right + BESIDE_GAP,
    left = main.left - BESIDE_GAP - width;
  const fitsRight = right + width <= viewportWidth - MARGIN,
    fitsLeft = left >= MARGIN;
  const away = main.left >= x ? "right" : "left";
  if (away === "right" ? fitsRight : fitsLeft) return away === "right" ? right : left;
  if (away === "right" ? fitsLeft : fitsRight) return away === "right" ? left : right;
  return away === "right" ? Math.max(MARGIN, viewportWidth - width - MARGIN) : MARGIN;
}

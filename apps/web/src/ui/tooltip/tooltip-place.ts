// Where the tooltip sits, kept inside the window: below and right of the point it opened at (or the pointer it follows),
// left of it when its width does not fit on the right; or beside its element (left of it when it fits, else right),
// level with its top.
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

// Where the tooltip sits: below and right of the point it opened at (or the pointer it follows), kept inside the window.

const GAP = 18,
  MARGIN = 10,
  BOTTOM_MARGIN = 12,
  /** The frame's widest size plus its margin: the tooltip never starts closer than this to the right edge. */
  RIGHT_RESERVE = 370;

export function placeTooltip(tooltip: HTMLElement, x: number, y: number): void {
  const left = Math.min(window.innerWidth - RIGHT_RESERVE, x + GAP);
  const top = Math.min(window.innerHeight - tooltip.offsetHeight - BOTTOM_MARGIN, y + GAP);
  tooltip.style.left = `${Math.max(MARGIN, left)}px`;
  tooltip.style.top = `${Math.max(MARGIN, top)}px`;
}

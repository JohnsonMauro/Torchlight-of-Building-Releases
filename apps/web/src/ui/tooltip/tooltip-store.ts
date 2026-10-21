// The one tooltip on the page at a time: what it is about (its anchor), what it shows and where it opened. A <Tooltip>
// shows and hides it; TooltipHost renders it. The last request stays after a hide, so the tooltip fades out with its
// content.
import { useSyncExternalStore, type ReactNode } from "react";

/** What a tooltip shows: its content and the frame's look. */
export interface TooltipBody {
  body: ReactNode;
  /** The frame's kind classes (tooltip-classes.ts: "qol-help-tooltip", "gear-tooltip six-affix"…). */
  kind?: string;
  /** The frame's rarity colours and art (its data-rarity). */
  rarity?: string;
  /** A talent's type (micro, medium, legendary, core, prism-core): the frame's colour (its data-talent-type). */
  talentType?: string;
  /** "pointer": beside the pointer, following it; "beside": beside its element (an Inventory card), left if it fits. */
  placement?: "pointer" | "beside";
}

export interface TooltipRequest extends TooltipBody {
  /** The element the tooltip is about. */
  anchor: HTMLElement;
  /** Where it opened: the pointer, or the focused element's top right corner. */
  x: number;
  y: number;
  /** The pointer may move into it (it stays a moment after the anchor is left) and it does not follow the pointer. */
  sticky: boolean;
}

interface TooltipState {
  request: TooltipRequest | null;
  shown: boolean;
}

let state: TooltipState = { request: null, shown: false };
const listeners = new Set<() => void>();
let hideTimer = 0;
// Hovers right after a scroll are ignored: the scroll moved the page under a still pointer.
let quietUntil = 0;

function publish(next: TooltipState): void {
  state = next;
  for (const listener of listeners) listener();
}

export function showTooltip(request: TooltipRequest): void {
  clearTimeout(hideTimer);
  publish({ request, shown: true });
}

/** Hides the tooltip; with `anchor`, only when it is that element's. */
export function hideTooltip(anchor?: HTMLElement): void {
  clearTimeout(hideTimer);
  if (!state.shown || (anchor && state.request?.anchor !== anchor)) return;
  publish({ ...state, shown: false });
}

/** Hides the tooltip shortly, so the pointer can reach a sticky one. */
export function hideTooltipSoon(anchor: HTMLElement): void {
  clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => hideTooltip(anchor), 180);
}

export function cancelTooltipHide(): void {
  clearTimeout(hideTimer);
}

/** Whether the tooltip shows and is `anchor`'s. */
export function tooltipShownFor(anchor: HTMLElement): boolean {
  return state.shown && state.request?.anchor === anchor;
}

/** A scroll hides the tooltip and quiets hovers for a moment. */
export function tooltipScrolled(): void {
  quietUntil = performance.now() + 160;
  hideTooltip();
}

export function hoversQuiet(): boolean {
  return performance.now() < quietUntil;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTooltipState(): TooltipState {
  return useSyncExternalStore(subscribe, () => state);
}

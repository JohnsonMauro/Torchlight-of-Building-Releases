// Dragging a slate on the Divinity Slates board. A drag starts after 4 px and moves the piece itself. While the button is
// held the slate can change pose: a right-click rotates it clockwise (Pedigree of Gods, which only flips, flips it
// horizontally), the middle / back button flips it horizontally and the forward button vertically, A / D rotate and W / S
// flip (src/app/slate-shortcuts.js), and the wheel flips it (down: horizontally). The click that follows a drop is
// swallowed, so it does not also select the slate.
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { slateShortcutAction } from "@legacy/app/slate-shortcuts.js";
import type { SlatePose } from "@legacy/app/bridge/slates-view-model.ts";

export interface SlateDragSource {
  id: string;
  pose: SlatePose;
  rules: { rotate: boolean; flip: boolean };
}
export interface SlateDragEnd {
  id: string;
  pose: SlatePose;
  x: number;
  y: number;
  startX: number;
  startY: number;
  originLeft: number;
  originTop: number;
}
export interface SlateDragHandlers {
  onStart: () => void;
  onDrop: (end: SlateDragEnd) => void;
  onCancel: () => void;
}
interface Drag extends SlateDragSource {
  pointerId: number;
  startX: number;
  startY: number;
  originLeft: number;
  originTop: number;
  moved: boolean;
  lastWheelAt: number;
}
/** The dragged piece as it is drawn: its id, offset from where it started, and its current pose. */
export interface SlateDragView {
  id: string;
  dx: number;
  dy: number;
  pose: SlatePose;
  moved: boolean;
}

const START_DISTANCE = 4;
const WHEEL_QUIET_MS = 80;
// Mouse buttons that flip a dragged slate: middle (1), back (3), forward (4, vertical).
const FLIP_BUTTONS = [1, 3, 4];

export function useSlateDrag(handlers: SlateDragHandlers) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });
  const drag = useRef<Drag | null>(null);
  const swallowNextClick = useRef(false);
  const [view, setView] = useState<SlateDragView | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  /** Rotates or flips the dragged slate when its rules allow; true when it changed. */
  const transform = useCallback((change: { rotate: number } | { flip: string }) => {
    const current = drag.current;
    if (!current) return false;
    if ("rotate" in change) {
      if (!current.rules.rotate) return false;
      current.pose.rotation = (current.pose.rotation + change.rotate * 90 + 360) % 360;
    } else {
      if (!current.rules.flip) return false;
      const key = change.flip === "y" ? "flipY" : "flipX";
      current.pose[key] = -current.pose[key];
    }
    current.moved = true;
    latest.current.onStart();
    setView((state) => ({
      id: current.id,
      dx: state?.dx ?? 0,
      dy: state?.dy ?? 0,
      pose: { ...current.pose },
      moved: true,
    }));
    return true;
  }, []);

  const finish = useCallback((event: PointerEvent, cancelled: boolean) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    drag.current = null;
    cleanup.current?.();
    setView(null);
    if (!current.moved) return;
    swallowNextClick.current = true;
    setTimeout(() => {
      swallowNextClick.current = false;
    }, 0);
    if (cancelled) return latest.current.onCancel();
    latest.current.onDrop({
      id: current.id,
      pose: current.pose,
      x: event.clientX,
      y: event.clientY,
      startX: current.startX,
      startY: current.startY,
      originLeft: current.originLeft,
      originTop: current.originTop,
    });
  }, []);

  const start = useCallback(
    (event: ReactPointerEvent<HTMLElement>, source: SlateDragSource) => {
      if (event.button !== 0 || drag.current) return;
      event.preventDefault();
      const element = event.currentTarget;
      element.setPointerCapture?.(event.pointerId);
      const rect = element.getBoundingClientRect();
      drag.current = {
        ...source,
        pose: { ...source.pose },
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originLeft: rect.left,
        originTop: rect.top,
        moved: false,
        lastWheelAt: 0,
      };
      const move = (moveEvent: PointerEvent) => {
        const current = drag.current;
        if (!current || moveEvent.pointerId !== current.pointerId) return;
        const dx = moveEvent.clientX - current.startX,
          dy = moveEvent.clientY - current.startY;
        if (!current.moved && Math.hypot(dx, dy) >= START_DISTANCE) {
          current.moved = true;
          latest.current.onStart();
        }
        if (!current.moved) return;
        moveEvent.preventDefault();
        setView({ id: current.id, dx, dy, pose: { ...current.pose }, moved: true });
      };
      // Caught at the window before the slate under the pointer sees it (a right-click there removes the slate).
      const contextMenu = (menuEvent: MouseEvent) => {
        menuEvent.preventDefault();
        menuEvent.stopPropagation();
        const rules = drag.current?.rules;
        if (rules?.rotate) transform({ rotate: 1 });
        else if (rules?.flip) transform({ flip: "x" });
      };
      const mouseDown = (downEvent: MouseEvent) => {
        if (!FLIP_BUTTONS.includes(downEvent.button)) return;
        downEvent.preventDefault();
        transform({ flip: downEvent.button === 4 ? "y" : "x" });
      };
      const quietButton = (buttonEvent: MouseEvent) => {
        if (FLIP_BUTTONS.includes(buttonEvent.button)) buttonEvent.preventDefault();
      };
      const keyDown = (keyEvent: KeyboardEvent) => {
        const action = slateShortcutAction(keyEvent) as { rotate?: number; flip?: string } | null;
        if (!action) return;
        if (action.rotate ? transform({ rotate: action.rotate }) : transform({ flip: action.flip ?? "x" }))
          keyEvent.preventDefault();
      };
      const up = (upEvent: PointerEvent) => finish(upEvent, false);
      const cancel = (cancelEvent: PointerEvent) => finish(cancelEvent, true);
      window.addEventListener("pointermove", move);
      window.addEventListener("contextmenu", contextMenu, true);
      window.addEventListener("mousedown", mouseDown);
      window.addEventListener("mouseup", quietButton);
      window.addEventListener("auxclick", quietButton);
      window.addEventListener("keydown", keyDown);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);
      cleanup.current = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("contextmenu", contextMenu, true);
        window.removeEventListener("mousedown", mouseDown);
        window.removeEventListener("mouseup", quietButton);
        window.removeEventListener("auxclick", quietButton);
        window.removeEventListener("keydown", keyDown);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancel);
        cleanup.current = null;
      };
    },
    [finish, transform],
  );

  /** The wheel during a drag flips the slate (at most every 80 ms); true when a drag took the wheel event. */
  const wheel = useCallback(
    (event: WheelEvent) => {
      const current = drag.current;
      if (!current) return false;
      event.preventDefault();
      const now = performance.now();
      if (now - current.lastWheelAt < WHEEL_QUIET_MS) return true;
      current.lastWheelAt = now;
      transform({ flip: (event.deltaY || event.deltaX) >= 0 ? "x" : "y" });
      return true;
    },
    [transform],
  );

  return {
    start,
    wheel,
    view,
    dragging: () => drag.current !== null,
    /** True, once, for the click that ends a drag. */
    swallowClick: () => {
      const swallow = swallowNextClick.current;
      swallowNextClick.current = false;
      return swallow;
    },
  };
}

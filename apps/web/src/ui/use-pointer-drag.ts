// Dragging an element with the pointer onto a drop target the view knows by key. A drag starts after 5 px; a ghost made
// from the element follows the pointer, or, without one, the element itself does. While the button is held, the browser's
// own drag of an image in the element is cancelled (it would cancel the pointer and end the drag), and a right-click
// is caught at the window before the element under the pointer sees it (it would open or remove something there): it
// turns the move into a copy (copyOnRightClick) or does nothing. The click that follows a drop, and the context menu after
// a copy, are swallowed, so they do not also act on the drop target.
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export interface PointerDragOptions<S> {
  /** The key of the drop target at the element under the pointer, or null where a drop is not allowed. */
  targetAt: (element: Element | null, source: S) => string | null;
  /** A right-click during the drag copies instead of moving. */
  copyOnRightClick?: boolean;
  /** Makes the ghost that follows the pointer (placed by its left/top at the pointer). */
  ghost?: (element: HTMLElement) => HTMLElement;
  /** A class the body carries while a drag is under way. */
  bodyClass?: string;
  onStart: () => void;
  onDrop: (source: S, target: string, copy: boolean) => void;
  onInvalidDrop: (source: S) => void;
}
interface Drag<S> {
  key: string;
  source: S;
  pointerId: number;
  element: HTMLElement;
  startX: number;
  startY: number;
  moved: boolean;
  copy: boolean;
  target: string | null;
  ghost: HTMLElement | null;
}

const START_DISTANCE = 5;
const CLICK_QUIET_MS = 400;
const CONTEXT_MENU_QUIET_MS = 300;

const dropTargetAt = <S>(options: PointerDragOptions<S>, x: number, y: number, source: S) =>
  options.targetAt(document.elementFromPoint(x, y), source);

export function usePointerDrag<S>(options: PointerDragOptions<S>) {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });
  const drag = useRef<Drag<S> | null>(null);
  const quietClickUntil = useRef(0);
  const quietContextMenuUntil = useRef(0);
  const [view, setView] = useState<{ source: string | null; target: string | null; copy: boolean }>({
    source: null,
    target: null,
    copy: false,
  });
  // Removes the window listeners and the body class of the drag in progress.
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  const finish = useCallback((event: PointerEvent, cancelled: boolean) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    if (!cancelled && event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = null;
    cleanup.current?.();
    current.ghost?.remove();
    current.element.style.transform = "";
    setView({ source: null, target: null, copy: false });
    if (current.copy) quietContextMenuUntil.current = performance.now() + CONTEXT_MENU_QUIET_MS;
    if (!current.moved) return;
    quietClickUntil.current = performance.now() + CLICK_QUIET_MS;
    const target = cancelled ? null : dropTargetAt(latest.current, event.clientX, event.clientY, current.source);
    if (target !== null) latest.current.onDrop(current.source, target, current.copy);
    else latest.current.onInvalidDrop(current.source);
  }, []);

  const start = useCallback(
    (event: ReactPointerEvent<HTMLElement>, key: string, source: S) => {
      if (event.button !== 0 || drag.current) return;
      const element = event.currentTarget;
      element.setPointerCapture?.(event.pointerId);
      drag.current = {
        key,
        source,
        pointerId: event.pointerId,
        element,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        copy: false,
        target: null,
        ghost: null,
      };
      const move = (moveEvent: PointerEvent) => {
        const current = drag.current;
        if (!current || moveEvent.pointerId !== current.pointerId) return;
        const dx = moveEvent.clientX - current.startX,
          dy = moveEvent.clientY - current.startY;
        if (!current.moved && Math.hypot(dx, dy) >= START_DISTANCE) {
          current.moved = true;
          const { ghost, bodyClass } = latest.current;
          if (bodyClass) document.body.classList.add(bodyClass);
          if (ghost) {
            current.ghost = ghost(current.element);
            if (current.copy) current.ghost.classList.add("copying");
            document.body.append(current.ghost);
          }
          setView((state) => ({ ...state, source: current.key }));
          latest.current.onStart();
        }
        if (!current.moved) return;
        moveEvent.preventDefault();
        if (current.ghost) {
          current.ghost.style.left = `${moveEvent.clientX}px`;
          current.ghost.style.top = `${moveEvent.clientY}px`;
        } else current.element.style.transform = `translate(${dx}px, ${dy}px)`;
        const target = dropTargetAt(latest.current, moveEvent.clientX, moveEvent.clientY, current.source);
        if (target !== current.target) {
          current.target = target;
          setView((state) => ({ ...state, target }));
        }
      };
      const makeCopy = (current: Drag<S>) => {
        if (!latest.current.copyOnRightClick || current.copy) return;
        current.copy = true;
        current.ghost?.classList.add("copying");
        setView((state) => ({ ...state, copy: true }));
      };
      const rightButton = (downEvent: PointerEvent) => {
        if (drag.current && downEvent.button === 2) {
          downEvent.preventDefault();
          downEvent.stopPropagation();
          makeCopy(drag.current);
        }
      };
      const contextMenu = (menuEvent: MouseEvent) => {
        if (drag.current) {
          menuEvent.preventDefault();
          menuEvent.stopPropagation();
          makeCopy(drag.current);
        }
      };
      const nativeDrag = (dragEvent: DragEvent) => dragEvent.preventDefault();
      const up = (upEvent: PointerEvent) => finish(upEvent, false);
      const cancel = (cancelEvent: PointerEvent) => finish(cancelEvent, true);
      window.addEventListener("pointermove", move);
      window.addEventListener("dragstart", nativeDrag, true);
      window.addEventListener("pointerdown", rightButton, true);
      window.addEventListener("contextmenu", contextMenu, true);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);
      window.addEventListener("lostpointercapture", cancel);
      cleanup.current = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("dragstart", nativeDrag, true);
        window.removeEventListener("pointerdown", rightButton, true);
        window.removeEventListener("contextmenu", contextMenu, true);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancel);
        window.removeEventListener("lostpointercapture", cancel);
        const { bodyClass } = latest.current;
        if (bodyClass) document.body.classList.remove(bodyClass);
        cleanup.current = null;
      };
    },
    [finish],
  );

  return {
    start,
    /** The element being dragged (its key; null after a right-click turned the drag into a copy). */
    source: view.copy ? null : view.source,
    /** The drop target under the pointer. */
    target: view.target,
    /** True, once, for the click right after a drop (within 400 ms). */
    swallowClick: () => {
      const swallow = performance.now() < quietClickUntil.current;
      quietClickUntil.current = 0;
      return swallow;
    },
    /** True for the context menu right after a copy. */
    swallowContextMenu: () => performance.now() < quietContextMenuUntil.current,
  };
}

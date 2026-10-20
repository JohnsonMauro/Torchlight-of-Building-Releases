// Dragging an equipped Kismet to another slot of the same kind (Kismet slot mode). A drag starts after 5 px; a right-click
// during it turns the move into a copy. The drop target must be an allocated node or an extra Fate slot of the same kind.
// The click (and, after a copy, the context menu) that follows the drop is swallowed, so it does not also act on the slot.
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { KismetKind } from "@legacy/app/bridge/pacts-view-model.ts";

export interface DragSource {
  key: string;
  kind: KismetKind;
  icon: string;
}
export interface DropSlot {
  kind: KismetKind | null;
  droppable: boolean;
}
interface Drag extends DragSource {
  pointerId: number;
  element: HTMLElement;
  startX: number;
  startY: number;
  moved: boolean;
  copy: boolean;
  target: string | null;
  ghost: HTMLElement | null;
}
export interface KismetDragHandlers {
  /** Where a drop would land (the slot key under the pointer). */
  slotAt: (key: string) => DropSlot | undefined;
  onStart: () => void;
  onDrop: (source: DragSource, target: string, copy: boolean) => void;
  onInvalidDrop: () => void;
}

const START_DISTANCE = 5;
const CLICK_QUIET_MS = 400;
const CONTEXT_MENU_QUIET_MS = 300;

export function useKismetDrag(handlers: KismetDragHandlers) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });
  const drag = useRef<Drag | null>(null);
  const quietClickUntil = useRef(0);
  const quietContextMenuUntil = useRef(0);
  const [view, setView] = useState<{ source: string | null; target: string | null; copy: boolean }>({
    source: null,
    target: null,
    copy: false,
  });
  // Removes the window listeners of the drag in progress.
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  const targetAt = (x: number, y: number, kind: KismetKind): string | null => {
    const key = (document.elementFromPoint(x, y)?.closest(".pact-tree-node[data-kismet-node]") as HTMLElement | null)
      ?.dataset.kismetNode;
    const slot = key ? latest.current.slotAt(key) : undefined;
    return key && slot?.kind === kind && slot.droppable ? key : null;
  };

  const makeCopy = (current: Drag) => {
    current.copy = true;
    current.ghost?.classList.add("copying");
    setView((state) => ({ ...state, copy: true }));
  };

  const finish = useCallback((event: PointerEvent, cancelled: boolean) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    if (!cancelled && event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = null;
    cleanup.current?.();
    current.ghost?.remove();
    setView({ source: null, target: null, copy: false });
    if (current.copy) quietContextMenuUntil.current = performance.now() + CONTEXT_MENU_QUIET_MS;
    if (!current.moved) return;
    quietClickUntil.current = performance.now() + CLICK_QUIET_MS;
    const target = cancelled ? null : targetAt(event.clientX, event.clientY, current.kind);
    if (target) latest.current.onDrop(current, target, current.copy);
    else latest.current.onInvalidDrop();
  }, []);

  const start = useCallback(
    (event: ReactPointerEvent<HTMLElement>, source: DragSource) => {
      if (event.button !== 0 || drag.current) return;
      const element = event.currentTarget;
      element.setPointerCapture?.(event.pointerId);
      drag.current = {
        ...source,
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
        const distance = Math.hypot(moveEvent.clientX - current.startX, moveEvent.clientY - current.startY);
        if (!current.moved && distance >= START_DISTANCE) {
          current.moved = true;
          const ghost = document.createElement("div");
          ghost.className = "kismet-drag-ghost";
          ghost.innerHTML = `<img src="${current.icon}" alt=""><b>+</b>`;
          ghost.style.width = `${current.element.offsetWidth}px`;
          ghost.style.height = `${current.element.offsetHeight}px`;
          document.body.append(ghost);
          current.ghost = ghost;
          setView({ source: current.key, target: null, copy: false });
          latest.current.onStart();
        }
        if (!current.moved || !current.ghost) return;
        moveEvent.preventDefault();
        current.ghost.style.left = `${moveEvent.clientX - current.ghost.offsetWidth / 2}px`;
        current.ghost.style.top = `${moveEvent.clientY - current.ghost.offsetHeight / 2}px`;
        const target = targetAt(moveEvent.clientX, moveEvent.clientY, current.kind);
        if (target !== current.target) {
          current.target = target;
          setView((state) => ({ ...state, target }));
        }
      };
      // A right-click during the drag copies instead of moving (pointerdown of the right button, or its context menu).
      // Caught at the window before the slot under the pointer sees it, which would open the Kismet crafter.
      const rightButton = (downEvent: PointerEvent) => {
        if (drag.current?.moved && downEvent.button === 2) {
          downEvent.preventDefault();
          downEvent.stopPropagation();
          makeCopy(drag.current);
        }
      };
      const contextMenu = (menuEvent: MouseEvent) => {
        if (drag.current?.moved) {
          menuEvent.preventDefault();
          menuEvent.stopPropagation();
          makeCopy(drag.current);
        }
      };
      const up = (upEvent: PointerEvent) => finish(upEvent, false);
      const cancel = (cancelEvent: PointerEvent) => finish(cancelEvent, true);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerdown", rightButton, true);
      window.addEventListener("contextmenu", contextMenu, true);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);
      window.addEventListener("lostpointercapture", cancel);
      cleanup.current = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerdown", rightButton, true);
        window.removeEventListener("contextmenu", contextMenu, true);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancel);
        window.removeEventListener("lostpointercapture", cancel);
        cleanup.current = null;
      };
    },
    [finish],
  );

  return {
    start,
    /** The slot being dragged from (null after a right-click turned the drag into a copy) and the slot under the pointer. */
    source: view.copy ? null : view.source,
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

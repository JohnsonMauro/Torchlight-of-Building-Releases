import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAltHeld } from "../use-alt-held";
import { PLANNER_TOOLTIP } from "./tooltip-classes";
import { placeTooltip } from "./tooltip-place";
import { cancelTooltipHide, hideTooltip, tooltipScrolled, useTooltipState } from "./tooltip-store";

/**
 * The page's tooltip (what a <Tooltip> shows): placed where it opened or beside its element, following the pointer
 * (unless sticky), placed again when Alt changes its content, hidden by any scroll outside it. Inside a modal dialog it
 * renders in that dialog, so it shows over the modal.
 */
export function TooltipHost() {
  const { request, shown } = useTooltipState();
  const altHeld = useAltHeld();
  const tooltip = useRef<HTMLDivElement>(null);
  // Where the pointer last was, so a change of content (Alt) places the tooltip there again.
  const pointer = useRef({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!shown || !request || !tooltip.current) return;
    pointer.current = { x: request.x, y: request.y };
    placeTooltip(tooltip.current, request, request.x, request.y);
  }, [shown, request]);

  useLayoutEffect(() => {
    if (shown && request && tooltip.current)
      placeTooltip(tooltip.current, request, pointer.current.x, pointer.current.y);
  }, [altHeld, shown, request]);

  useEffect(() => {
    if (!shown || !request || request.sticky) return;
    let frame = 0;
    const follow = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (tooltip.current) placeTooltip(tooltip.current, request, event.clientX, event.clientY);
      });
    };
    document.addEventListener("pointermove", follow);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", follow);
    };
  }, [shown, request]);

  useEffect(() => {
    const scrolled = (event: Event) => {
      if (event.target instanceof Node && tooltip.current?.contains(event.target)) return;
      tooltipScrolled();
    };
    window.addEventListener("scroll", scrolled, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", scrolled, { capture: true });
  }, []);

  const host = request?.anchor.closest("dialog") ?? document.body;
  return createPortal(
    <div
      ref={tooltip}
      className={`${PLANNER_TOOLTIP} ${request?.kind ?? ""} ${shown ? "visible" : ""}`}
      data-rarity={request?.rarity}
      data-talent-type={request?.talentType}
      role="tooltip"
      aria-hidden={!shown}
      onPointerEnter={cancelTooltipHide}
      onPointerLeave={(event) => {
        if (request && !(event.relatedTarget instanceof Node && request.anchor.contains(event.relatedTarget)))
          hideTooltip(request.anchor);
      }}
    >
      {request?.body}
    </div>,
    host,
  );
}

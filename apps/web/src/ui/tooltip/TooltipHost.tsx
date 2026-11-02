import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gameKeywordsExplained } from "#engine";
import { createPortal } from "react-dom";
import { KeywordNotes } from "../KeywordNotes";
import { useAltHeld } from "../use-alt-held";
import { InTooltip } from "./in-tooltip";
import { KEYWORDS_HEADING, PLANNER_TOOLTIP } from "./tooltip-classes";
import { placeBesideTooltip, placeTooltip } from "./tooltip-place";
import { cancelTooltipHide, hideTooltip, tooltipScrolled, useTooltipState, type TooltipRequest } from "./tooltip-store";

/**
 * The page's tooltip (what a <Tooltip> shows): placed where it opened or beside its element, following the pointer
 * (unless sticky), placed again when Alt changes its content, hidden by any scroll or press outside it. Inside a modal
 * dialog it renders in that dialog, so it shows over the modal. The game keywords its text names (KeywordText's
 * data-keyword) are explained under it (KeywordNotes), read from the rendered text once it is on the page; while Alt is
 * held (the tooltip's long form) they move to a panel beside it, on its side away from the pointer, so the tooltip grows
 * sideways instead of past the bottom of the window (owner, 2026-11-02: a tooltip cannot be scrolled).
 */
export function TooltipHost() {
  const { request, shown } = useTooltipState();
  const altHeld = useAltHeld();
  const tooltip = useRef<HTMLDivElement>(null);
  // Where the pointer last was, so a change of content (Alt) places the tooltip there again.
  const pointer = useRef({ x: 0, y: 0 });
  const body = useRef<HTMLDivElement>(null);
  const aside = useRef<HTMLElement>(null);
  const [notes, setNotes] = useState<{ request: TooltipRequest | null; ids: number[] }>({ request: null, ids: [] });
  const keywords = notes.request === request ? notes.ids : [];
  const keywordsBeside = altHeld && keywords.length > 0;
  // The tooltip where the pointer is, and the keywords' panel beside it when shown.
  const place = useCallback(
    (x: number, y: number) => {
      if (!request || !tooltip.current) return;
      placeTooltip(tooltip.current, request, x, y);
      if (aside.current) placeBesideTooltip(aside.current, tooltip.current, x);
    },
    [request],
  );

  // The keywords in the text as shown (Alt can change it), less the one a keyword's own tooltip is about.
  useLayoutEffect(() => {
    const root = body.current;
    if (!request || !root) return;
    const ids = (selector: string, attribute: string) =>
      [...root.querySelectorAll<HTMLElement>(selector)].map((element) => Number(element.dataset[attribute]));
    const title = ids("[data-keyword-title]", "keywordTitle");
    const next = gameKeywordsExplained(ids("[data-keyword]", "keyword")).filter((id) => !title.includes(id));
    setNotes((current) =>
      current.request === request && current.ids.join() === next.join() ? current : { request, ids: next },
    );
  }, [request, altHeld]);

  useLayoutEffect(() => {
    if (!shown || !request || !tooltip.current) return;
    pointer.current = { x: request.x, y: request.y };
    place(request.x, request.y);
  }, [shown, request, place]);

  useLayoutEffect(() => {
    if (shown && request) place(pointer.current.x, pointer.current.y);
  }, [altHeld, shown, request, notes, place]);

  useEffect(() => {
    if (!shown || !request || request.sticky) return;
    let frame = 0;
    const follow = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        place(event.clientX, event.clientY);
      });
    };
    document.addEventListener("pointermove", follow);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", follow);
    };
  }, [shown, request, place]);

  // A press anywhere but in the tooltip hides it: an edit, a drag or a dialog starts with one, and would leave the
  // tooltip showing what the element was. Caught before any handler can stop it, and done once the press is through:
  // the press focuses its element (which shows the tooltip again), and a toggle's own press reads the state first.
  useEffect(() => {
    let timer = 0;
    const pressed = (event: PointerEvent) => {
      if (event.target instanceof Node && tooltip.current?.contains(event.target)) return;
      clearTimeout(timer);
      timer = window.setTimeout(() => hideTooltip());
    };
    document.addEventListener("pointerdown", pressed, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", pressed, true);
    };
  }, []);

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
    <>
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
        <InTooltip value>
          <div ref={body} className="contents">
            {request?.body}
          </div>
          {keywords.length && !keywordsBeside ? <KeywordNotes ids={keywords} /> : null}
        </InTooltip>
      </div>
      {keywordsBeside ? (
        <aside
          ref={aside}
          className={`${PLANNER_TOOLTIP} keyword-tooltip ${shown ? "visible" : ""}`}
          aria-label="Keywords"
          aria-hidden={!shown}
        >
          <InTooltip value>
            <strong className={KEYWORDS_HEADING}>Keywords</strong>
            <KeywordNotes ids={keywords} />
          </InTooltip>
        </aside>
      ) : null}
    </>,
    host,
  );
}

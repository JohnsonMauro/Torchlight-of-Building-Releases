import { useLayoutEffect, useRef } from "react";
import { hideTooltip } from "./tooltip/tooltip-store";
import { HelpButton } from "./HelpButton";
import { sectionTitleClass } from "./section-card";
import { useBuildTabs, moveTab } from "./build-tabs";
import {
  BUILD_TAB,
  BUILD_TAB_DRAGGED,
  BUILD_TAB_STRIP,
  BUILD_TAB_TARGET,
  BUILD_TAB_UNDERLINE,
  buildTabButton,
} from "./build-tab-classes";
import { usePointerDrag } from "./use-pointer-drag";
import { useWorkspace } from "./use-workspace";

interface UnderlinePlace {
  x: number;
  y: number;
  width: number;
}
// Where the underline last stood. Each section has its own strip, so a switch shows another strip: it starts its
// underline here and slides it to its open tab.
let lastPlace: UnderlinePlace | null = null;
// Its width is its own, not a scale: a 1 px bar stretched by scaleX is rasterized at whole device pixels first, so at
// 150% display scaling (1.5 device px rounded to 2) it came out a third wider than the tab (2026-10-22).
const placeBar = (bar: HTMLElement, place: UnderlinePlace) => {
  bar.style.transform = `translate(${place.x}px, ${place.y}px)`;
  bar.style.width = `${place.width}px`;
};

const samePlace = (a: UnderlinePlace | null, b: UnderlinePlace | null) =>
  a !== null && b !== null && a.x === b.x && a.y === b.y && a.width === b.width;

/**
 * Keeps the strip's underline under its open tab: slid from the last place on a switch or a reorder, moved at once when
 * the open tab's place or size changes otherwise (the strip resized or wrapped, a label's width changed).
 */
function useUnderline(view: string, order: unknown) {
  const strip = useRef<HTMLElement>(null);
  const underline = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const nav = strip.current;
    const bar = underline.current;
    if (!nav || !bar) return;
    // A hidden strip (another section is open) has no layout to measure.
    const measure = (): UnderlinePlace | null => {
      const tab = nav.querySelector<HTMLElement>(`[data-build-tab="${view}"]`);
      if (!tab || nav.offsetParent === null) return null;
      return { x: tab.offsetLeft, y: tab.offsetTop + tab.offsetHeight - 2, width: tab.offsetWidth };
    };
    let shown: UnderlinePlace | null = null;
    const show = (next: UnderlinePlace, from: UnderlinePlace | null) => {
      bar.style.transition = "none";
      placeBar(bar, from ?? next);
      bar.getBoundingClientRect();
      bar.style.transition = "";
      placeBar(bar, next);
      bar.style.opacity = "1";
      shown = next;
      lastPlace = next;
    };
    const first = measure();
    if (first) show(first, lastPlace);
    const observer = new ResizeObserver(() => {
      const next = measure();
      if (next && !samePlace(next, shown)) show(next, null);
    });
    observer.observe(nav);
    for (const tab of nav.querySelectorAll("[data-build-tab]")) observer.observe(tab);
    return () => observer.disconnect();
  }, [view, order]);
  return { strip, underline };
}

/**
 * The strip at the top of each build section: the build's tabs in the user's order, the open one lit and underlined
 * (label and "?"), each with its "?" beside its label. A tab dragged by its label onto another takes its place. A tab
 * opens its section through the planner's click handler (data-view); the click that ends a drag is stopped before it
 * gets there.
 */
export function BuildTabs() {
  const tabs = useBuildTabs();
  const open = useWorkspace();
  const { strip, underline } = useUnderline(open.view, tabs);
  const drag = usePointerDrag<string>({
    targetAt: (element, view) => {
      const target = element?.closest<HTMLElement>("[data-build-tab]")?.dataset.buildTab;
      return target && target !== view ? target : null;
    },
    onStart: () => hideTooltip(),
    onDrop: (view, target) => moveTab(view, target),
    onInvalidDrop: () => undefined,
  });
  return (
    <nav ref={strip} className={BUILD_TAB_STRIP} aria-label="Build tabs">
      {tabs.map((tab) => {
        const isOpen = open.view === tab.view;
        return (
          <div
            key={tab.view}
            className={`${BUILD_TAB} ${drag.source === tab.view ? BUILD_TAB_DRAGGED : ""} ${drag.target === tab.view ? BUILD_TAB_TARGET : ""}`}
            data-build-tab={tab.view}
          >
            <button
              type="button"
              className={`${buildTabButton(isOpen)} ${sectionTitleClass}`}
              data-view={tab.view}
              aria-current={isOpen ? "page" : undefined}
              onPointerDown={(event) => drag.start(event, tab.view, tab.view)}
              onClick={(event) => {
                if (drag.swallowClick()) event.stopPropagation();
              }}
            >
              {tab.label}
            </button>
            <HelpButton topic={tab.help} label={tab.label} />
          </div>
        );
      })}
      <span ref={underline} className={BUILD_TAB_UNDERLINE} aria-hidden="true" />
    </nav>
  );
}

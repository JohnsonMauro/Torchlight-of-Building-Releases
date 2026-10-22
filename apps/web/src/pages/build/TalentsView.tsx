import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { buildSectionPlace, sectionCardClass } from "../../ui/section-card";
import { BuildTabs } from "../../ui/BuildTabs";
import { SlatePanel } from "../../features/slates/SlatePanel";
import {
  PrismPlacementPrompt,
  TalentPanelBar,
  TalentStage,
  TalentTabs,
  TalentThresholds,
} from "../../features/talents/TalentTree";
import { familyTint } from "../../ui/talent-slate-styles";
import { useViewSource } from "../../ui/use-view-source";
import { useViewOpen } from "../../ui/use-workspace";

/** The slate board is never shorter than this; a taller talent tree gives it its own height. */
const MIN_SLATE_HEIGHT = 650;

/** The talent tree's height while it shows (rounded up), so the slate board can take its place at the same height. */
function useTreeHeight(slateMode: boolean): [RefObject<HTMLDivElement | null>, number] {
  const layout = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const element = layout.current;
    if (slateMode || !element) return;
    // A hidden tree (another tab is open) measures 0: keep the height it last had.
    const observer = new ResizeObserver(() => {
      const measured = Math.ceil(element.getBoundingClientRect().height);
      if (measured > 0) setHeight(measured);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [slateMode]);
  return [layout, height];
}

export function TalentsView() {
  const open = useViewOpen("talents");
  const talents = useViewSource("talents");
  const slateMode = talents?.slateMode ?? false;
  const [treeLayout, treeHeight] = useTreeHeight(slateMode);
  const slateHeight: CSSProperties | undefined = slateMode
    ? { height: `${Math.max(MIN_SLATE_HEIGHT, treeHeight)}px` }
    : undefined;
  return (
    // The Talent tab (src/app/planner/workspace.js "talents"): the build tabs over the whole section, then the talent
    // trees beside the open tree's panel; under 760px they stack. The Slates tab shows the slate board in place of the
    // open tree.
    <section id="talents-view" hidden={!open} className={`${sectionCardClass} ${buildSectionPlace}`}>
      <BuildTabs />
      <div className="grid grid-cols-[230px_minmax(0,1fr)] items-start gap-3 p-3 max-[1100px]:grid-cols-[205px_minmax(0,1fr)] max-[760px]:block min-[1500px]:grid-cols-[minmax(230px,13fr)_minmax(700px,63fr)]">
        <div
          id="talent-board-tabs"
          className="talent-board-tabs grid grid-cols-1 grid-rows-[repeat(5,minmax(min-content,1fr))_auto] gap-2.5 leading-[normal] max-[1100px]:flex max-[1100px]:flex-col max-[1100px]:gap-2 max-[760px]:mb-3 min-[1100px]:self-stretch"
          role="tablist"
          aria-label="Talent boards"
        >
          <TalentTabs />
        </div>
        <div
          ref={treeLayout}
          className={`talent-layout min-w-0 leading-[normal] ${slateMode ? "block overflow-hidden" : "grid min-[1100px]:self-stretch"}`}
          style={slateHeight}
        >
          {slateMode && <SlatePanel />}
          <section
            hidden={slateMode}
            className={`talent-tree-panel relative min-h-127.5 min-w-0 rounded-md border border-line bg-(--talent-emblem)/12 p-3 ${familyTint(talents?.familyClass ?? "")} max-[1100px]:overflow-x-auto max-[760px]:min-h-0 min-[1100px]:flex min-[1100px]:h-full min-[1100px]:flex-col`}
          >
            <TalentPanelBar />
            <PrismPlacementPrompt />
            <div className="talent-stage-wrap pt-2.5 min-[1100px]:flex min-[1100px]:min-h-0 min-[1100px]:flex-1 min-[1100px]:flex-col">
              <TalentThresholds />
              <TalentStage />
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

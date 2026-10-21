import { buildSectionPlace } from "../../ui/section-card";
import {
  CoreTalents,
  PrismPlacementPrompt,
  TalentBoardHeading,
  TalentStage,
  TalentTabs,
} from "../../features/talents/TalentTree";
import { useViewOpen } from "../../ui/use-workspace";

export function TalentsView() {
  const open = useViewOpen("talents");
  return (
    // The Talent tab (src/app/planner/workspace.js "talents"): the talent trees beside the talent panel; under 760px
    // they stack.
    <section
      id="talents-view"
      hidden={!open}
      className={`app-view ${buildSectionPlace} grid min-w-0 scroll-mt-[82px] grid-cols-[230px_minmax(0,1fr)] items-start gap-x-0 gap-y-3 max-[1100px]:grid-cols-[205px_minmax(0,1fr)] max-[1100px]:gap-3 max-[760px]:block min-[1500px]:grid-cols-[minmax(230px,13fr)_minmax(700px,63fr)] min-[1500px]:gap-y-4`}
    >
      <div
        id="talent-board-tabs"
        className="talent-board-tabs col-start-1 row-start-1 grid grid-cols-1 grid-rows-[auto_repeat(4,minmax(82px,1fr))_minmax(72px,0.8fr)_auto] gap-2.5 rounded-l-md border border-r-0 border-line bg-surface p-2.5 leading-[normal] max-[1100px]:flex max-[1100px]:flex-col max-[1100px]:gap-2 max-[1100px]:rounded-md max-[1100px]:border-r max-[760px]:mb-2.5 min-[1100px]:self-stretch"
        role="tablist"
        aria-label="Talent boards"
      >
        <TalentTabs />
      </div>
      <div className="talent-layout col-start-2 row-start-1 grid leading-[normal] min-w-0 min-[1100px]:self-stretch [.showing-slates>&]:block [.showing-slates>&]:h-(--slate-panel-height,650px) [.showing-slates>&]:overflow-hidden">
        <section className="panel talent-tree-panel relative min-h-127.5 min-w-0 p-3.5 max-[1100px]:overflow-x-auto max-[760px]:min-h-0 min-[1100px]:flex min-[1100px]:h-full min-[1100px]:flex-col min-[1100px]:rounded-l-none min-[1100px]:border-l-0">
          <TalentBoardHeading />
          <PrismPlacementPrompt />
          <CoreTalents />
          <div className="talent-stage-wrap pt-2.5 min-[1100px]:flex min-[1100px]:min-h-0 min-[1100px]:flex-1 min-[1100px]:flex-col">
            <div
              className="talent-thresholds grid grid-cols-7 border-b border-line pb-2 text-center text-xs text-muted"
              aria-hidden="true"
            >
              <span>0</span>
              <span>3</span>
              <span>6</span>
              <span>9</span>
              <span>12</span>
              <span>15</span>
              <span>18</span>
            </div>
            <TalentStage />
          </div>
        </section>
      </div>
    </section>
  );
}

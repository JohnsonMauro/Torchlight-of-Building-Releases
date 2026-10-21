import { HeroPanel } from "../../features/hero/HeroPanel";
import {
  CoreTalents,
  PrismPlacementPrompt,
  TalentBoardHeading,
  TalentStage,
  TalentTabs,
} from "../../features/talents/TalentTree";

export function TalentsView() {
  return (
    // Hero | talent trees | talent panel on one row; under 1050px the trees and panel share a row above the hero, and
    // under 760px everything stacks.
    <section
      id="talents-view"
      className="app-view order-1 col-span-full grid min-w-0 scroll-mt-[82px] grid-cols-[250px_230px_minmax(0,1fr)] items-start gap-x-0 gap-y-3 bg-[#0c1117] clip-chamfer-9 max-[1100px]:grid-cols-[250px_205px_minmax(0,1fr)] max-[1100px]:gap-3 max-[1050px]:grid-cols-[220px_minmax(0,1fr)] max-[760px]:block min-[1500px]:grid-cols-[minmax(340px,24fr)_minmax(230px,13fr)_minmax(700px,63fr)] min-[1500px]:gap-y-4"
    >
      <HeroPanel className="col-start-1 row-start-1 mr-4 max-[1100px]:mr-0 max-[1050px]:col-span-full max-[1050px]:row-start-2 max-[760px]:mb-3" />
      <div
        id="talent-board-tabs"
        className="talent-board-tabs col-start-2 bg-[radial-gradient(circle_at_18%_0,rgb(160_68_34/0.067),transparent_18rem),linear-gradient(145deg,#192230,#0e141d_72%)] shadow-[0_12px_28px_rgb(0_0_0/0.18)] max-[1100px]:bg-[#10161e] max-[1100px]:shadow-[inset_0_1px_rgb(255_255_255/0.024),0_12px_28px_rgb(0_0_0/0.18)] row-start-1 grid leading-[normal] grid-cols-1 grid-rows-[auto_repeat(4,minmax(82px,1fr))_minmax(72px,0.8fr)_auto] gap-2.5 rounded-l-md border border-r-0 border-[#3a4655] p-2.5 max-[1100px]:flex max-[1100px]:flex-col max-[1100px]:gap-2 max-[1100px]:rounded-none max-[1100px]:border-r max-[1100px]:clip-chamfer-10 max-[1050px]:col-start-1 max-[760px]:mb-2.5 min-[1100px]:self-stretch"
        role="tablist"
        aria-label="Talent boards"
      >
        <TalentTabs />
      </div>
      <div className="talent-layout col-start-3 row-start-1 grid leading-[normal] min-w-0 max-[1050px]:col-start-2 min-[1100px]:self-stretch [.showing-slates>&]:block [.showing-slates>&]:h-(--slate-panel-height,650px) [.showing-slates>&]:overflow-hidden">
        <section className="panel talent-tree-panel relative bg-[radial-gradient(circle_at_50%_45%,rgb(72_116_139/0.13),transparent_36rem),linear-gradient(145deg,#192230,#0e141d_72%)] shadow-[0_12px_28px_rgb(0_0_0/0.18)] max-[1100px]:bg-[radial-gradient(circle_at_82%_0,rgb(160_68_34/0.067),transparent_18rem),linear-gradient(145deg,#192230,#0e141d_72%)] max-[1100px]:shadow-[inset_0_1px_rgb(255_255_255/0.024),0_12px_28px_rgb(0_0_0/0.18)] min-h-127.5 min-w-0 border border-[#3a4655] p-3.5 clip-chamfer-9 before:absolute before:top-0 before:left-0 before:h-px before:w-13.5 before:bg-[#bdcee0] before:opacity-65 before:content-[''] max-[1100px]:overflow-x-auto max-[760px]:min-h-0 min-[1100px]:flex min-[1100px]:h-full min-[1100px]:flex-col min-[1100px]:rounded-r-md min-[1100px]:border-l-0 min-[1100px]:[clip-path:none]">
          <TalentBoardHeading />
          <PrismPlacementPrompt />
          <CoreTalents />
          <div className="talent-stage-wrap pt-2.5 min-[1100px]:flex min-[1100px]:min-h-0 min-[1100px]:flex-1 min-[1100px]:flex-col">
            <div
              className="talent-thresholds grid grid-cols-7 border-b border-line pb-2 text-center text-[0.72rem] text-muted"
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

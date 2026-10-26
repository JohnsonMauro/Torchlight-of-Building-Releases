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

export function TalentsView() {
  const open = useViewOpen("talents");
  const talents = useViewSource("talents");
  const slateMode = talents?.slateMode ?? false;
  return (
    // The Talent tab (src/app/planner/workspace.js "talents"): the build tabs over the whole section, then the talent
    // trees beside the open tree's panel; under 760px they stack. The Slates tab lays the slate board over the
    // open tree, which keeps its place (invisible), so the panel keeps the tree's height when the two switch.
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
        <div className="talent-layout relative grid min-w-0 leading-[normal] min-[1100px]:self-stretch">
          {slateMode && <SlatePanel />}
          <section
            className={`talent-tree-panel relative ${slateMode ? "invisible" : ""} min-h-127.5 min-w-0 rounded-md border border-line bg-(--talent-emblem)/12 p-3 ${familyTint(talents?.familyClass ?? "")} max-[1100px]:overflow-x-auto max-[760px]:min-h-0 min-[1100px]:flex min-[1100px]:h-full min-[1100px]:flex-col`}
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

import { FollowerPanel } from "../../features/follower/FollowerPanel";
import { HeroDetailTabs, HeroShowcase, HeroTraitTree } from "../../features/hero/HeroTab";
import {
  CoreTalents,
  PrismPlacementPrompt,
  TalentBoardHeading,
  TalentStage,
  TalentTabs,
} from "../../features/talents/TalentTree";

export function TalentsView() {
  return (
    <section id="talents-view" className="app-view">
      <aside className="planner-hero-panel">
        <div className="planner-section-title hero-panel-tabs">
          <div className="hero-panel-tab-list" role="tablist" aria-label="Hero and follower">
            <button
              type="button"
              role="tab"
              id="hero-panel-tab-hero"
              className="active"
              aria-selected="true"
              aria-controls="hero-panel-hero"
              data-hero-panel-tab="hero"
            >
              Hero
            </button>
            <button
              type="button"
              role="tab"
              id="hero-panel-tab-follower"
              aria-selected="false"
              aria-controls="follower-panel"
              tabIndex={-1}
              data-hero-panel-tab="follower"
            >
              Follower
            </button>
          </div>
          <button type="button" className="qol-help" data-qol-help="hero" aria-label="Hero controls">
            ?
          </button>
        </div>
        <div id="hero-panel-hero" className="hero-panel-content" role="tabpanel" aria-labelledby="hero-panel-tab-hero">
          <HeroShowcase />
          <HeroDetailTabs />
          <HeroTraitTree />
        </div>
        <div
          id="follower-panel"
          className="hero-panel-content follower-panel"
          role="tabpanel"
          aria-labelledby="hero-panel-tab-follower"
          hidden
        >
          <FollowerPanel />
        </div>
      </aside>
      <div id="talent-board-tabs" className="talent-board-tabs" role="tablist" aria-label="Talent boards">
        <TalentTabs />
      </div>
      <div className="talent-layout">
        <section className="panel talent-tree-panel">
          <TalentBoardHeading />
          <PrismPlacementPrompt />
          <CoreTalents />
          <div className="talent-stage-wrap">
            <div className="talent-thresholds" aria-hidden="true">
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

import { HelpButton } from "../../ui/HelpButton";
import { FollowerPanel } from "../follower/FollowerPanel";
import { goldTab, panelGlow } from "./hero-classes";
import { HeroDetailTabs, HeroShowcase, HeroTraitTree } from "./HeroTab";

// The Build view's hero column: the Hero / Follower tabs (src/app/hero/hero-controller.js switches them by .active and
// data-hero-panel-tab) over the hero's showcase and trait tree, or the follower panel. The grid placement is the caller's.
export function HeroPanel({ className }: { className?: string }) {
  return (
    <aside
      className={`planner-hero-panel relative min-h-152.5 overflow-hidden border border-[#3a4655] bg-panel leading-[normal] clip-chamfer-10 max-[900px]:min-h-auto ${panelGlow} ${className ?? ""}`}
    >
      <div className="planner-section-title hero-panel-tabs relative flex h-12 items-center justify-between gap-2 border-b border-[#8b6333] bg-heading pr-3 text-[0.69rem] font-extrabold tracking-[0.12em] text-[#f2943c] uppercase after:absolute after:inset-x-0 after:-bottom-px after:h-px after:rule-gold after:content-['']">
        <div
          className="hero-panel-tab-list grid min-w-0 flex-1 grid-cols-2 self-stretch"
          role="tablist"
          aria-label="Hero and follower"
        >
          <button
            type="button"
            role="tab"
            id="hero-panel-tab-hero"
            className={`active ${goldTab}`}
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
            className={goldTab}
            aria-selected="false"
            aria-controls="follower-panel"
            tabIndex={-1}
            data-hero-panel-tab="follower"
          >
            Follower
          </button>
        </div>
        <HelpButton topic="hero" label="Hero" />
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
  );
}

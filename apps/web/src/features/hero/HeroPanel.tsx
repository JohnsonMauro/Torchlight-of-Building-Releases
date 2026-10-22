import type { ReactNode } from "react";
import { BuildTabs } from "../../ui/BuildTabs";
import { FollowerPanel } from "../follower/FollowerPanel";
import { DamageSummary } from "../stats/DamageSummary";
import { HeroDetailTabs, HeroShowcase, HeroTraitTree } from "./HeroTab";

// The character column and the Hero Trait and Follower tabs' panels: a panel, a tab's under the build tabs (the strip
// Skills, Gear, Pacts and Talent open with). The width and placement are the caller's.
function CharacterPanel({
  tabs = false,
  className,
  children,
}: {
  tabs?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <aside className={`panel relative overflow-hidden leading-[normal] ${className ?? ""}`}>
      {tabs ? <BuildTabs /> : null}
      {children}
    </aside>
  );
}

/**
 * The character column beside every build tab: the hero's portrait, name and main trait, with Change Hero, and the
 * build's damage summary. More of the character's figures join it later.
 */
export function CharacterColumn({ className }: { className?: string }) {
  return (
    <CharacterPanel className={className}>
      <HeroShowcase />
      <DamageSummary />
    </CharacterPanel>
  );
}

/** The Hero Trait tab: the hero's trait tabs over the open one (trait tiers, Trait Path or Scent Bottle). */
export function HeroPanel({ className }: { className?: string }) {
  return (
    <CharacterPanel tabs className={`planner-hero-panel ${className ?? ""}`}>
      <div id="hero-panel-hero">
        <HeroDetailTabs />
        <HeroTraitTree />
      </div>
    </CharacterPanel>
  );
}

/** The Follower tab: the follower card and its Tartarus Skill slots. */
export function FollowerColumn({ className }: { className?: string }) {
  return (
    <CharacterPanel tabs className={className}>
      <div id="follower-panel" className="follower-panel">
        <FollowerPanel />
      </div>
    </CharacterPanel>
  );
}

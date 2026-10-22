import type { ReactNode } from "react";
import { SectionHeading } from "../../ui/SectionHeading";
import { FollowerPanel } from "../follower/FollowerPanel";
import { DamageSummary } from "../stats/DamageSummary";
import { HeroDetailTabs, HeroShowcase, HeroTraitTree } from "./HeroTab";

// The character column and the Hero Trait and Follower tabs' panels: a panel under its heading strip (the one Skills,
// Gear and Pactspirits use), with its help button when it has one. The width and placement are the caller's.
function CharacterPanel({
  title,
  help,
  className,
  children,
}: {
  title?: string;
  help?: "hero" | "follower";
  className?: string;
  children: ReactNode;
}) {
  return (
    <aside className={`panel relative overflow-hidden leading-[normal] ${className ?? ""}`}>
      {title ? <SectionHeading title={title} help={help} /> : null}
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
    <CharacterPanel title="Hero Trait" help="hero" className={`planner-hero-panel ${className ?? ""}`}>
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
    <CharacterPanel title="Follower" help="follower" className={className}>
      <div id="follower-panel" className="follower-panel">
        <FollowerPanel />
      </div>
    </CharacterPanel>
  );
}

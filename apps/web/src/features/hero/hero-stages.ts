// A hero's trait stage: the Hero Trait tab drawn on the game's own Hero Trait screen, used as a decal, with the base trait,
// each tier's memory and trait choices placed where the game draws them (in percent of the decal). Experiment
// (2026-10-21): Rehan's Seething Silhouette only, the decal cut from the owner's screenshot of its screen (Berserker
// Rehan) with its trait and memory icons painted out. Each trait has its own screen, so a stage belongs to one trait.
import { artFrame, rarityArt } from "./hero-classes";
import type { TraitTiersView } from "@legacy/app/bridge/hero-traits-view-model.ts";
import type { MemorySocketLook } from "./MemorySocket";

export interface HeroStage {
  image: string;
  /** The decal's width / height. */
  ratio: number;
  /** The base trait's centre and width (percent). */
  base: { x: number; y: number; size: number };
  /** Each tier's column (percent across), left to right: level 45, 60, 75. */
  columns: number[];
  /** The rows (percent down): a tier's level (not in the game), first trait choice, memory and second choice. */
  rows: { level: number; top: number; memory: number; bottom: number };
  /** A node's width (percent). */
  node: number;
}

/** The hero traits drawn on their game screen, by hero id (hero-catalog-ss13.js: "rehan-seething-silhouette"). */
export const HERO_STAGES: Readonly<Record<string, HeroStage>> = {
  "rehan-seething-silhouette": {
    image: "./src/assets/tli/hero-art/rehan-seething-silhouette-stage.webp",
    ratio: 1400 / 686,
    base: { x: 62.07, y: 63.89, size: 6.4 },
    columns: [73.78, 82.62, 91.46],
    rows: { level: 40.5, top: 49.94, memory: 63.89, bottom: 78.83 },
    node: 5.6,
  },
};

/** Whether the stage can draw these tiers: plain tiers only (no dual rows, moved picks, base memory or supports). */
export function stageFits(stage: HeroStage, tiers: TraitTiersView): boolean {
  return (
    !tiers.dual &&
    !tiers.extraRow &&
    !tiers.base.memory &&
    !tiers.base.supports &&
    tiers.tiers.length === stage.columns.length &&
    tiers.tiers.every((tier) => tier.row === null && tier.groups.length === 1 && tier.groups[0].choices.length <= 2)
  );
}

const HEXAGON = "[clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]";
/** A node placed on the decal by its centre (its left, top and width come from the stage). */
export const STAGE_NODE = "absolute aspect-square -translate-x-1/2 -translate-y-1/2";
/** A tier's level over its column. */
export const STAGE_LEVEL =
  "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-xs font-bold tracking-wider whitespace-nowrap text-muted uppercase";
/** The base trait: round, in the accent. */
export const STAGE_BASE = `${artFrame} size-full rounded-full border-2 border-accent bg-sunken`;
/** A trait choice, a hexagon as in the game: its frame (the accent once picked) around its art. */
export const STAGE_CHOICE = `grid size-full cursor-pointer place-items-center border-0 p-[3px] focus-visible:outline-none ${HEXAGON}`;
export const STAGE_CHOICE_PICKED = "bg-accent";
export const STAGE_CHOICE_OTHER = "bg-line-strong opacity-60 hover:opacity-100 focus-visible:opacity-100";
export const STAGE_CHOICE_ART = `${artFrame} size-full bg-sunken ${HEXAGON}`;
/** The check under a picked trait: a small accent disc at the hexagon's foot. */
export const STAGE_CHECK =
  "pointer-events-none absolute -bottom-[8%] left-1/2 grid aspect-square w-[34%] -translate-x-1/2 place-items-center rounded-full border border-surface bg-accent text-on-accent";
/** A memory on the stage: a round socket in its rarity, as the game draws it. */
export const STAGE_MEMORY: MemorySocketLook = {
  button:
    "group/socket relative grid size-full cursor-pointer place-items-center border-0 bg-transparent p-0 text-text focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent",
  art: (rarity) => `${artFrame} size-full rounded-full border-2 ${rarityArt(rarity) || "border-grade-magic"}`,
  empty:
    "grid size-full place-items-center rounded-full border-2 border-dashed border-line-strong bg-sunken/60 text-base text-dim group-hover/socket:border-accent group-hover/socket:text-accent",
};

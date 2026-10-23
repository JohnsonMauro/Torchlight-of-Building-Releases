// A hero's trait stage: the Hero Trait tab drawn on the game's own Hero Trait screen, used as a decal, with the traits and
// memories placed where the game draws them (in percent of the decal). Each trait has its own screen, so a stage belongs
// to one trait. Two layouts:
// - tiers (Rehan's Seething Silhouette, 2026-10-21): the base trait, and per level a memory between two trait choices;
//   with `dual` (Bing's Creative Genius, 2026-10-23) each level's upper and lower pick in those two places and every
//   choice of its group as a round button over it, as the game opens them;
// - tree (Youga's The Ultimate One, 2026-10-22): the trait tree where TLIDB's coordinates put it (they are the game
//   screen's), the three memories under it. The decals are cut from the owner's screenshots with the icons, names and
//   buttons painted out (Torchlight-of-Building-Releases.local-context/tools/youga-stage-decal.py, bing-stage-decal.py).
import { artFrame, rarityArt } from "./hero-classes";
import type { TraitTiersView } from "@legacy/app/bridge/hero-traits-view-model.ts";
import type { MemorySocketLook } from "./MemorySocket";

interface StageArt {
  image: string;
  /** The decal's width / height. */
  ratio: number;
  /** How far left the decal is slid past its resting place (a fraction of its width), to bring the traits in. */
  shift?: number;
}

export interface TierStage extends StageArt {
  kind: "tiers";
  /** The base trait's centre and width (percent). */
  base: { x: number; y: number; size: number };
  /** Each tier's column (percent across), left to right: level 45, 60, 75. */
  columns: number[];
  /** The rows (percent down): a tier's level (not in the game), first trait choice, memory and second choice. */
  rows: { level: number; top: number; memory: number; bottom: number };
  /** A node's width (percent). */
  node: number;
  /** The memory sockets' columns (percent across) when they are not the choices' (Bing's sit right of them). */
  memoryColumns?: number[];
  /** A memory socket's width (percent); the node's when absent. */
  memory?: number;
  /**
   * Two choice groups per level (Bing, Creative Genius): the upper and lower pick in the top and bottom hexagons, and
   * every choice of a group as a round button, two to a row, above the top hexagon (`up`, percent down) or below the
   * bottom one (`down`); `size` a button's width and `spacing` between their centres (percent across), `rowStep` between
   * rows (percent down).
   */
  dual?: { up: number; down: number; size: number; spacing: number; rowStep: number };
}

export interface TreeStage extends StageArt {
  kind: "tree";
  /** A node's centre in percent of the decal from its TLIDB tree coordinates: scale x coordinate + offset, per axis. */
  screen: { x: [scale: number, offset: number]; y: [scale: number, offset: number] };
  /** A node's and the base trait's width (percent). */
  node: number;
  base: number;
  /** The memory sockets' centres (percent), Origin, Discipline and Progress (the Lv45 / 60 / 75 rows), and their width. */
  memories: { x: number; y: number }[];
  memory: number;
  /** The base trait's memory socket (a revived memory opens it; the game screen has no place for it): left of Origin. */
  baseMemory: { x: number; y: number };
  /** Where the game writes "Available Traits" (percent). */
  available: { x: number; y: number };
}

export type HeroStage = TierStage | TreeStage;

/** The hero traits drawn on their game screen, by hero id (hero-catalog.js: "rehan-seething-silhouette"). */
export const HERO_STAGES: Readonly<Record<string, HeroStage>> = {
  "rehan-seething-silhouette": {
    kind: "tiers",
    image: "./src/assets/tli/hero-art/rehan-seething-silhouette-stage.webp",
    ratio: 1400 / 686,
    base: { x: 62.07, y: 63.89, size: 6.4 },
    columns: [73.78, 82.62, 91.46],
    rows: { level: 40.5, top: 49.94, memory: 63.89, bottom: 78.83 },
    node: 5.6,
  },
  // Decal: the screenshot's 2560 x 1280 px below the top bar, at 1400 x 700. Measured on the screenshot (px): the base trait
  // at 1322, 723; the hexagons at x 1705 / 1995 / 2283, y 495 and 960; the memories at x 1735 / 2025 / 2313, y 715; the
  // choices the game opens over a hexagon at y 350, 131 px apart.
  "bing-creative-genius": {
    kind: "tiers",
    image: "./src/assets/tli/hero-art/bing-creative-genius-stage.webp",
    ratio: 2,
    base: { x: 51.64, y: 48.67, size: 6.4 },
    columns: [66.6, 77.93, 89.18],
    rows: { level: 11, top: 30.86, memory: 48.05, bottom: 67.19 },
    node: 6.4,
    memoryColumns: [67.77, 79.1, 90.35],
    memory: 5.1,
    dual: { up: 19.53, down: 78.5, size: 3.6, spacing: 4, rowStep: 7.8 },
  },
  // Decal: the screenshot's 2560 x 1280 px below the top bar, at 1400 x 700. Fitted on the screenshot's 11 nodes
  // (screen px = 1.261 x TLIDB x + 777 and 1.267 x TLIDB y + 13 below the top bar, within 3 px).
  "youga-the-ultimate-one": {
    kind: "tree",
    image: "./src/assets/tli/hero-art/youga-the-ultimate-one-stage.webp",
    ratio: 2,
    shift: 0.08,
    screen: { x: [0.04926, 30.36], y: [0.099, -16.62] },
    node: 5,
    base: 7.5,
    memories: [
      { x: 51.35, y: 87.69 },
      { x: 63.65, y: 87.69 },
      { x: 76.15, y: 87.99 },
    ],
    memory: 4.8,
    baseMemory: { x: 39.05, y: 87.69 },
    available: { x: 63.4, y: 76.3 },
  },
};

/**
 * Whether the stage can draw these tiers: one column per level, no moved picks, base memory or supports; two choices a
 * level, or an upper and a lower group on a dual stage.
 */
export function stageFits(stage: TierStage, tiers: TraitTiersView): boolean {
  if (tiers.extraRow || tiers.base.memory || tiers.base.supports || tiers.tiers.length !== stage.columns.length)
    return false;
  return tiers.dual
    ? Boolean(stage.dual) && tiers.tiers.every((tier) => tier.row === null && tier.groups.length === 2)
    : !stage.dual &&
        tiers.tiers.every(
          (tier) => tier.row === null && tier.groups.length === 1 && tier.groups[0].choices.length <= 2,
        );
}

const HEXAGON = "[clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]";
/** A node placed on the decal by its centre (its left, top and width come from the stage). */
export const STAGE_NODE = "absolute aspect-square -translate-x-1/2 -translate-y-1/2";
/** A tier's level over its column. */
export const STAGE_LEVEL =
  "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-xs font-bold tracking-wider whitespace-nowrap text-muted uppercase";
/** A line the game writes on its screen ("Available Traits: 0"). */
export const STAGE_CAPTION =
  "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-xs whitespace-nowrap text-muted";
/** The base trait: round, in the accent. */
export const STAGE_BASE = `${artFrame} size-full rounded-full border-2 border-accent bg-sunken`;
/** A tree node (tree stage): round, as the game draws it; a locked one is disabled. */
export const STAGE_TREE_NODE =
  "group/node relative grid size-full cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent off:cursor-not-allowed";
/** A tree node's art: accent ring once picked, faded and grey while locked. */
export const STAGE_TREE_ART = `${artFrame} size-full rounded-full border-2 bg-sunken`;
export const STAGE_TREE_ART_PICKED = "border-accent";
export const STAGE_TREE_ART_OPEN = "border-line-strong group-hover/node:border-accent";
export const STAGE_TREE_ART_LOCKED = "border-line opacity-35 grayscale";
/** The lines between picked nodes, over the decal's own faint ones. */
export const STAGE_TREE_LINE = "fill-none stroke-accent-strong stroke-2 [vector-effect:non-scaling-stroke]";
/** A trait choice, a hexagon as in the game: its frame (the accent once picked) around its art. */
export const STAGE_CHOICE = `grid size-full cursor-pointer place-items-center border-0 p-[3px] focus-visible:outline-none ${HEXAGON}`;
export const STAGE_CHOICE_PICKED = "bg-accent";
export const STAGE_CHOICE_OTHER = "bg-line-strong opacity-60 hover:opacity-100 focus-visible:opacity-100";
export const STAGE_CHOICE_ART = `${artFrame} size-full bg-sunken ${HEXAGON}`;
/** A dual stage's hexagon: the group's pick (picked with the round buttons over it), or an empty frame. */
export const STAGE_PICK_FRAME = `pointer-events-none grid size-full place-items-center p-[3px] ${HEXAGON}`;
export const STAGE_PICK_EMPTY = "bg-line-strong opacity-40";
/** The check under a picked trait: a small accent disc at the hexagon's foot. */
export const STAGE_CHECK =
  "pointer-events-none absolute z-2 -bottom-[8%] left-1/2 grid aspect-square w-[34%] -translate-x-1/2 place-items-center rounded-full border border-surface bg-accent text-on-accent";
/** A memory on the stage: a round socket in its rarity, as the game draws it. */
export const STAGE_MEMORY: MemorySocketLook = {
  button:
    "group/socket relative grid size-full cursor-pointer place-items-center border-0 bg-transparent p-0 text-text focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent",
  art: (rarity) => `${artFrame} size-full rounded-full border-2 ${rarityArt(rarity) || "border-grade-magic"}`,
  empty:
    "grid size-full place-items-center rounded-full border-2 border-dashed border-line-strong bg-sunken/60 text-base text-dim group-hover/socket:border-accent group-hover/socket:text-accent",
};

// The hero trait card: one tooltip layout for a hero trait (its effects at its level in this build, its keywords'
// definitions shown while Alt is held), a tree hero's extra row, a follower and a Tartarus Skill. Text comes in runs, so
// a keyword, a progression's current value or a bold label keeps its look without markup. Pure; the planner passes in
// what depends on the open build (src/app/hero/hero-controller.js and follower-panel.js) and React renders it
// (apps/web/src/features/hero/TraitTooltip.tsx).
import {
  baseTraitDescriptionForLevel,
  EXTRA_PICK_AFFIX,
  EXTRA_PICK_LEVEL,
  heroTraitKeyword,
  heroTraitKeywordSegments,
  heroTraitKeywordsIn,
  normalizePercentageText,
  withoutArtificialMoonLines,
} from "#engine";
import type { CoverageView } from "./gear-item-view.ts";

const text = (value: string) => normalizePercentageText(value);

/**
 * A stretch of text and its look: a keyword, bold text, a keyword's label (bold, accent), a progression's current or
 * other value, its separator.
 */
export interface TextRun {
  text: string;
  look: "" | "keyword" | "bold" | "label" | "current" | "other" | "separator";
}
export interface TraitParagraph {
  runs: TextRun[];
  coverage: CoverageView | null;
  /** A follower's flavour line (italic). */
  flavor: boolean;
}
export interface TraitTooltipView {
  title: string;
  coverage: CoverageView | null;
  /** The chip beside the title: the level, a rarity, a skill kind. */
  chip: string;
  /** The line under the head ("Unlocks at hero level 45"…); "" for none. */
  unlock: string;
  paragraphs: TraitParagraph[];
  /** The keywords' definitions, shown while Alt is held. */
  keywords: { name: string; kind: string; lines: string[] }[];
  /** The footer line; "" for none. */
  source: string;
  /** A follower's or a Tartarus Skill's card (the frame's follower-tooltip). */
  follower: boolean;
  /** The frame's data-rarity; null for none. */
  rarity: string | null;
}

export const paragraph = (runs: TextRun[], coverage: CoverageView | null = null, flavor = false): TraitParagraph => ({
  runs,
  coverage,
  flavor,
});
export const run = (value: string, look: TextRun["look"] = ""): TextRun => ({ text: text(value), look });

/** The lines a trait's tooltip adds about what the calculation assumes. */
const TRAIT_NOTES: Readonly<Record<string, string>> = {
  "Sing with the Tide":
    "Damage effects use the current base trait level. Bard state is assumed; bubbles, movement, Tide duration and state switching are excluded from this tag.",
  "Murmurs of the Distant Tide":
    "Additional Tide Effect scales the Tide damage bonuses in the stat sheet and damage path. Bard state is assumed; reduced Tide duration is ignored.",
  "Idyll of the Tide":
    "Stat sheet and damage path use the Idyll stack count set in Combat, defaulting to 15. Stack buildup and loss are not simulated.",
  "Wave Aria":
    "Damage component is included in calculations. Tide placement and duration are outside this badge’s scope.",
};

/**
 * Youga – The Ultimate One's fourth trait row comes from the revived memory affix "+1 Max Youga Count in the Universe"
 * (packages/engine/src/heroes/hero-trait-tree.js): it has no memory of its own, so its memory cell holds a "+1 Youga Count" chip,
 * and its level cell reads the fixed maximum level with a "MAX" caption. Hovering the row (outside its trait) shows where
 * it comes from; the trait's own tooltip carries the same note.
 */
export const EXTRA_ROW_CHIP = "+1 Youga Count";
export const EXTRA_ROW_NOTE = `This fourth trait row comes from the "${EXTRA_PICK_AFFIX}" memory affix. Its trait is at max level (${EXTRA_PICK_LEVEL}) and needs the three memory rows filled first.`;

/** A line with the hero's keywords as runs, and each "(a/b/c)" progression with the value at `level` picked out. */
function traitLineRuns(heroId: string, line: string, level: number): TextRun[] {
  const runs: TextRun[] = [];
  const words = (stretch: string) => {
    for (const segment of heroTraitKeywordSegments(heroId, stretch) as { text: string; keyword?: string }[])
      runs.push(run(segment.text, segment.keyword ? "keyword" : ""));
  };
  let offset = 0;
  for (const match of line.matchAll(/\(([^()]*(?:\/)[^()]*)\)(%?)/g)) {
    words(line.slice(offset, match.index));
    const values = match[1].split("/"),
      current = Math.min(values.length - 1, level - 1);
    runs.push(run("("));
    values.forEach((value, index) => {
      if (index) runs.push(run("/", "separator"));
      runs.push(run(value.trim(), index === current ? "current" : "other"));
    });
    runs.push(run(`)${match[2]}`));
    offset = (match.index ?? 0) + match[0].length;
  }
  words(line.slice(offset));
  return runs;
}

export interface HeroTraitTooltipInput {
  heroId: string;
  trait: { name: string; level: number; description: string };
  /** "base", "level45", a tree row's key ("…:extra" for the extra row). */
  levelKey: string;
  /** The trait's level in this build. */
  level: number;
  /** Whether the calculation uses the trait, from its shown lines and its whole description. */
  coverage: (shownLines: string[], descriptionLines: string[]) => CoverageView;
}
/** A hero trait at its level in this build. */
export function heroTraitTooltipView(input: HeroTraitTooltipInput): TraitTooltipView {
  const { heroId, trait } = input;
  const description =
    input.levelKey === "base" ? baseTraitDescriptionForLevel(heroId, trait.description) : trait.description;
  const descriptionLines = description.split("\n").filter(Boolean);
  const lines = withoutArtificialMoonLines(heroId, descriptionLines) as string[];
  const notes = [input.levelKey.endsWith(":extra") ? EXTRA_ROW_NOTE : "", TRAIT_NOTES[trait.name] || ""].filter(
    Boolean,
  );
  return {
    title: text(trait.name),
    coverage: input.coverage(lines, descriptionLines),
    chip: `Level ${input.level}`,
    unlock: `Unlocks at hero level ${trait.level}`,
    paragraphs: [
      ...lines.map((line) => paragraph(traitLineRuns(heroId, line, input.level))),
      ...notes.map((note) => paragraph([run(note)])),
    ],
    keywords: (heroTraitKeywordsIn(heroId, lines) as string[]).map((name) => {
      const entry = heroTraitKeyword(heroId, name) as { kind?: string; effect: string[] };
      return { name: text(name), kind: entry.kind || "Keyword", lines: entry.effect.map(text) };
    }),
    source: `TLIDB · CURRENT TRAIT LEVEL ${input.level}`,
    follower: false,
    rarity: null,
  };
}

/** A tree hero's fourth row (its chip). */
export function treeExtraRowTooltipView(): TraitTooltipView {
  return {
    title: EXTRA_ROW_CHIP,
    coverage: null,
    chip: `Level ${EXTRA_PICK_LEVEL} · Max`,
    unlock: "",
    paragraphs: [paragraph([run(EXTRA_ROW_NOTE)])],
    keywords: [],
    source: "",
    follower: false,
    rarity: null,
  };
}

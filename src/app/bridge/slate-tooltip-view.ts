// A Divinity Slate's tooltip (on the board or in the Slate Inventory): its art as posed, its affixes by group (a core
// talent affix shows its full text while Alt is held; an affix only one slate can apply says so), Judgment's boost, and
// a copy slate's copied affixes. Pure; the planner passes in what depends on the open build
// (src/app/slates/slates-controller.js slateTooltip query) and React renders it
// (apps/web/src/features/slates/SlateTooltip.tsx).
import { normalizePercentageText } from "../../engine/index.ts";
import type { CoverageView } from "./gear-item-view.ts";

const text = (value: string) => normalizePercentageText(value);

/** An affix whose "Tree: …" opening names a talent tree takes that tree's god colour (`family`, a class). */
export interface SlateAffixText {
  tree: string;
  family: string;
  rest: string;
}
export interface SlateAffixView {
  text: SlateAffixText;
  /** A core talent affix: its short form; `text` is then its full form, shown while Alt is held. */
  core: SlateAffixText | null;
  /** Only one copy of this effect is active across equipped slates. */
  limited: boolean;
  coverage: CoverageView;
}
export interface SlateTooltipView {
  name: string;
  /** "DIVINITY SLATE · RARE". */
  kicker: string;
  icon: string;
  /** The art as the slate is posed: its rotation and flips. */
  pose: { rotation: number; flipX: number; flipY: number };
  /** The slate's god colour (a talent-family class); "" for none. */
  family: string;
  /** Judgment boosts this slate's affixes. */
  judgment: boolean;
  groups: { title: string; affixes: SlateAffixView[] }[];
  /** "Copy effect" or "No affixes selected." when there are no groups. */
  empty: string;
  /** A copy slate's copied affixes; null for any other slate. */
  copied: {
    affixes: { source: string; text: SlateAffixText; coverage: CoverageView }[];
    /** When none are copied: why. */
    empty: string;
  } | null;
}
export interface SlateTooltipInput {
  slate: { name: string; rarity?: string; icon: string };
  pose: { rotation?: number; flipX?: number; flipY?: number };
  family: string;
  judgment: boolean;
  groups: { title: string; affixes: string[] }[];
  /** An affix as the slate applies it (Judgment's scaling). */
  display: (affix: string) => string;
  limited: (affix: string) => boolean;
  /** Whether the calculation uses an affix (as written in the slate). */
  coverage: (affix: string) => CoverageView;
  /** A talent tree's god colour class; "" for none. */
  familyOf: (tree: string) => string;
  /** A copy slate: whether it is placed, and what it copies; null for any other slate. */
  copy: { placed: boolean; copied: { source: string; affix: string }[] } | null;
  copiedCoverage: (affix: string) => CoverageView;
}

const CORE_AFFIX = /^(.+?): (Lv\.[12] Core Talent): (.+?)(?:\s+[—–]\s+|$)/;

export function slateTooltipView(input: SlateTooltipInput): SlateTooltipView {
  const affixText = (affix: string): SlateAffixText => {
    const colon = affix.indexOf(": ");
    const family = colon < 0 ? "" : input.familyOf(affix.slice(0, colon));
    return family
      ? { tree: text(affix.slice(0, colon)), family, rest: text(affix.slice(colon)) }
      : { tree: "", family: "", rest: text(affix) };
  };
  const rotation = (((Number(input.pose.rotation) || 0) % 360) + 360) % 360;
  const groups = input.groups
    .map((group) => ({
      title: group.title,
      affixes: group.affixes.filter(Boolean).map((affix): SlateAffixView => {
        const core = affix.match(CORE_AFFIX);
        return {
          text: affixText(input.display(affix)),
          core: core ? affixText(`${core[1]}: ${core[3]}`) : null,
          limited: input.limited(affix),
          coverage: input.coverage(affix),
        };
      }),
    }))
    .filter((group) => group.affixes.length);
  return {
    name: text(input.slate.name),
    kicker: `DIVINITY SLATE · ${(input.slate.rarity || "magic").toUpperCase()}`,
    icon: input.slate.icon,
    pose: {
      rotation,
      flipX: Number(input.pose.flipX) === -1 ? -1 : 1,
      flipY: Number(input.pose.flipY) === -1 ? -1 : 1,
    },
    family: input.family,
    judgment: input.judgment,
    groups,
    empty: input.copy ? "Copy effect" : "No affixes selected.",
    copied: input.copy
      ? {
          affixes: input.copy.copied.map(({ source, affix }) => ({
            source: text(source),
            text: affixText(affix),
            coverage: input.copiedCoverage(affix),
          })),
          empty: input.copy.placed
            ? "No eligible adjacent affixes to copy."
            : "Place on the grid to see copied affixes.",
        }
      : null,
  };
}

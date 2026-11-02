// A Divinity Slate's tooltip (on the board or in the Slate Inventory): its art as posed, its affixes by group, Judgment's
// boost, and a copy slate's copied affixes. A talent affix reads as the game shows it (owner's screenshot, 2026-11-02): a
// diamond in its node type's colour and the effect alone, one stat per line; a core talent affix shows the core's name and
// its effect while Alt is held; an affix only one slate can apply says so. Pure; the planner passes in what depends on the open build
// (src/app/slates/slates-controller.js slateTooltip query) and React renders it
// (apps/web/src/features/slates/SlateTooltip.tsx).
import { normalizePercentageText } from "#engine";
import type { CoverageView } from "./gear-item-view.ts";

const text = (value: string) => normalizePercentageText(value);

/** An affix whose "Tree: …" opening names a talent tree takes that tree's god colour (`family`, a class). */
export interface SlateAffixText {
  tree: string;
  family: string;
  rest: string;
}
/** A talent affix's node type, the colour of its diamond; "" for an affix that is no talent node. */
export type SlateAffixKind = "micro" | "medium" | "legendary" | "core" | "";
export interface SlateAffixView {
  text: SlateAffixText;
  /** A core talent affix: the core's name; `text` is then its effect, shown while Alt is held. */
  core: SlateAffixText | null;
  kind: SlateAffixKind;
  /** A talent affix's tree and node type ("Warlord · Micro Talent"), which the game does not print; "" otherwise. */
  origin: string;
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

// "<Tree>: <Type> Talent: <effect>"; a core's effect is "<Name> — <effect>".
const TALENT_AFFIX = /^(.+?): (Micro|Medium|Legendary Medium|Lv\.[12] Core) Talent: (.+)$/s;
const KIND: Record<string, SlateAffixKind> = { Micro: "micro", Medium: "medium", "Legendary Medium": "legendary" };
const plain = (rest: string): SlateAffixText => ({ tree: "", family: "", rest: text(rest) });

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
        const shown = input.display(affix);
        const talent = shown.match(TALENT_AFFIX);
        const own = { limited: input.limited(affix), coverage: input.coverage(affix) };
        if (!talent) return { text: affixText(shown), core: null, kind: "", origin: "", ...own };
        const [, tree, type, effect] = talent;
        const origin = `${text(tree)} · ${type} Talent`;
        if (type.startsWith("Lv.")) {
          const [name, ...rest] = effect.split(/\s+[—–]\s+/);
          return { text: plain(rest.join(" — ") || name), core: plain(name), kind: "core", origin, ...own };
        }
        return { text: plain(effect.split(/\s+·\s+/).join("\n")), core: null, kind: KIND[type], origin, ...own };
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

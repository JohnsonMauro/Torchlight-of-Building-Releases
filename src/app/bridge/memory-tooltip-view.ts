// The hero panel's item tooltips: a hero memory (its enhancement, implicit, revival, revived affix and affixes, each
// line with whether the calculation uses it) and a Sage's scent ingredient or elixir. Pure; the planner passes in what
// depends on the open build (src/app/hero/hero-tooltip-queries.js) and React renders it
// (apps/web/src/features/hero/MemoryTooltip.tsx).
import { normalizePercentageText } from "../../engine/index.ts";
import type { CoverageView } from "./gear-item-view.ts";
import type { MemoryRevivedEffectView } from "./hero-memory-view.ts";

const text = (value: string) => normalizePercentageText(value);

export interface MemoryLineView {
  text: string;
  /** Its affix tier (a T badge); null for none. */
  tier: number | null;
  coverage: CoverageView;
}
export type MemoryTooltipSection =
  | { kind: "lines"; heading: string; lines: MemoryLineView[]; /** Wax and Wane raised the implicit. */ wax: boolean }
  | { kind: "revived"; heading: string; effect: MemoryRevivedEffectView; note: string; coverage: CoverageView };
export interface MemoryTooltipView {
  name: string;
  icon: string;
  /** The frame's data-rarity. */
  rarity: string;
  /** "LEGENDARY · HERO MEMORY". */
  kicker: string;
  revived: boolean;
  /** "12/40". */
  enhancement: string;
  traitBonus: number;
  /** The base trait slot's reduction (%); null outside it. */
  reduction: number | null;
  sections: MemoryTooltipSection[];
  footer: string;
}
export interface MemoryTooltipInput {
  memory: { name?: string; type: string; rarity?: string; enhancementLevel: number };
  icon: string;
  revived: boolean;
  maxEnhancement: number;
  traitBonus: number;
  reduction: number | null;
  implicit: { text: string; coverage: CoverageView; wax: boolean };
  /** Wax and Wane, Rising Moon. */
  revival: { text: string; coverage: CoverageView }[];
  revivedAffix: { lunar: boolean; effect: MemoryRevivedEffectView; note: string; coverage: CoverageView } | null;
  fixed: MemoryLineView[];
  random: MemoryLineView[];
  /** An Inventory memory (else an equipped one): only the footer differs. */
  inventory: boolean;
}
export function memoryTooltipView(input: MemoryTooltipInput): MemoryTooltipView {
  const lines = (heading: string, entries: MemoryLineView[], wax = false): MemoryTooltipSection[] =>
    entries.length
      ? [{ kind: "lines", heading, wax, lines: entries.map((entry) => ({ ...entry, text: text(entry.text) })) }]
      : [];
  const rarity = input.memory.rarity || "normal";
  return {
    name: text(input.memory.name || input.memory.type),
    icon: input.icon,
    rarity,
    kicker: `${rarity.toUpperCase()} · HERO MEMORY`,
    revived: input.revived,
    enhancement: `${input.memory.enhancementLevel}/${input.maxEnhancement}`,
    traitBonus: input.traitBonus,
    reduction: input.reduction,
    sections: [
      ...lines(
        "Implicit",
        [{ text: input.implicit.text, tier: null, coverage: input.implicit.coverage }],
        input.implicit.wax,
      ),
      ...lines(
        "Memory Revival",
        input.revival.map((entry) => ({ ...entry, tier: null })),
      ),
      ...(input.revivedAffix
        ? [
            {
              kind: "revived" as const,
              heading: `Revived Affix${input.revivedAffix.lunar ? " · Lunar Phase" : ""}`,
              effect: input.revivedAffix.effect,
              note: input.revivedAffix.note,
              coverage: input.revivedAffix.coverage,
            },
          ]
        : []),
      ...lines("Fixed Affixes", input.fixed),
      ...lines("Random Affixes", input.random),
    ],
    footer: input.inventory ? "Right-click to equip or unequip" : "Right-click to unequip",
  };
}

export interface ScentTooltipView {
  /** "Elixir Skill", "Base Ingredient"… */
  kicker: string;
  title: string;
  icon: string;
  tags: string[];
  lines: string[];
}
export interface ScentTooltipInput {
  /** "elixir", or an ingredient kind ("base", "aroma"…). */
  kind: string;
  entry: { name: string; icon: string; description?: string; tags?: string[] };
}
const titleCase = (value: string) =>
  value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());
export function scentTooltipView({ kind, entry }: ScentTooltipInput): ScentTooltipView {
  const elixir = kind === "elixir";
  return {
    kicker: elixir ? "Elixir Skill" : `${titleCase(kind)} Ingredient`,
    title: text(entry.name),
    icon: entry.icon,
    tags: elixir ? entry.tags || [] : [],
    lines: (entry.description || "")
      .split("\n")
      .map((line) => text(line.trim()))
      .filter(Boolean),
  };
}

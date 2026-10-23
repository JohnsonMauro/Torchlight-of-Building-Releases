// The talent trees' tooltips: a node (its effects at its rank, and an installed prism's effects on it), a core talent
// slot (or the prism that replaces the cores) and an installed prism. Pure; the planner passes in what depends on the
// open build (src/app/talents/talents-controller.js and prism-controller.js queries) and React renders it
// (apps/web/src/features/talents/TalentTooltip.tsx).
import {
  inverseImageEffectMultiplier,
  inverseImageRoll,
  normalizePercentageText,
  prismAreaBounds,
  prismNodeAffixes,
  talentEffectText,
} from "../../engine/index.ts";
import { effectLabel, formatEffect, nodeTitle } from "../talents/talent-labels.js";
import { coverageView, type CoverageView } from "./gear-item-view.ts";
import type { PrismSectionLine, PrismSectionView } from "./prism-crafter-view.ts";
import type { Prism, TalentNode } from "./talents-view-model.ts";

const text = (value: string) => normalizePercentageText(value);
const titleCase = (value: string) =>
  value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());

// ---- An installed prism.

export interface PrismTooltipView {
  name: string;
  icon: string;
  /** "Ethereal Prism" or "Inverse Image". */
  kind: string;
  area: string;
  areaCoverage: CoverageView;
  /** Its affix sections, each line with whether the calculation uses it. */
  sections: (Omit<PrismSectionView, "lines"> & { lines: (PrismSectionLine & { coverage: CoverageView })[] })[];
  footer: string;
}
export interface PrismTooltipInput {
  name: string;
  icon: string;
  inverse: boolean;
  area: string;
  sections: readonly PrismSectionView[];
  /** A section line's coverage, by its kind ("base", "rareAffix"…). */
  coverage: (kind: string) => CoverageView;
}
export function prismTooltipView(input: PrismTooltipInput): PrismTooltipView {
  return {
    name: text(input.name),
    icon: input.icon,
    kind: input.inverse ? "Inverse Image" : "Ethereal Prism",
    area: input.area,
    areaCoverage: coverageView("Planner only"),
    sections: input.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({
        ...("text" in line ? { ...line, text: text(line.text) } : line),
        coverage: input.coverage(line.kind),
      })),
    })),
    footer: "Click to change · Right-click to remove",
  };
}

// ---- A core talent slot, or the prism that replaces the cores.

export interface CoreTalentTooltipView {
  /** The frame's data-talent-type. */
  talentType: "core" | "prism-core";
  icon: string | null;
  kicker: string;
  title: string;
  badge: string;
  lines: string[];
  coverage: CoverageView;
  /** What the calculation assumes for this core; "" for none. */
  note: string;
  footer: string;
}
export interface CoreTalentTooltipInput {
  tree: string;
  threshold: number;
  /** The selected core; null for an empty slot. */
  core: { name: string; description?: string; icon: string | null } | null;
  /** The installed prism shown as a core (its base effect); null for a core slot. */
  prism: { base: string; icon: string; effect: string; replacesCore: boolean } | null;
  locked: boolean;
  /** Whether the calculation uses the core, from its description's lines. */
  coverage: (lines: string[]) => CoverageView;
}
// What the calculation assumes for the cores whose effect depends on the fight.
const CORE_NOTES: Readonly<Record<string, string>> = {
  "Subtle Impact":
    "Damage over time only · Requires a Blur grant in the build and Blur enabled in Configuration. Conditional uptime is assumed.",
  Fueling: "Nearby target assumed · Fire Resistance fixed at 0%.",
  "True Flame": "Fire hits only · Requires a modeled Ignite source and uses configured average Affliction.",
};
export function coreTalentTooltipView(input: CoreTalentTooltipInput): CoreTalentTooltipView {
  const { core, prism, threshold } = input;
  const description = prism ? prism.effect : core?.description || "Choose a core talent to view its effects.";
  const lines = description
    .split(/\s*\|\s*|\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    talentType: prism ? "prism-core" : "core",
    icon: prism ? prism.icon : core?.icon || null,
    kicker: prism
      ? prism.replacesCore
        ? "Prism core override"
        : "Separate prism effect"
      : `Core talent · ${threshold} points`,
    title: text(prism ? prism.base : core?.name || `${threshold}-point Core Talent`),
    badge: prism ? "Prism" : core ? "Selected" : input.locked ? "Locked" : "Open",
    lines: lines.map(text),
    coverage: input.coverage(lines),
    note: core ? CORE_NOTES[core.name] || "" : "",
    footer: prism
      ? "Base prism effect"
      : core
        ? "Selected · Click to change"
        : input.locked
          ? `Requires ${threshold} points in ${input.tree}`
          : "Click to select a core talent",
  };
}

// ---- A talent node.

export interface TalentNodeTooltipView {
  /** The frame's data-talent-type (micro, medium, legendary…). */
  talentType: string;
  icon: string | null;
  kicker: string;
  title: string;
  /** "rank/max". */
  badge: string;
  /** Its effects at its rank; empty for a node described in words (`description`). */
  effects: { label: string; value: string; coverage: CoverageView }[];
  description: { text: string; coverage: CoverageView } | null;
  /** An installed prism's effects on this node; null when it has none. */
  prism: {
    heading: string;
    note: string;
    affixes: { tier: string; text: string; coverage: CoverageView | null; reason: string; active: boolean }[];
  } | null;
  footer: string;
}
export interface TalentNodeTooltipInput {
  tree: string;
  node: TalentNode & { description?: string };
  /** The open tree's nodes as shown (to count the allocated legendaries in an Ethereal Prism's area). */
  nodes: readonly TalentNode[];
  rankAt: (coordinate: string) => number;
  icon: string | null;
  locked: boolean;
  /** The node sits in the installed prism's area (an Inverse Image's reflected one). */
  prismAffected: boolean;
  prism: (Prism & { rareAffix?: string }) | null;
  prismCoordinate: string | null;
  prismName: string;
  effectCoverage: (key: string, value: unknown, rank: number) => string;
  lineCoverage: (description: string, allocated: boolean) => string;
  /** An Ethereal Prism's affix coverage ("rareAffix", "legendaryAffix"). */
  prismAffixCoverage: (kind: string) => string;
}
export function talentNodeTooltipView(input: TalentNodeTooltipInput): TalentNodeTooltipView {
  const { node, prism } = input;
  const coordinate = node.coordinate.join(",");
  const rank = input.rankAt(coordinate);
  const type = node.type || "micro";
  const max = node.maxRank || (node.effectsPerRank ? 3 : 1);
  const multiplier = node.reflectedFrom ? inverseImageEffectMultiplier(prism, type) : 1;
  const effects = Object.entries(node.effectsPerRank || node.effects || {}).map(([key, value]) => ({
    label: text(effectLabel(key)),
    value: text(
      formatEffect(key, typeof value === "number" ? value * (node.effectsPerRank ? rank : 1) * multiplier : value),
    ),
    coverage: coverageView(input.effectCoverage(key, value, rank)),
  }));
  return {
    talentType: type,
    icon: input.icon,
    kicker: type === "legendary" ? "Legendary Medium Talent" : `${titleCase(type)} Talent`,
    title: text(node.placeholder ? `${titleCase(type)} Talent` : nodeTitle(node)),
    badge: `${rank}/${max}`,
    effects,
    description: effects.length
      ? null
      : {
          text: text(node.description ? talentEffectText(node.description, rank, multiplier) : "Profession-tree node"),
          coverage: coverageView(input.lineCoverage(node.description || "", rank > 0)),
        },
    prism: input.prismAffected && prism && input.prismCoordinate ? nodePrismEffects(input, type, rank) : null,
    footer: rank > 0 ? "Allocated" : input.locked ? "Locked · prerequisites not met" : "Click to allocate",
  };
}

function nodePrismEffects(input: TalentNodeTooltipInput, type: string, rank: number): TalentNodeTooltipView["prism"] {
  const prism = input.prism as Prism;
  const prismCoordinate = input.prismCoordinate as string;
  if (prism.type === "inverse") {
    if (!input.node.reflectedFrom) return null;
    const roll = inverseImageRoll(prism, type === "legendary" ? "legendary" : type === "medium" ? "medium" : "micro");
    return {
      heading: "Inverse Image",
      note: `Reflected from ${input.node.reflectedFrom}`,
      affixes: [
        {
          tier: "Fixed affix",
          text: `${titleCase(type)} Talent Effect Range: ${roll > 0 ? "+" : ""}${roll}%`,
          coverage: null,
          reason: rank > 0 ? "Active on this reflected talent" : "Allocate this reflected talent to activate",
          active: rank > 0,
        },
      ],
    };
  }
  const bounds = prismAreaBounds(prism, prismCoordinate);
  const activeLegendaryCount = input.nodes.filter(
    (candidate) =>
      candidate.type === "legendary" &&
      candidate.coordinate.join(",") !== prismCoordinate &&
      candidate.coordinate[0] >= bounds.left &&
      candidate.coordinate[0] < bounds.left + bounds.width &&
      candidate.coordinate[1] >= bounds.top &&
      candidate.coordinate[1] < bounds.top + bounds.height &&
      input.rankAt(candidate.coordinate.join(",")) > 0,
  ).length;
  const affixes = prismNodeAffixes(prism, input.node.type, rank, activeLegendaryCount) as {
    tier: string;
    effect: string;
    reason: string;
    active: boolean;
  }[];
  return {
    heading: "Prism effects",
    note: text(input.prismName),
    affixes: affixes.map((affix) => ({
      tier: `${affix.tier} affix`,
      text: text(affix.effect),
      coverage: coverageView(
        affix.active ? input.prismAffixCoverage(affix.tier === "Rare" ? "rareAffix" : "legendaryAffix") : "Inactive",
      ),
      reason: text(affix.reason),
      active: affix.active,
    })),
  };
}

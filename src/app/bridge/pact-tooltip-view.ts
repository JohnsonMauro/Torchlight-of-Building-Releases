// The Pactspirits section's tooltips: a Pactspirit, a tree node (its effect, or the spirit's level bonuses on the outer
// node) and an installed Kismet. One card: a head, blocks of text, a footer. Pure; the planner passes in what depends
// on the open build (src/app/pacts/pacts-controller.js queries) and React renders it
// (apps/web/src/features/pacts/PactTooltip.tsx).
import { normalizePercentageText } from "../../engine/text/percentage-text.js";
import type { CoverageView } from "./gear-item-view.ts";

const text = (value: string) => normalizePercentageText(value);

/** A Kismet affix; with a Star Trail boost, `effective` replaces the rolled value (src/app/pacts/kismet-markup.js). */
export interface BoostedTextView {
  before: string;
  effective: string | null;
  /** The rolled value and the boost, when boosted. */
  title: string;
  after: string;
}
export type PactTooltipBlock =
  | { kind: "heading"; text: string }
  | { kind: "text"; text: string; coverage: CoverageView | null }
  | { kind: "list"; items: { text: BoostedTextView; coverage: CoverageView | null }[] }
  /** The spirit's outer node, pictured. */
  | { kind: "feature"; icon: string; name: string };
export interface PactTooltipView {
  /** The frame's data-rarity; null for none. */
  rarity: string | null;
  icon: string | null;
  title: string;
  kicker: string;
  blocks: PactTooltipBlock[];
  footer: string;
}

const plain = (value: string): BoostedTextView => ({ before: text(value), effective: null, title: "", after: "" });

export interface KismetTooltipInput {
  kismet: { name: string; icon: string; rarity: string; kind: string };
  /** Its affixes at their rolls, each with its Star Trail boost applied and whether the calculation uses it. */
  affixes: { text: BoostedTextView; coverage: CoverageView }[];
  /** "Star Trail ×1.5"…; "" without a boost. */
  boostNote: string;
  /** The node it replaces. */
  nodeName: string;
  slotMode: boolean;
  /** A Fate slot's extra Kismet slot. */
  extra: boolean;
}
export function kismetTooltipView(input: KismetTooltipInput): PactTooltipView {
  const { kismet } = input;
  const actions = input.slotMode
    ? input.extra
      ? "Right-click to edit or clear"
      : "Left-click to allocate · Right-click to edit or clear"
    : "Click to edit · Right-click to remove";
  return {
    rarity: kismet.rarity.toLowerCase(),
    icon: kismet.icon,
    title: text(kismet.name),
    kicker: `${kismet.rarity} · ${kismet.kind} Kismet${input.boostNote ? ` · ${input.boostNote}` : ""}`,
    blocks: [{ kind: "list", items: input.affixes }],
    footer: `${actions} · Replaces ${text(input.nodeName)}`,
  };
}

export interface PactNodeTooltipInput {
  name: string;
  effect: string;
  /** inner, mid, outer, destiny. */
  ring: string;
  icon: string | null;
  /** The spirit in the node's slot, with its level and rarity; null for none. */
  spirit: { name: string; level: number; rarity: string } | null;
  /** The spirit's level bonuses (the outer node shows them), each with its coverage. */
  rewards: { text: string; coverage: CoverageView }[];
  effectCoverage: CoverageView | null;
  slotMode: boolean;
  allocated: boolean;
  /** Micro and Medium nodes take a Kismet. */
  holdsKismet: boolean;
}
const RING_NAMES: Readonly<Record<string, string>> = { inner: "Micro node", mid: "Medium node", outer: "Outer node" };
export function pactNodeTooltipView(input: PactNodeTooltipInput): PactTooltipView {
  const rewards = input.ring === "outer" && input.spirit ? input.rewards : [];
  const blocks: PactTooltipBlock[] = rewards.length
    ? [
        { kind: "heading", text: `Level ${input.spirit?.level} bonuses` },
        { kind: "list", items: rewards.map((reward) => ({ text: plain(reward.text), coverage: reward.coverage })) },
      ]
    : input.effect
      ? [{ kind: "text", text: text(input.effect), coverage: input.effectCoverage }]
      : [];
  const destiny = input.ring === "destiny";
  const footer = input.slotMode
    ? `Left-click to ${input.allocated ? "refund" : "allocate"}${destiny ? " · Right-click to configure Fate slots" : input.holdsKismet ? " · Right-click to add a Kismet" : ""}`
    : destiny
      ? "Click to unlock extra Fate slots · Right-click to remove them"
      : input.holdsKismet
        ? "Click to craft a Kismet · Right-click to remove"
        : "TLIDB · outer node";
  return {
    rarity: input.spirit?.rarity ? input.spirit.rarity.toLowerCase() : null,
    icon: input.icon,
    title: text(input.name),
    kicker: RING_NAMES[input.ring] ?? "Fate slot",
    blocks,
    footer,
  };
}

export interface PactspiritTooltipInput {
  spirit: { name: string; icon: string; category: string; rarity: string; description: string };
  level: number;
  rewards: string[];
  /** The spirit's outer node; null for none. */
  outer: { icon: string; name: string } | null;
}
export function pactspiritTooltipView(input: PactspiritTooltipInput): PactTooltipView {
  const { spirit, level } = input;
  const advance = spirit.rarity === "Legendary" ? 2 : 1;
  const blocks: PactTooltipBlock[] = [
    { kind: "heading", text: "Pactspirit overview" },
    { kind: "text", text: text(spirit.description), coverage: null },
  ];
  if (spirit.rarity !== "Magic")
    blocks.push({
      kind: "text",
      text: `Unlock ${advance} Pact Node${advance === 2 ? "s" : ""} in advance`,
      coverage: null,
    });
  if (input.outer) blocks.push({ kind: "feature", icon: input.outer.icon, name: text(input.outer.name) });
  blocks.push({ kind: "heading", text: `Level ${level} bonuses` });
  blocks.push(
    input.rewards.length
      ? { kind: "list", items: input.rewards.map((reward) => ({ text: plain(reward), coverage: null })) }
      : { kind: "text", text: "No level bonus listed.", coverage: null },
  );
  return {
    rarity: spirit.rarity.toLowerCase(),
    icon: spirit.icon,
    title: text(spirit.name),
    kicker: `${spirit.category} · ${spirit.rarity} · Level ${level}`,
    blocks,
    footer: "Click to change · Right-click to remove",
  };
}

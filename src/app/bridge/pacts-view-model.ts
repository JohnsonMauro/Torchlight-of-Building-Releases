// What the Pactspirits section shows, read from the build's pact settings: the three pact slots, each Pactspirit's tree
// with its Kismet and Fate slots, and the equipped Kismet counts. Pure; the React view (apps/web/src/features/pacts) renders
// it and src/app/pacts/pacts-controller.js publishes it (src/app/bridge/view-sources.ts "pacts"), so the game data stays in the planner's bundle.
import { pactspiritCatalogSs13 } from "../../data/pacts/pactspirit-catalog-ss13.js";
import { pactspiritTreesSs13 } from "../../data/pacts/pactspirit-trees-ss13.js";
import { kismetCatalogSs13 } from "../../data/pacts/kismet-catalog-ss13.js";
import { selenaScorchingBeamPactsSs13 } from "../../data/pacts/selena-scorching-beam-ss13.js";
import { orderedPactspiritNodes, pactspiritLevel } from "../../engine/pacts/pactspirit-levels.js";
import { kismetKindForRing, kismetSlotKey } from "../../engine/pacts/kismet-crafting.js";
import { fateExtraSlots, fateSlotChoice } from "../../engine/pacts/fate-slot-unlocks.js";
import { equippedKismetSummary } from "../../engine/pacts/pact-kismet-summary.js";
import { sortPactspirits } from "../../engine/pacts/pactspirit-selection.js";
import type { PlannerState } from "../../engine/state/planner-state.ts";
import { displayTexts } from "./display-text.ts";
import { searchText } from "./search-match.ts";

export type KismetKind = "micro" | "medium";

/** A node of a Pactspirit tree. */
export interface PactNodeView {
  /** "<Pactspirit>:<index>": the node's allocation and Kismet slot key. */
  key: string;
  index: number;
  ring: string;
  name: string;
  /** Tooltip text (the node's effect, or the Fate slot's state). */
  effect: string;
  /** The equipped Kismet's icon, else the node's. */
  icon: string;
  /** Micro (inner ring) and Medium (mid ring) nodes hold a Kismet. */
  kismetKind: KismetKind | null;
  fate: boolean;
  /** Slot mode: inner, mid, outer and Fate nodes can be allocated and refunded. */
  allocatable: boolean;
  allocated: boolean;
  hasKismet: boolean;
  /** An allocated Fate node with extra slots chosen. */
  fateUnlocked: boolean;
  label: string;
}
/** An extra Kismet slot an unlocked Fate node adds. */
export interface ExtraSlotView {
  key: string;
  kind: KismetKind;
  name: string;
  effect: string;
  icon: string;
  hasKismet: boolean;
  label: string;
}
export interface PactSlotView {
  /** 0–2. */
  index: number;
  /** "" when the slot is empty. */
  name: string;
  spirit: { icon: string; category: string; rarity: string } | null;
  level: number;
  nodes: PactNodeView[];
  extras: ExtraSlotView[];
}
export interface PactsView {
  slotMode: boolean;
  slots: PactSlotView[];
  kismets: { microCount: number; microMax: number; mediumCount: number; mediumMax: number };
}

type Pacts = PlannerState["pacts"];
interface PactTreeNode {
  ring: string;
  name: string;
  effect: string;
  icon: string;
}
const TREES: Readonly<Record<string, PactTreeNode[] | undefined>> = pactspiritTreesSs13;

const quantity = (pacts: Pacts, key: string): number => Number(pacts.nativeNodeQuantities[key] ?? 0);
const equippedKismet = (pacts: Pacts, key: string, kind?: KismetKind) => {
  const name = pacts.kismetSlots[key]?.name;
  return kismetCatalogSs13.find((item) => item.name === name && (kind === undefined || item.kind === kind));
};

/** A Pactspirit's level: saved, else 1 in slot mode, else its captured rank (the default build's pacts). */
function slotLevel(pacts: Pacts, name: string): number {
  const fallback = pacts.kismetSlotMode
    ? 1
    : selenaScorchingBeamPactsSs13.pactspirits.find((spirit: { name: string }) => spirit.name === name)?.rank || 1;
  return pactspiritLevel(name, pacts.spiritLevels, fallback);
}

function nodeView(pacts: Pacts, name: string, node: PactTreeNode, index: number): PactNodeView {
  const slotMode = pacts.kismetSlotMode;
  const key = kismetSlotKey(name, index);
  const kismet = equippedKismet(pacts, key);
  const kismetKind = kismetKindForRing(node.ring) as KismetKind | null;
  const fate = node.ring === "destiny";
  const allocatable = node.ring === "inner" || node.ring === "mid" || node.ring === "outer" || fate;
  const allocated = allocatable && quantity(pacts, key) > 0;
  const unlocked = fateSlotChoice(pacts.fateUnlocks[name]);
  const action = slotMode
    ? `${allocated ? "Allocated" : "Unallocated"}; left-click to ${allocated ? "refund" : "allocate"}${kismetKind ? "; right-click for Kismet" : fate ? "; right-click for Fate slots" : ""}${kismet ? "; drag to move or swap, right-click during drag to copy" : ""}`
    : kismetKind
      ? "Click to craft a Kismet"
      : fate
        ? "Click to unlock Fate slots"
        : "";
  return {
    key,
    index,
    ring: node.ring,
    name: node.name,
    effect: fate
      ? unlocked
        ? "Undetermined Fate installed · unlocks additional Fate slots"
        : "+6% Damage · +6% Minion Damage"
      : node.effect,
    icon: kismet?.icon || node.icon,
    kismetKind,
    fate,
    allocatable,
    allocated,
    hasKismet: Boolean(kismet),
    fateUnlocked: Boolean(unlocked && fate && allocated),
    label: `${node.name}: ${action}`,
  };
}

function slotView(pacts: Pacts, name: string, index: number): PactSlotView {
  const entry = pactspiritCatalogSs13.find((candidate: { name: string }) => candidate.name === name);
  const sequence: PactTreeNode[] = name ? orderedPactspiritNodes(TREES[name] || []) : [];
  const destinyIndex = sequence.findIndex((node) => node.ring === "destiny");
  const destinyAllocated = destinyIndex >= 0 && quantity(pacts, `${name}:${destinyIndex}`) > 0;
  const extras = fateExtraSlots(name, destinyAllocated || !pacts.kismetSlotMode ? pacts.fateUnlocks[name] : null).map(
    (slot) => {
      const kind = slot.kind as KismetKind;
      const kismet = equippedKismet(pacts, slot.key, kind);
      const label = `Extra ${kind === "micro" ? "Micro" : "Medium"} Fate Slot ${slot.index}`;
      return {
        key: slot.key,
        kind,
        name: label,
        effect: kismet ? kismet.affixes.join(" · ") : "Right-click to choose a Kismet",
        icon: kismet?.icon || "",
        hasKismet: Boolean(kismet),
        label: kismet ? `${kismet.name} equipped; right-click to edit` : label,
      };
    },
  );
  return {
    index,
    name,
    spirit: entry ? { icon: entry.icon, category: entry.category, rarity: entry.rarity } : null,
    level: slotLevel(pacts, name),
    nodes: sequence.map((node, nodeIndex) => nodeView(pacts, name, node, nodeIndex)),
    extras,
  };
}

export function pactsView(pacts: Pacts): PactsView {
  const names = Array.from({ length: 3 }, (_, index) => pacts.selectedSpirits[index] || "");
  const summary = equippedKismetSummary(selenaScorchingBeamPactsSs13, pacts);
  return {
    slotMode: pacts.kismetSlotMode,
    slots: names.map((name, index) => slotView(pacts, name, index)),
    kismets: {
      microCount: summary.microCount,
      microMax: summary.microMax,
      mediumCount: summary.mediumCount,
      mediumMax: summary.mediumMax,
    },
  };
}

/** A Pactspirit of the Pactspirit selector (apps/web/src/features/pacts/PactspiritSelectorDialog.tsx). */
export interface PactspiritChoiceView {
  name: string;
  category: string;
  rarity: string;
  icon: string;
  description: string;
  /** What the search box matches (name and description), lower case. */
  search: string;
  /** Its place within its category (rarity, then name). */
  rank: number;
}
export interface PactspiritSelectorView {
  /** Every listed category in catalog order. */
  categories: string[];
  /** Every listed Pactspirit in catalog order. */
  choices: PactspiritChoiceView[];
}

/**
 * Categories the selector leaves out: the Drop Pactspirits only change what monsters drop, and the planner calculates
 * damage and defence. They stay in the catalog, so a saved build that holds one still loads and shows it.
 */
const UNLISTED_CATEGORIES = new Set(["Drop"]);

let selectorView: PactspiritSelectorView | null = null;
/** The Pactspirit selector's choices; the dialog filters them and groups them by category in catalog order. */
export function pactspiritSelectorView(): PactspiritSelectorView {
  if (selectorView) return selectorView;
  const listed = pactspiritCatalogSs13.filter((entry) => !UNLISTED_CATEGORIES.has(entry.category));
  const categories = [...new Set(listed.map((entry) => entry.category))];
  const rank = new Map<string, number>();
  for (const category of categories)
    sortPactspirits(listed.filter((entry) => entry.category === category)).forEach(
      (entry: { name: string }, index: number) => rank.set(entry.name, index),
    );
  selectorView = {
    categories,
    choices: listed.map((entry) => ({
      ...displayTexts({ name: entry.name, description: entry.description }),
      category: entry.category,
      rarity: entry.rarity,
      icon: entry.icon,
      search: searchText([entry.name, entry.category, entry.description]),
      rank: rank.get(entry.name) ?? 0,
    })),
  };
  return selectorView;
}

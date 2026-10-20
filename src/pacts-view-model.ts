// What the Pactspirits section shows, read from the build's pact settings: the three pact slots, each Pactspirit's tree
// with its Kismet and Fate slots, and the equipped Kismet counts. Pure; the React view (apps/web/src/features/pacts) renders
// it and src/app.js publishes it (src/view-sources.ts "pacts"), so the game data stays in the planner's bundle.
import { pactspiritCatalogSs13 } from "./data/pacts/pactspirit-catalog-ss13.js";
import { pactspiritTreesSs13 } from "./data/pacts/pactspirit-trees-ss13.js";
import { kismetCatalogSs13 } from "./data/pacts/kismet-catalog-ss13.js";
import { selenaScorchingBeamPactsSs13 } from "./data/pacts/selena-scorching-beam-ss13.js";
import { orderedPactspiritNodes, pactspiritLevel } from "./pactspirit-levels.js";
import { kismetKindForRing, kismetSlotKey } from "./kismet-crafting.js";
import { fateExtraSlots, fateSlotChoice } from "./fate-slot-unlocks.js";
import { equippedKismetSummary } from "./pact-kismet-summary.js";
import type { PlannerState } from "./planner-state.ts";

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
  allocatedCount: number;
}
export interface PactsView {
  slotMode: boolean;
  slots: PactSlotView[];
  /** Filled pact slots. */
  filled: number;
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
const ALLOCATABLE_RINGS = ["inner", "mid", "outer", "destiny"];

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
  const allocatedCount = sequence.filter(
    (node, nodeIndex) => ALLOCATABLE_RINGS.includes(node.ring) && quantity(pacts, `${name}:${nodeIndex}`) > 0,
  ).length;
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
    allocatedCount,
  };
}

export function pactsView(pacts: Pacts): PactsView {
  const names = Array.from({ length: 3 }, (_, index) => pacts.selectedSpirits[index] || "");
  const summary = equippedKismetSummary(selenaScorchingBeamPactsSs13, pacts);
  return {
    slotMode: pacts.kismetSlotMode,
    slots: names.map((name, index) => slotView(pacts, name, index)),
    filled: names.filter(Boolean).length,
    kismets: {
      microCount: summary.microCount,
      microMax: summary.microMax,
      mediumCount: summary.mediumCount,
      mediumMax: summary.mediumMax,
    },
  };
}

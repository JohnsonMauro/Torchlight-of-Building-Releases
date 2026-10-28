// What the talent trees of the Build page show: the four tree tabs (and the Slates tab), the open tree's points, its
// core talents, and its nodes on the stage with their connections, ranks, availability and the installed prism (its
// area, an Inverse Image's reflected area). Pure; the React view (apps/web/src/features/talents) renders it and
// src/app/talents/talents-controller.js publishes it (src/app/bridge/view-sources.ts "talents"). The open tree, the Slates tab and a prism
// waiting to be placed stay planner state (the prism dialogs change them too).
import {
  allProfessionTalentCatalogue,
  canAllocateTalent,
  MAX_TALENT_POINTS,
  godTalentTrees,
  inverseImageReflectedBounds,
  inverseImageReflectedCoordinates,
  prismAreaBounds,
  prismPrerequisiteFreeCoordinates,
  prismReplacesCore,
  prismTalentNodes,
  TALENT_THRESHOLDS,
  talentFamilies,
  talentPointTotals,
  tliArt,
} from "#engine";
import { prismIcon, prismName } from "../talents/prism-icons.js";

type Coordinate = [number, number];
/** A node of a tree's layout. Other fields are not read here. */
export interface TalentNode {
  coordinate: Coordinate;
  type?: string;
  maxRank?: number;
  icon?: string;
  /** Inverse Image: the coordinate this node is reflected from. */
  reflectedFrom?: string;
}
export interface TalentLayout {
  nodes: TalentNode[];
  edges: [number, number, number, number][];
}
export interface CoreTalent {
  name: string;
  unlockPoints: number;
  icon?: string;
}
/** A talent tree as the planner lists it (src/app/talents/talent-trees.js allTalentPanels). */
export interface TalentPanel {
  name: string;
  coreTalents: CoreTalent[];
}
export interface Prism {
  id: string;
  type: "ethereal" | "inverse";
  base: string;
  radiusAffix?: string;
  legendaryAffix?: string;
}
export interface TalentsState {
  selectedTrees: string[];
  coreSelections: Record<string, string>;
  prismInventory?: Prism[];
  installedPrisms?: Record<string, string>;
  installedPrismNodes?: Record<string, string>;
}
export interface TalentsInput {
  /** The open tree. */
  panel: TalentPanel;
  /** Every tree's own layout (its nodes as the game places them). */
  baseLayouts: Record<string, TalentLayout>;
  /** The layouts the points are counted on (an installed Inverse Image reflects nodes). */
  layouts: Record<string, TalentLayout>;
  /** Points by "<tree>:<column>,<row>". */
  ranks: Record<string, number>;
  talents: TalentsState;
  /** The Slates tab is open (the slate board stands in the tree's place). */
  slateMode: boolean;
  /** A prism waiting for the node it goes on. */
  pendingPrism: { id: string; panel: string } | null;
  /** The points the build may spend (talent-rules.js talentPointBudget): level, Treasure Troves, Path of Progression. */
  budget: { fromLevel: number; treasureTroves: number; pathOfProgression: number; total: number };
}

export interface TalentTabView {
  slot: number;
  /** "God tree", "Class tree", "Tree 3", "Tree 4". */
  label: string;
  name: string | null;
  art: string | null;
  familyClass: string;
  active: boolean;
  /** A slot after an empty one. */
  disabled: boolean;
  /** The points spent in its tree (shown on the tab); null for an empty slot. */
  points: number | null;
}
export type CoreView =
  | {
      kind: "slot";
      threshold: number;
      name: string | null;
      art: string | null;
      selected: boolean;
      locked: boolean;
    }
  /** A prism's own effect beside the cores ("Separate prism effect") or in their place ("Prism override"). */
  | { kind: "prism"; caption: string; name: string; art: string };
export interface TalentConnectionView {
  state: "active" | "reachable" | "locked";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface TalentAreaView {
  left: number;
  top: number;
  width: number;
  height: number;
  /** An Inverse Image's mirrored area. */
  reflected: boolean;
}
export interface TalentNodeView {
  coordinate: string;
  column: number;
  row: number;
  classes: string;
  type: string;
  label: string;
  art: string | null;
  symbol: string;
  rank: number;
  max: number;
  /** Not allocated, and its prerequisites are not met. */
  locked: boolean;
  /** In the installed prism's area (an Inverse Image's reflected one). */
  prismAffected: boolean;
  /** The installed prism, drawn over this node. */
  prism: { label: string; art: string } | null;
}
export interface TalentsView {
  tabs: TalentTabView[];
  slateMode: boolean;
  totalPoints: number;
  /** The points the build may spend: its level's, plus the Treasure Troves' and the Path of Progression's. */
  maxPoints: number;
  /** Points not spent: a tree the game log left short shows here (owner, 2026-10-28). */
  unusedPoints: number;
  /** Every character's cap (level 100, all bonus points): the card's "spent / cap". */
  capPoints: number;
  budget: { fromLevel: number; treasureTroves: number; pathOfProgression: number };
  /** The open tree's family class ("talent-family-goddess-of-knowledge"): its god's colour; "" for none. */
  familyClass: string;
  /** The points spent in the open tree (they unlock its columns and its core talents). */
  panelPoints: number;
  /** The points each column needs, left to right, and whether the open tree has them. */
  thresholds: { points: number; reached: boolean }[];
  /** Prisms go only on the trees after the God tree. */
  canInstallPrism: boolean;
  /** The prism waiting for a node; null when none is. */
  placingPrism: string | null;
  cores: CoreView[];
  connections: TalentConnectionView[];
  areas: TalentAreaView[];
  nodes: TalentNodeView[];
}

const TAB_LABELS = ["God tree", "Class tree", "Tree 3", "Tree 4"];
const catalogue = allProfessionTalentCatalogue as Record<string, { emblem?: string }>;
const art = tliArt as unknown as {
  talentPanels: Record<string, string>;
  coreTalents: Record<string, string>;
  talents: Record<string, Record<string, string>>;
};

/** A tree's family class ("talent-family-goddess-of-knowledge"); "" for none. */
export function talentFamilyClass(name: string | null | undefined): string {
  if (!name) return "";
  const families = talentFamilies as Record<string, string[]>;
  const family = (godTalentTrees as string[]).includes(name)
    ? name
    : Object.entries(families).find(([, trees]) => trees.includes(name))?.[0];
  return family
    ? `talent-family-${family
        .toLowerCase()
        .replace(/[^a-z]+/g, "-")
        .replace(/(^-|-$)/g, "")}`
    : "";
}

/** The open tree's nodes: its layout, reflected by an Inverse Image. */
export function talentDisplayNodes(
  baseLayout: TalentLayout,
  prism: Prism | undefined,
  prismCoordinate: string | undefined,
): TalentNode[] {
  return prismTalentNodes(baseLayout.nodes, prism, prismCoordinate) as TalentNode[];
}

const within = (bounds: { left: number; top: number; width: number; height: number }, [x, y]: Coordinate) =>
  x >= bounds.left && x < bounds.left + bounds.width && y >= bounds.top && y < bounds.top + bounds.height;

// A connection line runs between node centres, trimmed so it stops at the node edges (cells are 0.18 x 0.31 of a node).
function trimConnection([x1, y1, x2, y2]: [number, number, number, number]) {
  const start = { x: x1 + 0.5, y: y1 + 0.5 },
    end = { x: x2 + 0.5, y: y2 + 0.5 },
    dx = end.x - start.x,
    dy = end.y - start.y;
  const distance = Math.sqrt((dx / 0.18) ** 2 + (dy / 0.31) ** 2),
    inset = distance ? 1 / distance : 0;
  return { x1: start.x + dx * inset, y1: start.y + dy * inset, x2: end.x - dx * inset, y2: end.y - dy * inset };
}

export function talentsView(input: TalentsInput): TalentsView {
  const { panel, ranks, talents } = input;
  const selectedTrees = talents.selectedTrees;
  const pointTotals = talentPointTotals(input.layouts, ranks);
  const panelPoints = pointTotals.panels[panel.name] ?? 0;
  const prisms = talents.prismInventory || [];
  const installedPrism = prisms.find((item) => item.id === talents.installedPrisms?.[panel.name]);
  const prismCoordinate = talents.installedPrismNodes?.[panel.name];
  const placing = input.pendingPrism?.panel === panel.name ? input.pendingPrism : null;
  const rankAt = (coordinate: Coordinate | string) => ranks[`${panel.name}:${coordinate}`] || 0;

  const tabs = TAB_LABELS.map((label, slot): TalentTabView => {
    const name = selectedTrees[slot] || null;
    return {
      slot,
      label,
      name,
      art: name ? art.talentPanels[name] || catalogue[name]?.emblem || null : null,
      familyClass: talentFamilyClass(name),
      active: !input.slateMode && name === panel.name,
      disabled: slot > 0 && !selectedTrees[slot - 1],
      points: name ? (pointTotals.panels[name] ?? 0) : null,
    };
  });

  return {
    tabs,
    slateMode: input.slateMode,
    totalPoints: pointTotals.total,
    maxPoints: input.budget.total,
    unusedPoints: Math.max(0, input.budget.total - pointTotals.total),
    capPoints: MAX_TALENT_POINTS,
    budget: {
      fromLevel: input.budget.fromLevel,
      treasureTroves: input.budget.treasureTroves,
      pathOfProgression: input.budget.pathOfProgression,
    },
    familyClass: talentFamilyClass(panel.name),
    panelPoints,
    thresholds: (TALENT_THRESHOLDS as number[]).map((points) => ({ points, reached: panelPoints >= points })),
    canInstallPrism: selectedTrees.indexOf(panel.name) > 0,
    placingPrism: placing ? prismName(prisms.find((item) => item.id === placing.id)) : null,
    cores: coreViews(panel, talents, panelPoints, installedPrism),
    ...stageView(input, installedPrism, prismCoordinate, Boolean(placing), rankAt),
  };
}

function coreViews(
  panel: TalentPanel,
  talents: TalentsState,
  panelPoints: number,
  installedPrism: Prism | undefined,
): CoreView[] {
  if (installedPrism && prismReplacesCore(installedPrism))
    return [
      {
        kind: "prism",
        caption: "Prism override",
        name: installedPrism.base,
        art: prismIcon(installedPrism),
      },
    ];
  const thresholds = [...new Set(panel.coreTalents.map((core) => core.unlockPoints))].sort((a, b) => a - b);
  const cores: CoreView[] = thresholds.map((threshold) => {
    const selectedName = talents.coreSelections[`${panel.name}:${threshold}`];
    const core = panel.coreTalents.find((item) => item.name === selectedName);
    return {
      kind: "slot",
      threshold,
      name: core?.name ?? null,
      art: core ? art.coreTalents[core.name] || core.icon || null : null,
      selected: Boolean(core),
      locked: panelPoints < threshold,
    };
  });
  if (installedPrism?.type === "ethereal")
    cores.push({
      kind: "prism",
      caption: "Separate prism effect",
      name: installedPrism.base,
      art: prismIcon(installedPrism),
    });
  return cores;
}

function stageView(
  input: TalentsInput,
  installedPrism: Prism | undefined,
  prismCoordinate: string | undefined,
  placing: boolean,
  rankAt: (coordinate: Coordinate | string) => number,
): Pick<TalentsView, "connections" | "areas" | "nodes"> {
  const { panel } = input;
  const graph = input.layouts[panel.name];
  const baseLayout = input.baseLayouts[panel.name];
  const hasPrism = Boolean(installedPrism);
  const reflected = inverseImageReflectedCoordinates(installedPrism, prismCoordinate) as Set<string>;
  const prerequisiteFree = prismPrerequisiteFreeCoordinates(
    installedPrism,
    prismCoordinate,
    graph.nodes,
  ) as Set<string>;
  const prismAt = (coordinate: Coordinate) => hasPrism && coordinate.join(",") === prismCoordinate;
  const connections = graph.edges
    .filter(([x1, y1, x2, y2]) => !reflected.has(`${x1},${y1}`) && !reflected.has(`${x2},${y2}`))
    .map((edge): TalentConnectionView => {
      const [x1, y1, x2, y2] = edge;
      const left: Coordinate = x1 <= x2 ? [x1, y1] : [x2, y2];
      const right: Coordinate = x1 <= x2 ? [x2, y2] : [x1, y1];
      const leftOn = rankAt(left) || prismAt(left);
      const rightOn = rankAt(right) || prismAt(right);
      return { state: leftOn && rightOn ? "active" : leftOn ? "reachable" : "locked", ...trimConnection(edge) };
    });
  const prismBounds =
    installedPrism && prismCoordinate
      ? (prismAreaBounds(installedPrism, prismCoordinate) as TalentAreaView & object)
      : null;
  const reflectedBounds = inverseImageReflectedBounds(installedPrism, prismCoordinate) as Omit<
    TalentAreaView,
    "reflected"
  > | null;
  const areas: TalentAreaView[] = prismBounds
    ? [{ ...prismBounds, reflected: false }, ...(reflectedBounds ? [{ ...reflectedBounds, reflected: true }] : [])]
    : [];
  const nativeCoordinates = new Set(baseLayout.nodes.map((node) => node.coordinate.join(",")));
  const nodes = talentDisplayNodes(baseLayout, installedPrism, prismCoordinate).map((node): TalentNodeView => {
    const rank = rankAt(node.coordinate);
    const max = node.maxRank || 1;
    const coordinate = node.coordinate.join(",");
    const isPrismNode = hasPrism && coordinate === prismCoordinate;
    const affected =
      installedPrism?.type === "inverse"
        ? reflected.has(coordinate) && !isPrismNode
        : prismBounds !== null && !isPrismNode && within(prismBounds, node.coordinate);
    const availability = canAllocateTalent({
      panel: panel.name,
      node,
      graph,
      layouts: input.layouts,
      ranks: input.ranks,
      prismCoordinate: hasPrism ? prismCoordinate : null,
      prerequisiteFreeCoordinates: prerequisiteFree,
      maximum: input.budget.total,
    });
    const classes = [
      rank ? "allocated" : "",
      !rank ? "available" : "",
      !rank && !availability.allowed ? "locked" : "",
      node.type === "legendary" ? "legendary-node" : "",
      affected ? "prism-affected-node" : "",
      node.reflectedFrom ? "inverse-reflected-node" : "",
      placing && nativeCoordinates.has(coordinate) ? "prism-placement-target" : "",
      isPrismNode ? "prism-covered-node" : "",
    ];
    const label = `Unallocated ${node.type} talent`;
    return {
      coordinate,
      column: node.coordinate[0] + 1,
      row: node.coordinate[1] + 1,
      classes: classes.filter(Boolean).join(" "),
      type: node.type || "",
      label: `${label}, rank ${rank} of ${max}${availability.allowed ? "" : `, ${availability.reason}`}${affected ? (installedPrism?.type === "inverse" ? ", within Inverse Image reflected area" : ", within prism area") : ""}`,
      art: art.talents[panel.name]?.[node.reflectedFrom || coordinate] || node.icon || null,
      symbol: node.type === "legendary" ? "✧" : node.type === "medium" ? "◇" : "·",
      rank,
      max,
      locked: !rank && !availability.allowed,
      prismAffected: affected,
      prism:
        isPrismNode && installedPrism
          ? { label: `${prismName(installedPrism)} installed here`, art: prismIcon(installedPrism) }
          : null,
    };
  });
  return { connections, areas, nodes };
}

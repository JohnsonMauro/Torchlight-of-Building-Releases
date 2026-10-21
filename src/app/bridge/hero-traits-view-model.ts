// What the HERO tab of the Build page's hero panel shows: the selected hero, the Hero Trait / Trait Path (or Scent Bottle)
// tabs, and the open tab's content: the trait tiers with their memory sockets and the base trait's support slots, a tree
// hero's Trait Path board, or Sage's Scent Bottle. Pure; the React view (apps/web/src/features/hero) renders it and
// src/app/hero/hero-controller.js publishes it (src/app/bridge/view-sources.ts "heroTraits"). The open tab stays planner state.
import { tliArt } from "../../data/assets/tli-art.js";
import { tlidbSupportCatalogSs13 } from "../../data/catalogs/tlidb-ss13.js";
import { allHeroTraitsSs13 } from "../../data/heroes/all-hero-traits-ss13.generated.js";
import { heroById } from "../../data/heroes/hero-catalog-ss13.js";
import { equippedBaseTraitSlot } from "../../data/heroes/memory-revival-ss13.js";
import { sageElixirsSs13 } from "../../data/heroes/sage-scent-ss13.generated.js";
import { sageScentIngredientsSs13 } from "../../data/heroes/sage-scent-options-ss13.js";
import {
  EXTRA_PICK_LEVEL,
  TREE_ROW_LEVELS,
  heroTraitTree,
  heroTreeCapacity,
  heroTreeRules,
  heroTreeSelections,
  treeBoardLayout,
  treeRowLevelKey,
} from "../../engine/heroes/hero-trait-tree.js";
import { heroMemoryIcon, heroMemoryIsRevived, heroTraitSupportConfig } from "../hero/hero-memory-display.js";
import { EXTRA_ROW_CHIP } from "./trait-tooltip-view.ts";

export type HeroDetailTab = "traits" | "path" | "scent";
interface Memory {
  id: string;
  name: string;
  type: string;
  rarity: string;
  revivalMethod?: string;
  waxAndWane?: unknown;
  risingMoon?: unknown;
  revivedAffix?: unknown;
}
/** The stored hero settings (src/engine/state/planner-state.ts PlannerState["hero"]); other fields are not read here. */
export interface HeroState {
  selectedHeroId: string;
  selectedTraits: Record<string, string>;
  memories: Record<string, string>;
  memoryInventory?: Memory[];
  equippedMemoryIds?: Record<string, string>;
  baseTraitMemoryId?: string;
  sageScent?: Record<string, string>;
  carinoSpecialAmmoSupports?: string[];
  heroTraitSupports?: Record<string, string>;
  treeTraits?: Record<string, string[]>;
}
interface Trait {
  name: string;
  level: number;
  icon?: string;
}
interface TreeNode {
  name: string;
  parent?: string;
  base?: boolean;
  x: number;
  y: number;
}

/** A trait button (a base trait, a tier choice, a tree pick). */
export interface TraitView {
  name: string;
  art: string | null;
  /** The level key the trait tooltip reads (data-hero-trait-level-key). */
  levelKey: string;
}
/** A memory socket: data-memory-tier is its slot key ("base", "level45", "<hero>:level45"). */
export interface MemorySocketView {
  tier: string;
  label: string;
  /** The memory in it; null when empty. */
  memory: { name: string; art: string | null; rarity: string | null; revivedId: string | null } | null;
}
export interface SupportSlotView {
  index: number;
  /** data-open-carino-ammo, or the hero id of a trait support slot (data-open-hero-trait-support). */
  opens: string;
  support: { name: string; icon: string | null } | null;
  locked: boolean;
  /** The slot's title; "" for a filled one (its tooltip says it). */
  title: string;
  label: string;
}
export interface SupportSlotsView {
  kind: "carino" | "trait-support";
  label: string;
  heroId: string;
  slots: SupportSlotView[];
}
export interface ChoiceGroupView {
  /** Bing, Creative Genius: "Level 45 upper trait choice"; null for a single group. */
  label: string | null;
  position: "upper" | "lower" | null;
  selectionKey: string;
  choices: (TraitView & { selected: boolean })[];
}
export interface TierView {
  level: number;
  memory: MemorySocketView;
  /** A tree hero's row (0–2; the trait drag moves picks between rows); null for other heroes. */
  row: number | null;
  /** A tree hero's pick in this row (null when empty); undefined for other heroes. */
  pick?: TraitView | null;
  groups: ChoiceGroupView[];
}
export interface TraitTiersView {
  kind: "tiers";
  base: { memory: MemorySocketView | null; trait: TraitView; supports: SupportSlotsView | null };
  tiers: TierView[];
  dual: boolean;
  /**
   * Youga, The Ultimate One with "+1 Max Youga Count in the Universe": the fourth row (no memory of its own; its trait is
   * at the fixed maximum level), with its pick; undefined without it.
   */
  extraRow?: { row: number; pick: TraitView | null; chip: string; level: number; label: string };
  /** Tree heroes: the rows a pick can be dragged to, by the row it comes from. */
  rowMoves: Record<number, number[]>;
}
export interface TraitPathNodeView {
  name: string;
  art: string | null;
  base: boolean;
  selected: boolean;
  locked: boolean;
  /** "Base", "Lv.45" … */
  caption: string;
  levelKey: string;
}
export interface TraitPathLayout {
  height: number;
  nodes: { name: string; x: number; y: number }[];
  lines: TraitPathLineView[];
}
export interface TraitPathLineView {
  key: string;
  active: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface TraitPathView {
  kind: "path";
  picked: number;
  capacity: number;
  nodes: TraitPathNodeView[];
  /** The tree's own layout (node x in % of 400, y in px) and its lines, before the board is measured. */
  initial: { nodes: { name: string; x: number; y: number }[]; lines: TraitPathLineView[] };
  /** The layout at the board's width (px). */
  layoutAt: (width: number) => TraitPathLayout;
}
export interface ScentBottleView {
  kind: "scent";
  elixir: { name: string; icon: string; tags: string[] } | null;
  /** An ingredient slot is filled once a name is stored, even one the catalog no longer has (no art, no tooltip). */
  ingredients: { kind: string; label: string; filled: boolean; ingredient: { name: string; icon: string } | null }[];
}
export interface HeroTraitsView {
  /** null: no hero selected. */
  hero: { id: string; name: string; trait: string; image: string | null } | null;
  /** The two tabs over the tree (Sage and the tree heroes); null when the hero has only its traits. */
  tabs: { id: HeroDetailTab; label: string }[] | null;
  activeTab: HeroDetailTab;
  label: string;
  content: TraitTiersView | TraitPathView | ScentBottleView | null;
}

const SELENA_TIDE = "selena-sing-with-the-tide";
const SAGE = "sage-licorice-note";
const CARINO = "carino-ranger-of-glory";
const BING = "bing-creative-genius";
const CREATIVE_GENIUS_UPPER: Record<number, string[]> = {
  45: ["Inspiration Overflow"],
  60: ["Mind Domain", "Trouble Maker"],
  75: ["Brainstorm", "Flash of Brilliance"],
};
const SCENT_INGREDIENTS = [
  ["damage", "Damage Ingredient"],
  ["defense", "Defense Ingredient"],
  ["functional", "Functional Ingredient"],
] as const;
const art = tliArt as unknown as { hero: { memories: Record<string, string> } };
const supports = tlidbSupportCatalogSs13 as { name: string; icon?: string }[];
const traitsOf = (heroId: string): Trait[] =>
  (allHeroTraitsSs13 as Record<string, { traits: Trait[] }>)[heroId]?.traits || [];

// Lines of a trait tree between node centres, inset to the node edges; lit when both ends are picked.
function treeLines(nodes: TreeNode[], selected: Set<string>): TraitPathLineView[] {
  const byName = new Map(nodes.map((node) => [node.name, node]));
  return nodes.flatMap((node) => {
    const parent = node.parent ? byName.get(node.parent) : undefined;
    if (!parent) return [];
    const dx = node.x - parent.x,
      dy = node.y - parent.y,
      length = Math.hypot(dx, dy) || 1,
      inset = 27;
    return [
      {
        key: node.name,
        active: Boolean((parent.base || selected.has(parent.name)) && selected.has(node.name)),
        x1: parent.x + (dx / length) * inset,
        y1: parent.y + (dy / length) * inset,
        x2: node.x - (dx / length) * inset,
        y2: node.y - (dy / length) * inset,
      },
    ];
  });
}

function supportSlots(heroId: string, hero: HeroState): SupportSlotsView | null {
  if (heroId === CARINO) {
    const unlocked = hero.selectedTraits[`${heroId}:level75`] === "Well Prepared" ? 3 : 2;
    const selections = hero.carinoSpecialAmmoSupports || [];
    return {
      kind: "carino",
      label: "Special Ammo supports",
      heroId,
      slots: [0, 1, 2].map((index) => {
        const support = supports.find((entry) => entry.name === selections[index]);
        const locked = index >= unlocked;
        return {
          index,
          opens: String(index),
          support: support ? { name: support.name, icon: support.icon ?? null } : null,
          locked,
          title: locked ? "Requires Well Prepared" : support ? "" : `Select Special Ammo support ${index + 1}`,
          label: locked
            ? "Requires Well Prepared"
            : support
              ? `Edit ${support.name}; right-click to remove`
              : `Select support for Special Ammo slot ${index + 1}`,
        };
      }),
    };
  }
  const config = (heroTraitSupportConfig as Record<string, { skill: string }>)[heroId];
  if (!config) return null;
  const support = supports.find((entry) => entry.name === (hero.heroTraitSupports?.[heroId] || ""));
  return {
    kind: "trait-support",
    label: `${config.skill} support`,
    heroId,
    slots: [
      {
        index: 0,
        opens: heroId,
        support: support ? { name: support.name, icon: support.icon ?? null } : null,
        locked: false,
        title: support ? "" : `Select ${config.skill} support`,
        label: support ? `Edit ${support.name}; right-click to remove` : `Select support for ${config.skill}`,
      },
    ],
  };
}

function traitTiers(heroId: string, hero: HeroState, traits: Trait[], treeHero: boolean): TraitTiersView {
  const stateKey = (level: number) => (heroId === SELENA_TIDE ? `level${level}` : `${heroId}:level${level}`);
  const baseTrait = traits.find((trait) => trait.level === 1);
  const selectedHero = heroById(heroId) as { trait: string };
  const memoryIcon = (name: string) =>
    heroId === SELENA_TIDE && name === "Ceaseless Tide" ? art.hero.memories["Ceaseless Tide"] : baseTrait?.icon;
  const crafted = (id: string | undefined) => (hero.memoryInventory || []).find((item) => item.id === id);
  const picks: string[] = treeHero ? heroTreeSelections(hero, heroId) : [];
  const traitAt = (name: string | undefined, levelKey: string): TraitView | null => {
    const trait = name ? traits.find((item) => item.name === name && item.level > 1) : undefined;
    return trait ? { name: trait.name, art: trait.icon ?? null, levelKey } : null;
  };
  // The calculation reads "<hero>:level45", then "level45" (src/engine/character-stats.js; the game-log import stores
  // memories under the level alone), so a socket shows and edits the first that holds one.
  const memoryKey = (key: string, level: number) =>
    [key, `level${level}`].find((candidate) => hero.memories[candidate] || hero.equippedMemoryIds?.[candidate]) || key;

  const baseSlot = equippedBaseTraitSlot(hero);
  const baseMemory = crafted(hero.baseTraitMemoryId);
  const tiers = TREE_ROW_LEVELS.map((level): TierView => {
    const key = stateKey(level),
      slotKey = memoryKey(key, level),
      name = hero.memories[slotKey] || "",
      memory = crafted(hero.equippedMemoryIds?.[slotKey]);
    const socket: MemorySocketView = {
      tier: slotKey,
      label: name
        ? `Manage ${name}${heroMemoryIsRevived(memory) ? ", revived" : ""}`
        : `Add level ${level} hero memory`,
      memory: name
        ? {
            name,
            art: (memory ? heroMemoryIcon(memory.type) : memoryIcon(name)) ?? null,
            rarity: memory?.rarity ?? null,
            revivedId: memory && heroMemoryIsRevived(memory) ? memory.id : null,
          }
        : null,
    };
    if (treeHero) {
      const row = TREE_ROW_LEVELS.indexOf(level);
      return { level, memory: socket, row, pick: traitAt(picks[row], key), groups: [] };
    }
    const choices = traits.filter((trait) => trait.level === level);
    const group = (
      groupChoices: Trait[],
      selectionKey: string,
      position: ChoiceGroupView["position"],
    ): ChoiceGroupView => {
      const legacySelection = hero.selectedTraits[key];
      const selected =
        hero.selectedTraits[selectionKey] ||
        (groupChoices.some((choice) => choice.name === legacySelection) ? legacySelection : "");
      return {
        label: position ? `Level ${level} ${position} trait choice` : null,
        position,
        selectionKey,
        choices: groupChoices.map((choice) => ({
          name: choice.name,
          art: choice.icon ?? null,
          levelKey: key,
          selected: selected === choice.name,
        })),
      };
    };
    if (heroId !== BING) return { level, memory: socket, row: null, groups: [group(choices, key, null)] };
    const upperNames = new Set(CREATIVE_GENIUS_UPPER[level] || []);
    return {
      level,
      memory: socket,
      row: null,
      groups: [
        group(
          choices.filter((choice) => upperNames.has(choice.name)),
          `${key}:upper`,
          "upper",
        ),
        group(
          choices.filter((choice) => !upperNames.has(choice.name)),
          `${key}:lower`,
          "lower",
        ),
      ],
    };
  });

  const rowMoves: Record<number, number[]> = {};
  let extraRow: TraitTiersView["extraRow"];
  if (treeHero) {
    const rules = heroTreeRules(hero, heroId),
      rowCount = heroTreeCapacity(hero, heroId) > TREE_ROW_LEVELS.length ? TREE_ROW_LEVELS.length + 1 : 3;
    if (rowCount > TREE_ROW_LEVELS.length) {
      const row = TREE_ROW_LEVELS.length;
      extraRow = {
        row,
        pick: traitAt(picks[row], treeRowLevelKey(heroId, row)),
        chip: EXTRA_ROW_CHIP,
        level: EXTRA_PICK_LEVEL,
        label: `Fourth trait row, ${EXTRA_ROW_CHIP}, level ${EXTRA_PICK_LEVEL} (max)`,
      };
    }
    for (let from = 0; from < rowCount; from += 1)
      if (picks[from] && rules)
        rowMoves[from] = Array.from({ length: rowCount }, (_, to) => to).filter(
          (to) => to !== from && !rules.move(picks, from, to).error,
        );
  }
  return {
    kind: "tiers",
    base: {
      memory: baseSlot
        ? {
            tier: "base",
            label: baseMemory
              ? `Manage base trait ${baseMemory.name}${heroMemoryIsRevived(baseMemory) ? ", revived" : ""}`
              : "Add base trait memory",
            memory: baseMemory
              ? {
                  name: baseMemory.name,
                  art: heroMemoryIcon(baseMemory.type),
                  rarity: baseMemory.rarity,
                  revivedId: heroMemoryIsRevived(baseMemory) ? baseMemory.id : null,
                }
              : null,
          }
        : null,
      trait: {
        name: baseTrait?.name || selectedHero.trait,
        art: baseTrait?.icon ?? null,
        levelKey: "base",
      },
      supports: supportSlots(heroId, hero),
    },
    tiers,
    dual: heroId === BING,
    extraRow,
    rowMoves,
  };
}

function traitPath(heroId: string, hero: HeroState, traits: Trait[]): TraitPathView {
  const tree = heroTraitTree(heroId) as { base: string; nodes: TreeNode[] },
    rules = heroTreeRules(hero, heroId);
  if (!rules) throw new Error(`${heroId} has no trait tree`);
  const selected: string[] = heroTreeSelections(hero, heroId);
  const picked = selected.filter(Boolean),
    selectedSet = new Set(picked),
    atLimit = picked.length >= rules.capacity;
  const traitByName = new Map(traits.map((trait) => [trait.name, trait]));
  return {
    kind: "path",
    picked: picked.length,
    capacity: rules.capacity,
    nodes: tree.nodes.map((node) => {
      const trait = traitByName.get(node.name),
        parentReady = node.base || node.parent === tree.base || selectedSet.has(node.parent ?? ""),
        chosen = Boolean(node.base || selectedSet.has(node.name));
      return {
        name: node.name,
        art: trait?.icon ?? null,
        base: Boolean(node.base),
        selected: chosen,
        locked: !node.base && !chosen && (!parentReady || atLimit),
        caption: node.base ? "Base" : trait?.level ? `Lv.${trait.level}` : "",
        levelKey: node.base
          ? "base"
          : selected.includes(node.name)
            ? treeRowLevelKey(heroId, selected.indexOf(node.name))
            : `${heroId}:tree`,
      };
    }),
    initial: {
      nodes: tree.nodes.map((node) => ({ name: node.name, x: node.x / 4, y: node.y })),
      lines: treeLines(tree.nodes, selectedSet),
    },
    layoutAt: (width) => {
      const layout = treeBoardLayout(tree, width) as { height: number; nodes: TreeNode[] };
      return {
        height: layout.height,
        nodes: layout.nodes.map((node) => ({ name: node.name, x: node.x, y: node.y })),
        lines: treeLines(layout.nodes, selectedSet),
      };
    },
  };
}

function scentBottle(hero: HeroState): ScentBottleView {
  const scent = hero.sageScent || {};
  const elixir = (sageElixirsSs13 as { name: string; icon: string; tags: string[] }[]).find(
    (entry) => entry.name === scent.elixir,
  );
  const ingredients = sageScentIngredientsSs13 as Record<string, { name: string; icon: string }[]>;
  return {
    kind: "scent",
    elixir: elixir ? { name: elixir.name, icon: elixir.icon, tags: elixir.tags } : null,
    ingredients: SCENT_INGREDIENTS.map(([kind, label]) => {
      const ingredient = ingredients[kind].find((entry) => entry.name === scent[kind]);
      return {
        kind,
        label,
        filled: Boolean(scent[kind]),
        ingredient: ingredient ? { name: ingredient.name, icon: ingredient.icon } : null,
      };
    }),
  };
}

export function heroTraitsView(hero: HeroState, activeTab: HeroDetailTab): HeroTraitsView {
  const selected = heroById(hero.selectedHeroId) as
    { id: string; name: string; trait: string; image?: string } | undefined;
  if (!selected) return { hero: null, tabs: null, activeTab, label: "No hero selected", content: null };
  const sage = selected.id === SAGE,
    treeHero = Boolean(heroTraitTree(selected.id));
  const traits = traitsOf(selected.id);
  const view = {
    hero: { id: selected.id, name: selected.name, trait: selected.trait, image: selected.image ?? null },
    tabs:
      sage || treeHero
        ? [
            { id: "traits" as const, label: "Hero Trait" },
            treeHero ? { id: "path" as const, label: "Trait Path" } : { id: "scent" as const, label: "Scent Bottle" },
          ]
        : null,
    activeTab,
    label: `${selected.name}, ${selected.trait} hero traits`,
  };
  if (sage && activeTab === "scent") return { ...view, content: scentBottle(hero) };
  if (treeHero && activeTab === "path") return { ...view, content: traitPath(selected.id, hero, traits) };
  return { ...view, content: traitTiers(selected.id, hero, traits, treeHero) };
}

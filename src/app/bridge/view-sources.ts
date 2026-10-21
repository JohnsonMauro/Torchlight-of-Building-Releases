// Data the planner (each section's controller in src/app/<section>/*, registered by src/app/app.js) publishes for the
// React views while it owns the open build. Each source is a
// reader of the current data; the planner calls viewSourceChanged where it used to re-render its own markup, so a source
// is read again only then (and only while a view subscribes). Edits go the other way, through src/app/bridge/planner-commands.js.
import type { PlannerResult } from "../../engine/planner-api.ts";
import type { PlannerState } from "../../engine/state/planner-state.ts";
import type { PactsView, PactspiritSelectorView } from "./pacts-view-model.ts";
import type { FollowerPanelView, FollowerPickerCard } from "../hero/follower-panel.js";
import type { SkillsView } from "./skills-view-model.ts";
import type { SlatesView } from "./slates-view-model.ts";
import type { EquipmentView } from "./equipment-view-model.ts";
import type { TalentsView } from "./talents-view-model.ts";
import type { HeroTraitsView } from "./hero-traits-view-model.ts";
import type { CarinoAmmoSelectorView, SageScentSelectorView } from "./hero-dialogs-view-model.ts";
import type { StatsView } from "./stats-view-model.ts";
import type { SkillSelectorView } from "./skill-selector-view.ts";
import type { GameLogImportView } from "./game-log-import-view.ts";
import type { HeroMemoryView } from "./hero-memory-view.ts";
import type { PrismCrafterView } from "./prism-crafter-view.ts";
import type { EquipmentCrafterView } from "./equipment-crafter-view.ts";
import type { InventoryItemEditorView } from "./inventory-item-editor-view.ts";
import type { SlateCrafterView } from "../slates/slate-craft.ts";

/** The Config tab: the calculated build and the combat settings it was calculated with. */
export interface ConfigurationSource {
  planner: PlannerResult;
  combat: PlannerState["combat"];
  /** Manual mode: the same build in automatic mode (which conditions this build has a source for); null otherwise. */
  probe: PlannerResult | null;
  /** The skills active in this build (a skill short of Energy, or disabled, is not). */
  activeNames: ReadonlySet<string>;
}

/** A dialog the planner opens: `session` goes up at every opening. */
export interface DialogSession {
  session: number;
}

export interface ViewSources {
  /** The open view (src/app/planner/workspace.js): a build tab, or a focused view (builds, character, configuration). */
  workspace: { view: string; focused: boolean };
  configuration: ConfigurationSource;
  /** The Pactspirits section (src/app/bridge/pacts-view-model.ts). */
  pacts: PactsView;
  /** The hero panel's FOLLOWER tab (src/app/hero/follower-panel.js followerPanelView). */
  follower: FollowerPanelView;
  /** The Skills section of the Build page (src/app/bridge/skills-view-model.ts). */
  skills: SkillsView;
  /** The Divinity Slates board (src/app/bridge/slates-view-model.ts). */
  slates: SlatesView;
  /** The Gear section of the Build page (src/app/bridge/equipment-view-model.ts). */
  equipment: EquipmentView;
  /** The talent trees of the Build page (src/app/bridge/talents-view-model.ts). */
  talents: TalentsView;
  /** The HERO tab of the hero panel (src/app/bridge/hero-traits-view-model.ts). */
  heroTraits: HeroTraitsView;
  /** The Stats view (src/app/bridge/stats-view-model.ts). */
  stats: StatsView;
  /** The hero selector: its opening (counted, so its search starts over) and the open build's hero. */
  heroSelector: DialogSession & { selectedHeroId: string };
  /** The follower selector: its opening and its cards (src/app/hero/follower-panel.js followerPickerView). */
  followerSelector: DialogSession & { cards: FollowerPickerCard[] };
  /** The Pactspirit selector: its opening and every Pactspirit (src/app/bridge/pacts-view-model.ts). */
  pactspiritSelector: DialogSession & PactspiritSelectorView;
  /** Sage's scent selector: its opening and the slot's choices (src/app/bridge/hero-dialogs-view-model.ts). */
  sageScentSelector: DialogSession & SageScentSelectorView;
  /** Carino's Special Ammo selector: its opening, the slot and its supports. */
  carinoAmmoSelector: DialogSession & CarinoAmmoSelectorView;
  /** The talent tree picker: the trees the open slot can take (a God tree for slot 1). */
  talentPicker: {
    title: string;
    god: boolean;
    cards: { name: string; familyClass: string; art: string; selected: boolean; points: number }[];
  };
  /** The core talent picker: the open tree's choices for a slot, locked below the slot's points. */
  corePicker: {
    title: string;
    status: string;
    locked: boolean;
    options: { name: string; description: string; art: string; selected: boolean }[];
  };
  /** The Fate slot selector: the Pactspirit it is open for, its unlock, and every unlock. */
  fateSlotSelector: { spirit: string; selected: string; choices: { id: string; label: string }[] };
  /** The skill selector (src/app/bridge/skill-selector-view.ts). */
  skillSelector: SkillSelectorView;
  /**
   * The Inventory item dialog: the open item (its name raw for the title, escaped-text name, rarity classes, art and
   * whether it is equipped), and while editing, its editor (src/app/bridge/inventory-item-editor-view.ts).
   */
  inventoryItem: {
    id: string;
    title: string;
    editing: boolean;
    item: { name: string; classes: string; icon: string; equipped: boolean } | null;
    editor: InventoryItemEditorView | null;
  };
  /** The slate editor: the board slate it is open for (`session` goes up at every drawing: opening, a rotation). */
  slateEditor: DialogSession & {
    id: string;
    title: string;
    name: string;
    icon: string;
    rotate: boolean;
    flip: boolean;
    rarity: string;
    affixes: string[];
  };
  /**
   * The Slate Inventory: the crafted slates (on the grid, "equipped"; beside it, "staged"; with their art, or their shape
   * in their god's color), or the crafter's mode, which the planner writes itself.
   */
  slateInventory: {
    mode: "inventory" | "crafter";
    /** The slate crafter, in its mode (src/app/slates/slate-craft.ts). */
    crafter: SlateCrafterView | null;
    items: {
      id: string;
      name: string;
      detail: string;
      state: "equipped" | "staged" | "";
      icon: string;
      shape: { godKey: string; cells: [number, number][] } | null;
    }[];
  };
  /** The Kismet crafter: its opening, the slot kind's Kismets, the chosen one's values and preview. */
  kismetCrafter: DialogSession & {
    title: string;
    selected: string;
    /** `search`: the name and effects as typed text, lowercase; `label` and `affixes`: as shown. */
    choices: { name: string; search: string; icon: string; rarity: string; label: string; affixes: string }[];
    rolls: { index: number; min: number; max: number; step: number; value: number; affix: string }[];
    preview: {
      icon: string;
      name: string;
      detail: string;
      /** Each effect; with a Star Trail boost, `effective` replaces the rolled number (src/app/pacts/kismet-markup.js). */
      affixes: { before: string; effective: string | null; title: string; after: string }[];
      install: string;
    } | null;
  };
  /** The Prism crafter (src/app/bridge/prism-crafter-view.ts). */
  prismCrafter: PrismCrafterView;
  /** The equipment crafter (src/app/bridge/equipment-crafter-view.ts). */
  equipmentCrafter: EquipmentCrafterView;
  /** The feedback dialog: its opening, the form ("calculation", "bug", "answer") and what it was opened with. */
  feedback: DialogSession & { formKey: string; context: Record<string, unknown> & { buildCode?: string } };
  /** The hero memory dialog: the inventory, or the crafter (src/app/bridge/hero-memory-view.ts). */
  heroMemory: HeroMemoryView;
  /** The Import from game dialog: its opening and what it shows (src/app/bridge/game-log-import-view.ts). */
  gameLogImport: DialogSession & GameLogImportView;
  /** The prism inventory: the tree slot it is open for, every crafted prism, and whether that tree has one installed. */
  prismInventory: {
    slot: number;
    items: {
      id: string;
      name: string;
      icon: string;
      /** "Ethereal Prism · 1x1 area · Installed in Lich" */
      detail: string;
      equipped: boolean;
      installedElsewhere: boolean;
    }[];
    installedHere: boolean;
  };
}
export type ViewSourceName = keyof ViewSources;

interface Source<T> {
  read: (() => T) | null;
  version: number;
  snapshot: { version: number; value: T } | null;
  listeners: Set<() => void>;
}
const sources = new Map<ViewSourceName, Source<unknown>>();

function source<K extends ViewSourceName>(name: K): Source<ViewSources[K]> {
  let entry = sources.get(name);
  if (!entry) {
    entry = { read: null, version: 0, snapshot: null, listeners: new Set() };
    sources.set(name, entry);
  }
  return entry as Source<ViewSources[K]>;
}

/**
 * The planner provides a source while it loads. Subscribers are not told: reading now could run a calculation before the
 * planner has finished loading. Its first viewSourceChanged (the first render of that view) announces the data.
 */
export function provideViewSource<K extends ViewSourceName>(name: K, read: () => ViewSources[K]): void {
  source(name).read = read;
}

/** The data behind a source changed: the next read calls its reader again. */
export function viewSourceChanged(name: ViewSourceName): void {
  const entry = source(name);
  entry.version++;
  for (const listener of entry.listeners) {
    try {
      listener();
    } catch (error) {
      console.error(error);
    }
  }
}

/** Calls `listener` after every change of the source. Returns the unsubscribe function. */
export function subscribeViewSource(name: ViewSourceName, listener: () => void): () => void {
  const entry = source(name);
  entry.listeners.add(listener);
  return () => entry.listeners.delete(listener);
}

/** The source's current data, the same object until it changes; null before the planner has provided it. */
export function readViewSource<K extends ViewSourceName>(name: K): ViewSources[K] | null {
  const entry = source(name);
  if (!entry.read) return null;
  if (entry.snapshot?.version !== entry.version) entry.snapshot = { version: entry.version, value: entry.read() };
  return entry.snapshot.value;
}

// Data the legacy planner (src/app/app.js) publishes for the React views while it still owns the open build. Each source is a
// reader of the current data; the planner calls viewSourceChanged where it used to re-render its own markup, so a source
// is read again only then (and only while a view subscribes). Edits go the other way, through src/app/bridge/planner-commands.js.
import type { PlannerResult } from "../../engine/planner-api.ts";
import type { PlannerState } from "../../engine/state/planner-state.ts";
import type { PactsView, PactspiritSelectorView } from "./pacts-view-model.ts";
import type { FollowerPanelView, FollowerPickerCard } from "../follower-panel.js";
import type { SkillsView } from "./skills-view-model.ts";
import type { SlatesView } from "./slates-view-model.ts";
import type { EquipmentView } from "./equipment-view-model.ts";
import type { TalentsView } from "./talents-view-model.ts";
import type { HeroTraitsView } from "./hero-traits-view-model.ts";
import type { CarinoAmmoSelectorView, SageScentSelectorView } from "./hero-dialogs-view-model.ts";
import type { StatsView } from "./stats-view-model.ts";

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
  configuration: ConfigurationSource;
  /** The Pactspirits section (src/app/bridge/pacts-view-model.ts). */
  pacts: PactsView;
  /** The hero panel's FOLLOWER tab (src/app/follower-panel.js followerPanelView). */
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
  /** The follower selector: its opening and its cards (src/app/follower-panel.js followerPickerView). */
  followerSelector: DialogSession & { cards: FollowerPickerCard[] };
  /** The Pactspirit selector: its opening and every Pactspirit (src/app/bridge/pacts-view-model.ts). */
  pactspiritSelector: DialogSession & PactspiritSelectorView;
  /** Sage's scent selector: its opening and the slot's choices (src/app/bridge/hero-dialogs-view-model.ts). */
  sageScentSelector: DialogSession & SageScentSelectorView;
  /** Carino's Special Ammo selector: its opening, the slot and its supports. */
  carinoAmmoSelector: DialogSession & CarinoAmmoSelectorView;
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

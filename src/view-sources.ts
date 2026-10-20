// Data the legacy planner (src/app.js) publishes for the React views while it still owns the open build. Each source is a
// reader of the current data; the planner calls viewSourceChanged where it used to re-render its own markup, so a source
// is read again only then (and only while a view subscribes). Edits go the other way, through src/planner-commands.js.
import type { PlannerResult } from "./planner-api.ts";
import type { PlannerState } from "./planner-state.ts";
import type { PactsView } from "./pacts-view-model.ts";

/** The Config tab: the calculated build and the combat settings it was calculated with. */
export interface ConfigurationSource {
  planner: PlannerResult;
  combat: PlannerState["combat"];
  /** Manual mode: the same build in automatic mode (which conditions this build has a source for); null otherwise. */
  probe: PlannerResult | null;
  /** The skills active in this build (a skill short of Energy, or disabled, is not). */
  activeNames: ReadonlySet<string>;
}

export interface ViewSources {
  configuration: ConfigurationSource;
  /** The Pactspirits section (src/pacts-view-model.ts). */
  pacts: PactsView;
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

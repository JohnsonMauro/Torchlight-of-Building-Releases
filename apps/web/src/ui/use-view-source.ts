// Reads a source the legacy planner publishes (src/view-sources.ts) and re-renders when the planner says it changed.
import { useCallback, useSyncExternalStore } from "react";
import { readViewSource, subscribeViewSource } from "@legacy/view-sources.ts";
import type { ViewSourceName, ViewSources } from "@legacy/view-sources.ts";

/** The source's data; null until the planner has loaded and provided it. */
export function useViewSource<K extends ViewSourceName>(name: K): ViewSources[K] | null {
  const subscribe = useCallback((onChange: () => void) => subscribeViewSource(name, onChange), [name]);
  const read = useCallback(() => readViewSource(name), [name]);
  return useSyncExternalStore(subscribe, read);
}

// The saved-build library as the UI reads it: a snapshot from src/planner-state.ts that changes when this tab writes the
// library (subscribeBuildLibrary) or another tab does (the `storage` event).
import { useSyncExternalStore } from "react";
import { loadBuildLibrary, plannerLibraryStorageKey, subscribeBuildLibrary } from "@legacy/planner-state.ts";
import type { BuildLibrary, LibraryBuild } from "@legacy/planner-state.ts";

export type { BuildLibrary, LibraryBuild };

let version = 0;
let snapshot: { version: number; library: BuildLibrary } | null = null;

function subscribe(onChange: () => void): () => void {
  const changed = () => {
    version++;
    onChange();
  };
  const unsubscribe = subscribeBuildLibrary(changed);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === plannerLibraryStorageKey) changed();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    unsubscribe();
    window.removeEventListener("storage", onStorage);
  };
}

// useSyncExternalStore needs the same object back until something changed.
function getSnapshot(): BuildLibrary {
  if (snapshot?.version !== version) snapshot = { version, library: loadBuildLibrary() };
  return snapshot.library;
}

export function useBuildLibrary(): BuildLibrary {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function activeBuild(library: BuildLibrary): LibraryBuild | undefined {
  return library.builds.find((build) => build.id === library.activeBuildId);
}

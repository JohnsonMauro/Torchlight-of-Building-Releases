// The saved-build library as the UI reads it: a snapshot from src/app/storage/build-library.ts that changes when this tab writes the
// library (subscribeBuildLibrary) or another tab does (the `storage` event).
import { useSyncExternalStore } from "react";
import {
  loadBuildLibrary,
  plannerLibraryStorageKey,
  subscribeBuildLibrary,
} from "@legacy/app/storage/build-library.ts";
import type { BuildLibrary, LibraryBuild } from "@legacy/app/storage/build-library.ts";

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

// useSyncExternalStore needs the same object back until something changed, and a new one when it did. The planner
// edits the cached library in place (an autosave changes a build's state and updatedAt), so each change gets a fresh
// copy of the library and of every build record; the states inside are shared, not copied.
function getSnapshot(): BuildLibrary {
  if (snapshot?.version !== version) {
    const library = loadBuildLibrary();
    snapshot = { version, library: { ...library, builds: library.builds.map((build) => ({ ...build })) } };
  }
  return snapshot.library;
}

export function useBuildLibrary(): BuildLibrary {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function activeBuild(library: BuildLibrary): LibraryBuild | undefined {
  return library.builds.find((build) => build.id === library.activeBuildId);
}

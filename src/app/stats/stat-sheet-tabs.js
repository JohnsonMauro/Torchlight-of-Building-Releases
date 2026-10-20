// The Character stats tab the Stats page shows (apps/web/src/features/stats/StatSheet.tsx), kept in sessionStorage so a
// reload of the tab opens it again.

export const STAT_TAB_STORAGE_KEY = "tli-builder:stat-sheet-tab:v1";

export function readStoredStatTab(storage = session()) {
  try {
    return storage?.getItem(STAT_TAB_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function storeStatTab(key, storage = session()) {
  try {
    storage?.setItem(STAT_TAB_STORAGE_KEY, key);
  } catch {
    /* storage unavailable */
  }
}

function session() {
  try {
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
}

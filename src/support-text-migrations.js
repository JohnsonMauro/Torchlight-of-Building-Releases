// Read-time migration for saved supports (src/planner-state.ts normalizePlannerState), like src/changed-item-migrations.js.
// A support installed from the catalog is saved with a copy of the catalog's effect text (src/app.js, src/game-log-import.js),
// so a support whose text the catalog has since changed (scripts/import-tlidb-skill-catalog.mjs rebuilds a support text
// when TLIDB changes it) would keep the old copy. User rule 2026-10-15: old builds change with the data. A saved support
// named after a catalog support reads the catalog's current effect text; one the catalog does not hold keeps its own.
// Storage is not rewritten eagerly: the build carries the new text when it is next saved.
import { tlidbSupportCatalogSs13 } from "./data/catalogs/tlidb-ss13.js";

const catalogEffects = new Map(tlidbSupportCatalogSs13.map((entry) => [entry.name, entry.effects]));

function migrateSupport(support) {
  const effects = catalogEffects.get(support?.name);
  if (!effects || !Array.isArray(support.effects) || JSON.stringify(support.effects) === JSON.stringify(effects))
    return support;
  return { ...support, effects: [...effects] };
}

/** Saved custom supports by setup key, with catalog supports reading the catalog's current effect text. */
export function migrateCustomSupports(customSupports = {}) {
  return Object.fromEntries(
    Object.entries(customSupports).map(([key, supports]) => [
      key,
      Array.isArray(supports) ? supports.map(migrateSupport) : supports,
    ]),
  );
}

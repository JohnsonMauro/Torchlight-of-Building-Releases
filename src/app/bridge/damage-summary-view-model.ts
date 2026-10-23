// The character column's damage summary (apps/web/src/features/stats/DamageSummary.tsx): the build's average DPS over
// the recount span and each source's share — the Stats page's recount card (src/app/bridge/stats-view-model.ts), with
// the same sources left out, so both read the same figures — and the main skill. The recount timeline is part of every
// calculated build (src/engine/combat/dummy-recount.js), so this is a pass over its bins. Pure.
import type { MainSkill } from "../../engine/index.ts";
import { MIX_COLORS, RECOUNT_SPAN_SECONDS, recountSourceShares, recountTiles } from "../stats/dummy-recount-panel.js";
import { numberText, type NumberText } from "../stats/number-text.ts";

export interface DamageSummaryView {
  /** Whether any damage source is modeled; without one there is no recount. */
  modeled: boolean;
  spanSeconds: number;
  /** "Average DPS in a span of time" of the recount card. */
  averageDps: NumberText | null;
  mainSkill: { name: string; level: number; icon: string } | null;
  sources: { key: string; label: string; share: string; width: string; color: string }[];
}

// The calculated build as read here (src/engine/planner-api.ts PlannerResult).
interface Planner {
  mainSkill?: MainSkill | null;
  damageSources?: { name: string; status: string }[];
  dummyRecount?: { timeline?: unknown } | null;
}
interface Tile {
  key: string;
  value: number;
}
interface Share {
  key: string;
  label: string;
  share: number;
  excluded?: boolean;
}

/** No figures: calculations are paused (safe mode) or nothing is modeled. */
export const EMPTY_DAMAGE_SUMMARY: DamageSummaryView = {
  modeled: false,
  spanSeconds: RECOUNT_SPAN_SECONDS,
  averageDps: null,
  mainSkill: null,
  sources: [],
};

/** The summary of a calculated build; `excluded`: the recount sources the Stats page leaves out. */
export function damageSummaryView(planner: Planner, excluded: readonly string[]): DamageSummaryView {
  const recount = planner.dummyRecount;
  const main = planner.mainSkill;
  const mainSkill = main?.name ? { name: main.name, level: main.effectiveLevel, icon: main.icon } : null;
  const modeled =
    Boolean(recount?.timeline) && (planner.damageSources || []).some((source) => source.status === "modeled");
  if (!modeled || !recount)
    return { modeled: false, spanSeconds: RECOUNT_SPAN_SECONDS, averageDps: null, mainSkill, sources: [] };
  const average = (recountTiles(recount, { excluded }) as Tile[]).find((tile) => tile.key === "averageDps");
  // Colours by rank in the full list, as on the recount card; sources left out or under 0.05% (0.0%) are not listed.
  const sources = (recountSourceShares(recount, { excluded }) as Share[])
    .map((item, index) => ({ item, color: MIX_COLORS[index % MIX_COLORS.length] }))
    .filter(({ item }) => !item.excluded && item.share >= 0.0005)
    .map(({ item, color }) => ({
      key: item.key,
      label: item.label,
      share: `${(item.share * 100).toFixed(1)}%`,
      width: `${(item.share * 100).toFixed(2)}%`,
      color,
    }));
  return {
    modeled: true,
    spanSeconds: RECOUNT_SPAN_SECONDS,
    averageDps: average ? numberText(average.value) : null,
    mainSkill,
    sources,
  };
}

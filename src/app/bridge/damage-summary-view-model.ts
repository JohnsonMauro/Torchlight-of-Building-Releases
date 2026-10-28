// The character column's damage summary (apps/web/src/features/stats/DamageSummary.tsx): the build's average DPS over
// the recount span and each source's share — the Stats page's recount card (src/app/bridge/stats-view-model.ts), with
// the same sources left out, so both read the same figures — and the main skill. The recount timeline is part of every
// calculated build (packages/engine/src/combat/dummy-recount.js), so this is a pass over its bins. Pure.
import { tlidbSkillCatalog, type MainSkill } from "#engine";
import { MIX_COLORS, RECOUNT_SPAN_SECONDS, recountSourceShares, recountTiles } from "../stats/dummy-recount-panel.js";
import { numberText, type NumberText } from "../stats/number-text.ts";

export interface DamageSummaryView {
  /** Whether any damage source is modeled; without one there is no recount. */
  modeled: boolean;
  spanSeconds: number;
  /** "Average DPS in a span of time" of the recount card. */
  averageDps: NumberText | null;
  mainSkill: { name: string; level: number; icon: string } | null;
  sources: DamageSummarySource[];
}
/** A recount source; a skill's carries its name (its tooltip), its icon, its uses and its Spell Burst status. */
export interface DamageSummarySource {
  key: string;
  label: string;
  share: string;
  width: string;
  color: string;
  skill: { name: string; icon: string; detail: string; spellBurst: string; spellBurstOk: boolean } | null;
}

// The calculated build as read here (packages/engine/src/planner-api.ts PlannerResult).
interface Planner {
  mainSkill?: MainSkill | null;
  damageSources?: { name: string; status: string }[];
  dummyRecount?: { timeline?: unknown } | null;
  skillHits?: readonly {
    name: string;
    setupKey?: string;
    notes?: readonly string[];
    rate?: { usesPerSecond?: number; spellBurst?: { maxSpellBurst: number; fullChargeSeconds: number } | null };
  }[];
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

const BURST_BLOCK = /cannot activate Spell Burst: (.+?)(?: \(|\.?$)/;
const round2 = (value: number) => Math.round(value * 100) / 100;

/** The skill a recount source ("hit:<setupKey>") is, with what the summary shows of it; null for other sources (Ignite). */
function sourceSkill(key: string, skillHits: NonNullable<Planner["skillHits"]>): DamageSummarySource["skill"] {
  if (!key.startsWith("hit:")) return null;
  const entry = skillHits.find((hit) => `hit:${hit.setupKey}` === key);
  if (!entry) return null;
  const burst = entry.rate?.spellBurst;
  const block = (entry.notes ?? []).map((note) => String(note).match(BURST_BLOCK)).find(Boolean);
  const uses = entry.rate?.usesPerSecond;
  return {
    name: entry.name,
    icon: tlidbSkillCatalog.find((skill) => skill.name === entry.name)?.icon || "",
    detail: Number.isFinite(uses) ? `${round2(uses as number)} uses/s` : "",
    spellBurst: burst
      ? `Activates Spell Burst: ${burst.maxSpellBurst} stacks every ${round2(burst.fullChargeSeconds)} s`
      : block
        ? `Cannot activate Spell Burst: ${block[1]}`
        : "",
    spellBurstOk: Boolean(burst),
  };
}

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
  // Colours by rank in the full list, as on the recount card; every source that deals damage is listed (owner,
  // 2026-10-27), a share under 0.1% as "<0.1%".
  const sources = (recountSourceShares(recount, { excluded }) as Share[])
    .map((item, index) => ({ item, color: MIX_COLORS[index % MIX_COLORS.length] }))
    .filter(({ item }) => !item.excluded && item.share > 0)
    .map(({ item, color }): DamageSummarySource => ({
      key: item.key,
      label: item.label,
      share: item.share >= 0.0005 ? `${(item.share * 100).toFixed(1)}%` : "<0.1%",
      width: `${(item.share * 100).toFixed(2)}%`,
      color,
      skill: sourceSkill(item.key, planner.skillHits ?? []),
    }));
  return {
    modeled: true,
    spanSeconds: RECOUNT_SPAN_SECONDS,
    averageDps: average ? numberText(average.value) : null,
    mainSkill,
    sources,
  };
}

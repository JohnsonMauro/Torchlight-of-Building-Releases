// What the build strip says about the open build's season (apps/web/src/shell/LoadoutStrip.tsx): nothing for a build made
// in the current season; for one made in an earlier season, that season, and the change carrying it into the current one
// until the user dismisses it (src/engine/state/season-migration.js). Pure: it reads the stored state it is given.
import { currentSeason, seasonChangeSummary, seasonLabel } from "../../engine/index.ts";

export interface BuildSeasonView {
  /** "SS13 build". */
  text: string;
  /** "Made in SS13, read with SS14 rules". */
  detail: string;
  /** The change not dismissed yet: its summary and each part it removed. */
  change: { summary: string; removed: string[] } | null;
}

interface SeasonFields {
  seasonOrigin?: string;
  seasonChange?: { from: string; to: string; removed: string[]; talentPointsReturned: number } | null;
}

export function buildSeasonView(state: unknown): BuildSeasonView | null {
  const { seasonOrigin, seasonChange } = (state ?? {}) as SeasonFields;
  if (!seasonOrigin || (seasonOrigin === currentSeason.id && !seasonChange)) return null;
  return {
    text: `${seasonLabel(seasonOrigin)} build`,
    detail: `Made in ${seasonLabel(seasonOrigin)}, read with ${currentSeason.label} rules`,
    change: seasonChange ? { summary: seasonChangeSummary(seasonChange), removed: [...seasonChange.removed] } : null,
  };
}

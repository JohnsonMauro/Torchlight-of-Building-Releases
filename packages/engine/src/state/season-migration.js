// Carrying a build from an earlier season into the current one (owner, 2026-10-22, as Path of Building does): the build is
// read with the current season's rules and keeps what is still compatible; what the current season no longer has is
// removed (an item, a talent node: its points go back) and listed, so the page can say what changed. The build keeps the
// season it was made in (`seasonOrigin`) and the list (`seasonChange`) until the user dismisses it.
import { removeIncompatible } from "./season-compatibility.js";
import { currentSeason, seasonById, seasonLabel, seasons } from "./season.ts";

// What changes between two seasons beyond what the compatibility pass finds (packages/engine/src/state/
// season-compatibility.js), by the season a build leaves: seasonSteps.ss14 = (state) => state carries an SS14 build into
// SS15 (renamed items, moved talent nodes, re-rolled ranges of the texts copied into the build). None yet.
export const seasonSteps = {};

/**
 * A stored build carried into the current season: unchanged when it already follows it. A build without a season predates
 * the field and follows the season it was saved in, the current one when seasons started to be recorded (SS14). Throws
 * for a season the planner does not know (a build from a newer version of it).
 */
export function migrateBuildSeason(
  state,
  { known = seasons, steps = seasonSteps, compatible = removeIncompatible } = {},
) {
  const current = known[known.length - 1];
  const season = state.season ?? currentSeason.id;
  const seasonOrigin = state.seasonOrigin ?? season;
  const from = known.findIndex((entry) => entry.id === season);
  if (from < 0 || !known.some((entry) => entry.id === seasonOrigin))
    throw new TypeError(
      `This build was made for ${seasonLabel(from < 0 ? season : seasonOrigin)}, a season this planner does not know yet`,
    );
  if (season === current.id) return { ...state, season, seasonOrigin };
  let next = state;
  for (const { id } of known.slice(from, -1)) next = steps[id] ? steps[id](next) : next;
  const { state: kept, removed, talentPointsReturned } = compatible(next);
  // A change not dismissed yet (a build that skipped a season) keeps its first season and adds what this one removed.
  const earlier = state.seasonChange;
  return {
    ...kept,
    season: current.id,
    seasonOrigin,
    seasonChange: {
      from: earlier?.from ?? season,
      to: current.id,
      removed: [...(earlier?.removed || []), ...removed],
      talentPointsReturned: (earlier?.talentPointsReturned || 0) + talentPointsReturned,
    },
  };
}

/** "SS13 → SS14: 3 parts removed, 12 talent points returned" for a build's pending season change, or "". */
export function seasonChangeSummary(change) {
  if (!change) return "";
  const parts = [
    change.removed.length
      ? `${change.removed.length} incompatible part${change.removed.length === 1 ? "" : "s"} removed`
      : "nothing incompatible",
    ...(change.talentPointsReturned
      ? [`${change.talentPointsReturned} talent point${change.talentPointsReturned === 1 ? "" : "s"} returned`]
      : []),
  ];
  return `Moved from ${seasonLabel(change.from)} to ${seasonById(change.to)?.label ?? seasonLabel(change.to)}: ${parts.join(", ")}`;
}

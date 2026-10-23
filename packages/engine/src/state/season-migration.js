// Carrying a build from an earlier season into the current one (owner, 2026-10-22, as Path of Building does): the build is
// read with the current season's rules and keeps what is still compatible; what the current season no longer has is
// removed (an item, a talent node: its points go back) and listed, so the page can say what changed. The build keeps the
// season it was made in (`seasonOrigin`) and the list (`seasonChange`) until the user dismisses it.
import { allProfessionTalentCatalogue } from "../../data/talents/all-profession-trees.generated.js";
import { legendaryGear } from "../../data/gear/legendary-gear.generated.js";
import { currentSeason, seasonById, seasonLabel, seasons } from "./season.ts";

// What changes between two seasons beyond what the compatibility pass finds, by the season a build leaves:
// seasonSteps.ss14 = (state) => state carries an SS14 build into SS15 (renamed items, moved talent nodes…). None yet.
export const seasonSteps = {};

const legendaryNames = new Set(legendaryGear.map((item) => item.name));

// A legendary the current season's catalog no longer has; other items are kept (their bases do not change between seasons).
const missingLegendary = (item) => item?.rarity === "legendary" && !legendaryNames.has(item.name);

// The build's parts the current season does not have, removed: talent ranks on a tree or node that no longer exists (or
// above the node's max rank: the extra points go back), core talents a tree no longer offers, a prism on a node that no
// longer exists, legendary items no longer in the catalog. Returns the state, what was removed and the points returned.
export function removeIncompatible(state, trees = allProfessionTalentCatalogue) {
  const removed = [];
  let talentPointsReturned = 0;
  const nodeOf = (tree, coordinate) => trees[tree]?.nodes.find((node) => node.coordinate.join(",") === coordinate);
  const prismType = (id) => (state.talents?.prismInventory || []).find((item) => item.id === id)?.type;
  const talentRanks = {};
  for (const [key, rank] of Object.entries(state.talentRanks || {})) {
    const at = key.lastIndexOf(":");
    const [tree, coordinate] = [key.slice(0, at), key.slice(at + 1)];
    // An installed Inverse Image keeps ranks on its mirrored positions, which are not nodes of the tree: its tree's
    // ranks are checked only for the tree itself.
    const mirrored = prismType(state.talents?.installedPrisms?.[tree]) === "inverse" && trees[tree];
    const node = nodeOf(tree, coordinate);
    if (!node && !mirrored) {
      if (rank > 0) {
        removed.push(`Talent ${tree} ${coordinate}`);
        talentPointsReturned += rank;
      }
      continue;
    }
    const kept = node ? Math.min(rank, node.maxRank) : rank;
    if (kept < rank) {
      removed.push(`Talent ${tree} ${coordinate}: ${rank - kept} rank${rank - kept === 1 ? "" : "s"}`);
      talentPointsReturned += rank - kept;
    }
    talentRanks[key] = kept;
  }
  const coreSelections = {};
  for (const [key, core] of Object.entries(state.talents?.coreSelections || {})) {
    const tree = key.slice(0, key.lastIndexOf(":"));
    if (!core || trees[tree]?.coreTalents.some((talent) => talent.name === core)) coreSelections[key] = core;
    else removed.push(`Core talent ${core} (${tree})`);
  }
  const installedPrisms = { ...(state.talents?.installedPrisms || {}) },
    installedPrismNodes = { ...(state.talents?.installedPrismNodes || {}) };
  for (const [tree, coordinate] of Object.entries(installedPrismNodes))
    if (!nodeOf(tree, coordinate)) {
      removed.push(`Prism on ${tree} ${coordinate} (back in the prism inventory)`);
      delete installedPrisms[tree];
      delete installedPrismNodes[tree];
    }
  const equipmentOverrides = {},
    disabledEquipmentSlots = [...(state.disabledEquipmentSlots || [])];
  for (const [slot, item] of Object.entries(state.equipmentOverrides || {})) {
    if (!missingLegendary(item)) {
      equipmentOverrides[slot] = item;
      continue;
    }
    removed.push(`${item.name} (${slot})`);
    if (!disabledEquipmentSlots.includes(slot)) disabledEquipmentSlots.push(slot);
  }
  const equipmentInventory = (state.equipmentInventory || []).filter((item) => {
    if (!missingLegendary(item)) return true;
    // An equipped copy was listed above with its slot.
    if (!Object.values(state.equipmentOverrides || {}).some((equipped) => equipped?.sourceInventoryId === item.id))
      removed.push(`${item.name} (inventory)`);
    return false;
  });
  return {
    state: {
      ...state,
      talentRanks,
      disabledEquipmentSlots,
      equipmentOverrides,
      equipmentInventory,
      ...(state.talents ? { talents: { ...state.talents, coreSelections, installedPrisms, installedPrismNodes } } : {}),
    },
    removed,
    talentPointsReturned,
  };
}

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

// Main stats (manual keyword text, config_multi_language_en): "Every point of Strength / Dexterity / Intelligence additionally
// increases the damage of skills that have it as a main stat by 0.5% … This includes … Ailment Damage dealt directly by the
// skill … When a skill has multiple main stats, the bonuses of the main stats are added together before calculating the
// final damage bonus". A skill's main stats are its Strength / Dexterity / Intelligence tags; the points are the stat
// sheet's totals.
export const MAIN_STATS = ["Strength", "Dexterity", "Intelligence"];

export const mainStatsOf = (tags = []) => tags.filter((tag) => MAIN_STATS.includes(tag));

/** [{ stat, value }]: 0.5% additional damage per point of each of the skill's main stats (`points` keyed in lower case). */
export function mainStatParts(stats = [], points = null) {
  return stats
    .filter((stat) => Number(points?.[stat.toLowerCase()]))
    .map((stat) => ({ stat, value: 0.5 * Number(points[stat.toLowerCase()]) }));
}

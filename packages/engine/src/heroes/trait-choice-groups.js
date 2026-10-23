// The trait choices of a hero's level 45 / 60 / 75 tiers and the `hero.selectedTraits` key that holds each pick, for the
// heroes that pick one trait per tier (not the trait-tree heroes, packages/engine/src/heroes/hero-trait-tree.js). The
// calculation (character-stats.js heroTraitStatLines), the Hero Trait tab (src/app/bridge/hero-traits-view-model.ts) and
// the game-log import read the same keys, one pick per group.
import { allHeroTraits } from "../../data/heroes/all-hero-traits.generated.js";
import { heroTraitTree } from "./hero-trait-tree.js";

export const TRAIT_TIER_LEVELS = [45, 60, 75];
// Selena – Sing with the Tide keeps her tier picks under the level alone (selena-tide.js SING_WITH_THE_TIDE; not imported:
// selena-tide.js reaches character-stats.js, which reads these groups).
const SING_WITH_THE_TIDE = "selena-sing-with-the-tide";

// Bing – Creative Genius picks one trait in each of two groups per tier ("an additional Trait can be selected at each
// level threshold"); the groups as the game's Hero Trait screen draws them (2026-10-23, commit e09d11f). The other
// choices of the tier are the lower group.
const UPPER_CHOICES = {
  "bing-creative-genius": {
    45: ["Inspiration Overflow"],
    60: ["Mind Domain", "Trouble Maker"],
    75: ["Brainstorm", "Flash of Brilliance"],
  },
};

/** Whether a hero picks its 45 / 60 / 75 traits in `hero.selectedTraits` (false for a trait-tree hero). */
export const picksTraitsByTier = (heroId) => Boolean(heroId) && !heroTraitTree(heroId);

/** The key of a hero's tier: "level45" for Selena – Sing with the Tide, "<heroId>:level45" for the others. */
export const traitTierKey = (heroId, level) =>
  heroId === SING_WITH_THE_TIDE ? `level${level}` : `${heroId}:level${level}`;

/** @typedef {{ name: string, level: number, icon?: string, description?: string }} TierTrait */
/** @typedef {{ position: "upper" | "lower" | null, selectionKey: string, choices: TierTrait[] }} TraitChoiceGroup */

/**
 * A tier's choice groups: one group (position null) under the tier key, or Bing's "upper" and "lower" groups under
 * "<tier key>:upper" / ":lower".
 * @param {string} heroId
 * @param {number} level
 * @returns {TraitChoiceGroup[]}
 */
export function traitTierGroups(heroId, level) {
  /** @type {TierTrait[]} */
  const choices = (allHeroTraits[heroId]?.traits || []).filter((trait) => trait.level === level);
  const key = traitTierKey(heroId, level);
  const upper = UPPER_CHOICES[heroId]?.[level];
  if (!upper) return [{ position: null, selectionKey: key, choices }];
  return [
    { position: "upper", selectionKey: `${key}:upper`, choices: choices.filter((trait) => upper.includes(trait.name)) },
    {
      position: "lower",
      selectionKey: `${key}:lower`,
      choices: choices.filter((trait) => !upper.includes(trait.name)),
    },
  ];
}

/** The group of a tier that offers `traitName`, or null. */
export function traitGroupOf(heroId, level, traitName) {
  return (
    traitTierGroups(heroId, level).find((group) => group.choices.some((trait) => trait.name === traitName)) || null
  );
}

/** The picked traits of a by-tier hero, [{ level, selectionKey, trait }], one per group that holds one of its choices. */
export function selectedTierTraits(heroId, selectedTraits = {}) {
  if (!picksTraitsByTier(heroId)) return [];
  return TRAIT_TIER_LEVELS.flatMap((level) =>
    traitTierGroups(heroId, level).flatMap((group) => {
      const trait = group.choices.find((choice) => choice.name === selectedTraits[group.selectionKey]);
      return trait ? [{ level, selectionKey: group.selectionKey, trait }] : [];
    }),
  );
}

/**
 * Moves the picks an older build or the game-log import stored under another key into their group's key: "level45"
 * (every by-tier hero but Selena – Sing with the Tide, whose tier key it is) and, for a hero with two groups,
 * "<heroId>:level45". A group that already holds a pick keeps it (the one the Hero Trait tab shows); the older key goes
 * either way. A name that is no choice of the tier stays where it is.
 */
export function withTierTraitKeys(heroId, selectedTraits = {}) {
  if (!picksTraitsByTier(heroId)) return selectedTraits;
  const next = { ...selectedTraits };
  for (const level of TRAIT_TIER_LEVELS) {
    const groups = traitTierGroups(heroId, level);
    const legacyKeys = [`level${level}`, traitTierKey(heroId, level)].filter(
      (key, index, keys) => keys.indexOf(key) === index && !groups.some((group) => group.selectionKey === key),
    );
    for (const key of legacyKeys) {
      const group = groups.find((candidate) => candidate.choices.some((trait) => trait.name === next[key]));
      if (!group) continue;
      if (!next[group.selectionKey]) next[group.selectionKey] = next[key];
      delete next[key];
    }
  }
  return next;
}

// Iris – Growing Breeze (hero trait audit batch B6, 2026-10-19; research/hero-traits-audit-2026-10-19.md §5 B6, §8 B6):
// Nourishment on the Spirit Magi (and, with Nourishing Spring Rain, on the Synthetic Troops). Pure;
// packages/engine/src/heroes/minion-heroes.js dispatches to it, packages/engine/src/minions/minion-damage-model.js applies it. The
// Nourishment grant / loss / effect lines keep their reader (packages/engine/src/minions/minion-damage-model.js nourishmentState) and
// their badge rule in packages/engine/src/text/line-coverage.js; this module reads only the clauses B6 adds.
//
// Provisional readings (src/app/stats/open-questions.js, shown only for the hero):
// - Socialite: +1 Max Summonable Spirit Magi per Magus skill, within the map cap read as one per Magus skill + "Max Spirit Magi In
//   Map" lines. Windrider: channelled whenever the Trait Skill switch is on, 3 Nourishment (+1 with the moon) per 5 × 0.33 s ÷ (1 +
//   Cast Speed). Full Bloom: entered at every 10 Nourishment stacks granted (and at the start with own buffs built), 12 s; the
//   Ultimate in the cycle while it lasts.

import { KEYWORDS, TROOPS, firstOf, originEffectPools, round, shared, sumOf } from "../minion-hero-lines.js";

export const GROWING_BREEZE = "iris-growing-breeze";

export const GROWING_PATTERNS = Object.freeze({
  empowerShare: /^(\d+(?:\.\d+)?)% of your Empower Skill Effect bonus is also applied to Spirit Magi's Nourishment$/i,
  mapCap: /^\+(\d+) to Max Spirit Magi In Map$/i,
  summonable: /^Max Summonable Spirit Magi of Spirit Magus Skills \+(\d+)$/i,
  fullBloom: /^After gaining a total of (\d+) stacks of Nourishment, Spirit Magi enter Full Bloom for ([\d.]+) ?s$/i,
  ultimateCdr:
    /^When a Spirit Magus casts the Ultimate while having Full Bloom, \+?(\d+(?:\.\d+)?)% additional Ultimate Cooldown Recovery Speed for every stack of Nourishment$/i,
  windrider: /^Changes the Base Trait to Holding a Trait Skill or Spirit Magus Skill to use Windrider$/i,
  autoTrait: /^Always attempts to auto-trigger the Trait Skill, Growing Breeze$/i,
  originShare:
    /^(\d+(?:\.\d+)?)% of the bonus applied to Origin of Spirit Magus is also applied to Spirit Magi's Nourishment$/i,
  // Revived (Nourishing Spring Rain, Nature's Party).
  troopNourish: /^Nourishment can be applied to Synthetic Troop Minions$/i,
  troopGrowth:
    /^When Spirit Magi are present, \+(\d+(?:\.\d+)?)% additional damage for Synthetic Troop Minions for every (\d+) Growth, up to \+(\d+(?:\.\d+)?)%$/i,
  troopLoss:
    /^When Spirit Magi are present, -(\d+(?:\.\d+)?)% chance for Synthetic Troop Minions to lose Nourishment for every (\d+(?:\.\d+)?)% chance to use Enhanced Skills$/i,
  modularization: /^The cooldown of Modularization Skills is reduced to ([\d.]+) ?s$/i,
  partyHeader: /^Nourishment applies additional base effects:?$/i,
  partyFrost:
    /^Frost Magus: Restores ([\d.]+)% of Missing Life and Energy Shield to you on hit\. Interval: ([\d.]+) ?s\. \+(\d+) Max Frostbite Rating per Nourishment stack$/i,
  partyThunder:
    /^Thunder Magus: Inflicts Numbed on hit\. Interval: ([\d.]+) ?s\. \+(\d+(?:\.\d+)?)% additional Lightning Damage dealt to Numbed enemies per Nourishment stack$/i,
  partyFire:
    /^Fire Magus: \+(\d+(?:\.\d+)?)% additional Critical Strike Damage and -(\d+(?:\.\d+)?)% Critical Strike Rating per Nourishment stack$/i,
  partyRock:
    /^Rock Magus: Transfers (\d+(?:\.\d+)?)% of damage taken to this Minion, and adds Physical Damage equal to ([\d.]+)% of Armor per Nourishment stack, up to (\d+) Physical Damage per stack$/i,
  partyErosion: /^Erosion Magus: Inflicts Deterioration on hit$/i,
});
const KEYS = Object.keys(GROWING_PATTERNS);
const REVIVED_KEYS = [
  "troopNourish",
  "troopGrowth",
  "troopLoss",
  "modularization",
  "partyHeader",
  "partyFrost",
  "partyThunder",
  "partyFire",
  "partyRock",
  "partyErosion",
];

/** Growing Breeze's state: the Nourishment Effect shares, Windrider, the Socialite counts, the troops and Nature's Party. */
function state(lines, { modifierTexts, empower, castSpeedPercent, stats }) {
  const I = GROWING_PATTERNS;
  const empowerShare = sumOf(lines, I.empowerShare);
  const originShare = sumOf(lines, I.originShare);
  const origin = originEffectPools(modifierTexts);
  const fromEmpower = shared(empower, empowerShare),
    fromOrigin = shared(origin, originShare);
  const cdr = firstOf(lines, I.ultimateCdr);
  const windrider = Boolean(firstOf(lines, I.windrider));
  const castFactor = Math.max(0.01, 1 + (Number(castSpeedPercent) || 0) / 100);
  const thunder = firstOf(lines, I.partyThunder),
    fire = firstOf(lines, I.partyFire),
    rock = firstOf(lines, I.partyRock),
    frost = firstOf(lines, I.partyFrost);
  const troopGrowth = firstOf(lines, I.troopGrowth),
    troopLoss = firstOf(lines, I.troopLoss);
  return {
    empower,
    empowerSharePercent: empowerShare,
    origin,
    originSharePercent: originShare,
    // Nourishment effect: increased pool from the shares, each additional share multiplies (provisional).
    effectIncreasedPercent: round(fromEmpower.increased + fromOrigin.increased),
    effectAdditional: [...fromEmpower.additional, ...fromOrigin.additional],
    effectFactor: round(
      Math.max(0, 1 + (fromEmpower.increased + fromOrigin.increased) / 100) *
        [...fromEmpower.additional, ...fromOrigin.additional].reduce(
          (product, value) => product * (1 + value / 100),
          1,
        ),
    ),
    windrider: windrider
      ? {
          intervalSeconds: round((KEYWORDS.windrider.channelSeconds * KEYWORDS.windrider.maxStacks) / castFactor),
          stacks: KEYWORDS.windrider.nourishment,
          castSpeedPercent: Number(castSpeedPercent) || 0,
        }
      : null,
    ultimateCdrPercent: cdr ? Number(cdr.match[1]) : 0,
    mapCap: sumOf(lines, I.mapCap),
    summonable: sumOf(lines, I.summonable),
    troops: firstOf(lines, I.troopNourish)
      ? { lossPerChancePercent: troopLoss ? Number(troopLoss.match[1]) / Number(troopLoss.match[2]) : 0 }
      : null,
    troopGrowth: troopGrowth
      ? {
          percent: Number(troopGrowth.match[1]),
          per: Number(troopGrowth.match[2]),
          capPercent: Number(troopGrowth.match[3]),
        }
      : null,
    party:
      firstOf(lines, I.partyHeader) || thunder || fire || rock || frost || firstOf(lines, I.partyErosion)
        ? {
            frost: frost ? { maxFrostbitePerStack: Number(frost.match[3]) } : null,
            thunder: thunder
              ? { intervalSeconds: Number(thunder.match[1]), percentPerStack: Number(thunder.match[2]) }
              : null,
            fire: fire
              ? { critDamagePerStack: Number(fire.match[1]), critRatingPerStack: Number(fire.match[2]) }
              : null,
            rock: rock
              ? {
                  armorPercent: Number(rock.match[2]),
                  capPerStack: Number(rock.match[3]),
                  armor: Number(stats.armor) || 0,
                  perStack: Math.min(Number(rock.match[3]), ((Number(stats.armor) || 0) * Number(rock.match[2])) / 100),
                }
              : null,
            erosion: Boolean(firstOf(lines, I.partyErosion)),
          }
        : null,
  };
}

/** The badge of one Growing Breeze clause, from the settled state and the Minions' results. */
function lineStatus(key, state, { modeled, list, pending, inCalc, inactive, neutral }) {
  const g = state.growing;
  if (!g) return inactive("the loadout's lines are not in the build");
  const magi = modeled
    ? modeled.filter((minion) => minion.family === "spirit-magus")
    : state.hasMagus
      ? [{ name: "the Spirit Magi" }]
      : [];
  const nourished = modeled ? magi.filter((minion) => minion.magus?.nourishment) : magi;
  const noMagus = !state.hasMagus
    ? "no modeled Spirit Magus"
    : !state.traitPressed
      ? "the Trait Skill switch is off: no Nourishment"
      : "no Nourishment";
  const troops = modeled
    ? modeled.filter((minion) => TROOPS.has(minion.family))
    : state.hasTroop
      ? [{ name: "the troops" }]
      : [];
  const party = (magusKey) =>
    modeled ? modeled.find((minion) => minion.key === magusKey && minion.magus?.nourishment) : null;
  switch (key) {
    case "empowerShare":
      return !nourished.length
        ? inactive(noMagus)
        : g.empower.increased || g.empower.additional.length
          ? inCalc(
              `${g.empowerSharePercent}% of your Empower Skill Effect bonus (${g.empower.sources.map((item) => item.text).join(", ")}) on Nourishment: ×${g.effectFactor} Nourishment Effect (provisional)`,
            )
          : inactive(
              'no Empower Skill Effect bonus (plain "+X% Empower Skill Effect" lines; the conditional Defensive Skill lines are not read)',
            );
    case "mapCap":
    case "summonable": {
      const raised = modeled ? magi.filter((minion) => minion.heroTraits?.extraCount > 0) : [];
      return raised.length
        ? inCalc(
            `${list(raised)}: +${raised.reduce((sum, minion) => sum + minion.heroTraits.extraCount, 0)} Spirit Magus (Max Summonable +${g.summonable} per Magus skill, within the map cap of one per Magus skill + ${g.mapCap}; both lines are needed; provisional)`,
          )
        : magi.length
          ? pending
            ? inCalc("settled after the Minion pass")
            : inactive(`no Magus skill can field another Magus (Max Summonable +${g.summonable}, map cap +${g.mapCap})`)
          : inactive("no modeled Spirit Magus");
    }
    case "fullBloom":
    case "ultimateCdr": {
      const bloom = modeled
        ? nourished.filter(
            (minion) => minion.heroTraits?.fullBloom?.entries > 0 && minion.heroTraits?.ultimate?.casts > 0,
          )
        : nourished;
      return bloom.length
        ? inCalc(
            key === "fullBloom"
              ? `Full Bloom at every 10 Nourishment stacks granted (and at the start with own buffs built), 12 s: ${list(bloom)} cast the Ultimate whenever ready inside it (8 s initial cooldown, keyword Full Bloom), and 50% of the Minion speed bonuses become additional damage (provisional)`
              : `the Ultimate's cooldown recovers +${g.ultimateCdrPercent}% faster per Nourishment stack held at the cast (provisional)`,
          )
        : inactive(noMagus);
    }
    case "windrider":
      return nourished.length && g.windrider && state.traitPressed
        ? inCalc(
            `Windrider channelled whenever the Trait Skill switch is on: 3 Nourishment (+ the moon's 1) per full channel every ${g.windrider.intervalSeconds} s (5 × 0.33 s ÷ (1 + ${round(g.windrider.castSpeedPercent)}% Cast Speed); keyword Windrider; provisional), replacing the 5 s press`,
          )
        : inactive(noMagus);
    case "autoTrait":
      return !magi.length
        ? inactive("no modeled Spirit Magus")
        : state.traitPressed
          ? neutral(
              "the best case already presses the Trait Skill whenever off cooldown; the auto-trigger keeps it pressed with the switch off",
            )
          : inCalc("the Trait Skill is auto-triggered whenever off cooldown, whatever the switch");
    case "originShare":
      return !nourished.length
        ? inactive(noMagus)
        : g.origin.increased || g.origin.additional.length
          ? inCalc(
              `${g.originSharePercent}% of the Origin of Spirit Magus effect bonus on Nourishment: ×${g.effectFactor} Nourishment Effect (provisional)`,
            )
          : inactive("no Origin of Spirit Magus effect bonus in the build");
    case "troopNourish": {
      const got = modeled ? troops.filter((minion) => minion.heroTraits?.troopNourish) : troops;
      return got.length
        ? inCalc(`${list(got)} take Nourishment from the Trait Skill presses, with the Magi's loss rules (provisional)`)
        : inactive(
            !troops.length
              ? "no modeled Synthetic Troop / Module Minion"
              : "the Trait Skill switch is off: no Nourishment",
          );
    }
    case "troopGrowth":
      return troops.length && magi.length
        ? inCalc(
            "the Spirit Magi's Growth (the highest) gives the troops +5% additional damage per 10 Growth (provisional)",
          )
        : inactive(!troops.length ? "no modeled Synthetic Troop / Module Minion" : "no Spirit Magus present");
    case "troopLoss": {
      const got = modeled
        ? troops.filter((minion) => minion.heroTraits?.troopNourish && minion.heroTraits.lossReduction > 0)
        : [];
      return got.length
        ? inCalc(
            `the troops' Nourishment loss chance is lowered by ${round(got[0].heroTraits.lossReduction)}% (2% per 1% of the Magi's Enhanced-skill chance)`,
          )
        : inactive(
            !troops.length
              ? "no modeled Synthetic Troop / Module Minion"
              : !magi.length
                ? "no Spirit Magus present"
                : pending
                  ? "settled after the Minion pass"
                  : "the Spirit Magi have no Enhanced-skill chance",
          );
    }
    case "modularization":
      return neutral(
        "each Module is summoned once and stays: a shorter Modularization cooldown changes no dummy figure",
      );
    case "partyHeader": {
      const any = modeled
        ? nourished.some(
            (minion) => minion.heroTraits?.party || minion.heroTraits?.partyFire || minion.heroTraits?.partyRock,
          )
        : nourished.length > 0;
      return any
        ? inCalc("the per-Magus Nourishment effects below")
        : inactive(
            nourished.length
              ? "no modeled Spirit Magus has a damage effect here (Frost: Minion Frostbite is not modeled)"
              : noMagus,
          );
    }
    case "partyFrost":
      return party("frost-magus")
        ? {
            status: "Not modeled",
            reason:
              "Frostbite inflicted by Minions is not modeled (the Frost Magus's Max Frostbite Rating); the Life and Energy Shield restore has no DPS effect",
          }
        : inactive("no Nourished Frost Magus");
    case "partyThunder": {
      const m = party("thunder-magus");
      return m?.heroTraits?.party?.numbedStacks > 0
        ? inCalc(
            `${m.heroTraits.party.numbedStacks} Numbed stacks held on the dummy (its Nourished hits, ${m.heroTraits.party.nourishedHitsPerSecond}/s, one per 0.2 s, 2 s each): +5% Lightning Damage taken each on its own Lightning hits, and +2% additional Lightning Damage per Nourishment stack (provisional)`,
          )
        : inactive("no Nourished Thunder Magus");
    }
    case "partyFire": {
      const m = party("fire-magus");
      return m?.heroTraits?.partyFire
        ? inCalc(
            "per Nourishment stack held: +9% additional Critical Strike Damage and -20% Critical Strike Rating on each Fire Magus use (the expected value over the stacks; provisional)",
          )
        : inactive("no Nourished Fire Magus");
    }
    case "partyRock": {
      const m = party("rock-magus");
      return m?.heroTraits?.partyRock
        ? inCalc(
            `+${round(g.party.rock.perStack)} Physical Damage per Nourishment stack (${g.party.rock.armorPercent}% of ${round(g.party.rock.armor)} Armor, up to ${g.party.rock.capPerStack}) added to the Rock Magus's hits; the damage transfer has no DPS effect (provisional)`,
          )
        : m
          ? inactive("no Armor")
          : inactive("no Nourished Rock Magus");
    }
    case "partyErosion": {
      const m = party("erosion-magus");
      return m?.heroTraits?.party
        ? inCalc(
            "Deterioration on each Nourished Erosion hit: 60% of the Erosion damage dealt as True Damage when the 1 s stack ends (manual; the player's Deterioration lines are not the Minion's; provisional)",
          )
        : inactive("no Nourished Erosion Magus");
    }
    default:
      return null;
  }
}

export const growingBreeze = Object.freeze({
  id: GROWING_BREEZE,
  slot: "growing",
  patterns: GROWING_PATTERNS,
  keys: KEYS,
  revivedKeys: REVIVED_KEYS,
  state,
  lineStatus,
  switches: () => [],
});

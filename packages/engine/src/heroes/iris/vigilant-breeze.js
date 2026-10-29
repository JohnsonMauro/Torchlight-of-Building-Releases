// Iris – Vigilant Breeze (hero trait audit batch B6, 2026-10-19; research/hero-traits-audit-2026-10-19.md §5 B6, §8 B6, §6 Q-H13):
// the Vigilant state, Breeze and the Merged Spirit Magi. Pure; packages/engine/src/heroes/minion-heroes.js dispatches to it,
// packages/engine/src/minions/minion-damage-model.js applies it.
//
// Provisional reading (src/app/stats/open-questions.js, shown only for the hero):
// - Q-H13 (recommended): the Vigilant state held (best-case switch "irisVigilant"), Breeze at its max (10 + Breeze's Whisper +
//   Warmest Vigilance + Blowing Breeze when their sources fire), Growth +6 per Breeze with the moon; Reconjuring breaks ignored.
//   The Merged Magus's Ultimate is in its cycle (8 s, the Full Bloom keyword's initial cooldown; none with Whirlwind Tango, then
//   only cast where it out-damages the Base / Enhanced slot); without Happiest Reunion one Magus is Merged (the best one).

import { originEffectFactor, originGrants, originTextAt } from "../../skills/origin-of-spirit-magus.js";
import { KEYWORDS, firstOf, round, sumOf } from "../minion-hero-lines.js";

export const VIGILANT_BREEZE = "iris-vigilant-breeze";
export const VIGILANT_CONDITION = "irisVigilant";

export const VIGILANT_PATTERNS = Object.freeze({
  activeAsTrait:
    /^When a Spirit Magus Skill is set as an Active Skill, casting the Active Skill is considered as casting the Trait Skill as well$/i,
  merge:
    /^Merges with Spirit Magi after casting the Trait Skill, entering the Vigilant state\. Merged Spirit Magi gain (\d+) stack\(s\) of Breeze\. Casting the Trait Skill again will remove the Vigilant state$/i,
  drain: /^During Vigilant, Merged Spirit Magi consume (\d+(?:\.\d+)?)% of Max Life per second when not Reconjuring$/i,
  breezeGain:
    /^While in the Vigilant state, Merged Spirit Magi gain (\d+) stack of Breeze every ([\d.]+) ?s when not Reconjuring, up to (\d+) stack\(s\)$/i,
  breezeLoss: /^When Reconjuring or not Merged, Spirit Magi lose (\d+) stack\(s\) of Breeze every ([\d.]+) ?s$/i,
  breezeGrowth: /^\+(\d+) Growth for every stack of Breeze$/i,
  tangoNoCooldown: /^The Ultimate of Merged Spirit Magi has no cooldown$/i,
  tangoGain:
    /^Every time a Merged Spirit Magus casts its Ultimate, it consumes (\d+(?:\.\d+)?)% of Max Life and gains (\d+) stack\(s\) of Breeze$/i,
  whisper:
    /^Whenever a Merged Spirit Magus casts an Enhanced Skill, restores ([\d.]+)% of Max Life and \+(\d+) to Max Breeze Stacks\. Interval: ([\d.]+) ?s$/i,
  whisperCap: /^Up to \+(\d+) to Max Breeze Stacks, lasting until Reconjuring$/i,
  mapCap: /^\+(\d+) to Max Spirit Magi In Map$/i,
  reunionMerged: /^While in the Vigilant state, all Spirit Magi are considered Merged Spirit Magi$/i,
  reunionDamage:
    /^While in the Vigilant state, for every Spirit Magus there is, \+(\d+(?:\.\d+)?)% additional damage \(multiplies\) for Merged Spirit Magi\. \+(\d+(?:\.\d+)?)% to the amount of Max Life they consume per second when not Reconjuring$/i,
  warmest:
    /^\+(\d+) to the Max Breeze Stacks for every ([\d.]+)% Max Life consumed by Merged Spirit Magi, up to \+(\d+)$/i,
  mergingOrigin:
    /^Iris is not affected by Origin of Spirit Magus Effects, and all basic Origin of Spirit Magus Effects will be applied to all Spirit Magi$/i,
  mergingGrowth:
    /^For every (\d+) Growth a Spirit Magus has, it ([\d.]+)% additional Origin of Spirit Magus Effect received$/i,
  // Revived (Soft Storm, Blowing Breeze).
  softStormTrigger:
    /^While in Vigilant, for every (\d+) use\(s\) of Enhanced Skills by Spirit Magi, triggers the Ultimate$/i,
  softStormPenalty: /^Spirit Magi cannot use the Ultimate\. -(\d+(?:\.\d+)?)% additional Ultimate Damage$/i,
  blowing:
    /^While in Vigilant, for every (\d+) use\(s\) of the Ultimate by Spirit Magi, \+(\d+) to Max Breeze Stacks, up to (\d+) Stacks, lasting until Reconjuring$/i,
});
const KEYS = Object.keys(VIGILANT_PATTERNS);
const REVIVED_KEYS = ["softStormTrigger", "softStormPenalty", "blowing"];

/** Vigilant Breeze's state, or null without its Merge / Breeze lines. */
function state(lines, { requestedConditions }) {
  const I = VIGILANT_PATTERNS;
  const merge = firstOf(lines, I.merge),
    gain = firstOf(lines, I.breezeGain);
  if (!merge && !gain) return null;
  const whisper = firstOf(lines, I.whisper),
    whisperCap = firstOf(lines, I.whisperCap),
    warmest = firstOf(lines, I.warmest),
    blowing = firstOf(lines, I.blowing);
  const reunion = firstOf(lines, I.reunionDamage),
    merging = firstOf(lines, I.mergingGrowth),
    tango = firstOf(lines, I.tangoGain);
  const soft = firstOf(lines, I.softStormTrigger),
    softPenalty = firstOf(lines, I.softStormPenalty);
  const growthPerBreeze = sumOf(lines, I.breezeGrowth);
  return {
    held: Boolean(merge) && requestedConditions[VIGILANT_CONDITION] !== false,
    mergeStacks: merge ? Number(merge.match[1]) : 0,
    gain: gain
      ? { stacks: Number(gain.match[1]), everySeconds: Number(gain.match[2]), max: Number(gain.match[3]) }
      : { stacks: 0, everySeconds: 1, max: 0 },
    drainPercent: sumOf(lines, I.drain),
    growthPerBreeze,
    tango: {
      noCooldown: Boolean(firstOf(lines, I.tangoNoCooldown)),
      lifePercent: tango ? Number(tango.match[1]) : 0,
      breeze: tango ? Number(tango.match[2]) : 0,
    },
    whisper: whisper
      ? {
          perCast: Number(whisper.match[2]),
          intervalSeconds: Number(whisper.match[3]),
          cap: whisperCap ? Number(whisperCap.match[1]) : Infinity,
        }
      : null,
    warmest: warmest
      ? { per: Number(warmest.match[1]), everyPercent: Number(warmest.match[2]), cap: Number(warmest.match[3]) }
      : null,
    blowing: blowing
      ? { every: Number(blowing.match[1]), per: Number(blowing.match[2]), cap: Number(blowing.match[3]) }
      : null,
    allMerged: Boolean(firstOf(lines, I.reunionMerged)),
    reunion: reunion ? { perMagusPercent: Number(reunion.match[1]), drainPercent: Number(reunion.match[2]) } : null,
    mapCap: sumOf(lines, I.mapCap),
    merging: firstOf(lines, I.mergingOrigin)
      ? { perGrowth: merging ? Number(merging.match[1]) : 0, percent: merging ? Number(merging.match[2]) : 0 }
      : merging
        ? { perGrowth: Number(merging.match[1]), percent: Number(merging.match[2]), noOriginLine: true }
        : null,
    softStorm:
      soft || softPenalty
        ? {
            every: soft ? Number(soft.match[1]) : 0,
            penaltyPercent: softPenalty ? Number(softPenalty.match[1]) : 0,
            blocksUse: Boolean(softPenalty),
          }
        : null,
    ultimateCooldownSeconds: KEYWORDS.fullBloom.ultimateCooldownSeconds,
  };
}

/**
 * The Vigilant Breeze maximum and Growth for one Merged Magus (Q-H13: held at the maximum). `chanceAt(extraGrowth)` gives the
 * Magus's Enhanced-skill chance at that extra Growth (packages/engine/src/minions/minion-damage-model.js spiritMagusState); `ultimateInCycle` whether
 * the Magus casts its Ultimate itself.
 */
export function vigilantBreezeMax(vigilant, { chanceAt = () => 0, ultimateInCycle = true } = {}) {
  if (!vigilant) return null;
  const base = vigilant.gain.max;
  const warmest = vigilant.warmest ? vigilant.warmest.cap : 0;
  // Life consumed: the Vigilant drain (plus Happiest Reunion's) every second, the Ultimate's cost; Warmest Vigilance's cap is reached
  // after cap × every% of Max Life consumed (a few seconds), so it is held (Q-H13).
  const softTriggers = (chance) => Boolean(vigilant.softStorm?.every) && chance > 0;
  const blowingOn = (chance) =>
    Boolean(vigilant.blowing) && ((ultimateInCycle && !vigilant.softStorm?.blocksUse) || softTriggers(chance));
  const firstChance = chanceAt(vigilant.growthPerBreeze * (base + warmest));
  const blowing = blowingOn(firstChance) ? vigilant.blowing.cap : 0;
  const midChance = chanceAt(vigilant.growthPerBreeze * (base + warmest + blowing));
  // Breeze's Whisper: +1 Max Breeze per Enhanced Skill cast, up to its cap (reached after cap casts; held: Q-H13).
  const whisper = vigilant.whisper && midChance > 0 ? vigilant.whisper.cap : 0;
  const blowingFinal = blowingOn(Math.max(midChance, firstChance)) ? vigilant.blowing.cap : 0;
  const max = base + warmest + blowingFinal + whisper;
  return {
    max,
    base,
    warmest,
    whisper,
    blowing: blowingFinal,
    extraGrowth: vigilant.growthPerBreeze * max,
    chance: chanceAt(vigilant.growthPerBreeze * max),
  };
}

/** Breeze held t s after merging when own buffs are not pre-built: 5 on merge, +gain per second, + the Ultimate's gains, capped. */
export function vigilantBreezeAt(vigilant, max, time, ultimateCasts = 0) {
  const gained =
    vigilant.mergeStacks +
    Math.floor(Math.max(0, time) / Math.max(0.01, vigilant.gain.everySeconds) + 1e-9) * vigilant.gain.stacks +
    (vigilant.tango?.breeze || 0) * ultimateCasts;
  return Math.min(max, gained);
}

/**
 * Merging Stream: the build's Origins as Minion layers on each Spirit Magus (Iris is not affected), each value × the build's
 * Origin effect factor; the Magus's received bonus (per 2 Growth) is applied in the Minion model. Thunder → additional Attack and
 * Cast Speed and additional damage; Fire → flat Critical Strike Rating; the defensive Origins add nothing on the dummy.
 */
export function mergingStreamOrigins({ summons = [], modifierTexts = [] } = {}) {
  const grants = originGrants({ summons, modifierTexts });
  const { factor } = originEffectFactor(modifierTexts);
  const out = [];
  for (const grant of grants) {
    const text = originTextAt(grant.magus, grant.level);
    if (!text) continue;
    const thunder = text.match(
      /\+?([\d.]+)% additional Attack and Cast Speed and \+?([\d.]+)% additional damage to the summoner/i,
    );
    const fire = text.match(/\+([\d.]+) Attack and Spell Critical Strike Rating/i);
    const source = `Origin of ${grant.magus} on the Spirit Magi (Lv.${grant.level}${factor !== 1 ? `, ×${round(factor)} Origin effect` : ""}; Merging Stream)`;
    if (thunder)
      out.push({ magus: grant.magus, source, speed: Number(thunder[1]) * factor, damage: Number(thunder[2]) * factor });
    else if (fire) out.push({ magus: grant.magus, source, critRating: Number(fire[1]) * factor });
    else out.push({ magus: grant.magus, source, defensive: true });
  }
  return { origins: out, factor };
}

/** The badge of one Vigilant Breeze clause, from the settled state and the Minions' results. */
function lineStatus(key, state, { modeled, list, inCalc, inactive, neutral }) {
  const v = state.vigilant;
  if (!v) return inactive("no Vigilant line in the build");
  const magi = modeled
    ? modeled.filter((minion) => minion.family === "spirit-magus")
    : state.hasMagus
      ? [{ name: "the Spirit Magi" }]
      : [];
  const merged = modeled ? magi.filter((minion) => minion.heroTraits?.vigilant?.merged) : v.held ? magi : [];
  const none = !state.hasMagus
    ? "no modeled Spirit Magus"
    : !v.held
      ? 'switched off: no Vigilant state ("Vigilant held")'
      : "no Merged Spirit Magus";
  const breeze = merged[0]?.heroTraits?.vigilant?.breeze || null;
  const breezeText = breeze
    ? `Breeze held at its max ${breeze.max} (${breeze.base} + Warmest Vigilance ${breeze.warmest} + Breeze's Whisper ${breeze.whisper} + Blowing Breeze ${breeze.blowing}; Q-H13, provisional)`
    : "Breeze held at its max (Q-H13)";
  const ult = merged.map((minion) => minion.heroTraits?.ultimate).find(Boolean) || null;
  switch (key) {
    case "activeAsTrait":
      return merged.length
        ? neutral("the Vigilant state is held (best case); a Magus active-slot cast merges as the Trait Skill would")
        : inactive(none);
    case "merge":
      return merged.length
        ? inCalc(
            `${list(merged)} Merged in the Vigilant state (held: best case; without Happiest Reunion the best Magus is the Merged one); ${breezeText}`,
          )
        : inactive(none);
    case "drain":
      return neutral(
        "the Life drain fills Warmest Vigilance's cap within seconds (held: Q-H13); Reconjuring breaks are ignored",
      );
    case "breezeGain":
      return merged.length
        ? inCalc(`${breezeText}: +${KEYWORDS.breeze.perStackPercent}% additional damage per stack (keyword Breeze)`)
        : inactive(none);
    case "breezeLoss":
      return neutral("Reconjuring breaks are ignored (Q-H13); a Magus that is not Merged holds no Breeze");
    case "breezeGrowth": {
      if (!merged.length) return inactive(none);
      const matters = merged.some(
        (minion) => minion.heroTraits.vigilant.extraGrowthMatters || minion.heroTraits.merging?.receivedPercent > 0,
      );
      const growth = merged[0].heroTraits.vigilant.growth;
      return matters
        ? inCalc(
            `+${v.growthPerBreeze} × ${breeze?.max ?? "max"} Breeze = +${(breeze?.max || 0) * v.growthPerBreeze} Growth (Growth ${growth}: Stage ${merged[0].magus?.stage ?? "?"}${merged[0].heroTraits.merging?.receivedPercent ? `, Merging Stream +${merged[0].heroTraits.merging.receivedPercent}% Origin Effect received` : ""})`,
          )
        : neutral(
            `+${(breeze?.max || 0) * v.growthPerBreeze} Growth (Growth ${growth}): the Stage does not change and no per-Growth line reads it (the Physique and Skill Area parts have no DPS effect)`,
          );
    }
    case "tangoNoCooldown":
      return !merged.length
        ? inactive(none)
        : ult
          ? v.softStorm?.blocksUse
            ? inactive("Soft Storm: the Magi cannot use the Ultimate")
            : inCalc(`the Merged Magus's ${ult.name}: ${ult.reason}`)
          : inactive("no Ultimate damage row");
    case "tangoGain":
      return merged.length
        ? state.prebuilt
          ? neutral(
              "Breeze is held at its max (Q-H13), so the Ultimate's Breeze changes no figure; its Life cost has no DPS effect",
            )
          : inCalc("Breeze builds from 5 on merging (own buffs not pre-built): each Ultimate adds its stacks")
        : inactive(none);
    case "whisper":
    case "whisperCap":
      return !merged.length
        ? inactive(none)
        : breeze?.whisper > 0
          ? inCalc(
              `+${breeze.whisper} to Max Breeze Stacks from the Merged Magus's Enhanced Skills (held: Q-H13); the Life restore has no DPS effect`,
            )
          : inactive("the Merged Magus never uses an Enhanced Skill (0% Enhanced-skill chance)");
    case "mapCap":
      return magi.length
        ? neutral("every Magus skill's Magus is already out (no map cap binds without Socialite)")
        : inactive("no modeled Spirit Magus");
    case "reunionMerged":
      return !v.held || !magi.length
        ? inactive(none)
        : merged.length > 1
          ? inCalc(`${list(merged)}: all Merged in the Vigilant state`)
          : neutral("one Spirit Magus: it is the Merged one anyway");
    case "reunionDamage":
      return merged.length
        ? inCalc(
            `+${v.reunion.perMagusPercent}% (multiplies) × ${merged[0].heroTraits.vigilant.reunionMagi || 1} Spirit Magi additional damage for the Merged Magi; the Life cost has no DPS effect`,
          )
        : inactive(none);
    case "warmest":
      return merged.length && breeze?.warmest > 0
        ? inCalc(
            `+${breeze.warmest} to Max Breeze Stacks: the Vigilant drain consumes ${v.warmest.cap} × ${v.warmest.everyPercent}% Max Life within seconds (held: Q-H13)`,
          )
        : inactive(none);
    case "mergingOrigin":
    case "mergingGrowth": {
      const got = modeled ? magi.filter((minion) => minion.heroTraits?.merging?.applied?.length) : magi;
      if (!got.length)
        return inactive(
          !magi.length
            ? "no modeled Spirit Magus"
            : "no damage Origin in the build (Thunder: speed and damage, Fire: crit rating; the others are defensive)",
        );
      const m = got[0].heroTraits?.merging;
      return key === "mergingOrigin"
        ? inCalc(`${m ? m.applied.join(", ") : "the Origins"} on every Spirit Magus instead of Iris (provisional)`)
        : m && m.receivedPercent > 0
          ? inCalc(
              `${m.growth} Growth ÷ ${v.merging.perGrowth} × ${v.merging.percent}% = +${m.receivedPercent}% additional Origin Effect received`,
            )
          : inactive("no Growth step");
    }
    case "softStormTrigger":
      return ult?.mode === "triggered"
        ? inCalc(`${ult.reason} (provisional)`)
        : inactive(!merged.length ? none : "no Enhanced Skill use triggers it (0% Enhanced-skill chance)");
    // The Merged Magus's Ultimate is unlocked in the Vigilant state: "cannot use" takes it out of its cycle even with no trigger.
    case "softStormPenalty":
      return ult?.mode === "triggered"
        ? inCalc(`${ult.reason} (provisional)`)
        : merged.length && ult
          ? inCalc(
              `the Magi cannot use ${ult.name}: it leaves the Merged Magus's cycle, and no Enhanced use triggers it (0% Enhanced-skill chance)`,
            )
          : inactive(!merged.length ? none : "no Ultimate damage row");
    case "blowing":
      return merged.length && breeze?.blowing > 0
        ? inCalc(`+${breeze.blowing} to Max Breeze Stacks from the Ultimate's uses (held: Q-H13)`)
        : inactive(!merged.length ? none : "the Merged Magus never uses its Ultimate");
    default:
      return null;
  }
}

/** The best-case switch of Vigilant Breeze. */
function switches(state) {
  return state.vigilant?.mergeStacks
    ? [
        {
          id: VIGILANT_CONDITION,
          label: "Vigilant held (Merged Spirit Magi, Breeze at max)",
          enabled: state.vigilant.held,
          active: state.vigilant.held && state.hasMagus,
          summary: "the Vigilant state held with Breeze at its max (Q-H13, provisional)",
          reason: state.hasMagus ? "best-case assumption: Reconjuring breaks ignored" : "no modeled Spirit Magus",
        },
      ]
    : [];
}

export const vigilantBreeze = Object.freeze({
  id: VIGILANT_BREEZE,
  slot: "vigilant",
  patterns: VIGILANT_PATTERNS,
  keys: KEYS,
  revivedKeys: REVIVED_KEYS,
  state,
  lineStatus,
  switches,
});

// Erika – Vendetta's Sting (hero trait audit batch B5, 2026-10-19, research/hero-traits-audit-2026-10-19.md §5 B5, §8 B5, §6 Q-H12).
// Pure: reads the build's trait lines (origin "trait") and the revived lines the module reads (Vengeful Night Wraith;
// packages/engine/src/heroes/hero-exclusive-revivals.js MODULE_LINES) and returns the state the engines apply:
// packages/engine/src/heroes/erika/vendetta-model.js (the Vendetta triggers), packages/engine/src/planner.js (the derived lines, the Activation
// Medium block) and packages/engine/src/heroes/erika/badges.js (the badges).
//
// Sourced (TLIDB keyword tooltips, Torchlight_Hyperlink_hover, fetched 2026-10-19 and saved in research/tlidb/fetch-cache):
// - Incisive (ef32e8ab…): "Within 5m, damage dealt increases the closer you are to the enemy, up to +20% additional Attack Damage
//   at 2m. Lasts for 3s".
// - Vendetta / Endless Vendetta (815193af… / 77747a08…), Quickness = Hasten (bd896d8a…), Elite (7f49f62b…: rare monsters and
//   bosses, so the training dummy), Effective / Excess (04750ac3… / f3601521…: the part of a value up to / above its fixed cap).
// - Game records (§4.3 table, readable recipes): Lightning Shadow 710001 (Electrify 250771 [1,3,3,10]; Feline Figure 264779
//   [10,3,0.4]; +68% additional Numbed Effect 77242344, attr 3401 add); Vendetta's Sting 720001 (the "+X% additional Attack
//   Damage for skills triggered by Vendetta" lines, the moon's 10% and Swift Stalk's 90% all write attr 5719 add, so they add in
//   one pool); Swift Stalk 19226660 (attr 3402 add = additional Incisive Duration, attr 3401 inc = Incisive Effect).
//
// Provisional readings (src/app/stats/open-questions.js, Erika only):
// - Q-H12 (recommended reading): Active slot 3 holds a Lv. 20 Vendetta (Endless Vendetta with Swift Stalk), the same rule as
//   Youga's Spacetime Dictator (packages/engine/src/heroes/trait-board-grants.js).
// - Incisive: held at 2 m (best-case switch "erikaIncisiveClose"); gained at the end of each Vendetta cast; its uptime from the
//   Vendetta cycle (packages/engine/src/heroes/erika/vendetta-model.js) once the hit pass measures it, held at 1 before. Incisive Effect scales the +20% and
//   Mortal Gambit's +5% damage taken (an additional base effect).
// - Leisurely Stroll: "Vendetta has no Cooldown" while Hasten is held reaches Vendetta only (Endless Vendetta keeps its 10 s);
//   its +20% additional Attack Speed reaches every Vendetta cast (Endless Vendetta's repeats too).
// - Feline Fury: Effective Critical Strike Chance = the Main Skill's crit chance up to 100%; Excess = the part above 100%
//   (uncapped rating ÷ 100); each extra trigger is a full triggered use.
// - Vengeful Night Wraith: one Phantom per 3 Vendetta casts, each a triggered use at +30% additional (Phantom) damage, taking no
//   player time; the Phantom's cast grants no Incisive.

import { first, matchAll, traitLinesOf } from "./trait-lines.js";

export const VENDETTAS_STING = "erika-vendettas-sting";
export const INCISIVE = Object.freeze({
  additionalAttackDamagePercent: 20,
  atMeters: 2,
  withinMeters: 5,
  durationSeconds: 3,
  source: "TLIDB keyword Incisive (hyperlink hover ef32e8ab)",
});
export const INCISIVE_CLOSE_CONDITION = "erikaIncisiveClose";
const EPS = 1e-9;
const round = (value) => Math.round(value * 10000) / 10000;

export const VENDETTA_PATTERNS = Object.freeze({
  incisiveGain: /^Gains Incisive after casting Vendetta$/i,
  areaShare: /^(\d+(?:\.\d+)?)% of the bonuses to Skill Area is also applied to Vendetta, up to (\d+(?:\.\d+)?)%$/i,
  triggered: /^\+(\d+(?:\.\d+)?)% additional Attack Damage for skills triggered by Vendetta$/i,
  moon: /^\+(\d+(?:\.\d+)?)% Vendetta Skill Area\. \+(\d+(?:\.\d+)?)% additional Attack Damage for skills triggered by Vendetta$/i,
  grant: /^Replace the skill in the third slot with Vendetta$/i,
  endless: /^Replace Vendetta with Endless Vendetta$/i,
  hasten:
    /^(?:When having Hasten, Vendetta has no Cooldown(?: and Vendetta gains \+(\d+(?:\.\d+)?)% additional Attack Speed)?|Vendetta has no Cooldown when you have Hasten)$/i,
  manualPenalty: /^-(\d+(?:\.\d+)?)% additional damage for manually used Main Skills while Incisive is active$/i,
  noActivationMedium: /^Main Skills cannot be supported by Activation Medium$/i,
  elites:
    /^Skills triggered by Vendetta deal \+(\d+(?:\.\d+)?)% additional damage to Elites while Endless Vendetta is active$/i,
  incisiveDuration: /^\+(\d+(?:\.\d+)?)% additional Incisive Duration\. \+(\d+(?:\.\d+)?)% Incisive Effect$/i,
  extraTrigger:
    /^For every (\d+(?:\.\d+)?)% Effective Critical Strike Chance, Vendetta has a (\d+(?:\.\d+)?)% chance to trigger Main Melee Attack Skill (\d+) additional time$/i,
  excess:
    /^For every (\d+(?:\.\d+)?)% Excess Critical Strike Chance, (\d+(?:\.\d+)?)% chance to \+(\d+(?:\.\d+)?)% additional Attack Damage for skills triggered by Vendetta$/i,
  mortalTaken:
    /^Incisive gains an additional base effect: Within ([\d.]+) m, damage taken increases the closer you are to the enemy, up to \+(\d+(?:\.\d+)?)% additional damage taken at ([\d.]+) m$/i,
  mortalEffect:
    /^\+(\d+(?:\.\d+)?)% Incisive Effect for each stack of Agility Blessing, stacking up to (\d+) time\(s\)$/i,
  phantom:
    /^For every (\d+) casts of Vendetta, generates (\d+) Phantom that casts Vendetta (\d+) additional time on a random target within ([\d.]+) ?m$/i,
  phantomDamage: /^\+(\d+(?:\.\d+)?)% additional Phantom Damage$/i,
});

/**
 * Vendetta's Sting state before the triggers settle: the grant, Incisive, the triggered-skill pool, the Vendetta clauses.
 * @param {object} p
 * @param {string} p.heroId
 * @param {object[]} p.modifierTexts
 * @param {object} p.blessingStacks held Blessing stacks (Agility for Mortal Gambit)
 * @param {object} p.requestedConditions the best-case switches (erikaIncisiveClose)
 * @param {object|null} p.vendetta the measured Vendetta cycle (packages/engine/src/planner.js hitRateFacts.erika.vendetta), null before
 */
export function vendettaStingState({
  heroId = "",
  modifierTexts = [],
  blessingStacks = {},
  requestedConditions = {},
  vendetta = null,
} = {}) {
  if (heroId !== VENDETTAS_STING) return null;
  const lines = traitLinesOf(modifierTexts, heroId);
  const P = VENDETTA_PATTERNS;
  const grant = first(lines, P.grant),
    endless = first(lines, P.endless);
  const triggered = [
    ...matchAll(lines, P.triggered).map(({ line, match }) => ({
      source: line.source,
      value: Number(match[1]) * (line.multiplier ?? 1),
    })),
    ...matchAll(lines, P.moon).map(({ line, match }) => ({
      source: line.source,
      value: Number(match[2]) * (line.multiplier ?? 1),
    })),
  ];
  const elitesMatch = first(lines, P.elites);
  const hastenMatch = first(lines, P.hasten);
  const manualMatch = first(lines, P.manualPenalty);
  const durationMatch = first(lines, P.incisiveDuration);
  const mortalTaken = first(lines, P.mortalTaken),
    mortalEffect = first(lines, P.mortalEffect);
  const extraMatch = first(lines, P.extraTrigger),
    excessMatch = first(lines, P.excess);
  const phantomMatch = first(lines, P.phantom),
    phantomDamage = first(lines, P.phantomDamage);
  const gains = Boolean(first(lines, P.incisiveGain));
  const agility = Math.max(0, Number(blessingStacks?.Agility) || 0);
  const mortalStacks = mortalEffect ? Math.min(Number(mortalEffect.match[2]), agility) : 0;
  const effectPercent =
    (durationMatch ? Number(durationMatch.match[2]) : 0) +
    (mortalEffect ? Number(mortalEffect.match[1]) * mortalStacks : 0);
  const durationSeconds = INCISIVE.durationSeconds * (1 + (durationMatch ? Number(durationMatch.match[1]) : 0) / 100);
  const close = requestedConditions?.[INCISIVE_CLOSE_CONDITION] !== false;
  const uptime =
    gains && vendetta?.modeled
      ? incisiveUptime(vendetta, durationSeconds)
      : gains && vendetta && vendetta.modeled === false
        ? 0
        : gains
          ? 1
          : 0;
  const manualUptime =
    gains && vendetta?.modeled ? incisiveUptime(vendetta, durationSeconds, { manualOnly: true }) : uptime;
  const incisive = gains
    ? {
        close,
        durationSeconds: round(durationSeconds),
        effectPercent: round(effectPercent),
        mortalStacks,
        agilityStacks: agility,
        damagePercent: close ? round(INCISIVE.additionalAttackDamagePercent * (1 + effectPercent / 100)) : 0,
        takenPercent: close && mortalTaken ? round(Number(mortalTaken.match[2]) * (1 + effectPercent / 100)) : 0,
        uptime: round(uptime),
        manualUptime: round(manualUptime),
        measured: Boolean(vendetta),
        vendettaModeled: vendetta ? Boolean(vendetta.modeled) : null,
      }
    : null;
  return {
    granted: Boolean(grant),
    skill: grant ? (endless ? "Endless Vendetta" : "Vendetta") : null,
    endless: Boolean(endless),
    triggered,
    elitesPercent: elitesMatch && endless ? Number(elitesMatch.match[1]) : 0,
    elitesLine: Boolean(elitesMatch),
    hasten: hastenMatch
      ? { attackSpeedPercent: Number(hastenMatch.match[1] || 0), source: hastenMatch.line.source }
      : null,
    manualPenaltyPercent: manualMatch ? Number(manualMatch.match[1]) : 0,
    noActivationMedium: Boolean(first(lines, P.noActivationMedium)),
    extraTrigger: extraMatch
      ? {
          perCritPercent: Number(extraMatch.match[1]),
          chancePercent: Number(extraMatch.match[2]),
          extra: Number(extraMatch.match[3]),
        }
      : null,
    excess: excessMatch
      ? {
          perExcessPercent: Number(excessMatch.match[1]),
          chancePercent: Number(excessMatch.match[2]),
          additionalPercent: Number(excessMatch.match[3]),
        }
      : null,
    phantom: phantomMatch
      ? {
          everyCasts: Number(phantomMatch.match[1]),
          phantoms: Number(phantomMatch.match[2]),
          casts: Number(phantomMatch.match[3]),
          additionalPercent: phantomDamage ? Number(phantomDamage.match[1]) : 0,
        }
      : null,
    incisive,
    vendetta,
  };
}

/**
 * Incisive's share of time from the Vendetta cycle: gained at the end of each Vendetta cast (repeatTimes cumulative within the
 * cycle), lasting `durationSeconds`. `manualOnly`: the share of the time outside the Vendetta casts (the manual Main Skill time).
 */
export function incisiveUptime(
  { cycleSeconds, repeatTimes = [], sequenceSeconds = 0 } = {},
  durationSeconds,
  { manualOnly = false } = {},
) {
  if (!(cycleSeconds > 0) || !repeatTimes.length) return 0;
  const ends = [];
  let cursor = 0;
  for (const time of repeatTimes) {
    cursor += time;
    ends.push(cursor);
  }
  // Intervals on one cycle, with the previous cycle's tails wrapping in.
  const intervals = [];
  for (const shift of [-cycleSeconds, 0])
    for (const end of ends) intervals.push([end + shift, end + shift + durationSeconds]);
  const windowStart = manualOnly ? sequenceSeconds : 0,
    windowEnd = cycleSeconds;
  const span = windowEnd - windowStart;
  if (!(span > EPS)) return manualOnly ? 0 : 1;
  const clipped = intervals
    .map(([a, b]) => [Math.max(a, windowStart), Math.min(b, windowEnd)])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  let covered = 0,
    curA = null,
    curB = null;
  for (const [a, b] of clipped) {
    if (curB === null || a > curB) {
      if (curB !== null) covered += curB - curA;
      curA = a;
      curB = b;
    } else curB = Math.max(curB, b);
  }
  if (curB !== null) covered += curB - curA;
  return Math.min(1, covered / span);
}

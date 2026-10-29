// What the Minion heroes' loadouts share (Moto – Order Calling and Charge Calling, Iris – Growing Breeze and Vigilant Breeze;
// hero trait audit batch B6, 2026-10-19): the keyword values their engines read, the Minion families, and the line readers.
// Each loadout's module is in its hero's folder (packages/engine/src/heroes/moto/, packages/engine/src/heroes/iris/);
// packages/engine/src/heroes/minion-heroes.js dispatches to them.
//
// Sourced (TLIDB keyword tooltips, Torchlight_Hyperlink_hover, fetched 2026-10-19 and saved in research/tlidb/fetch-cache):
// - Overload (5f163559…): "Provides buffs for your Minions. Bonuses that apply to Empower Skill Effects are also applied to Overload
//   Effect. Bonuses that apply to Skill Effect Duration are also applied to Overload Duration."
// - Command (f18daf82…): +3% additional damage per point for Synthetic Troop Minions (packages/engine/src/minions/minion-cores.js commandState).
// - Self-Destruct Protocol (c92edbbf…): "Synthetic Troop Minions are immediately defeated 1s after activation. The base multiplier for
//   Minions to self-destruct is 115%. Skill Tags: Attack, Melee, Physical, Area, Strength, Dexterity, Intelligence".
// - Windrider (336df32a…): "A Spell Channeled Skill with a base channel interval of 0.33s and can be channeled up to 5 stack(s). At
//   max channeled stacks, loses all channeled stacks and grants 3 stack(s) of Nourishment to Spirit Magi within 12m".
// - Full Bloom (8d0198aa…): "unlocks their Ultimate that has an initial cooldown of 8s. 50% of the Attack Speed bonus and additional
//   bonus to Spirit Magi is also applied to additional Spirit Magi Attack Damage. 50% of the Cast Speed bonus … Spell Damage."
// - Nourishment (e26f7d50…): "+30% additional damage for that use. Lasts 15s and stacks up to 10 time(s). Effect of Nourishment
//   enjoys Empower Skill Effect bonuses."
// - Breeze (07edbff3…): "+16% additional damage dealt by Merged Spirit Magi" (per stack).
// - Growth (a3edcfc8…): a Stage per 100 Growth (Stage 1–5), max 1000; per 8 Growth +1% Physique and +10% additional Skill Area.
// - Merges with Spirit Magi (cce5814b…): the Trait Skill selects Spirit Magi by Skill Slot order, a Magus active-slot cast the
//   Magus of that skill; Cooldown 3 s. Vigilant (fbcfbb0d…): you control the Merged Spirit Magi and take the damage in their
//   place; "the Ultimate of Merged Spirit Magi is unlocked".
// - Game records (§4.3 table, readable recipes): Overload's +60% (338908 buff 81801), "+22% additional damage when Minions have
//   Overload" (2165317: a separate affix on the Minions, attr 5719 add, not scaled by Overload Effect), Veteran's speed (101010392,
//   attr 6001 / 6002 inc on the Minion tag), All In (200000101) / Overload Program (962858944) additional Overload Effect, Charge
//   Forward (13865709: per 5 Command → attr 34011), Heroic Sacrifice (996398784: Max Life + Max Energy Shield → additional
//   Self-Destruct damage), Essential Speed (110264: Minion Attack Speed → Self-Destruct damage).

import { normalizePercentageText } from "../text/percentage-text.js";
import { originEffectFactor } from "../skills/origin-of-spirit-magus.js";

export const TROOP_FAMILIES = Object.freeze(["synthetic-troop", "module"]);
export const TROOPS = new Set(TROOP_FAMILIES);
export const RECENTLY_SECONDS = 4;
export const KEYWORDS = Object.freeze({
  overload: "TLIDB keyword Overload (hover 5f163559): Empower Skill Effect bonuses also apply to Overload Effect",
  selfDestruct: Object.freeze({
    percent: 115,
    lifeSeconds: 1,
    tags: Object.freeze(["Attack", "Melee", "Physical", "Area"]),
    source:
      "TLIDB keyword Self-Destruct Protocol (hover c92edbbf): 115% base multiplier, defeated 1 s after activation",
  }),
  windrider: Object.freeze({
    channelSeconds: 0.33,
    maxStacks: 5,
    nourishment: 3,
    source: "TLIDB keyword Windrider (hover 336df32a)",
  }),
  fullBloom: Object.freeze({
    ultimateCooldownSeconds: 8,
    speedSharePercent: 50,
    source: "TLIDB keyword Full Bloom (hover 8d0198aa)",
  }),
  breeze: Object.freeze({
    perStackPercent: 16,
    source: "TLIDB keyword Breeze (hover 07edbff3): +16% additional damage dealt by Merged Spirit Magi per stack",
  }),
});
export const round = (value) => Math.round(value * 10000) / 10000;
export const cleanB6 = (text) =>
  normalizePercentageText(String(text ?? ""))
    .replace(/\s+/g, " ")
    .replace(/(\d) %/g, "$1%")
    .replace(/ ([,.])/g, "$1")
    .trim();

export const N = "([+-]?\\d+(?:\\.\\d+)?)";
export const matchesOf = (lines, pattern) =>
  lines.map((line) => ({ line, match: line.clean.match(pattern) })).filter((item) => item.match);
export const firstOf = (lines, pattern) => matchesOf(lines, pattern)[0] || null;
export const sumOf = (lines, pattern, group = 1) =>
  matchesOf(lines, pattern).reduce((sum, item) => sum + Number(item.match[group]) * (item.line.multiplier ?? 1), 0);

/** The player's Empower Skill Effect bonus (plain lines; "for the supported skill" and conditional wordings are not read). */
export function playerEmpowerEffect(modifierTexts = []) {
  let increased = 0;
  const additional = [],
    sources = [];
  for (const line of modifierTexts) {
    if (!line || line.origin === "derived") continue;
    const text = cleanB6(line.text);
    const match = text.match(new RegExp(`^${N}% (additional )?Empower (?:Skill )?Effect$`, "i"));
    if (!match) continue;
    const value = Number(match[1]) * (line.multiplier ?? 1);
    if (match[2]) additional.push(value);
    else increased += value;
    sources.push({ source: line.source, text, value, additional: Boolean(match[2]) });
  }
  return {
    increased,
    additional,
    sources,
    factor: Math.max(0, 1 + increased / 100) * additional.reduce((product, value) => product * (1 + value / 100), 1),
  };
}

/** Origin of Spirit Magus effect pools ("+X% [additional] Origin of Spirit Magus effect"). */
export function originEffectPools(modifierTexts = []) {
  const { sources } = originEffectFactor(modifierTexts);
  return {
    increased: sources.filter((item) => !item.additional).reduce((sum, item) => sum + item.value, 0),
    additional: sources.filter((item) => item.additional).map((item) => item.value),
    sources,
  };
}

// "share% of a bonus is also applied to X": the increased part adds share × increased into X's increased pool, each additional part
// multiplies X by (1 + share × additional) (provisional; the same reading as the planner's other share lines).
export const shared = (pools, sharePercent) => ({
  increased: (pools.increased * sharePercent) / 100,
  additional: pools.additional.map((value) => (value * sharePercent) / 100),
});

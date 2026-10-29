// Thea's shared pieces (hero trait audit batch B7, 2026-10-19): the loadout ids, the keyword values, the trait patterns of the three
// loadouts and their clause keys, the line readers, the Divine Blessing cycle's badge and the badge helpers. Each loadout's state and
// badges are in its own module; packages/engine/src/heroes/thea/traits.js composes them.

import { normalizePercentageText } from "../../text/percentage-text.js";

export const WISDOM = "thea-wisdom-of-the-gods";
export const INCARNATION = "thea-incarnation-of-the-gods";
export const BLASPHEMER = "thea-blasphemer";
export const THEA_HEROES = new Set([WISDOM, INCARNATION, BLASPHEMER]);
export const INSIDE_REALM_CONDITION = "theaInsideRealm";
export const CYCLE_SOURCE = "Thea: Divine Blessing cycle (a stack of each Blessing every 6 s, Q-H3)";
export const CYCLE = Object.freeze({ intervalSeconds: 2, order: Object.freeze(["Focus", "Agility", "Tenacity"]) });
export const KEYWORDS = Object.freeze({
  desecration: Object.freeze({
    perStackPercent: 15,
    initialMax: 3,
    durationSeconds: 5,
    source:
      "TLIDB keyword Desecration (hover e08b6093): +15% additional Erosion Damage taken (multiplies) per stack, initial max 3, lasts 5 s, 1 target",
  }),
  sacrificialPawn: Object.freeze({
    erosionTakenPercent: 10,
    source:
      "TLIDB keyword Sacrificial Pawn (hover 0f6b3f2c): +10% additional Erosion Damage taken; a Crowd Control Effect",
  }),
  mountainOfSins: Object.freeze({
    erosionResistancePercent: 20,
    source: "TLIDB keyword Mountain of Sins (hover 8ad74b7c): reduces Erosion Resistance by 20%",
  }),
  godsBoon: Object.freeze({
    buffSeconds: 10,
    source: "game data: God's Boon's buff 82115 lasts 10 s (hero trait audit §6)",
  }),
});
export const HORIZON_SECONDS = 120;
export const EPS = 1e-9;
export const round = (value) => Math.round(value * 10000) / 10000;
export const pct = (value) => Math.round(value * 10000) / 100;
export const cleanThea = (text) =>
  normalizePercentageText(String(text ?? ""))
    .replace(/\s+/g, " ")
    .replace(/(\d) %/g, "$1%")
    .replace(/ ([,.:])/g, "$1")
    .replace(/^\+ (\d)/, "+$1")
    .trim();

const NUM = "([+-]?\\d+(?:\\.\\d+)?)";
export const THEA_PATTERNS = Object.freeze({
  cycle:
    /^Gain a Divine Blessing every ([\d.]+) ?s in the following order: Focus Blessing - Agility Blessing - Tenacity Blessing$/i,
  // Wisdom of The Gods (tree).
  boonClick: /^Click the Trait Skill to cast God's Boon$/i,
  boonBase: /^God's Boon: Consumes all Focus Blessings to grant self God's Boon\. Cooldown: ([\d.]+) ?s$/i,
  boonMax:
    /^\+(\d+(?:\.\d+)?)% additional damage if God's Boon consumes max stacks of Focus Blessing\. Lasts for ([\d.]+) ?s$/i,
  boonAuto: /^Automatically try to use God's Boon when Focus Blessing is at max stacks$/i,
  boonArea:
    /^\+(\d+(?:\.\d+)?)% Skill Area for each stack of Focus Blessing consumed by God's Boon\. Lasts for \+?([\d.]+) ?s\. Stacks up to (\d+) time\(s\)$/i,
  revelation:
    /^\+(\d+(?:\.\d+)?)% additional damage while having Tenacity Blessing, Agility Blessing, and Focus Blessing$/i,
  revelationTalents: /^Replaces some Talents on the No\. 4 activated Talent Panel/i,
  justiceShare:
    /^The biggest max stack bonus of Agility Blessing or Tenacity Blessing is also applied to the max stack bonus of Focus Blessing$/i,
  boonCdr: new RegExp(`^${NUM}% additional Cooldown Recovery Speed for God's Boon$`, "i"),
  punishment:
    /^Deals Lucky Damage and \+(\d+(?:\.\d+)?)% additional Max Damage per stack of Agility Blessing when the number of Agility Blessing stacks equals the number of Focus Blessing stacks$/i,
  reincarnation:
    /^\+(\d+(?:\.\d+)?)% additional damage for each stack of Focus Blessing that God's Boon consumes\. Lasts for ([\d.]+) ?s\. Stacks up to (\d+) time\(s\)$/i,
  farewell:
    /^\+(\d+(?:\.\d+)?)% Double Damage Chance for each stack of Focus Blessing that God's Boon consumes\. Lasts for ([\d.]+) ?s\. Stacks up to (\d+) time\(s\)$/i,
  quadruple: /^For every 1% overflown Double Damage Chance, there is a 1% chance to deal Quadruple Damage instead$/i,
  purity: /^Buffs gained from God's Boon can stack (\d+) additional time$/i,
  oracle:
    /^During God's Boon, Tenacity Blessing and Agility Blessing gain an additional effect: \+(\d+(?:\.\d+)?)% additional damage$/i,
  oracleCap: /^\+(\d+) to Max (Agility|Focus|Tenacity) Blessing Stacks$/i,
  // Incarnation of the Gods.
  realmCast:
    /^Click the Trait Skill to use Divine Realm on the closest enemy for ([\d.]+) ?s\. Cooldown: ([\d.]+) ?s$/i,
  realmDamage:
    /^\+(\d+(?:\.\d+)?)% additional damage for every stack of Blessing when the Divine Realm is active\. Stacks up to (\d+) time\(s\)$/i,
  convertOutside: /^Converts all Tenacity Blessing to Agility Blessing when outside the Divine Realm$/i,
  convertInside: /^Converts all Agility Blessing to Tenacity Blessing when within the Divine Realm$/i,
  transferOutside:
    /^The increase\/decrease of max Tenacity Blessing stacks is also applied to Agility Blessing when you're outside of the Divine Realm\.?$/i,
  transferInside:
    /^The increase\/decrease of max Agility Blessing stacks is also applied to Tenacity Blessing when you're within the Divine Realm\.?$/i,
  realmMoon:
    /^\+(\d+(?:\.\d+)?)% additional damage for every stack of Tenacity Blessing or Agility Blessing\. Stacks up to (\d+)%? time\(s\)$/i,
  realmArea:
    /additional Divine Realm Skill Area for every \+1 to the max stacks of any Blessing\. Stacks up to \d+ time\(s\)$/i,
  prepare:
    /^Every ([\d.]+) ?s, Prepares Divine Realm\. Prioritizes triggering Divine Realm on the (?:nearest|farthest) enemy$/i,
  tenacious:
    /^When Tenacity Blessing is at least at (\d+) stack\(s\), \+(\d+(?:\.\d+)?)% additional damage\. When Tenacity Blessing is at least at (\d+) stack\(s\), this effect becomes: Deals \+(\d+(?:\.\d+)?)% additional damage to enemies at Low Life for every stack of Tenacity Blessing\. Stacks up to (\d+) time\(s\)$/i,
  agile:
    /^When Agility Blessing is at least at (\d+) stack\(s\), \+(\d+(?:\.\d+)?)% additional Attack and Cast Speed\. When Agility Blessing is at least at (\d+) stack\(s\), this effect becomes: When at Low Life, \+(\d+(?:\.\d+)?)% additional damage for every stack of Agility Blessing\. Stacks up to (\d+) time\(s\)$/i,
  mightSpeed:
    /^(\d+(?:\.\d+)?)% additional Attack and Cast Speed for every stack of any Blessing owned when outside the Divine Realm, up to an additional \+(\d+(?:\.\d+)?)%$/i,
  mightDamage:
    /^(\d+(?:\.\d+)?)% additional damage for every stack of any Blessing owned when outside the Divine Realm, up to an additional \+(\d+(?:\.\d+)?)%$/i,
  mightTaken:
    /additional damage taken for every stack of any blessing owned while within area of Divine Realm, up to -?\d+(?:\.\d+)?%$/i,
  powerInside: /^When in the Divine Realm, \+(\d+(?:\.\d+)?)% additional damage to enemies in the Divine Realm$/i,
  powerSpeed:
    /^\+(\d+(?:\.\d+)?)% Attack and Cast Speed when outside the Divine Realm while the Divine Realm is active$/i,
  powerKill: /^When defeating an enemy outside the Divine Realm while the Divine Realm is active/i,
  powerRefresh: /^When there are no enemies in the Divine Realm, refreshes the cooldown of Divine Realm$/i,
  deem: /^Upon inflicting damage, deem this enemy to be at Low Life for ([\d.]+) ?s\. This effect's Cooldown for the same enemy: ([\d.]+) ?s$/i,
  realmEnemy: /^\+(\d+(?:\.\d+)?)% additional damage to enemies in the Divine Realm$/i,
  crossing: /^\+(\d+) to max stacks of all Blessings while outside the Divine Realm$/i,
  // Blasphemer.
  desecrationClick:
    /^Click the Trait Skill to inflict Desecration on the enemy with the highest rarity within ([\d.]+) ?m\. Cooldown: ([\d.]+) ?s\. Inflicts one-third of the max stacks each time \(rounded up\)$/i,
  desecrationConvert:
    /^Converts the effects of affixes that increase Max Blessings Stacks into effects that reduce Max Blessings Stacks and increase Max Desecration Stacks\. Increases Max Desecration Stacks by up to (\d+) for each type of Blessings$/i,
  desecrationTrigger:
    /^Triggers the Trait Skill and ignores its cooldown when gaining any Blessing\. Interval: ([\d.]+) ?s$/i,
  elitesOnly: /^Desecration only affects Elites$/i,
  pawn: /^When there are no other enemies within ([\d.]+) ?m of the Desecrated target, the target gains Sacrificial Pawn$/i,
  spread: /^Up to \d+ Elites within [\d.]+ ?m of a Desecrated target will also be inflicted with Desecration$/i,
  sageSpeed:
    /^\+(\d+(?:\.\d+)?)% Attack and Cast Speed when dealing damage to a Desecrated target\. Lasts ([\d.]+) ?s\. This effect cannot stack$/i,
  onsetTrue:
    /^When inflicting Desecration on an Elite for the first time, deals True Damage equal to (\d+(?:\.\d+)?)% of Max Life$/i,
  onsetMountain: /^When a Desecrated target is under a crowd control effect, the target gains Mountain of Sins$/i,
  extremeCap:
    /^If the Max Blessings Stacks are further increased when the max stacks of all Blessings are 0, converts the effects of their affixes into effects that increase Max Desecration Stacks\. Desecration stacks up to (\d+) times$/i,
  extremeLife:
    /^Desecration gains an additional base effect: (\d+(?:\.\d+)?)% additional Erosion Damage taken for every (\d+(?:\.\d+)?)% of Life the target loses$/i,
  shrineSelf: /^Inflicts Desecration on yourself when inflicting Desecration on enemies$/i,
  shrineDamage: /^\+(\d+(?:\.\d+)?)% additional Erosion Damage when you have Desecration$/i,
});
const WISDOM_KEYS = [
  "cycle",
  "boonClick",
  "boonBase",
  "boonMax",
  "boonAuto",
  "boonArea",
  "revelation",
  "revelationTalents",
  "justiceShare",
  "boonCdr",
  "punishment",
  "reincarnation",
  "farewell",
  "quadruple",
  "purity",
  "oracle",
  "oracleCap",
];
const INCARNATION_KEYS = [
  "cycle",
  "realmCast",
  "realmDamage",
  "convertOutside",
  "convertInside",
  "transferOutside",
  "transferInside",
  "realmMoon",
  "realmArea",
  "prepare",
  "tenacious",
  "agile",
  "mightSpeed",
  "mightDamage",
  "mightTaken",
  "powerInside",
  "powerSpeed",
  "powerKill",
  "powerRefresh",
  "deem",
  "realmEnemy",
  "crossing",
];
const BLASPHEMER_KEYS = [
  "cycle",
  "desecrationClick",
  "desecrationConvert",
  "desecrationTrigger",
  "elitesOnly",
  "pawn",
  "spread",
  "sageSpeed",
  "onsetTrue",
  "onsetMountain",
  "extremeCap",
  "extremeLife",
  "shrineSelf",
  "shrineDamage",
];
const KEYS = { [WISDOM]: WISDOM_KEYS, [INCARNATION]: INCARNATION_KEYS, [BLASPHEMER]: BLASPHEMER_KEYS };
// Revived (memory) lines the module reads: The Place of Oracle (+ its three Blessing variants), Crossing the Divine Threshold's
// Blessing line, Inverted Shrine.
export const THEA_REVIVED_KEYS = new Set(["oracle", "oracleCap", "crossing", "shrineSelf", "shrineDamage"]);

/** The clause key a Thea line is for this loadout, or null. */
export function theaClauseKey(heroId, text) {
  const keys = KEYS[heroId];
  if (!keys) return null;
  const clean = cleanThea(text);
  return keys.find((key) => THEA_PATTERNS[key].test(clean)) || null;
}
/** Whether a revived (memory) line of this loadout is read here. */
export const theaRevivedLine = (heroId, text) => THEA_REVIVED_KEYS.has(theaClauseKey(heroId, text));

export const linesOf = (modifierTexts, heroId) =>
  modifierTexts
    .filter(
      (line) =>
        line &&
        line.origin !== "derived" &&
        !line.lineEffect &&
        (line.origin === "trait" || (line.origin === "memory" && theaRevivedLine(heroId, line.text))),
    )
    .map((line) => ({ ...line, clean: cleanThea(line.text) }));
export const matchesOf = (lines, pattern) =>
  lines.map((line) => ({ line, match: line.clean.match(pattern) })).filter((item) => item.match);
export const firstOf = (lines, pattern) => matchesOf(lines, pattern)[0] || null;

/** A piecewise-constant schedule ("steps", packages/engine/src/combat/timed-effects.js) of `levelAt` over the given edge times. */
export function stepsFrom(levelAt, times) {
  const points = [];
  const sorted = [...new Set(times)].sort((a, b) => a - b);
  for (let index = 0; index < sorted.length; index++) {
    const next = sorted[index + 1] ?? HORIZON_SECONDS;
    const level = round(levelAt((sorted[index] + next) / 2));
    if (!points.length || points[points.length - 1][1] !== level) points.push([sorted[index], level]);
  }
  return points;
}

export const L = (status, reason, extra = {}) => ({ status, reason, ...extra });
export const inCalc = (reason, extra) => L("In calc", reason, extra);
export const inactive = (reason, extra) => L("Inactive", reason, extra);
export const neutral = (reason, extra) => L("No DPS effect", reason, extra);
export const notOnDummy = (reason, extra) => L("Not on dummy", reason, extra);
export const notModeled = (reason, extra) => L("Not modeled", reason, extra);
export const signed = (value) => `${value >= 0 ? "+" : ""}${round(value)}`;

export function cycleRead(state) {
  const B = state.blessings;
  const list = CYCLE.order.map((name) => `${name} ${round(B[name].stacks)} of ${B[name].maxStacks}`).join(", ");
  const used = CYCLE.order.some((name) => B[name].stacks > 0 && B[name].perStackDamage > 0) || B.Agility.stacks > 0;
  return used
    ? inCalc(
        `a Divine Blessing every 2 s (Focus → Agility → Tenacity, one stack of each type every 6 s), held at max stacks with own buffs built (Q-H3, provisional): ${list}`,
      )
    : inactive(`no Blessing holds a stack (${list})`);
}

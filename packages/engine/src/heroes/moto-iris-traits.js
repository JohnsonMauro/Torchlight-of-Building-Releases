// Moto (Order Calling, Charge Calling) and Iris (Growing Breeze, Vigilant Breeze): hero trait audit batch B6 (2026-10-19;
// research/hero-traits-audit-2026-10-19.md §5 B6, §8 B6, §6 Q-H8 / Q-H13). Pure: reads the build's trait lines (origin "trait")
// and the hero-exclusive revived lines the module reads (packages/engine/src/heroes/hero-exclusive-revivals.js MODULE_LINES) and returns the states the
// Minion engine applies (packages/engine/src/minions/minion-damage-model.js `heroTraits`), packages/engine/src/planner.js passes per Minion and packages/engine/src/heroes/hero-trait-modules.js
// badges.
//
// Sourced (TLIDB keyword tooltips, Torchlight_Hyperlink_hover, fetched 2026-10-19 and saved in research/tlidb-ss14/fetch-cache):
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
//
// Provisional readings (src/app/stats/open-questions.js, shown only for the hero):
// - Q-H8 (recommended): Overload held at uptime 1 while a Summon Skill is recast within every 12 s (best-case switch
//   "motoOverload"); its duration lines change no dummy figure. All In's first-gain bonus is held (each recast summons fresh Minions
//   that gain Overload for the first time). Machine's Joy: 30 stacks with own buffs built (Minion hits, no Trait Skill cast).
// - Charge Calling pressed on cooldown (6 s / 6 s: uptime 1; the Trait Skill switch); each summon cast during it creates 1 + Rally +
//   1 Synthetic Troop Minions that self-destruct 1 s after (115% of Base Damage, Physical Attack), at most the skill's quantity + 1
//   alive: explosions/s = min(casts/s × troops per cast, alive ÷ 1 s). Summon casts: Fuel War with War's trigger (Main Summon Skill)
//   or the player recasting the summon (its use time; a Module's 4 s cooldown). The planner keeps whichever of the troops' own
//   attacks and the explosion loop deals more (best case). Mechanical Parts: drop chance × explosions/s, picked up, "recently" = 4 s.
// - Q-H13 (recommended): the Vigilant state held (best-case switch "irisVigilant"), Breeze at its max (10 + Breeze's Whisper +
//   Warmest Vigilance + Blowing Breeze when their sources fire), Growth +6 per Breeze with the moon; Reconjuring breaks ignored.
//   The Merged Magus's Ultimate is in its cycle (8 s, the Full Bloom keyword's initial cooldown; none with Whirlwind Tango, then
//   only cast where it out-damages the Base / Enhanced slot); without Happiest Reunion one Magus is Merged (the best one).
// - Socialite: +1 Max Summonable Spirit Magi per Magus skill, within the map cap read as one per Magus skill + "Max Spirit Magi In
//   Map" lines. Windrider: channelled whenever the Trait Skill switch is on, 3 Nourishment (+1 with the moon) per 5 × 0.33 s ÷ (1 +
//   Cast Speed). Full Bloom: entered at every 10 Nourishment stacks granted (and at the start with own buffs built), 12 s; the
//   Ultimate in the cycle while it lasts.

import { normalizePercentageText } from "../text/percentage-text.js";
import { originEffectFactor, originGrants, originTextAt } from "../skills/origin-of-spirit-magus.js";

export const ORDER_CALLING = "moto-order-calling";
export const CHARGE_CALLING = "moto-charge-calling";
export const GROWING_BREEZE = "iris-growing-breeze";
export const VIGILANT_BREEZE = "iris-vigilant-breeze";
export const B6_HEROES = new Set([ORDER_CALLING, CHARGE_CALLING, GROWING_BREEZE, VIGILANT_BREEZE]);
export const OVERLOAD_CONDITION = "motoOverload";
export const VIGILANT_CONDITION = "irisVigilant";
export const TROOP_FAMILIES = Object.freeze(["synthetic-troop", "module"]);
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
const round = (value) => Math.round(value * 10000) / 10000;
export const cleanB6 = (text) =>
  normalizePercentageText(String(text ?? ""))
    .replace(/\s+/g, " ")
    .replace(/(\d) %/g, "$1%")
    .replace(/ ([,.])/g, "$1")
    .trim();

const N = "([+-]?\\d+(?:\\.\\d+)?)";
export const MOTO_PATTERNS = Object.freeze({
  overloadGrant:
    /^Within ([\d.]+) ?s after a Summon Skill is cast, all your Minions will gain Overload\. Cooldown: ([\d.]+) ?s$/i,
  overloadDamage: /^Overload grants \+(\d+(?:\.\d+)?)% additional damage$/i,
  overloadRefresh:
    /^The Effect and Duration of Overload are refreshed when a Minion that already has Overload gains Overload again$/i,
  overloadMinionDamage: /^\+(\d+(?:\.\d+)?)% additional damage when Minions have Overload$/i,
  modularization: /^The cooldown of Modularization Skills is reduced to ([\d.]+) ?s$/i,
  overloadDuration: /^\+(\d+(?:\.\d+)?)% (?:additional )?Overload Duration$/i,
  veteranSpeed: /^Minions \+(\d+(?:\.\d+)?)% Attack and Cast Speed when they have Overload$/i,
  allIn: /^\+(\d+(?:\.\d+)?)% additional Overload Effect when a Minion gains Overload for the first time$/i,
  regen: /^Minions with Overload regenerate [\d.]+% Max Life per second for every \d+ Command owned$/i,
  selfReconstruct: /^\+(\d+(?:\.\d+)?)% additional damage when Minions have Overload and are not at Low Life$/i,
  programGain: /^Gains Overload for ([\d.]+) ?s after a Synthetic Troop Minion is spawned$/i,
  overloadEffect: /^\+(\d+(?:\.\d+)?)% additional Overload Effect$/i,
  chargeForward: /^\+(\d+(?:\.\d+)?)% Overload Effect for every (\d+) Command owned, up to \+(\d+(?:\.\d+)?)%$/i,
  machineJoy:
    /^\+(\d+(?:\.\d+)?)% additional Overload Effect on hit\. Stacks up to (\d+) time\(s\) \(multiplies\)\. Removes all stacks when casting a Trait Skill$/i,
  chargeCalling:
    /^Allows you to click the Trait Skill to gain Charge Calling for ([\d.]+) ?s\. Cooldown: ([\d.]+) ?s$/i,
  selfDestruct:
    /^During Charge Calling, Synthetic Troop Minions summoned at a time \+(\d+)\. All Synthetic Troop Minions will activate Self-Destruct Protocol and Charge at the enemy in the next ([\d.]+) ?s/i,
  selfDestructDamage: /^\+(\d+(?:\.\d+)?)% additional Self-Destruct Damage triggered by Self-Destruct Protocol$/i,
  chargeMoon:
    /^\+(\d+(?:\.\d+)?)% additional Minion Damage if any Mechanical Part is picked up recently\. \+(\d+(?:\.\d+)?)% Skill Area for Self-Destruct Protocol$/i,
  partDrop:
    /^\+(\d+(?:\.\d+)?)% chance for a Synthetic Troop Minion to drop (\d+) Mechanical Part When it initiates Self-Destruct Protocol\. Mechanical Parts last ([\d.]+) ?s$/i,
  partPickup: /^Player will automatically pick up nearby Mechanical Parts$/i,
  partDamage:
    /^\+?(\d+(?:\.\d+)?)% additional Minion Damage for each Mechanical Part picked up recently\. Stacks up to (\d+) time\(s\)$/i,
  traitSlot:
    /^Gains a Skill Slot, in which a Support Skill or Activation Medium Support Skill can be installed to support Trait Skill Charge Calling$/i,
  heroic:
    /^For every (\d+(?:\.\d+)?) Max Life and Max Energy Shield a Synthetic Troop Minion has, \+(\d+(?:\.\d+)?)% additional damage for the Self-Destruct triggered by Self-Destruct Protocol$/i,
  guerilla:
    /^\+(\d+(?:\.\d+)?)% additional Self-Destruct Protocol Charge Speed and \+(\d+(?:\.\d+)?)% additional Self-Destruct Protocol Damage for each Mechanical Part collected recently\. Stacks up to (\d+) time\(s\)$/i,
  fuelWar: /^Triggers the Main Summon Skill on the closest enemy within (\d+) ?m every ([\d.]+) ?s$/i,
  fuelWarCooldown: /^Skills triggered this way ignore the cooldown of Modularization Skills$/i,
  essentialSpeed:
    /^(\d+(?:\.\d+)?)% of the bonus and additional bonus to Minion Attack Speed is also applied to the bonus and additional bonus of Self-Destruct Protocol Damage$/i,
  perilLife: /^Adds (\d+(?:\.\d+)?)% of the player's Max Life to the Base Life of Synthetic Troop Minions$/i,
  perilShield:
    /^Adds (\d+(?:\.\d+)?)% of the player's Max Energy Shield to the Base Energy Shield of Synthetic Troop(?: Minions)?$/i,
});

export const IRIS_PATTERNS = Object.freeze({
  activeAsTrait:
    /^When a Spirit Magus Skill is set as an Active Skill, casting the Active Skill is considered as casting the Trait Skill as well$/i,
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
  reunionMerged: /^While in the Vigilant state, all Spirit Magi are considered Merged Spirit Magi$/i,
  reunionDamage:
    /^While in the Vigilant state, for every Spirit Magus there is, \+(\d+(?:\.\d+)?)% additional damage \(multiplies\) for Merged Spirit Magi\. \+(\d+(?:\.\d+)?)% to the amount of Max Life they consume per second when not Reconjuring$/i,
  warmest:
    /^\+(\d+) to the Max Breeze Stacks for every ([\d.]+)% Max Life consumed by Merged Spirit Magi, up to \+(\d+)$/i,
  mergingOrigin:
    /^Iris is not affected by Origin of Spirit Magus Effects, and all basic Origin of Spirit Magus Effects will be applied to all Spirit Magi$/i,
  mergingGrowth:
    /^For every (\d+) Growth a Spirit Magus has, it ([\d.]+)% additional Origin of Spirit Magus Effect received$/i,
  // Revived (Nourishing Spring Rain, Nature's Party, Soft Storm, Blowing Breeze).
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
  softStormTrigger:
    /^While in Vigilant, for every (\d+) use\(s\) of Enhanced Skills by Spirit Magi, triggers the Ultimate$/i,
  softStormPenalty: /^Spirit Magi cannot use the Ultimate\. -(\d+(?:\.\d+)?)% additional Ultimate Damage$/i,
  blowing:
    /^While in Vigilant, for every (\d+) use\(s\) of the Ultimate by Spirit Magi, \+(\d+) to Max Breeze Stacks, up to (\d+) Stacks, lasting until Reconjuring$/i,
});
// The clauses each loadout's module reads (Growing Breeze: only the clauses B6 adds; the Nourishment grant / loss / effect lines keep
// their reader, packages/engine/src/minions/minion-damage-model.js nourishmentState, and its badge rule in packages/engine/src/text/line-coverage.js).
const GROWING_KEYS = [
  "empowerShare",
  "mapCap",
  "summonable",
  "fullBloom",
  "ultimateCdr",
  "windrider",
  "autoTrait",
  "originShare",
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
const VIGILANT_KEYS = [
  "activeAsTrait",
  "merge",
  "drain",
  "breezeGain",
  "breezeLoss",
  "breezeGrowth",
  "tangoNoCooldown",
  "tangoGain",
  "whisper",
  "whisperCap",
  "mapCap",
  "reunionMerged",
  "reunionDamage",
  "warmest",
  "mergingOrigin",
  "mergingGrowth",
  "softStormTrigger",
  "softStormPenalty",
  "blowing",
];
const MOTO_ORDER_KEYS = [
  "overloadGrant",
  "overloadDamage",
  "overloadRefresh",
  "overloadMinionDamage",
  "modularization",
  "overloadDuration",
  "veteranSpeed",
  "allIn",
  "regen",
  "selfReconstruct",
  "programGain",
  "overloadEffect",
  "chargeForward",
  "machineJoy",
];
const MOTO_CHARGE_KEYS = [
  "chargeCalling",
  "selfDestruct",
  "selfDestructDamage",
  "chargeMoon",
  "partDrop",
  "partPickup",
  "partDamage",
  "traitSlot",
  "heroic",
  "guerilla",
  "fuelWar",
  "fuelWarCooldown",
  "essentialSpeed",
  "perilLife",
  "perilShield",
];
const KEYS = {
  [ORDER_CALLING]: [MOTO_PATTERNS, MOTO_ORDER_KEYS],
  [CHARGE_CALLING]: [MOTO_PATTERNS, MOTO_CHARGE_KEYS],
  [GROWING_BREEZE]: [IRIS_PATTERNS, GROWING_KEYS],
  [VIGILANT_BREEZE]: [IRIS_PATTERNS, VIGILANT_KEYS],
};

/** The clause key a B6 line is for this loadout, or null. */
export function b6ClauseKey(heroId, text) {
  const entry = KEYS[heroId];
  if (!entry) return null;
  const clean = cleanB6(text);
  const [patterns, keys] = entry;
  return keys.find((key) => patterns[key].test(clean)) || null;
}
/** Whether a revived (memory) line of this loadout is read here. */
export const B6_REVIVED_KEYS = new Set([
  "machineJoy",
  "perilLife",
  "perilShield",
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
  "softStormTrigger",
  "softStormPenalty",
  "blowing",
]);
export const b6RevivedLine = (heroId, text) => B6_REVIVED_KEYS.has(b6ClauseKey(heroId, text));

const linesOf = (modifierTexts, heroId) =>
  modifierTexts
    .filter(
      (line) =>
        line &&
        line.origin !== "derived" &&
        !line.lineEffect &&
        (line.origin === "trait" || (line.origin === "memory" && b6RevivedLine(heroId, line.text))),
    )
    .map((line) => ({ ...line, clean: cleanB6(line.text) }));
const matchesOf = (lines, pattern) =>
  lines.map((line) => ({ line, match: line.clean.match(pattern) })).filter((item) => item.match);
const firstOf = (lines, pattern) => matchesOf(lines, pattern)[0] || null;
const sumOf = (lines, pattern, group = 1) =>
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
function originEffectPools(modifierTexts = []) {
  const { sources } = originEffectFactor(modifierTexts);
  return {
    increased: sources.filter((item) => !item.additional).reduce((sum, item) => sum + item.value, 0),
    additional: sources.filter((item) => item.additional).map((item) => item.value),
    sources,
  };
}

// "share% of a bonus is also applied to X": the increased part adds share × increased into X's increased pool, each additional part
// multiplies X by (1 + share × additional) (provisional; the same reading as the planner's other share lines).
const shared = (pools, sharePercent) => ({
  increased: (pools.increased * sharePercent) / 100,
  additional: pools.additional.map((value) => (value * sharePercent) / 100),
});

/**
 * Summary of the build's B6 traits for the selected loadout, or null for any other hero.
 * @param {object} p
 * @param {string} p.heroId
 * @param {object[]} p.modifierTexts the build's lines (trait lines origin "trait", revived lines origin "memory")
 * @param {object} p.requestedConditions best-case switches (motoOverload, traitSkillOnCooldown, irisVigilant, prebuiltSelfBuffs)
 * @param {object|null} p.command packages/engine/src/minions/minion-cores.js commandState (Charge Forward's Command)
 * @param {object} p.stats { maxLife, maxEnergyShield, armor } (Peril of Synthetic Troops, Nature's Party's Rock Magus)
 * @param {number} p.castSpeedPercent the character's increased Cast Speed (Windrider's channel interval)
 * @param {{ key, family, minion }[]} p.minions the modeled Minion sources of the build (families)
 * @param {object} p.traitSupports hero.heroTraitSupports (Unstoppable Wave's Charge Calling support slot)
 */
export function motoIrisState({
  heroId = "",
  modifierTexts = [],
  requestedConditions = {},
  command = null,
  stats = {},
  castSpeedPercent = 0,
  minions = [],
  traitSupports = {},
} = {}) {
  if (!B6_HEROES.has(heroId)) return null;
  const lines = linesOf(modifierTexts, heroId);
  const M = MOTO_PATTERNS,
    I = IRIS_PATTERNS;
  const prebuilt = requestedConditions.prebuiltSelfBuffs !== false;
  const traitPressed = requestedConditions.traitSkillOnCooldown !== false;
  const families = new Set(minions.map((item) => item.family));
  const hasMinion = minions.length > 0,
    hasTroop = TROOP_FAMILIES.some((family) => families.has(family)),
    hasMagus = families.has("spirit-magus");
  const readTexts = new Set();
  for (const line of lines) if (b6ClauseKey(heroId, line.clean)) readTexts.add(line.clean);
  const out = {
    heroId,
    readTexts,
    prebuilt,
    traitPressed,
    hasMinion,
    hasTroop,
    hasMagus,
    overload: null,
    chargeCalling: null,
    growing: null,
    vigilant: null,
    chargeCallingSupport: heroId === CHARGE_CALLING ? String(traitSupports?.[CHARGE_CALLING] || "") : "",
  };
  const empower = playerEmpowerEffect(modifierTexts);

  if (heroId === ORDER_CALLING) {
    const grant = firstOf(lines, M.overloadGrant);
    const program = firstOf(lines, M.programGain);
    if (grant || program) {
      const held = Boolean(grant) && requestedConditions[OVERLOAD_CONDITION] !== false;
      const forward = firstOf(lines, M.chargeForward);
      const commandPoints = command?.points || 0;
      const forwardPercent = forward
        ? Math.min(
            Number(forward.match[3]),
            Number(forward.match[1]) * Math.floor(commandPoints / Number(forward.match[2]) + 1e-9),
          )
        : 0;
      const allIn = sumOf(lines, M.allIn);
      const effectAdditional = [
        ...(allIn
          ? [{ source: firstOf(lines, M.allIn).line.source, value: allIn, label: "All In (first gain, held: Q-H8)" }]
          : []),
        ...matchesOf(lines, M.overloadEffect).map(({ line, match }) => ({
          source: line.source,
          value: Number(match[1]) * (line.multiplier ?? 1),
          label: "additional Overload Effect",
        })),
        ...empower.additional.map((value) => ({
          source: "Empower Skill Effect (Overload keyword)",
          value,
          label: "additional Empower Skill Effect",
        })),
      ];
      const joyMatch = firstOf(lines, M.machineJoy);
      const joy = joyMatch
        ? {
            perStackPercent: Number(joyMatch.match[1]),
            maxStacks: Number(joyMatch.match[2]),
            source: joyMatch.line.source,
            prebuilt,
          }
        : null;
      const increased = forwardPercent + empower.increased;
      const factorAt = (joyStacks = joy ? joy.maxStacks : 0) =>
        Math.max(0, 1 + increased / 100) *
        effectAdditional.reduce((product, item) => product * (1 + item.value / 100), 1) *
        (joy ? (1 + joy.perStackPercent / 100) ** joyStacks : 1);
      const damageMatch = firstOf(lines, M.overloadDamage);
      const basePercent = damageMatch ? Number(damageMatch.match[1]) : 0;
      out.overload = {
        grant: Boolean(grant),
        held,
        programSeconds: program ? Number(program.match[1]) : null,
        windowSeconds: grant ? Number(grant.match[1]) : null,
        cooldownSeconds: grant ? Number(grant.match[2]) : null,
        basePercent,
        factor: round(factorAt()),
        factorAt,
        increasedPercent: round(increased),
        forward: forward
          ? {
              perStepPercent: Number(forward.match[1]),
              every: Number(forward.match[2]),
              capPercent: Number(forward.match[3]),
              commandPoints,
              percent: forwardPercent,
            }
          : null,
        additional: effectAdditional,
        empower,
        joy,
        minionDamagePercent: sumOf(lines, M.overloadMinionDamage),
        selfReconstructPercent: sumOf(lines, M.selfReconstruct),
        speedPercent: sumOf(lines, M.veteranSpeed),
        durationLines: matchesOf(lines, M.overloadDuration).length,
      };
      // Which Minions hold Overload: every Minion while Order Calling's Overload is held (a Summon recast within 12 s), else the
      // Synthetic Troop Minions with Overload Program (each spawned with 6 s of Overload, defeated after 6 s: always up).
      out.overload.appliesTo = (family) =>
        (out.overload.held && hasMinion) || (Boolean(out.overload.programSeconds) && TROOP_FAMILIES.includes(family));
      out.overload.layersAt = (joyStacks) => {
        const value = basePercent * factorAt(joyStacks);
        const label = `Overload (Order Calling: +${basePercent}% × ${round(factorAt(joyStacks))} Overload Effect${out.overload.held ? "; held, Q-H8" : "; Overload Program"})`;
        return [
          ...(value
            ? [
                {
                  kind: "additional",
                  value: round(value),
                  source: label,
                  text: `+${round(value)}% additional Minion Damage (Overload: +${basePercent}% × ${round(factorAt(joyStacks))} Overload Effect)`,
                },
              ]
            : []),
          ...(out.overload.minionDamagePercent
            ? [
                {
                  kind: "additional",
                  value: out.overload.minionDamagePercent,
                  source: "Order Calling (Minions have Overload)",
                  text: `+${out.overload.minionDamagePercent}% additional Minion Damage (Minions have Overload)`,
                },
              ]
            : []),
          ...(out.overload.selfReconstructPercent
            ? [
                {
                  kind: "additional",
                  value: out.overload.selfReconstructPercent,
                  source: "Self-Reconstruct (Overload, not at Low Life: the dummy never attacks)",
                  text: `+${out.overload.selfReconstructPercent}% additional Minion Damage (Overload, not at Low Life)`,
                },
              ]
            : []),
          ...(out.overload.speedPercent
            ? [
                {
                  kind: "speed",
                  value: out.overload.speedPercent,
                  additional: false,
                  attack: true,
                  cast: true,
                  source: "Veteran (Minions with Overload)",
                  text: `+${out.overload.speedPercent}% Minion Attack and Cast Speed (Overload)`,
                },
              ]
            : []),
        ];
      };
    }
  }

  if (heroId === CHARGE_CALLING) {
    const press = firstOf(lines, M.chargeCalling),
      sd = firstOf(lines, M.selfDestruct);
    if (press || sd) {
      const drop = firstOf(lines, M.partDrop),
        part = firstOf(lines, M.partDamage),
        moon = firstOf(lines, M.chargeMoon),
        guerilla = firstOf(lines, M.guerilla);
      const heroic = firstOf(lines, M.heroic),
        fuel = firstOf(lines, M.fuelWar),
        essential = firstOf(lines, M.essentialSpeed);
      const pressed = Boolean(press && sd) && traitPressed;
      out.chargeCalling = {
        pressed,
        durationSeconds: press ? Number(press.match[1]) : 6,
        cooldownSeconds: press ? Number(press.match[2]) : 6,
        uptime: press ? Math.min(1, Number(press.match[1]) / Number(press.match[2])) : 0,
        extraPerCast: sd ? Number(sd.match[1]) : 0,
        chargeSeconds: sd ? Number(sd.match[2]) : KEYWORDS.selfDestruct.lifeSeconds,
        additional: matchesOf(lines, M.selfDestructDamage).map(({ line, match }) => ({
          source: line.source,
          value: Number(match[1]) * (line.multiplier ?? 1),
          text: `+${match[1]}% additional Self-Destruct Damage (Charge Calling)`,
        })),
        parts: drop
          ? {
              chancePercent: Number(drop.match[1]),
              perDrop: Number(drop.match[2]),
              lastsSeconds: Number(drop.match[3]),
              pickup: Boolean(firstOf(lines, M.partPickup)),
              perPartPercent: part ? Number(part.match[1]) : 0,
              partCap: part ? Number(part.match[2]) : 0,
              moonPercent: moon ? Number(moon.match[1]) : 0,
              guerilla: guerilla
                ? {
                    speedPercent: Number(guerilla.match[1]),
                    damagePercent: Number(guerilla.match[2]),
                    cap: Number(guerilla.match[3]),
                  }
                : null,
            }
          : null,
        moonPercent: moon ? Number(moon.match[1]) : 0,
        heroic: heroic ? { per: Number(heroic.match[1]), percent: Number(heroic.match[2]) } : null,
        fuelWar: fuel
          ? {
              meters: Number(fuel.match[1]),
              intervalSeconds: Number(fuel.match[2]),
              ignoresModuleCooldown: Boolean(firstOf(lines, M.fuelWarCooldown)),
            }
          : null,
        essentialSharePercent: essential ? Number(essential.match[1]) : 0,
        peril: {
          lifePercent: sumOf(lines, M.perilLife),
          shieldPercent: sumOf(lines, M.perilShield),
          playerLife: Number(stats.maxLife) || 0,
          playerShield: Number(stats.maxEnergyShield) || 0,
        },
        traitSlot: Boolean(firstOf(lines, M.traitSlot)),
      };
    }
  }

  if (heroId === GROWING_BREEZE) {
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
    out.growing = {
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
                    perStack: Math.min(
                      Number(rock.match[3]),
                      ((Number(stats.armor) || 0) * Number(rock.match[2])) / 100,
                    ),
                  }
                : null,
              erosion: Boolean(firstOf(lines, I.partyErosion)),
            }
          : null,
    };
  }

  if (heroId === VIGILANT_BREEZE) {
    const merge = firstOf(lines, I.merge),
      gain = firstOf(lines, I.breezeGain);
    if (merge || gain) {
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
      out.vigilant = {
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
  }
  return out;
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

const TROOPS = new Set(TROOP_FAMILIES);
/**
 * The `heroTraits` input of packages/engine/src/minions/minion-damage-model.js calculateMinion for one Minion (null when the loadout reaches none).
 * @param {object|null} state motoIrisState
 * @param {object} p
 * @param {string} p.family the Minion's family
 * @param {string[]} p.setupKeys the setups that summon it; `mainSetupKey` the Main Skill's (Fuel War with War's Main Summon Skill)
 * @param {boolean} p.merged Vigilant: this Magus is a Merged one; `magiCount` the Spirit Magi in the map (Happiest Reunion)
 * @param {object|null} p.merging Merging Stream's Origins (mergingStreamOrigins)
 * @param {{ present, maxGrowth, maxEnhancedChance }|null} p.magi the modeled Spirit Magi (Nourishing Spring Rain on troops)
 * @param {number} p.extraCount Socialite's extra Magi for this Magus skill
 */
export function minionHeroTraits(
  state,
  {
    family = "",
    setupKeys = [],
    mainSetupKey = null,
    merged = false,
    magiCount = 1,
    merging = null,
    magi = null,
    extraCount = 0,
  } = {},
) {
  if (!state) return null;
  const out = { readTexts: state.readTexts, prebuilt: state.prebuilt, layers: [] };
  let any = false;
  const o = state.overload;
  if (o && o.appliesTo(family)) {
    any = true;
    out.layers.push(...o.layersAt(o.joy ? o.joy.maxStacks : 0));
    out.overload = true;
    if (o.joy) {
      const valueAt = (stacks) => o.basePercent * o.factorAt(stacks);
      out.overloadRamp = {
        prebuilt: o.joy.prebuilt,
        maxStacks: o.joy.maxStacks,
        ratioAt: (stacks) => (1 + valueAt(stacks) / 100) / (1 + valueAt(o.joy.maxStacks) / 100),
      };
    }
  }
  const c = state.chargeCalling;
  if (c && TROOPS.has(family)) {
    any = true;
    out.selfDestruct = { ...c, mainSummon: Boolean(mainSetupKey) && setupKeys.includes(mainSetupKey) };
  }
  const g = state.growing;
  if (g && family === "spirit-magus") {
    any = true;
    out.nourish = { effectFactor: g.effectFactor, windrider: g.windrider, ultimateCdrPercent: g.ultimateCdrPercent };
    if (g.party) out.party = g.party;
    if (extraCount > 0) {
      out.extraCount = extraCount;
      out.extraCountSource = "Socialite";
    }
  }
  if (g && TROOPS.has(family)) {
    if (g.troops) {
      any = true;
      out.troopNourish = {
        reductionPercent: magi?.present ? g.troops.lossPerChancePercent * (magi.maxEnhancedChance || 0) : 0,
      };
      out.nourish = { effectFactor: 1, windrider: g.windrider, ultimateCdrPercent: 0 };
    }
    if (g.troopGrowth && magi?.present) {
      any = true;
      const value = Math.min(
        g.troopGrowth.capPercent,
        g.troopGrowth.percent * Math.floor((magi.maxGrowth || 0) / g.troopGrowth.per + 1e-9),
      );
      if (value)
        out.layers.push({
          kind: "additional",
          value,
          source: "Nourishing Spring Rain (Spirit Magi present)",
          text: `+${value}% additional Minion Damage (+${g.troopGrowth.percent}% per ${g.troopGrowth.per} Growth of the Spirit Magi: ${magi.maxGrowth}; up to +${g.troopGrowth.capPercent}%)`,
        });
    }
  }
  const v = state.vigilant;
  if (v && family === "spirit-magus") {
    any = true;
    out.vigilant = { ...v, merged: Boolean(merged), magiCount };
  }
  if (v?.merging && family === "spirit-magus" && merging?.origins?.length) {
    any = true;
    out.merging = { ...v.merging, origins: merging.origins.filter((origin) => !origin.defensive) };
  }
  return any ? out : null;
}

const sumAllIn = (o) =>
  round(o.additional.filter((item) => /All In/.test(item.label)).reduce((sum, item) => sum + item.value, 0));
/**
 * The badge of one B6 clause: { status, reason } from the state and, once the Minion pass ran, the Minions' results
 * (`state.minions`: [{ key, name, family, modeled, dps, count, heroTraits, magus }]). Before the Minion pass the reading is the
 * state's alone (the planner settles the entries after the Minions).
 */
export function b6LineStatus(heroId, text, state) {
  const key = b6ClauseKey(heroId, text);
  if (!key) return null;
  const inCalc = (reason) => ({ status: "In calc", reason });
  const inactive = (reason) => ({ status: "Inactive", reason });
  const neutral = (reason) => ({ status: "No DPS effect", reason });
  if (!state) return inactive("the loadout's lines are not in the build");
  const facts = state.minions || null;
  // Before the Minion pass (the first line-effects pass) the entries are placeholders: packages/engine/src/planner.js settles them after the Minions.
  if (!facts) return state.hasMinion ? inCalc("settled after the Minion pass") : inactive("no modeled Minion");
  const modeled = facts.filter((minion) => minion.modeled);
  const pending = false;
  const list = (items) => items.map((minion) => minion.name).join(", ");
  if (heroId === ORDER_CALLING) {
    const o = state.overload;
    if (!o) return inactive("no Overload line in the build");
    const covered = modeled
      ? modeled.filter((minion) => minion.heroTraits?.overload)
      : state.hasMinion && (o.held || o.programSeconds)
        ? [{ name: "the Minions" }]
        : [];
    const none = !state.hasMinion
      ? "no modeled Minion"
      : !o.held && !o.programSeconds
        ? 'switched off: no Summon Skill recast within 12 s ("Overload held")'
        : "no Minion holds Overload (Overload Program reaches Synthetic Troops only)";
    const parts = [
      o.forward?.percent ? `Charge Forward +${o.forward.percent}%` : "",
      o.empower.increased ? `Empower Skill Effect +${round(o.empower.increased)}% (keyword Overload)` : "",
      ...o.additional.map((item) => `+${round(item.value)}% ${item.label}`),
      o.joy
        ? `Machine's Joy (1 + ${o.joy.perStackPercent}%)^${o.joy.maxStacks}${o.joy.prebuilt ? "" : " (ramps with the Minion hits: own buffs not pre-built)"}`
        : "",
    ].filter(Boolean);
    const effect = `×${round(o.factor)} Overload Effect${parts.length ? ` (${parts.join(", ")})` : ""}`;
    const held = `Overload held on ${pending ? "the Minions" : list(covered)} (${o.held ? "a Summon Skill recast within every 12 s: Q-H8, provisional" : `Overload Program: ${o.programSeconds} s on each Synthetic Troop spawned`})`;
    switch (key) {
      case "overloadGrant":
        return covered.length ? inCalc(`${held}; uptime 1`) : inactive(none);
      case "overloadDamage":
        return covered.length
          ? inCalc(`+${o.basePercent}% ${effect} = +${round(o.basePercent * o.factor)}% additional damage; ${held}`)
          : inactive(none);
      case "overloadRefresh":
        return neutral("Overload is held at uptime 1 (Q-H8): a refresh changes no dummy figure");
      case "overloadMinionDamage":
        return covered.length && !o.minionDamagePercent
          ? neutral("+0% at this base trait level")
          : covered.length
            ? inCalc(
                `+${o.minionDamagePercent}% additional Minion Damage while Overloaded (a separate affix on the Minions, not scaled by Overload Effect; game record 2165317); ${held}`,
              )
            : inactive(none);
      case "modularization":
        return neutral(
          "each Module is summoned once and stays; Overload is held by recasting any Summon Skill within 12 s, which a Module's own 4 s cooldown already allows (Q-H8)",
        );
      case "overloadDuration":
        return neutral(
          "Overload is held at uptime 1 while a Summon Skill is recast within every 12 s (Q-H8), so its duration changes no dummy figure (its base duration is not in the readable data)",
        );
      case "veteranSpeed":
        return covered.length
          ? inCalc(`+${o.speedPercent}% Minion Attack and Cast Speed while Overloaded; ${held}`)
          : inactive(none);
      case "allIn":
        return covered.length
          ? inCalc(
              `+${sumAllIn(o)}% additional Overload Effect: each recast summons fresh Minions that gain Overload for the first time (held: Q-H8, provisional)`,
            )
          : inactive(none);
      case "regen":
        return neutral("Minion Life regeneration: the dummy never attacks");
      case "selfReconstruct":
        return covered.length
          ? inCalc(
              `+${o.selfReconstructPercent}% additional Minion Damage: Overloaded and not at Low Life (the dummy never attacks); ${held}`,
            )
          : inactive(none);
      case "programGain": {
        if (o.held) return neutral("Order Calling's Overload already holds every Minion (Q-H8)");
        const troops = modeled ? modeled.filter((minion) => TROOPS.has(minion.family)) : state.hasTroop ? [1] : [];
        return troops.length
          ? inCalc(
              `each Synthetic Troop Minion spawns with ${o.programSeconds} s of Overload and is defeated after ${o.programSeconds} s: Overloaded for its whole life`,
            )
          : inactive("no modeled Synthetic Troop / Module Minion");
      }
      case "overloadEffect":
        return covered.length ? inCalc(`additional Overload Effect: ${effect}`) : inactive(none);
      case "chargeForward":
        return !covered.length
          ? inactive(none)
          : o.forward?.percent
            ? inCalc(
                `${o.forward.commandPoints} Command ÷ ${o.forward.every} × ${o.forward.perStepPercent}% = +${o.forward.percent}% Overload Effect (cap ${o.forward.capPercent}%; Command from a "+N Command per second" line, Mighty Guard, full: best case)`,
              )
            : inactive('no Command held (a "+N Command per second" line, Mighty Guard, with Full Command on)');
      case "machineJoy":
        return covered.length
          ? inCalc(
              `${o.joy.prebuilt ? `${o.joy.maxStacks} stacks held (own buffs built before engaging; Minion hits, and Order Calling has no Trait Skill to clear them)` : "stacks from the Minion hits from 0"} × ${o.joy.perStackPercent}% (multiplies) additional Overload Effect (provisional)`,
            )
          : inactive(none);
      default:
        return null;
    }
  }
  if (heroId === CHARGE_CALLING) {
    const c = state.chargeCalling;
    if (!c) return inactive("no Charge Calling line in the build");
    const troops = modeled ? modeled.filter((minion) => minion.heroTraits?.selfDestruct) : [];
    const chosen = troops.filter((minion) => minion.heroTraits.selfDestruct.chosen);
    const sd = chosen[0]?.heroTraits.selfDestruct || troops[0]?.heroTraits?.selfDestruct || null;
    const none = !c.pressed
      ? "the Trait Skill switch is off: Charge Calling is never pressed"
      : !state.hasTroop
        ? "no modeled Synthetic Troop / Module Minion"
        : pending
          ? "settled after the Minion pass"
          : troops.length && sd
            ? `the troops' own attacks deal more (${round(sd.ownDps)} DPS) than the explosion loop (${round(sd.loopDps)} DPS), so the best case leaves Charge Calling unpressed`
            : "no Self-Destruct explosions";
    const loop = sd
      ? `${round(sd.rate)} explosions/s (${sd.fuel ? `Fuel War with War every ${round(sd.castInterval)} s` : `the summon recast every ${round(sd.castInterval)} s`} × ${sd.perCast} troops, at most ${sd.maxAlive} alive for ${round(sd.life)} s${sd.capped ? ": the alive cap binds" : ""}) × ${round(sd.perExplosion)} per explosion`
      : "";
    const parts = Boolean(sd && sd.partStacks > 0);
    switch (key) {
      case "chargeCalling":
      case "selfDestruct":
        return chosen.length
          ? inCalc(
              `Charge Calling held (6 s every 6 s, pressed on cooldown); ${list(chosen)} self-destruct: ${loop} (provisional)`,
            )
          : inactive(none);
      case "selfDestructDamage":
        return chosen.length
          ? inCalc(
              `+${c.additional.reduce((sum, item) => sum + item.value, 0)}% additional Self-Destruct Damage on ${loop}`,
            )
          : inactive(none);
      case "chargeMoon":
        return !chosen.length
          ? inactive(none)
          : parts
            ? inCalc(
                `a Mechanical Part is picked up recently (${round(sd.partsPerSecond)}/s): +${c.moonPercent}% additional Minion Damage on the explosions; the Skill Area part has no DPS effect`,
              )
            : inactive("no Mechanical Part drops (Unstoppable Wave's drop chance)");
      case "partDrop":
      case "partPickup":
        return !chosen.length
          ? inactive(none)
          : parts
            ? inCalc(
                `${c.parts.chancePercent}% × ${round(sd.rate)} explosions/s = ${round(sd.partsPerSecond)} Mechanical Parts/s, picked up at the dummy where they drop; ${round(sd.partStacks)} held "recently" (${RECENTLY_SECONDS} s)`,
              )
            : inactive("no Mechanical Part is picked up");
      case "partDamage":
        return !chosen.length
          ? inactive(none)
          : parts
            ? inCalc(
                `${round(sd.partStacks)} Mechanical Parts picked up recently × ${c.parts.perPartPercent}% (cap ${c.parts.partCap}) additional Minion Damage on the explosions`,
              )
            : inactive("no Mechanical Part is picked up");
      case "traitSlot":
        return state.chargeCallingSupport
          ? {
              status: "Not modeled",
              reason: `the support in Charge Calling's slot (${state.chargeCallingSupport}) is not read: Charge Calling deals no damage of its own and is held at uptime 1`,
            }
          : neutral("the slot is empty; Charge Calling deals no damage of its own and is held at uptime 1");
      case "heroic":
        return !chosen.length
          ? inactive(none)
          : sd.heroicPercent > 0
            ? inCalc(
                `Synthetic Troop Life ${round(sd.troopLife)} (5 × Base Damage${c.peril.lifePercent ? ` + ${c.peril.lifePercent}% of your Max Life` : ""})${sd.troopShield ? ` + Energy Shield ${round(sd.troopShield)}` : ""} ÷ ${c.heroic.per} = +${sd.heroicPercent}% additional Self-Destruct damage (Minion Max Life lines are not read; provisional)`,
              )
            : inactive("the troops' Life and Energy Shield give no step");
      case "guerilla":
        return !chosen.length
          ? inactive(none)
          : sd.guerillaStacks > 0
            ? inCalc(
                `${round(sd.guerillaStacks)} Mechanical Parts collected recently: +${round(c.parts.guerilla.speedPercent * sd.guerillaStacks)}% additional Charge Speed (shorter charge: ${round(sd.life)} s) and +${round(c.parts.guerilla.damagePercent * sd.guerillaStacks)}% additional Self-Destruct damage`,
              )
            : inactive("no Mechanical Part is picked up (Unstoppable Wave)");
      case "fuelWar": {
        if (!chosen.length) return inactive(none);
        if (!chosen.some((minion) => minion.heroTraits.selfDestruct.fuel))
          return inactive('the Main Skill is not a Synthetic Troop summon ("Main Summon Skill")');
        return sd.ownRate != null && sd.ownRate >= sd.rate - 1e-9
          ? neutral(`the troops' own summon already reaches the alive cap (${round(sd.rate)} explosions/s)`)
          : inCalc(`the Main Summon Skill triggered every ${round(c.fuelWar.intervalSeconds)} s: ${loop}`);
      }
      case "fuelWarCooldown":
        return !chosen.length
          ? inactive(none)
          : !chosen.some((minion) => minion.heroTraits.selfDestruct.fuel)
            ? inactive("no Fuel War with War trigger (the Main Skill is not this summon)")
            : chosen.some((minion) => minion.family === "module" && minion.heroTraits.selfDestruct.ignoresCooldown)
              ? inCalc("the triggered Module summon ignores its 4 s cooldown")
              : neutral("the summon is not a Modularization Skill (no cooldown to ignore)");
      case "essentialSpeed":
        return !chosen.length
          ? inactive(none)
          : sd.essentialIncreased > 0 || sd.essentialAdditional > 0
            ? inCalc(
                `${c.essentialSharePercent}% of the Minion Attack Speed bonuses (+${round(sd.essentialIncreased)}% increased${sd.essentialAdditional ? `, ${sd.essentialAdditional} additional line(s)` : ""}) on the Self-Destruct damage`,
              )
            : inactive("no Minion Attack Speed bonus");
      case "perilLife":
        return !chosen.length
          ? inactive(none)
          : !c.heroic
            ? neutral("the troops' Life reaches damage only through Heroic Sacrifice (not picked)")
            : c.peril.playerLife > 0
              ? inCalc(
                  `+${c.peril.lifePercent}% × ${round(c.peril.playerLife)} Max Life on the troops' Base Life, read by Heroic Sacrifice`,
                )
              : inactive("no Max Life");
      case "perilShield":
        return !chosen.length
          ? inactive(none)
          : !c.heroic
            ? neutral("the troops' Energy Shield reaches damage only through Heroic Sacrifice (not picked)")
            : c.peril.playerShield > 0
              ? inCalc(
                  `+${c.peril.shieldPercent}% × ${round(c.peril.playerShield)} Max Energy Shield on the troops, read by Heroic Sacrifice`,
                )
              : inactive("no Max Energy Shield");
      default:
        return null;
    }
  }
  if (heroId === GROWING_BREEZE) {
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
              : inactive(
                  `no Magus skill can field another Magus (Max Summonable +${g.summonable}, map cap +${g.mapCap})`,
                )
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
          ? inCalc(
              `${list(got)} take Nourishment from the Trait Skill presses, with the Magi's loss rules (provisional)`,
            )
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
  if (heroId === VIGILANT_BREEZE) {
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
  return null;
}

/** The best-case switches this loadout lists (packages/engine/src/heroes/hero-trait-modules.js pushes them as timed-effect toggles). */
export function b6Switches(state) {
  if (!state) return [];
  const out = [];
  if (state.overload?.grant)
    out.push({
      id: OVERLOAD_CONDITION,
      label: "Overload held (a Summon Skill recast within every 12 s)",
      enabled: state.overload.held,
      active: state.overload.held && state.hasMinion,
      summary: "every Minion holds Overload (Q-H8, provisional)",
      reason: state.hasMinion ? "best-case assumption: Order Calling's Overload never lapses" : "no modeled Minion",
    });
  if (state.chargeCalling)
    out.push({
      id: "traitSkillOnCooldown",
      label: "Charge Calling pressed on cooldown (Self-Destruct Protocol)",
      enabled: state.chargeCalling.pressed,
      active: state.chargeCalling.pressed && state.hasTroop,
      summary:
        "Charge Calling held (6 s / 6 s): the Synthetic Troops self-destruct where that deals more (provisional)",
      reason: state.hasTroop ? "best-case assumption" : "no modeled Synthetic Troop / Module Minion",
    });
  if (state.vigilant?.mergeStacks)
    out.push({
      id: VIGILANT_CONDITION,
      label: "Vigilant held (Merged Spirit Magi, Breeze at max)",
      enabled: state.vigilant.held,
      active: state.vigilant.held && state.hasMagus,
      summary: "the Vigilant state held with Breeze at its max (Q-H13, provisional)",
      reason: state.hasMagus ? "best-case assumption: Reconjuring breaks ignored" : "no modeled Spirit Magus",
    });
  return out;
}

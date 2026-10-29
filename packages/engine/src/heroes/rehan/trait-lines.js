// Rehan's shared pieces (hero trait audit batch B10, 2026-10-19): the loadout ids and switches, the keyword values, the trait patterns
// of both loadouts with their badge module and clause keys, and the line readers. packages/engine/src/heroes/rehan/traits.js
// composes the Rage cycle with Anger's Burst and Seething Silhouette's Seething Spirit.

import { normalizePercentageText } from "../../text/percentage-text.js";

export const ANGER = "rehan-anger";
export const SEETHING = "rehan-seething-silhouette";
export const REHAN_HEROES = new Set([ANGER, SEETHING]);
export const TUNNEL_VISION_SWITCH = "rehanTunnelVision";
export const SPIRIT_RETURN_SWITCH = "rehanSpiritReturn";
export const BURST_SETUP_KEY = "rehan:burst";
export const INFUSION_RECENT_SECONDS = 4;
// Fury's Onslaught's second game parameter by rank (tier records 320012 01–05; SS13 = SS14): the Spirit's Berserk additional damage.
export const FURY_SPIRIT_OFFSET = Object.freeze({ 40: -33.33, 47: -36.31, 54: -39.02, 61: -41.52, 68: -43.82 });
export const KEYWORDS = Object.freeze({
  rage: Object.freeze({
    maxRage: 100,
    source:
      "TLIDB keyword Rage (hover ece24b16): a Berserker exclusive energy with a default upper limit of 100; at max Rage the Berserker enters Berserk",
  }),
  berserk: Object.freeze({
    bonusFactor: 2,
    source:
      "TLIDB keyword Berserk (hover b3645c45): gains bonuses twice the Max Rage while Berserk is active; Berserk expires when you run out of Rage",
  }),
  burst: Object.freeze({
    weaponPercent: 340,
    radiusMeters: 3,
    perLevelAdditionalPercent: 10,
    level: 1,
    gameRow: 90000,
    tags: Object.freeze(["Attack", "Melee", "Physical", "Triggered", "Area", "Strength", "Dexterity"]),
    source:
      "TLIDB keyword Burst (hover 46230009): 340% of Weapon Damage to enemies within 3 m (dual wielding: the average of both weapons), +10% additional damage (multiplies) per +1 Skill Level; game row config_skill_damage 90000 (one Lv. 1 row, 340% Weapon Damage)",
  }),
  burstBlast: Object.freeze({
    min: 1166,
    max: 1944,
    effectiveness: 288,
    type: "Physical",
    gameRow: 90003,
    tags: Object.freeze(["Spell", "Physical", "Triggered", "Area", "Strength", "Dexterity"]),
    source:
      "TLIDB keyword Burst Blast (hover 219965c8): 1166–1944 Spell Physical Damage within 3 m, damage effect 288%; game row config_skill_damage 90003 (Physical 1166–1944, 288%)",
  }),
  seethingSpirit:
    "TLIDB keyword Seething Spirit (hover bfe0c1e9): an ancestor spirit that casts your Non-Mobility and Non-Channeled Main Melee Attack Skills when it appears",
  disarm: "TLIDB keyword Disarm (hover a54e950b): deemed unarmed and unable to use Attack Skills when disarmed",
});
export const EPS = 1e-9;
export const round = (value) => Math.round(value * 10000) / 10000;
export const pct = (value) => Math.round(value * 10000) / 100;
export const fmt = (value) => (Number.isFinite(value) ? String(round(value)) : "∞");
export const cleanRehan = (text) =>
  normalizePercentageText(String(text ?? ""))
    .replace(/\s+/g, " ")
    .replace(/(\d) %/g, "$1%")
    .replace(/ ([,.:;])/g, "$1")
    .replace(/^\+ (\d)/, "+$1")
    .replace(/\bnon- /gi, "non-")
    .trim();

const N = "(\\d+(?:\\.\\d+)?)";
export const REHAN_PATTERNS = Object.freeze({
  // Rage outside Berserk and the Berserk state (both loadouts).
  rageMelee: new RegExp(`^When not in the Berserk state, each Melee Attack Skill generates ${N} Rage$`, "i"),
  rageChannel: new RegExp(
    `^When not in the Berserk state, each stack of Melee Attack Skill channeled generates ${N} Rage$`,
    "i",
  ),
  enter: /^Enter Berserk automatically at Max Rage$/i,
  drain: new RegExp(`^While Berserk is active, ${N} Rage is consumed per second$`, "i"),
  // Anger.
  perRage: new RegExp(`^\\+?${N}% additional damage and \\+?${N}% Movement Speed for every ${N} Rage you have$`, "i"),
  burstTrigger: new RegExp(`^Attacks trigger Burst once on hit while Berserk is active\\. Cooldown: ${N} ?s$`, "i"),
  burstPerLevel: new RegExp(`^\\+?${N}% additional Burst Damage per ${N} levels?$`, "i"),
  moonCdr: new RegExp(`^\\+?${N}% Burst Cooldown Recovery Speed for every ${N} Rage$`, "i"),
  furyGen: new RegExp(`^Generates ${N} Rage per second instead of consuming Rage while Berserk is active$`, "i"),
  furyCost: new RegExp(`^When triggering Burst, consumes ${N} Rage$`, "i"),
  frenzyCrit: new RegExp(`^\\+?${N}% Critical Strike Rating for every ${N} Rage$`, "i"),
  frenzyGain: new RegExp(`^When Burst lands a Critical Strike, generates ${N} Rage\\. Interval: ${N} ?s$`, "i"),
  tunnelPenalty: new RegExp(`^-${N}% additional damage for non-Burst skills$`, "i"),
  burstAdditional: /^([+-]\d+(?:\.\d+)?)% additional Burst Damage$/i,
  rampaging: new RegExp(
    `^${N}% of the bonus and additional bonus to Attack Speed is also applied to Burst's Cooldown Recovery Speed$`,
    "i",
  ),
  burstArea: new RegExp(`^\\+${N}% additional Burst Area$`, "i"),
  areaToBurst: new RegExp(`^For every \\+${N}% Skill Area, \\+${N}% additional Burst Damage, up to \\+?${N}%$`, "i"),
  // Seething Silhouette.
  attackSpeedPerRage: new RegExp(`^\\+${N}% Attack Speed for every ${N} Rage$`, "i"),
  berserkMove: new RegExp(`^\\+${N}% Movement Speed while Berserk is active$`, "i"),
  twice: /^Gains bonuses twice the Max Rage while Berserk is active$/i,
  castCost: new RegExp(
    `^Casting Melee Attack Skills no longer generates Rage and consumes ${N} points of Rage instead while Berserk is active\\. The mode ends when Rage runs out$`,
    "i",
  ),
  berserkArea: new RegExp(`^\\+${N}% Skill Area while Berserk is active$`, "i"),
  berserkDamage: new RegExp(`^\\+${N}% additional damage while Berserk is active$`, "i"),
  doubleDamage: new RegExp(`^\\+${N}% chance to deal Double Damage every ${N} points of Rage you have$`, "i"),
  ownSpirit: /^Own Seething Spirit$/i,
  ritualSpirit: /^Seething Spirit will always exist and attack automatically while Berserk is active$/i,
  disarmed: /^You are Disarmed while Berserk is active$/i,
  spiritDamage: new RegExp(`^\\+${N}% additional Seething Spirit Damage$`, "i"),
  ritualSelfDamage: new RegExp(
    `^While Berserk is active, takes Secondary Physical Damage equal to ${N}% of current Life every ${N} ?s\\. This damage is not affected by bonuses$`,
    "i",
  ),
  onslaughtSpirit: new RegExp(
    `^When a Melee Main Skill is used while Berserk is active, Seething Spirit appears and automatically attacks for ${N} ?s\\. Using the Melee Main Skill again will refresh the Seething Spirit's duration$`,
    "i",
  ),
  spiritSpeed: new RegExp(`^-${N}% additional Seething Spirit Attack Speed$`, "i"),
  onslaughtRage: new RegExp(
    `^Rage will no longer be naturally consumed while Berserk is active\\. The Rage consumed by Melee Attack Skills will be halved\\. \\+${N}% additional damage dealt by the player$`,
    "i",
  ),
  hysteriaTaken: new RegExp(
    `^Generates ${N} points? of Rage when taking damage equal to ${N}% of the sum of Max Life and Max Energy Shield$`,
    "i",
  ),
  hysteriaConsumed: new RegExp(`^Generate ${N} Rage for every ${N}% Max Life consumed$`, "i"),
  growing: new RegExp(
    `^Gains ${N} additional Rage when Seething Spirit uses a skill\\. The Rage gained is doubled when Seething Spirit deals Double Damage\\. Interval: ${N} ?s$`,
    "i",
  ),
  splitForm: new RegExp(`^\\+${N}% Rage gained for every ${N} Max Life$`, "i"),
  // Split Form's Max Life line: a plain stat line (the stat sheet reads it) that also feeds the Rage-gained line above.
  splitLife: /^([+-]?\d+(?:\.\d+)?)% additional Max Life$/i,
  infusion: new RegExp(
    `^\\+${N}% additional damage per ${N} points of Rage gained recently\\. Stacks up to ${N} times$`,
    "i",
  ),
  infusionDisarm: new RegExp(
    `^You will no longer be Disarmed after Berserk has been active for ${N} ?s\\. \\+${N}% Rage gained$`,
    "i",
  ),
  // Hero-exclusive revivals: Hero's Resourcefulness and Furious Roar (Anger).
  blast: /^Burst becomes Burst Blast and can activate Spell Burst$/i,
  onHit: /^All conditions of this trait that trigger on attack are changed to trigger on hit$/i,
  skillUse:
    /^The Base Trait effect that generates Rage from using Melee Skills is changed to generating Rage upon skill use\./i,
  roarTrigger: new RegExp(
    `^Attacks trigger Burst once on Critical Strike while Berserk is active\\. Cooldown: ${N} ?s$`,
    "i",
  ),
  roarPenalty: /^([+-]\d+(?:\.\d+)?)% additional Burst Damage$/i,
  // Ancestral Hate's Life cost and Starfall Wasteland (Seething Silhouette).
  hateConsume: new RegExp(`^Seething Spirit consumes ${N}% of current Life when using skills$`, "i"),
  starfallRanged: /^Seething Spirit now only uses Ranged Projectile Skills \(except Channeled and Parabolic Skills\)$/i,
  starfallRage: new RegExp(`^Generates ${N} Rage when using a Ranged Skill$`, "i"),
  starfallProjectiles: new RegExp(
    `^\\+(\\d+) to Projectile Quantity, \\+(\\d+) Horizontal Projectile Jump\\(s\\), \\+(\\d+) Horizontal Projectile Penetration\\(s\\), \\+${N}% Projectile Size for Ranged Skills cast by Seething Spirit$`,
    "i",
  ),
  starfallReturn: new RegExp(
    `^${N}% chance for Ranged Skills cast by Seething Spirit to return after reaching their max range$`,
    "i",
  ),
});
// Each clause's badge module (packages/engine/src/heroes/hero-trait-modules.js).
const GROUP = Object.freeze({
  rageMelee: "rage",
  rageChannel: "rage",
  enter: "rage",
  drain: "rage",
  perRage: "rage",
  furyGen: "rage",
  frenzyCrit: "rage",
  attackSpeedPerRage: "rage",
  berserkMove: "rage",
  twice: "rage",
  castCost: "rage",
  berserkArea: "rage",
  berserkDamage: "rage",
  doubleDamage: "rage",
  disarmed: "rage",
  ritualSelfDamage: "rage",
  onslaughtRage: "rage",
  hysteriaTaken: "rage",
  hysteriaConsumed: "rage",
  splitForm: "rage",
  splitLife: "rage",
  infusion: "rage",
  infusionDisarm: "rage",
  skillUse: "rage",
  starfallRage: "rage",
  burstTrigger: "burst",
  burstPerLevel: "burst",
  moonCdr: "burst",
  furyCost: "burst",
  frenzyGain: "burst",
  tunnelPenalty: "burst",
  burstAdditional: "burst",
  rampaging: "burst",
  burstArea: "burst",
  areaToBurst: "burst",
  blast: "burst",
  onHit: "burst",
  roarTrigger: "burst",
  roarPenalty: "burst",
  ownSpirit: "spirit",
  ritualSpirit: "spirit",
  spiritDamage: "spirit",
  onslaughtSpirit: "spirit",
  spiritSpeed: "spirit",
  growing: "spirit",
  hateConsume: "spirit",
  starfallRanged: "spirit",
  starfallProjectiles: "spirit",
  starfallReturn: "spirit",
});
const KEY_ORDER = Object.keys(GROUP);
export const REHAN_REVIVED_KEYS = new Set([
  "blast",
  "onHit",
  "skillUse",
  "roarTrigger",
  "roarPenalty",
  "hateConsume",
  "starfallRanged",
  "starfallRage",
  "starfallProjectiles",
  "starfallReturn",
]);
const REVIVED_HERO = {
  blast: ANGER,
  onHit: ANGER,
  skillUse: ANGER,
  roarTrigger: ANGER,
  roarPenalty: ANGER,
  hateConsume: SEETHING,
  starfallRanged: SEETHING,
  starfallRage: SEETHING,
  starfallProjectiles: SEETHING,
  starfallReturn: SEETHING,
};

/** The clause key of a Rehan line, or null. `revived`: only the revived keys. */
export function rehanClauseKey(text, { revived = false } = {}) {
  const clean = cleanRehan(text);
  const keys = revived ? [...REHAN_REVIVED_KEYS] : KEY_ORDER.filter((key) => !REHAN_REVIVED_KEYS.has(key));
  return keys.find((key) => REHAN_PATTERNS[key].test(clean)) || null;
}
/** The badge module of a Rehan line ("rage", "burst", "spirit"), or null. */
export const rehanModuleOf = (text, options) => GROUP[rehanClauseKey(text, options)] || null;
/** Whether a revived (memory) line of this loadout is read here. */
export function rehanRevivedLine(heroId, text) {
  const key = rehanClauseKey(text, { revived: true });
  return Boolean(key) && REVIVED_HERO[key] === heroId;
}

export const linesOf = (modifierTexts, heroId) =>
  modifierTexts
    .filter(
      (line) =>
        line &&
        line.origin !== "derived" &&
        !line.lineEffect &&
        (line.origin === "trait" || (line.origin === "memory" && rehanRevivedLine(heroId, line.text))),
    )
    .map((line) => ({ ...line, clean: cleanRehan(line.text) }));
export const all = (lines, key) =>
  lines.flatMap((line) => {
    const match = line.clean.match(REHAN_PATTERNS[key]);
    return match && (REHAN_REVIVED_KEYS.has(key) ? line.origin === "memory" : line.origin === "trait")
      ? [{ line, match }]
      : [];
  });
export const first = (lines, key) => all(lines, key)[0] || null;
export const plainSum = (modifierTexts, pattern) =>
  modifierTexts
    .filter((line) => line && line.origin !== "derived" && !line.lineEffect)
    .reduce((total, line) => {
      const match = cleanRehan(line.text).match(pattern);
      return total + (match ? Number(match[1]) * (line.multiplier ?? 1) : 0);
    }, 0);
export const MAX_RAGE = /^\+(\d+(?:\.\d+)?) (?:to )?Max Rage$/i;
export const RAGE_GAINED = /^([+-]?\d+(?:\.\d+)?)% Rage gained$/i;
export const DOUBLE_DAMAGE = /^\+(\d+(?:\.\d+)?)% chance to deal Double Damage$/i;

export const L = (status, reason, extra = {}) => ({ status, reason, ...extra });

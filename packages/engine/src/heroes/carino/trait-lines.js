// Carino's shared pieces (hero trait audit batch B9, 2026-10-19): the loadout ids and switches, the keyword values, the trait patterns
// of the three loadouts with their badge module and clause keys, and the line readers. packages/engine/src/heroes/carino/traits.js
// composes the loadouts' mechanics.

import { normalizePercentageText } from "../../text/percentage-text.js";

export const RANGER = "carino-ranger-of-glory";
export const LETHAL = "carino-lethal-flash";
export const ZEALOT = "carino-zealot-of-war";
export const CARINO_HEROES = new Set([RANGER, LETHAL, ZEALOT]);
export const DEFLECTION_SWITCH = "carinoDeflection";
export const RETURNING_SWITCH = "carinoReturningHits";
export const SPECIAL_AMMO_LEVEL = 20;
export const KEYWORDS = Object.freeze({
  reload:
    "TLIDB keyword Reload (hover bb23b3f1): reloads the whole magazine; Projectile Skills cannot be used while reloading",
  specialAmmo:
    "TLIDB keyword Special Ammo (hover bab6adde): a chance to reload the slot's special ammo; consumed with the support's effects when the support is not on the skill panel and can support Projectile Skills",
  magicShot: Object.freeze({
    ammoPerCast: 3,
    source:
      "TLIDB keyword Magic Shot (hover 948139d0): each Projectile Skill used or triggered consumes 3 ammo; several special ammo grant every consumed support's effects; reloading is instant",
  }),
  blankFiring:
    "TLIDB keyword Blank Firing (hover 548823c3): Projectile Skills can be used without ammo; no ammo benefits apply",
  burningRed: Object.freeze({
    seconds: 10,
    heatUpEffectPercent: 100,
    source:
      "TLIDB keyword Burning Red (hover 3c9df3ab): lasts 10 s; no Overheated or reload while active; gains 100% Heat Up effect bonuses; forced reload when it ends",
  }),
  deflection: "TLIDB keyword Deflection (hover fd631f6a): 6% less damage taken per stack, up to 4; consumed when hit",
});
export const EPS = 1e-9;
export const round = (value) => Math.round(value * 10000) / 10000;
export const pct = (value) => Math.round(value * 10000) / 100;
export const cleanCarino = (text) =>
  normalizePercentageText(String(text ?? ""))
    .replace(/\s+/g, " ")
    .replace(/(\d) %/g, "$1%")
    .replace(/ ([,.:;])/g, "$1")
    .replace(/^\+ (\d)/, "+$1")
    .trim();

const N = "(\\d+(?:\\.\\d+)?)";
const P = "\\+?(\\d+(?:\\.\\d+)?)";
export const CARINO_PATTERNS = Object.freeze({
  // Shared ammo clauses.
  consume: /^Projectile Skills consume ammo$/i,
  ammoBonus: new RegExp(`^\\+${N}% additional (?:Projectile )?Damage when consuming ammo$`, "i"),
  magazine: /^\+(\d+) initial Magazine Capacity$/i,
  // Ranger of Glory.
  reloadClick: new RegExp(`^Click the Trait Skill to reload the magazine\\. Base reloading time is ${N} ?s$`, "i"),
  unavailable: /^Projectile Skills are unavailable while reloading$/i,
  reloadShare: new RegExp(
    `^${N}% of the max bonus to Attack Speed or Cast Speed is also applied to Reload Speed$`,
    "i",
  ),
  reloadMove: new RegExp(`^While reloading, \\+${N}% Movement Speed$`, "i"),
  autoReload: /^Always auto- ?reloading ammo; Reloading can be interrupted\.?$/i,
  moonSpecial: new RegExp(`^\\+${N}% chance to Reload Special Ammo\\. \\+${N}% Magic Shot Duration$`, "i"),
  slotsNoble:
    /^\+(\d+) Special Ammo slot\(s\)\. These slots can be installed with Projectile-exclusive Magnificent and Noble Support Skills$/i,
  slots: /^\+(\d+) Special Ammo slot\(s\)$/i,
  reloadChance: new RegExp(`^\\+${N}% chance to reload special ammo$`, "i"),
  specialBonus: new RegExp(
    `^\\+${N}% additional damage dealt by this Projectile Skill if a Special Ammo is consumed$`,
    "i",
  ),
  magicShotGain: new RegExp(
    `^${N}% chance to gain Magic Shot for ${N} ?s when consuming a Special Ammo\\. Interval: ${N} ?s\\.?$`,
    "i",
  ),
  landslideAll: /^While Magic Shot is active, using or triggering Projectile Skills consume all ammo in the magazine$/i,
  landslideBonus: new RegExp(`^\\+${N}% additional damage for every Special Ammo consumed$`, "i"),
  galeShare: new RegExp(
    `^${N}% of the increase/decrease on Attack and Cast Speed is also applied to reload chance of special ammo$`,
    "i",
  ),
  galeOrder: /^Reload Special Ammo slots in order$/i,
  neverStopping: new RegExp(
    `^While Magic Shot is active, for every Special Ammo consumed, extends Magic Shot's Duration by ${N} ?s$`,
    "i",
  ),
  arsenalNoble: new RegExp(
    `^For every activated Noble Support Skill, \\+${N}% additional Projectile Damage, up to ${N}%$`,
    "i",
  ),
  // Lethal Flash.
  autoReloadQuantity: new RegExp(
    `^Always auto-reload ammo, reloading (\\d+) ammo each time\\. Reload Time: ${N} ?s$`,
    "i",
  ),
  castWhileReloading: /^Projectile Skills can be cast while reloading, but will interrupt the reloading process$/i,
  returning: new RegExp(
    `^After reaching their max range, Projectiles will return and travel an additional ${N}% of that distance, hitting the enemies on their path again$`,
    "i",
  ),
  reloadSpeedPer: new RegExp(`^${P}% Reload Speed for every 1% Projectile Speed$`, "i"),
  reloadQuantityPer: new RegExp(`^\\+(\\d+) to Reload Quantity for every ${N}% Projectile Speed$`, "i"),
  deflectionBonus: new RegExp(`^\\+${N}% additional Projectile Damage while having Deflection$`, "i"),
  nightMax: /^\+(\d+) to Max Deflection$/i,
  nightDuration: new RegExp(
    `^Deflection is no longer consumed when hit, but Deflection now only lasts for ${N} ?s$`,
    "i",
  ),
  nightBonus: new RegExp(`^\\+${N}% additional Projectile Damage when Deflection is active$`, "i"),
  // Zealot of War.
  reloadBase: new RegExp(`^Base reloading time is ${N} ?s$`, "i"),
  magazinePerQuantity:
    /^For every \+1 Projectile Quantity or \+1 Split Quantity, \+(\d+) Magazine Capacity \(excludes the Projectile Quantity and Split Quantity provided by the skill itself and linked Support Skills\)$/i,
  heatEffect: new RegExp(`^\\+${N}% Heat Up Effect$`, "i"),
  blank: /^Allows Blank Firing$/i,
  heatGain: /^While having ammo, for every ammo consumed, gains 1 stack of Heat Up$/i,
  overheatGain: /^During Blank Firing, gains Overheated when casting a Projectile Skill$/i,
  heatValue: new RegExp(
    `^Heat Up: For every stack of Heat Up, ${P}% additional Projectile Skill Damage and ${P} Projectile Max Deviation Angle$`,
    "i",
  ),
  forcedReload: new RegExp(`^Forced to reload once Overheated has been active for ${N} ?s$`, "i"),
  heatLoss: /^After reloading, loses all stacks of Heat Up and Overheated$/i,
  ceasefireStart: /^Starts with max stacks of Heat Up but does not reload ammo at the beginning$/i,
  ceasefireHold: /^While active, Overheated can last without forcing reload$/i,
  burningRed: /^At Max Heat Up Stacks, enter Burning Red instead of Overheated$/i,
  burningRedReload: /^Reload immediately when Burning Red ends$/i,
  heatSpeed: new RegExp(
    `^Heat Up gains an additional effect: For every stack of Heat Up, ${P}% additional Attack and Cast Speed$`,
    "i",
  ),
  shackles: new RegExp(`^\\+${N}% additional Heat Up Effect after stopping movement\\. Lasts ${N} ?s$`, "i"),
});
// Each clause's badge module (packages/engine/src/heroes/hero-trait-modules.js).
const GROUP = Object.freeze({
  consume: "ammo",
  ammoBonus: "ammo",
  magazine: "ammo",
  reloadClick: "ammo",
  unavailable: "ammo",
  reloadShare: "ammo",
  reloadMove: "ammo",
  autoReload: "ammo",
  autoReloadQuantity: "ammo",
  castWhileReloading: "ammo",
  reloadSpeedPer: "ammo",
  reloadQuantityPer: "ammo",
  reloadBase: "ammo",
  magazinePerQuantity: "ammo",
  moonSpecial: "specialAmmo",
  slotsNoble: "specialAmmo",
  slots: "specialAmmo",
  reloadChance: "specialAmmo",
  specialBonus: "specialAmmo",
  magicShotGain: "specialAmmo",
  landslideAll: "specialAmmo",
  landslideBonus: "specialAmmo",
  galeShare: "specialAmmo",
  galeOrder: "specialAmmo",
  neverStopping: "specialAmmo",
  arsenalNoble: "specialAmmo",
  returning: "ouroboros",
  deflectionBonus: "deflection",
  nightMax: "deflection",
  nightDuration: "deflection",
  nightBonus: "deflection",
  heatEffect: "heatUp",
  blank: "heatUp",
  heatGain: "heatUp",
  overheatGain: "heatUp",
  heatValue: "heatUp",
  forcedReload: "heatUp",
  heatLoss: "heatUp",
  ceasefireStart: "heatUp",
  ceasefireHold: "heatUp",
  burningRed: "heatUp",
  burningRedReload: "heatUp",
  heatSpeed: "heatUp",
  shackles: "heatUp",
});
const KEY_ORDER = Object.keys(GROUP);
export const CARINO_REVIVED_KEYS = new Set(["arsenalNoble", "nightMax", "nightDuration", "nightBonus", "shackles"]);
const REVIVED_HERO = {
  arsenalNoble: RANGER,
  nightMax: LETHAL,
  nightDuration: LETHAL,
  nightBonus: LETHAL,
  shackles: ZEALOT,
};

/** The clause key of a Carino line, or null. `revived`: only the revived keys. */
export function carinoClauseKey(text, { revived = false } = {}) {
  const clean = cleanCarino(text);
  const keys = revived ? [...CARINO_REVIVED_KEYS] : KEY_ORDER.filter((key) => !CARINO_REVIVED_KEYS.has(key));
  return keys.find((key) => CARINO_PATTERNS[key].test(clean)) || null;
}
/** The badge module of a Carino trait line ("ammo", "specialAmmo", "heatUp", "deflection", "ouroboros"), or null. */
export const carinoModuleOf = (text, options) => GROUP[carinoClauseKey(text, options)] || null;
/** Whether a revived (memory) line of this loadout is read here (Royal Arsenal's Noble line, Into the Night, Self-Imposed Shackles). */
export function carinoRevivedLine(heroId, text) {
  const key = carinoClauseKey(text, { revived: true });
  return Boolean(key) && REVIVED_HERO[key] === heroId;
}

export const linesOf = (modifierTexts, heroId) =>
  modifierTexts
    .filter(
      (line) =>
        line &&
        line.origin !== "derived" &&
        !line.lineEffect &&
        (line.origin === "trait" || (line.origin === "memory" && carinoRevivedLine(heroId, line.text))),
    )
    .map((line) => ({ ...line, clean: cleanCarino(line.text) }));
export const all = (lines, key) =>
  lines.flatMap((line) => {
    const match = line.clean.match(CARINO_PATTERNS[key]);
    return match && (CARINO_REVIVED_KEYS.has(key) ? line.origin === "memory" : line.origin === "trait")
      ? [{ line, match }]
      : [];
  });
export const first = (lines, key) => all(lines, key)[0] || null;
export const sumOf = (items, index = 1) =>
  items.reduce((total, item) => total + Number(item.match[index]) * (item.line.multiplier ?? 1), 0);
// Build-wide plain lines (non-derived) matching a pattern: the summed value of group 1.
export const plainSum = (modifierTexts, pattern) =>
  modifierTexts
    .filter((line) => line && line.origin !== "derived" && !line.lineEffect)
    .reduce((total, line) => {
      const match = cleanCarino(line.text).match(pattern);
      return total + (match ? Number(match[1] ?? match[2]) * (line.multiplier ?? 1) : 0);
    }, 0);
export const PROJECTILE_QUANTITY = /^(?:Projectile Quantity \+(\d+)|\+(\d+) (?:to )?Projectile Quantity)$/i;
export const SPLIT_QUANTITY = /^\+(\d+(?:\.\d+)?) (?:to )?(?:Parabolic Projectile Splits quantity|Split Quantity)$/i;
export const RELOAD_SPEED = /^([+-]?\d+(?:\.\d+)?)% Reload Speed$/i;
export const MAGIC_SHOT_DURATION = /^([+-]?\d+(?:\.\d+)?)% Magic Shot Duration$/i;

export const L = (status, reason, extra = {}) => ({ status, reason, ...extra });

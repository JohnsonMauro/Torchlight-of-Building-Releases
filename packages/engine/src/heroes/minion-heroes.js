// The Minion heroes' loadouts (Moto – Order Calling and Charge Calling, Iris – Growing Breeze and Vigilant Breeze; hero trait
// audit batch B6, 2026-10-19; research/hero-traits-audit-2026-10-19.md §5 B6, §8 B6, §6 Q-H8 / Q-H13). Pure: reads the build's
// trait lines (origin "trait") and the hero-exclusive revived lines the modules read (packages/engine/src/heroes/hero-exclusive-revivals.js
// MODULE_LINES) and returns the states the Minion engine applies (packages/engine/src/minions/minion-damage-model.js `heroTraits`),
// packages/engine/src/planner.js passes per Minion and packages/engine/src/heroes/hero-trait-modules.js badges. Each loadout's
// patterns, state and badges are in its hero's folder; this module dispatches by loadout.

import { TROOPS, TROOP_FAMILIES, cleanB6, playerEmpowerEffect } from "./minion-hero-lines.js";
import { orderCalling } from "./moto/order-calling.js";
import { chargeCalling } from "./moto/charge-calling.js";
import { growingBreeze } from "./iris/growing-breeze.js";
import { vigilantBreeze } from "./iris/vigilant-breeze.js";

const LOADOUTS = Object.freeze(
  Object.fromEntries([orderCalling, chargeCalling, growingBreeze, vigilantBreeze].map((item) => [item.id, item])),
);
export const B6_HEROES = new Set(Object.keys(LOADOUTS));

/** The clause key a B6 line is for this loadout, or null. */
export function b6ClauseKey(heroId, text) {
  const loadout = LOADOUTS[heroId];
  if (!loadout) return null;
  const clean = cleanB6(text);
  return loadout.keys.find((key) => loadout.patterns[key].test(clean)) || null;
}
/** The clause keys of the B6 revived affixes (one set for every loadout). */
export const B6_REVIVED_KEYS = new Set(Object.values(LOADOUTS).flatMap((loadout) => loadout.revivedKeys));
/** Whether a revived (memory) line of this loadout is read here. */
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
  const loadout = LOADOUTS[heroId];
  if (!loadout) return null;
  const lines = linesOf(modifierTexts, heroId);
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
    chargeCallingSupport: heroId === chargeCalling.id ? String(traitSupports?.[chargeCalling.id] || "") : "",
  };
  out[loadout.slot] = loadout.state(lines, {
    modifierTexts,
    requestedConditions,
    prebuilt,
    traitPressed,
    hasMinion,
    command,
    stats,
    castSpeedPercent,
    empower: playerEmpowerEffect(modifierTexts),
  });
  return out;
}

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
  const list = (items) => items.map((minion) => minion.name).join(", ");
  return LOADOUTS[heroId].lineStatus(key, state, { modeled, list, pending: false, inCalc, inactive, neutral });
}

/** The best-case switches this loadout lists (packages/engine/src/heroes/hero-trait-modules.js pushes them as timed-effect toggles). */
export function b6Switches(state) {
  if (!state) return [];
  return LOADOUTS[state.heroId]?.switches(state) || [];
}

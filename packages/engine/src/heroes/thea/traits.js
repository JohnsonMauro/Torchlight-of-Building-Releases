// Thea (Wisdom of The Gods, Incarnation of the Gods, Blasphemer): hero trait audit batch B7 (2026-10-19;
// research/hero-traits-audit-2026-10-19.md §5 B7, §8 B7, §6 Q-H3 / Q-H9). Pure: reads the build's trait lines (origin "trait") and
// the hero-exclusive revived lines the module reads (packages/engine/src/heroes/hero-exclusive-revivals.js MODULE_LINES: The Place of Oracle and its three
// Blessing variants, Crossing the Divine Threshold, Inverted Shrine) and returns
//   - theaBlessingInputs: the Blessing model's extra lines (the Divine Blessing cycle as a gain source, the revived Max Blessing
//     Stacks lines) and the max-stack rules (packages/engine/src/defense/blessing-model.js applyTheaCapRules: Predicted Justice's shared bonus, the Divine
//     Realm's Agility / Tenacity conversion and transfer, Blasphemer's inversion into Max Desecration Stacks);
//   - theaState: God's Boon's cadence and buffs, the Focus Blessing that God's Boon consumes, the Divine Realm, the dummy deemed at
//     Low Life, Desecration on the dummy, for packages/engine/src/planner.js (the Focus override, the Lucky share) and packages/engine/src/heroes/hero-trait-modules.js
//     (the badges, the derived lines and the clocked parts);
//   - theaLineRead: one clause's status, reason, derived bodies and clocked parts.
//
// Sourced:
// - Trait texts (TLIDB, SS14; packages/engine/data/heroes/all-hero-traits.generated.js) and the game tier records (§4.3): God's Boon's
//   buff 82115 lasts the second parameter, 10 s (§6, answered from the game files); Predicted Reincarnation's buff 82113 and
//   Farewell Prophecy's 82114 stack per Focus consumed (node 213); Prophecy of Purity writes the God's Boon buffs' stack limit
//   (attr 3442 flat 1, tag 5008700).
// - TLIDB keyword tooltips (Torchlight_Hyperlink_hover, fetched 2026-10-19 into research/tlidb/fetch-cache):
//   Focus / Agility / Tenacity Blessing (initial max stacks 4: +5% additional damage; +4% Attack and Cast Speed and +2% additional
//   damage; 4% damage reduction), Desecration (e08b6093: "+15% additional Erosion Damage taken (multiplies) for each stack of
//   Desecration. Initial max stacks: 3. Lasts for 5s. Can only affect 1 target"), Sacrificial Pawn (0f6b3f2c: "-10% additional
//   damage dealt and +10% additional Erosion Damage taken. This is considered a Crowd Control Effect"), Mountain of Sins (8ad74b7c:
//   "Reduces Erosion Resistance by 20%"), Divine Realm (8c37095a: the Agility / Tenacity conversion outside / within; "deals
//   additional damage to Full Life enemies when outside … to Low Life enemies when within"), God's Boon (83458fb2), Low Life
//   (be27a4cb: under 35% of Max Life), Preparation (5e33ceac: triggers the skill once when ready, else right after its cooldown).
//
// Provisional readings (src/app/stats/open-questions.js, shown only for Thea):
// - Q-H3 (recommended): a Divine Blessing every 2 s in the order Focus → Agility → Tenacity, so each type gains a stack every 6 s;
//   the Blessings are held at their max stacks (own buffs built before engaging; their durations are not in the readable data).
//   God's Boon fires at max Focus every P = max(15 s ÷ (1 + its Cooldown Recovery Speed), Max Focus × 6 s) and consumes every
//   Focus stack, so Focus refills one stack per 6 s: its time average is (3·F·(F − 1) + F·(P − 6·F)) ÷ P (another Focus gain
//   source in the build refills it at once: Focus held at max, P = the cooldown). The God's Boon buffs last 10 s: uptime
//   min(1, 10 s ÷ P). The 5 s / 20 s windows cast God's Boon at t = 0 with own buffs built (Focus pre-built), else at the first
//   max Focus (6 · (F − 1) s). Only the God's Boon-specific Cooldown Recovery Speed lines are read (as Frostfire Rampage's).
// - The Place of Oracle's "+2% additional damage" is per stack of Tenacity and Agility Blessing, scaled by each Blessing's Effect;
//   Prophecy of Purity's extra stack raises the per-Focus buffs' stack limits (Predicted Reincarnation, Farewell Prophecy, the
//   moon's Skill Area); Prophecy of Punishment's Lucky Damage and Max Damage hold for the share of time Focus equals Agility
//   (a fractional Lucky roll count with the same expected roll); Farewell Prophecy's Double Damage chance is time-averaged and its
//   Quadruple Damage reads the averaged chance (packages/engine/src/combat/double-damage.js).
// - The Divine Realm: pressed on cooldown (8 s / 8 s, the Trait Skill switch) or Prepared by Tenacious Divinity / Agile Godhood,
//   cast on the dummy: uptime 1 from t = 0. Inside vs outside the Realm cannot both hold: the "Divine Realm position" choice
//   (packages/engine/src/planner.js exclusiveConditionGroups) keeps the one with more damage, default outside. Outside, Tenacity converts to
//   Agility and Tenacity's max-stack change applies to Agility; within, the reverse. "When outside the Divine Realm" holds with no
//   Realm too; "while the Divine Realm is active" and "enemies in the Divine Realm" need it.
// - Q-H9 (recommended): the dummy never loses Life (0% lost) except where a line deems it at Low Life: Incarnation deems it for
//   6.5 s of every 10 s from the first hit (share 0.65), read by "enemies at Low Life" lines (packages/engine/src/text/line-conditions.js enemyLowLife).
// - Desecration (Blasphemer): applied on every Blessing gain (every 2 s, the trait skill ignores its cooldown) or, with no gain, on
//   the 5 s cooldown when the Trait Skill switch is on; each application inflicts ⌈max ÷ 3⌉ stacks and refreshes the duration of
//   every stack (as Ignite's shared timer), so the dummy holds max stacks after ⌈3⌉ applications; the dummy starts clean.
//   "+15% additional Erosion Damage taken (multiplies)" per stack: one line, (1.15^n − 1). Blasphemer turns every increase to Max
//   Blessing Stacks into a decrease and +1 Max Desecration Stack each (up to 4 per Blessing type); Extreme Desecration converts
//   the rest once every Blessing's max is 0, up to 25. Sacrificial Pawn (the dummy alone) is a crowd control type on the dummy;
//   Mountain of Sins reads any crowd control type on the Desecrated dummy and is read as Erosion Penetration (as Gemma's Frigid
//   Infusion). Onset of Depravity's True Damage is once per Elite: not on the dummy. Inverted Shrine's self Desecration is held
//   while you Desecrate the dummy.

import {
  WISDOM,
  INCARNATION,
  BLASPHEMER,
  THEA_HEROES,
  CYCLE,
  CYCLE_SOURCE,
  KEYWORDS,
  THEA_PATTERNS,
  round,
  pct,
  cleanThea,
  linesOf,
  matchesOf,
  firstOf,
  theaClauseKey,
  inactive,
} from "./trait-lines.js";
import { wisdomState, wisdomRead } from "./wisdom-of-the-gods.js";
import { realmBasics, incarnationState, incarnationRead } from "./incarnation-of-the-gods.js";
import { blasphemerState, blasphemerRead } from "./blasphemer.js";

/**
 * The Blessing model's Thea inputs (before packages/engine/src/defense/blessing-model.js calculateBlessings), or null for any other hero.
 * @returns {{ lines: { text, source }[], capRules: object }|null}
 */
export function theaBlessingInputs({ heroId = "", modifierTexts = [], requestedConditions = {} } = {}) {
  if (!THEA_HEROES.has(heroId)) return null;
  const lines = linesOf(modifierTexts, heroId);
  const P = THEA_PATTERNS;
  const cycle = firstOf(lines, P.cycle);
  const extra = [];
  // Q-H3: one Divine Blessing every 2 s in turn, so each type gains a stack every 3 × 2 s ("Timed gain": held at max stacks).
  if (cycle)
    for (const name of CYCLE.order)
      extra.push({
        text: `Gains a stack of ${name} Blessing every ${round(Number(cycle.match[1]) * CYCLE.order.length)} s`,
        source: CYCLE_SOURCE,
      });
  // The Place of Oracle: Agility / Focus / Tenacity (revived, Wisdom of The Gods only: packages/engine/src/heroes/hero-exclusive-revivals.js).
  if (heroId === WISDOM)
    for (const { line, match } of matchesOf(
      lines.filter((item) => item.origin === "memory"),
      P.oracleCap,
    ))
      extra.push({ text: `+${match[1]} to Max ${match[2]} Blessing Stacks`, source: line.source });
  const capRules = {};
  if (heroId === WISDOM && firstOf(lines, P.justiceShare))
    capRules.shareBiggest = {
      to: "Focus",
      from: ["Agility", "Tenacity"],
      source: firstOf(lines, P.justiceShare).line.source,
    };
  if (heroId === INCARNATION) {
    const realm = realmBasics(lines, requestedConditions);
    const crossing = firstOf(lines, P.crossing);
    if (realm.outside && crossing)
      for (const name of CYCLE.order)
        extra.push({
          text: `+${crossing.match[1]} to Max ${name} Blessing Stacks`,
          source: `${crossing.line.source} (Crossing the Divine Threshold: outside the Divine Realm)`,
        });
    const transfer = firstOf(lines, realm.outside ? P.transferOutside : P.transferInside);
    const convert = firstOf(lines, realm.outside ? P.convertOutside : P.convertInside);
    const [from, to] = realm.outside ? ["Tenacity", "Agility"] : ["Agility", "Tenacity"];
    if (transfer) capRules.transfer = { from, to, source: transfer.line.source };
    if (convert) capRules.convert = { from, to, source: convert.line.source };
  }
  if (heroId === BLASPHEMER) {
    const convert = firstOf(lines, P.desecrationConvert);
    const extreme = firstOf(lines, P.extremeCap);
    if (convert)
      capRules.invert = {
        perTypeCap: Number(convert.match[1]),
        baseDesecration: KEYWORDS.desecration.initialMax,
        extremeCap: extreme ? Number(extreme.match[1]) : null,
        source: convert.line.source,
      };
  }
  return { lines: extra, capRules };
}

/**
 * Applies Thea's max-stack rules to the Blessing model's entries (packages/engine/src/defense/blessing-model.js calls it after the cap lines are summed and
 * before the stacks are held). Mutates the entries; returns what it did.
 */
export function applyTheaCapRules(result, rules = {}) {
  const info = { shared: null, transfer: null, convert: null, invert: null };
  if (!rules) return info;
  const bonus = (name) => result[name].maxStacks - result[name].baseMax;
  if (rules.invert) {
    // Blasphemer: each increase to a Blessing's max becomes a decrease (to 0 at most) and +1 Max Desecration Stack, up to the
    // per-type cap; Extreme Desecration converts the rest once every Blessing's max is 0 (up to its cap).
    const perType = [];
    for (const name of Object.keys(result)) {
      const entry = result[name];
      const increases = entry.capSources.filter((line) => line.value > 0).reduce((sum, line) => sum + line.value, 0);
      const decreases = entry.capSources.filter((line) => line.value < 0).reduce((sum, line) => sum + line.value, 0);
      const before = Math.max(0, entry.baseMax + decreases);
      const converted = Math.min(rules.invert.perTypeCap, increases, before);
      entry.maxStacks = Math.max(0, before - increases);
      for (const line of entry.capSources.filter((item) => item.value > 0))
        line.invertedBy = "Blasphemer: increases to Max Blessing Stacks reduce them and raise Max Desecration Stacks";
      perType.push({ name, increases, converted, rest: Math.max(0, increases - converted), max: entry.maxStacks });
    }
    const allZero = perType.every((item) => item.max === 0);
    const extremeExtra =
      rules.invert.extremeCap != null && allZero ? perType.reduce((sum, item) => sum + item.rest, 0) : 0;
    const raw = rules.invert.baseDesecration + perType.reduce((sum, item) => sum + item.converted, 0) + extremeExtra;
    info.invert = {
      perType,
      allZero,
      extremeExtra,
      desecrationMax: rules.invert.extremeCap != null ? Math.min(rules.invert.extremeCap, raw) : raw,
      extremeCap: rules.invert.extremeCap,
      source: rules.invert.source,
    };
  }
  if (rules.transfer) {
    const change = bonus(rules.transfer.from);
    if (change) {
      result[rules.transfer.to].maxStacks += change;
      result[rules.transfer.to].capSources.push({
        source: rules.transfer.source,
        text: `${rules.transfer.from} Blessing's max-stack change also applies to ${rules.transfer.to} Blessing`,
        value: change,
        transferred: true,
      });
    }
    info.transfer = { ...rules.transfer, change };
  }
  if (rules.shareBiggest) {
    const biggest = Math.max(0, ...rules.shareBiggest.from.map(bonus));
    if (biggest) {
      result[rules.shareBiggest.to].maxStacks += biggest;
      result[rules.shareBiggest.to].capSources.push({
        source: rules.shareBiggest.source,
        text: `the biggest max-stack bonus of ${rules.shareBiggest.from.join(" or ")} Blessing also applies to ${rules.shareBiggest.to} Blessing`,
        value: biggest,
        transferred: true,
      });
    }
    info.shared = { ...rules.shareBiggest, value: biggest };
  }
  if (rules.convert) info.convert = { ...rules.convert };
  return info;
}

/**
 * Thea's state for the selected loadout, or null for any other hero.
 * @param {object} p
 * @param {string} p.heroId
 * @param {object[]} p.modifierTexts the build's lines
 * @param {object} p.requestedConditions best-case switches (traitSkillOnCooldown, theaInsideRealm, prebuiltSelfBuffs)
 * @param {object|null} p.blessings the Blessing model's result with Thea's inputs (packages/engine/src/defense/blessing-model.js calculateBlessings)
 * @param {object} p.facts { anyDamage, life ("low" | "full"), enemyCrowdControl: [names] }
 */
export function theaState({
  heroId = "",
  modifierTexts = [],
  requestedConditions = {},
  blessings = null,
  facts = {},
} = {}) {
  if (!THEA_HEROES.has(heroId)) return null;
  const lines = linesOf(modifierTexts, heroId);
  const P = THEA_PATTERNS;
  const cycleLine = firstOf(lines, P.cycle);
  const entries = Object.fromEntries((blessings?.entries || []).map((entry) => [entry.name, entry]));
  const held = (name) => entries[name]?.stacks || 0;
  const maxOf = (name) => entries[name]?.maxStacks ?? 4;
  const prebuilt = requestedConditions.prebuiltSelfBuffs !== false;
  const traitPressed = requestedConditions.traitSkillOnCooldown !== false;
  const anyDamage = facts.anyDamage !== false;
  const dealsErosion = facts.dealsErosion !== false;
  const state = {
    heroId,
    cycle: Boolean(cycleLine),
    cycleSource: cycleLine?.line.source || null,
    prebuilt,
    traitPressed,
    anyDamage,
    dealsErosion,
    blessings: Object.fromEntries(
      CYCLE.order.map((name) => [
        name,
        {
          stacks: round(held(name)),
          maxStacks: maxOf(name),
          baseMax: entries[name]?.baseMax ?? 4,
          effect: entries[name]?.effectMultiplier ?? 1,
          perStackDamage: entries[name]?.baseEffect?.additionalDamagePerStack ?? 0,
          capSources: (entries[name]?.capSources || []).map((line) => ({
            source: line.source,
            text: line.text,
            value: line.value,
          })),
          otherGain: (entries[name]?.gainSources || []).some(
            (source) => source.available && source.source !== CYCLE_SOURCE,
          ),
        },
      ]),
    ),
    thea: blessings?.thea || null,
  };
  if (heroId === WISDOM) state.wisdom = wisdomState(lines, state, { ...facts, modifierTexts });
  if (heroId === INCARNATION)
    state.incarnation = incarnationState(lines, state, requestedConditions, {
      ...facts,
      enemyLowLifeLines: modifierTexts.filter(
        (line) =>
          line &&
          line.origin !== "derived" &&
          !line.lineEffect &&
          /against Low Life enemies$/i.test(cleanThea(line.text)),
      ).length,
    });
  if (heroId === BLASPHEMER) state.blasphemer = blasphemerState(lines, state, facts);
  return state;
}

/** The best-case switches this loadout lists (packages/engine/src/heroes/hero-trait-modules.js pushes them as timed-effect toggles). */
export function theaSwitches(state) {
  if (!state) return [];
  const out = [];
  const realm = state.incarnation?.realm;
  if (realm?.cast)
    out.push({
      id: "traitSkillOnCooldown",
      label: "Divine Realm pressed on cooldown (Trait Skill)",
      enabled: realm.pressed,
      active: realm.active,
      summary: `the Divine Realm (${realm.durationSeconds} s, ${realm.cooldownSeconds} s cooldown) on the dummy from t = 0: uptime ${pct(realm.uptime)}%`,
      reason: realm.active
        ? realm.pressed
          ? "best-case assumption: pressed whenever off cooldown"
          : "Prepared by a trait: held without pressing"
        : "the Trait Skill switch is off and no trait Prepares the Divine Realm",
    });
  const b = state.blasphemer;
  if (b?.click && !b.gains)
    out.push({
      id: "traitSkillOnCooldown",
      label: "Desecration pressed on cooldown (Trait Skill)",
      enabled: state.traitPressed,
      active: b.active,
      summary: `Desecration every ${b.cooldownSeconds} s on the dummy`,
      reason: b.active ? "best-case assumption" : "no Blessing gain triggers it and the Trait Skill switch is off",
    });
  return out;
}

/**
 * One Thea clause: { key, status, reason, bodies: [derived line texts], timed: [timed effects], group, lucky }, or null when the
 * line is not a Thea clause of this loadout.
 */
export function theaLineRead(heroId, text, state) {
  const key = theaClauseKey(heroId, text);
  if (!key) return null;
  if (!state) return inactive("the loadout's lines are not in the build", { key });
  const read =
    heroId === WISDOM
      ? wisdomRead(key, text, state)
      : heroId === INCARNATION
        ? incarnationRead(key, text, state)
        : blasphemerRead(key, text, state);
  return { key, bodies: [], timed: [], group: null, ...read };
}

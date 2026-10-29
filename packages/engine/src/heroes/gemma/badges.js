// Gemma's badge modules (packages/engine/src/heroes/hero-trait-modules.js reads them): each row of the module table, the trait
// lines it reads and its badge handler, for Flame of Pleasure (Purgatory), Ice-Fire Fusion (Frostfire Rampage) and Frostbitten
// Heart (Cold Pulse).
import { stepsOf } from "./timeline.js";
import { frostfireCycle, frostfireLevels } from "./ice-fire-fusion.js";
import { coldPulseState } from "./frostbitten-heart.js";
import { infernalAverageStacks, purgatoryIntervals } from "./flame-of-pleasure.js";
import { curseTakenPercentAtLevel } from "../../skills/curse-model.js";

const num = (text) => Number(String(text).replace("−", "-"));
const round = (value) => Math.round(value * 10000) / 10000;

const PATTERNS = {
  purgatoryBase: /^Purgatory has an initial radius of \d+ m, lasts for ([\d.]+) s, and has a cooldown of ([\d.]+) s$/i,
  purgatoryDuration: /^\+?([\d.]+) s Purgatory Duration$/i,
  purgatoryTaken: /^\+(\d+(?:\.\d+)?)% additional damage taken by enemies within the range of Purgatory$/i,
  // Dress Licker's wording is "for enemies within the range of Purgatory" (game affix 565386: attr 5107, the player's additional
  // Fire Damage, gated on the target in Purgatory); "against" kept for older text.
  purgatoryFire: /^\+(\d+(?:\.\d+)?)% additional Fire Damage (?:against|for) enemies within the range of Purgatory$/i,
  purgatoryCharges: /^\+(\d+) Max Purgatory Charges$/i,
  purgatoryArea: /Purgatory Skill Area$/i,
  purgatoryMechanism:
    /^Click the Trait Skill to unleash Purgatory|^Purgatory ?'s upper limit becomes|^Attempts to auto-cast Purgatory/i,
  purgatoryOnKill: /^Eliminates enemies with less than|when defeating enemies within the range of Purgatory$/i,
  infernal:
    /^For every second Purgatory is active, \+?(\d+(?:\.\d+)?)% additional damage and Minion Damage until Purgatory is lost or a new Purgatory is cast$/i,
  banquetScorch: /^Enemies within range of Purgatory are cursed by Lv\. (\d+) Scorch$/i,
  banquetClose: /^-(\d+(?:\.\d+)?) ?% additional damage taken by enemies within ([\d.]+) ?m$/i,
  dressConversion:
    /^Converts (\d+(?:\.\d+)?) ?% of Physical Damage taken by enemies within the range of Purgatory to Fire Damage$/i,
  // Frostfire Rampage (Ice-Fire Fusion; B3).
  frostfireEnter: /^Enters Frostfire Rampage after casting Fire or Cold Skills (\d+) time\(s\)$/i,
  frostfireDamage: /^\+(\d+(?:\.\d+)?) ?% additional Fire Damage and Cold Damage during Frostfire Rampage$/i,
  frostfireBase: /^Frostfire Rampage lasts for ([\d.]+) s and has a cooldown of ([\d.]+) s$/i,
  frostfireCdrAdditional: /^\+(\d+(?:\.\d+)?) ?% additional Cooldown Recovery Speed for Frostfire Rampage$/i,
  frostfireCdr: /^\+(\d+(?:\.\d+)?) ?% Frostfire Rampage Cooldown Recovery Speed$/i,
  frostfireDuration: /^([+-]\d+(?:\.\d+)?) ?% Frostfire Rampage Duration$/i,
  frostfirePenetration:
    /^\+(\d+(?:\.\d+)?) ?% Elemental Penetration and \+[\d.]+ ?% Movement Speed during Frostfire Rampage$/i,
  frostfireEnd:
    /^\+(\d+(?:\.\d+)?) ?% additional Fire Damage and Cold Damage when Frostfire Rampage ends\. The effect gradually falls off to 0 within ([\d.]+) s$/i,
  frostfireRegen: /^Regenerates [\d.]+ ?% Life and Mana per second when entering Frostfire Rampage/i,
  // Cold Pulse (Frostbitten Heart; B3).
  pulseTrigger: /^When dealing Cold Damage, triggers Cold Pulse at the enemy ?'s location\. Interval: ([\d.]+) s$/i,
  pulseFrostbite: /^Inflicts Frostbite when Cold Pulse hits an enemy$/i,
  pulseBuff:
    /^\+(\d+(?:\.\d+)?) ?% additional Cold Damage for you and your Minions for ([\d.]+) s when Cold Pulse hits an enemy$/i,
  pulseInterval: /^([+-][\d.]+) s Cold Pulse Interval$/i,
  pulseTaken:
    /^Enemies \+(\d+(?:\.\d+)?) ?% additional Cold Damage taken for every Cold Pulse hit they took recently\. Lasts for ([\d.]+) s\. Stacks up to (\d+) time\(s\)\.?$/i,
  pulseResistance: /^-(\d+(?:\.\d+)?) ?% Cold Resistance for ([\d.]+) s when Cold Pulse hits an enemy$/i,
  pulseArea: /Cold Pulse Skill Area$/i,
  pulseBlooming:
    /^Upon inflicting Frostbite, additionally casts Cold Pulse at the Frostbitten target once\. Interval: ([\d.]+) ?s for the same target$/i,
};

// Gemma (hero trait audit B3): the Frostfire Rampage cycle from the build's Ice-Fire Fusion lines (packages/engine/src/heroes/gemma/ice-fire-fusion.js).
// `state.fireColdCastsPerSecond`: the Fire / Cold skills' casts per second the hit pass measured (packages/engine/src/planner.js hitRateFacts);
// before that pass, 5 casts per cooldown are assumed.
const sumOf = (traits, pattern) =>
  traits
    .filter((item) => pattern.test(item.clean))
    .reduce((total, item) => total + num(item.clean.match(pattern)[1]), 0);
function resolveFrostfire(traits, state) {
  const enter = traits.map((item) => item.clean.match(PATTERNS.frostfireEnter)).find(Boolean);
  const base = traits.map((item) => item.clean.match(PATTERNS.frostfireBase)).find(Boolean);
  const castsNeeded = enter ? num(enter[1]) : 5;
  const castsPerSecond = Number.isFinite(state.fireColdCastsPerSecond) ? state.fireColdCastsPerSecond : null;
  const tags = state.activeTags || new Set();
  const casting = (tags.has("Fire") || tags.has("Cold")) && castsPerSecond !== 0;
  const cycle = frostfireCycle({
    baseDurationSeconds: base ? num(base[1]) : 5,
    baseCooldownSeconds: base ? num(base[2]) : 10,
    durationPercent: sumOf(traits, PATTERNS.frostfireDuration),
    cooldownRecoveryPercent: sumOf(traits, PATTERNS.frostfireCdr),
    cooldownRecoveryAdditional: traits
      .filter((item) => PATTERNS.frostfireCdrAdditional.test(item.clean))
      .map((item) => num(item.clean.match(PATTERNS.frostfireCdrAdditional)[1])),
    castsNeeded,
    castsPerSecond,
  });
  // Own buff: with own buffs pre-built (default) the first Rampage starts at t = 0, otherwise at the 5th cast.
  const startSeconds =
    state.prebuiltSelfBuffs !== false ? 0 : castsPerSecond > 0 ? (castsNeeded - 1) / castsPerSecond : 0;
  return { cycle, casting: casting && cycle.uptime > 0, castsNeeded, castsPerSecond, startSeconds };
}
// Gemma – Frostbitten Heart (B3): the Cold Pulse cadence (packages/engine/src/heroes/gemma/frostbitten-heart.js coldPulseState).
function resolveColdPulse(traits, state) {
  const trigger = traits.map((item) => item.clean.match(PATTERNS.pulseTrigger)).find(Boolean);
  if (!trigger) return { pulse: null, reason: "no Cold Pulse trigger in the build" };
  const dealsCold = Boolean(state.dealtDamageTypes?.has?.("Cold") || state.hitTypes?.has?.("Cold"));
  if (!dealsCold) return { pulse: null, reason: "no active skill deals Cold Damage, so Cold Pulse never triggers" };
  const intervalSeconds = Math.max(0.1, num(trigger[1]) + sumOf(traits, PATTERNS.pulseInterval));
  const frostbitten = (state.enemyAilments || []).includes("Frostbite");
  const blooming = frostbitten && traits.some((item) => PATTERNS.pulseBlooming.test(item.clean));
  const otherFrostbiteOnHit =
    frostbitten && Boolean(state.frostbiteSource) && !/Cold Pulse/.test(state.frostbiteSource);
  const taken = traits.map((item) => item.clean.match(PATTERNS.pulseTaken)).find(Boolean);
  const pulse = coldPulseState({
    intervalSeconds,
    blooming,
    otherFrostbiteOnHit,
    stackWindowSeconds: taken ? num(taken[2]) : 8,
    maxStacks: taken ? num(taken[3]) : 4,
  });
  return { pulse, intervalSeconds, blooming, frostbitten, otherFrostbiteOnHit, reason: "" };
}

export function purgatoryBadge(line, module, ctx) {
  const { state, traits, entries, timedEffects, entry, derive } = ctx;
  let match;
  const base = traits.map((item) => item.clean.match(PATTERNS.purgatoryBase)).find(Boolean);
  const duration =
    (base ? num(base[1]) : 5) +
    traits
      .filter((item) => PATTERNS.purgatoryDuration.test(item.clean))
      .reduce((sum, item) => sum + num(item.clean.match(PATTERNS.purgatoryDuration)[1]), 0);
  const cooldown = base ? num(base[2]) : 8;
  const charges =
    1 +
    traits
      .filter((item) => PATTERNS.purgatoryCharges.test(item.clean))
      .reduce((sum, item) => sum + num(item.clean.match(PATTERNS.purgatoryCharges)[1]), 0);
  const uptime = Math.min(1, duration / cooldown);
  const text = `uptime ${round(uptime * 100)}% (${round(duration)} s every ${cooldown} s; auto-cast delay ignored: provisional)`;
  // Audit of held debuffs (pact scripted-effects batch 2026-10-13): auto-cast whenever available, so a cast at t = 0 (best
  // case, user 2026-10-13); the 5 s / 20 s windows and the recount follow the casts, sustained figures keep the uptime.
  // With extra charges (B3) the casts come from the charge simulation (packages/engine/src/heroes/gemma/flame-of-pleasure.js purgatoryIntervals).
  const intervals = purgatoryIntervals({ durationSeconds: duration, cooldownSeconds: cooldown, charges });
  const inPurgatory = (t) => (intervals.some(([start, end]) => t >= start - 1e-9 && t < end - 1e-9) ? 1 : 0);
  const cast =
    charges > 1
      ? { kind: "steps", points: stepsOf(inPurgatory, intervals.flat()), sustained: uptime }
      : { kind: "periodic", durationSeconds: duration, periodSeconds: cooldown, startSeconds: 0 };
  if ((match = line.clean.match(PATTERNS.purgatoryTaken))) {
    const body = `+${round(num(match[1]) * uptime)}% additional damage taken`;
    entry(line, module, true, text, [body]);
    derive(body, line.source, text);
    timedEffects.push({
      id: `purgatory:${line.source}`,
      label: "Purgatory",
      source: line.source,
      target: "enemy",
      toggle: false,
      enabled: true,
      active: true,
      parts: [{ type: null, reach: "all", percent: num(match[1]), schedule: cast }],
    });
  } else if ((match = line.clean.match(PATTERNS.purgatoryFire))) {
    const body = `+${round(num(match[1]) * uptime)}% additional Fire Damage`;
    entry(line, module, true, text, [body]);
    derive(body, line.source, text);
    timedEffects.push({
      id: `purgatoryFire:${line.source}`,
      label: "Purgatory",
      source: line.source,
      target: "self",
      toggle: false,
      enabled: true,
      active: true,
      parts: [{ type: "Fire", reach: "all", percent: num(match[1]), schedule: cast }],
    });
  } else if (PATTERNS.purgatoryBase.test(line.clean) || PATTERNS.purgatoryDuration.test(line.clean))
    entry(line, module, true, text);
  else if (PATTERNS.purgatoryCharges.test(line.clean))
    entry(
      line,
      module,
      true,
      `${charges} charges, recovering one at a time on the ${cooldown} s cooldown (provisional): a Purgatory is recast as soon as the last one ends while a charge is ready, so the 5 s / 20 s windows and the recount hold it longer from t = 0; the long-run uptime stays ${round(uptime * 100)}%`,
    );
  else if (PATTERNS.purgatoryMechanism.test(line.clean))
    entries.push({
      source: line.source,
      origin: "trait",
      text: line.clean,
      active: false,
      conditionText: `${module.label}: the mechanism the Purgatory model assumes (auto-cast whenever no Purgatory is up and a charge is ready, one Purgatory that follows you with the dummy inside; ${text}); the line itself changes no figure`,
      status: "No DPS effect",
      provisional: true,
      bodies: [],
      condition: "heroModule",
      group: null,
      module: module.key,
    });
  else if (PATTERNS.purgatoryArea.test(line.clean))
    entries.push({
      source: line.source,
      origin: "trait",
      text: line.clean,
      active: false,
      conditionText: `${module.label}: the dummy is already inside Purgatory (it follows you, within 10 m), so a larger area changes no dummy damage`,
      status: "No DPS effect",
      provisional: true,
      bodies: [],
      condition: "heroModule",
      group: null,
      module: module.key,
    });
  else if (PATTERNS.purgatoryOnKill.test(line.clean))
    entries.push({
      source: line.source,
      origin: "trait",
      text: line.clean,
      active: false,
      conditionText: `${module.label}: an execute / on-kill effect (the training dummy is never defeated)`,
      status: "Not on dummy",
      provisional: false,
      bodies: [],
      condition: "heroModule",
      group: null,
      module: module.key,
    });
  else if ((match = line.clean.match(PATTERNS.infernal))) {
    // Infernal Damnation (B3): ⌊seconds active⌋ stacks, reset by each new Purgatory; time average over a cycle of max(duration,
    // cooldown) (charges recover one at a time, so the long-run cycle is the cooldown).
    const perStack = num(match[1]),
      stacks = infernalAverageStacks(duration, Math.max(duration, cooldown)),
      value = round(perStack * stacks);
    const bodies = [`+${value}% additional damage`, `+${value}% additional Minion Damage`];
    entry(
      line,
      module,
      value > 0,
      value > 0
        ? `${round(stacks)} stacks on average (⌊seconds active⌋ over a ${round(duration)} s Purgatory every ${round(Math.max(duration, cooldown))} s, reset by each new cast) × ${perStack}% = +${value}% additional damage and Minion Damage (provisional)`
        : "the Purgatory lasts under 1 s: no stack",
      bodies,
    );
    if (value > 0) {
      for (const body of bodies) derive(body, line.source, `Infernal Damnation: ${round(stacks)} average stacks`);
      const levelAt = (t) => {
        const open = intervals.find(([start, end]) => t >= start - 1e-9 && t < end - 1e-9);
        return open ? Math.floor(t - open[0] + 1e-9) : 0;
      };
      const edges = intervals.flatMap(([start, end]) => {
        const list = [start, end];
        for (let k = 1; start + k < end; k++) list.push(start + k);
        return list;
      });
      timedEffects.push({
        id: `infernalDamnation:${line.source}`,
        label: "Infernal Damnation",
        source: line.source,
        target: "self",
        toggle: false,
        enabled: true,
        active: true,
        parts: [
          {
            type: null,
            reach: "all",
            percent: perStack,
            schedule: { kind: "steps", points: stepsOf(levelAt, edges), sustained: round(stacks) },
          },
        ],
      });
    }
  } else if ((match = line.clean.match(PATTERNS.banquetScorch))) {
    // Banquet of Bliss (B3): a Lv. N Scorch on the dummy while it is in Purgatory. Scorch's "+X% additional Fire Damage taken by
    // Cursed enemies" at that level (packages/engine/src/skills/curse-model.js: the curse level curve), × (1 + Curse Effect). A Scorch skill already on the dummy is the same curse (no second copy).
    // Whether it takes a curse slot is not stated (the trait also grants +1 curse): not counted against the limit (provisional).
    const level = num(match[1]);
    const scorch = curseTakenPercentAtLevel(level);
    const curseEffect = Number(state.curseEffectPercent) || 0;
    const perCast = round(scorch * (1 + curseEffect / 100)),
      value = round(perCast * uptime);
    const own = (state.curseSkillNames || []).some((name) => /^Scorch$/i.test(name));
    const body = `+${value}% additional Fire Damage taken`;
    entry(
      line,
      module,
      !own,
      own
        ? "a Scorch skill already curses the dummy: the same curse, no second copy"
        : `Lv. ${level} Scorch: +${round(scorch)}% additional Fire Damage taken${curseEffect ? ` × (1 + ${curseEffect}% Curse Effect)` : ""} = +${perCast}% while the dummy is in Purgatory (${text}) = +${value}% (Scorch value from the Lv20 / Lv31 records, linear: provisional; no curse slot taken: provisional)`,
      own ? [] : [body],
    );
    if (!own) {
      derive(body, line.source, `Banquet of Bliss: Lv. ${level} Scorch in Purgatory`);
      timedEffects.push({
        id: `banquetScorch:${line.source}`,
        label: "Banquet of Bliss: Scorch",
        source: line.source,
        target: "enemy",
        toggle: false,
        enabled: true,
        active: true,
        parts: [{ type: "Fire", reach: "all", percent: perCast, schedule: cast }],
      });
    }
  } else if ((match = line.clean.match(PATTERNS.banquetClose))) {
    // Banquet of Bliss's penalty (B3): best case you stand beyond its range (switch gemmaBanquetBeyondRange, on by default).
    const on = state.requestedConditions?.gemmaBanquetBeyondRange !== false;
    const body = `-${num(match[1])}% additional damage taken`;
    timedEffects.push({
      id: "gemmaBanquetBeyondRange",
      label: `Banquet of Bliss: stand beyond ${match[2]} m`,
      source: line.source,
      target: "enemy",
      toggle: true,
      provisional: true,
      enabled: on,
      active: on,
      summary: `you stand more than ${match[2]} m from the dummy (still within 10 m), so its -${num(match[1])}% additional damage taken does not apply`,
      reason: on
        ? "best-case assumption"
        : `the dummy within ${match[2]} m: -${num(match[1])}% additional damage taken applies`,
      parts: [],
    });
    entries.push({
      source: line.source,
      origin: "trait",
      text: line.clean,
      active: !on,
      conditionText: `${module.label}: ${on ? `best case: you stand beyond ${match[2]} m (switch "Banquet of Bliss: stand beyond ${match[2]} m" in the best-case assumptions), so it does not apply` : `switched off: the dummy within ${match[2]} m takes -${num(match[1])}% additional damage`}`,
      status: on ? "Inactive" : "In calc",
      provisional: true,
      bodies: on ? [] : [{ body, derivedText: body, readers: ["hero"] }],
      condition: "heroModule",
      group: null,
      module: module.key,
      listedAs: "condition:gemmaBanquetBeyondRange",
    });
    if (!on) derive(body, line.source, `Banquet of Bliss: within ${match[2]} m`);
  } else if ((match = line.clean.match(PATTERNS.dressConversion))) {
    // Dress Licker (B3): Physical Damage the dummy takes inside Purgatory is taken as Fire (its Fire Resistance and non-Physical
    // armour, the Fire Damage taken debuffs; the player's Physical bonuses already applied). Read on skill hits at the
    // Purgatory uptime (packages/engine/src/skills/skill-hit-model.js takenConversion); Physical damage over time (Trauma, Physical skill DoTs) keeps
    // its Physical mitigation, and the windows use the sustained share (provisional).
    const physical = Boolean(state.hitTypes?.has?.("Physical"));
    const share = round((num(match[1]) / 100) * uptime);
    if (physical) ctx.out.takenConversion = { from: "Physical", to: "Fire", share, source: line.source };
    entries.push({
      source: line.source,
      origin: "trait",
      text: line.clean,
      active: physical,
      conditionText: `${module.label}: ${physical ? `${round(share * 100)}% of the Physical hit damage is taken as Fire (${num(match[1])}% × ${round(uptime * 100)}% Purgatory uptime): Fire Resistance, non-Physical armour and Fire Damage taken apply to it on skill hits; Physical damage over time is not converted (provisional)` : "the build deals no Physical hit damage"}`,
      status: physical ? "Partly modeled" : "Inactive",
      provisional: true,
      bodies: [],
      condition: "heroModule",
      group: null,
      module: module.key,
    });
  } else entry(line, { ...module, status: "Not modeled" }, false, "this Purgatory clause is not read");
}

export function frostfireBadge(line, module, ctx) {
  const { state, traits, entries, timedEffects, entry, derive, gemma } = ctx;
  let match;
  const read = gemma.frostfire || (gemma.frostfire = resolveFrostfire(traits, state));
  const { cycle } = read;
  const reach = read.casting
    ? `Rampage ${cycle.durationSeconds} s, ${cycle.ends ? `every ${cycle.periodSeconds} s` : `re-entered every ${cycle.periodSeconds} s, before it ends: held`} (cooldown ${cycle.cooldownSeconds} s${cycle.castsBound ? `, held back by the casts: ${read.castsNeeded} Fire / Cold casts take ${cycle.castSeconds} s` : read.castsPerSecond == null ? `, ${read.castsNeeded} Fire / Cold casts per cooldown assumed until the hit pass measures the cast rate` : `; ${read.castsNeeded} casts in ${cycle.castSeconds} s`}): ${round(cycle.uptime * 100)}% uptime (Q-H4 reading; provisional)`
    : "no active Fire or Cold skill casts";
  const unread = () =>
    entry(line, { ...module, status: "Not modeled" }, false, "this Frostfire Rampage clause is not read");
  if ((match = line.clean.match(PATTERNS.frostfireDamage))) {
    const value = round(num(match[1]) * cycle.uptime),
      body = `+${value}% additional Fire and Cold Damage`;
    entry(line, module, read.casting, reach, read.casting ? [body] : []);
    if (read.casting) {
      derive(body, line.source, `Frostfire Rampage: ${round(cycle.uptime * 100)}% uptime`);
      const schedule = {
        kind: "periodic",
        durationSeconds: cycle.ends ? cycle.durationSeconds : 1,
        periodSeconds: cycle.ends ? cycle.periodSeconds : 1,
        startSeconds: read.startSeconds,
      };
      timedEffects.push({
        id: `frostfire:${line.source}`,
        label: "Frostfire Rampage",
        source: line.source,
        target: "self",
        toggle: false,
        enabled: true,
        active: true,
        parts: ["Fire", "Cold"].map((type) => ({ type, reach: "all", percent: num(match[1]), schedule })),
      });
    }
  } else if ((match = line.clean.match(PATTERNS.frostfireEnd))) {
    const peak = num(match[1]),
      value = round(peak * cycle.radianceShare),
      active = read.casting && cycle.ends;
    const body = `+${value}% additional Fire and Cold Damage`;
    entry(
      line,
      module,
      active,
      !read.casting
        ? reach
        : !cycle.ends
          ? `the Rampage never ends (${cycle.durationSeconds} s ≥ its ${cycle.periodSeconds} s cycle), so its end bonus never fires`
          : `+${peak}% at each end, fading linearly to 0 over 3 s: +${value}% on average over the ${cycle.periodSeconds} s cycle (${reach})`,
      active ? [body] : [],
    );
    if (active) {
      derive(body, line.source, "Ice-Fire Radiance: end bonus, time average");
      const levelAt = (t) => frostfireLevels(cycle, read.startSeconds, t).radiance;
      const edges = [];
      for (let t = read.startSeconds + cycle.durationSeconds; t < 120; t += cycle.periodSeconds) edges.push(t, t + 3);
      timedEffects.push({
        id: `frostfireEnd:${line.source}`,
        label: "Ice-Fire Radiance",
        source: line.source,
        target: "self",
        toggle: false,
        enabled: true,
        active: true,
        parts: ["Fire", "Cold"].map((type) => ({
          type,
          reach: "all",
          percent: peak,
          schedule: { kind: "steps", points: stepsOf(levelAt, edges), sustained: cycle.radianceShare },
        })),
      });
    }
  } else if ((match = line.clean.match(PATTERNS.frostfirePenetration))) {
    const value = round(num(match[1]) * cycle.uptime),
      body = `+${value}% Elemental Penetration`;
    entry(
      line,
      module,
      read.casting,
      read.casting
        ? `${reach}: +${num(match[1])}% Elemental Penetration × uptime = +${value}% (the windows keep the sustained share; the Movement Speed part has no DPS effect)`
        : reach,
      read.casting ? [body] : [],
    );
    if (read.casting) derive(body, line.source, `Frostfire Rampage: ${round(cycle.uptime * 100)}% uptime`);
  } else if (
    PATTERNS.frostfireEnter.test(line.clean) ||
    PATTERNS.frostfireBase.test(line.clean) ||
    PATTERNS.frostfireCdr.test(line.clean) ||
    PATTERNS.frostfireCdrAdditional.test(line.clean) ||
    PATTERNS.frostfireDuration.test(line.clean)
  ) {
    entry(line, module, read.casting, reach);
  } else if (PATTERNS.frostfireRegen.test(line.clean)) {
    entries.push({
      source: line.source,
      origin: "trait",
      text: line.clean,
      active: false,
      conditionText: `${module.label}: Life and Mana recovery`,
      status: "No DPS effect",
      provisional: false,
      bodies: [],
      condition: "heroModule",
      group: null,
      module: module.key,
    });
  } else unread();
}

export function coldPulseBadge(line, module, ctx) {
  const { state, traits, entries, timedEffects, entry, derive, gemma } = ctx;
  let match;
  const read = gemma.coldPulse || (gemma.coldPulse = resolveColdPulse(traits, state));
  const { pulse } = read;
  const off = read.reason;
  const neutral = (status, why) =>
    entries.push({
      source: line.source,
      origin: "trait",
      text: line.clean,
      active: false,
      conditionText: `${module.label}: ${why}`,
      status,
      provisional: true,
      bodies: [],
      condition: "heroModule",
      group: null,
      module: module.key,
    });
  const cadence = pulse
    ? `a Cold Pulse ${pulse.pulsesPerSecond} times per second (every ${read.intervalSeconds} s${read.blooming ? ", plus Blooming Frost Flower's" : ""}) from t = 0`
    : "";
  if (PATTERNS.pulseTrigger.test(line.clean)) {
    if (!pulse) entry(line, module, false, off);
    else
      neutral(
        "Partly modeled",
        `${cadence}; its Frostbite and the buffs and debuffs it carries are applied, but Cold Pulse's own damage is not published, so it is not counted`,
      );
  } else if (PATTERNS.pulseFrostbite.test(line.clean)) {
    entry(
      line,
      module,
      Boolean(pulse && read.frostbitten),
      !pulse
        ? off
        : read.frostbitten
          ? `the dummy is Frostbitten (${cadence}; held between pulses, provisional): Frostbite Rating, Cold Damage taken and the Frostbite lines (packages/engine/src/combat-states.js)`
          : "a build-wide Cannot inflict Frostbite line blocks it",
    );
  } else if ((match = line.clean.match(PATTERNS.pulseBuff))) {
    const seconds = num(match[2]),
      uptime = pulse ? pulse.buffUptime(seconds) : 0,
      value = round(num(match[1]) * uptime);
    const bodies = [`+${value}% additional Cold Damage`, `+${value}% additional Minion Cold Damage`];
    entry(
      line,
      module,
      Boolean(pulse),
      pulse
        ? `${cadence}: the ${seconds} s buff is up ${round(uptime * 100)}% of the time: +${value}% additional Cold Damage for you and your Minions`
        : off,
      pulse ? bodies : [],
    );
    if (pulse) {
      for (const body of bodies) derive(body, line.source, `Cold Pulse buff: ${round(uptime * 100)}% uptime`);
      if (uptime < 1)
        timedEffects.push({
          id: `coldPulseBuff:${line.source}`,
          label: "Cold Pulse buff",
          source: line.source,
          target: "self",
          toggle: false,
          enabled: true,
          active: true,
          parts: [
            {
              type: "Cold",
              reach: "all",
              percent: num(match[1]),
              schedule: { kind: "steps", points: pulse.upSteps(seconds), sustained: uptime },
            },
          ],
        });
    }
  } else if (PATTERNS.pulseInterval.test(line.clean)) {
    entry(
      line,
      module,
      Boolean(pulse),
      pulse ? `Cold Pulse every ${read.intervalSeconds} s (4 s base): ${cadence}` : off,
    );
  } else if ((match = line.clean.match(PATTERNS.pulseTaken))) {
    const perStack = num(match[1]),
      value = pulse ? round(perStack * pulse.stacks) : 0,
      body = `+${value}% additional Cold Damage taken`;
    entry(
      line,
      module,
      Boolean(pulse),
      pulse
        ? `${cadence}: ${round(pulse.stacks)} of ${match[3]} stacks held on average (Cold Pulse hits in the last ${match[2]} s) × ${perStack}% = +${value}% additional Cold Damage taken; the clean dummy builds them from zero in the windows (provisional)`
        : off,
      pulse ? [body] : [],
    );
    if (pulse) {
      derive(body, line.source, `Dance of Frost: ${round(pulse.stacks)} stacks`);
      timedEffects.push({
        id: `danceOfFrost:${line.source}`,
        label: "Dance of Frost",
        source: line.source,
        target: "enemy",
        toggle: false,
        enabled: true,
        active: true,
        parts: [
          {
            type: "Cold",
            reach: "all",
            percent: perStack,
            schedule: { kind: "steps", points: pulse.stackSteps(), sustained: pulse.stacks },
          },
        ],
      });
    }
  } else if ((match = line.clean.match(PATTERNS.pulseResistance))) {
    const seconds = num(match[2]),
      uptime = pulse ? pulse.buffUptime(seconds) : 0,
      value = round(num(match[1]) * uptime),
      body = `+${value}% Cold Penetration`;
    entry(
      line,
      module,
      Boolean(pulse),
      pulse
        ? `${cadence}: -${num(match[1])}% Cold Resistance on the dummy ${round(uptime * 100)}% of the time, applied as resistance − ${value} (the planner's mitigation treats a resistance reduction like penetration; the windows keep the sustained share; provisional)`
        : off,
      pulse ? [body] : [],
    );
    if (pulse) derive(body, line.source, `Frigid Infusion: ${round(uptime * 100)}% uptime`);
  } else if ((match = line.clean.match(PATTERNS.pulseBlooming))) {
    const active = Boolean(pulse && read.frostbitten);
    entry(
      line,
      module,
      active,
      !pulse
        ? off
        : !read.frostbitten
          ? "the dummy is not Frostbitten (a Cannot inflict Frostbite line), so it never fires"
          : `an extra Cold Pulse per Frostbite infliction, at most every ${match[1]} s on the dummy (${read.otherFrostbiteOnHit ? "another Frostbite source on hit: every 2 s from t = 0" : "the pulse's own Frostbite: with each base pulse"}): ${cadence} (provisional)`,
    );
  } else if (PATTERNS.pulseArea.test(line.clean))
    neutral("No DPS effect", "the pulse lands at the dummy's location; a larger area changes no single-target damage");
  else entry(line, { ...module, status: "Not modeled" }, false, "this Cold Pulse clause is not read");
}

export const GEMMA_MODULES = Object.freeze([
  {
    key: "purgatory",
    heroes: /^gemma-flame-of-pleasure$/,
    label: "Gemma: Purgatory",
    status: "Provisional",
    rule: "Purgatory lasts 5 s (+ \"Purgatory Duration\" lines) with an 8 s cooldown and is auto-cast whenever available: uptime = duration ÷ cooldown (≤ 1), the dummy inside it (it follows the player). The ≤ 1 s auto-cast check delay is ignored (an upper bound). Its damage-taken and Fire lines apply at that uptime in sustained figures; the 5 s / 20 s windows and the recount follow the casts from t = 0 (best case). Hero trait audit B3 (packages/engine/src/heroes/gemma/flame-of-pleasure.js; provisional): extra Purgatory Charges recover one at a time on the cooldown (the long-run uptime is unchanged; the windows recast at once), Infernal Damnation's ⌊seconds active⌋ stacks, Banquet of Bliss's Scorch on the dummy inside it, Dress Licker's Physical → Fire taken conversion on hits.",
    // Banquet of Bliss's "-30% additional damage taken by enemies within 1 m" belongs to the Purgatory module (B3: best-case switch).
    lines: /Purgatory|additional damage taken by enemies within [\d.]+ ?m$/i,
    badge: purgatoryBadge,
  },
  // Gemma (hero trait audit B3, 2026-10-19; packages/engine/src/heroes/gemma/): the Frostfire Rampage cycle (Q-H4), Cold Pulse and the
  // Purgatory extensions. Before B3 the Rampage read Not modeled ("whether casts during the cooldown count is not in the text").
  {
    key: "frostfire",
    heroes: /^gemma-ice-fire-fusion$/,
    label: "Gemma: Frostfire Rampage",
    status: "Provisional",
    rule: "Q-H4 recommended reading (game record: a counter +1 per cast, the Rampage fired behind a cooldown check, so casts during the cooldown count): one Rampage per period P = max(cooldown, 5 casts ÷ the Fire / Cold casts per second); cooldown 10 s ÷ ((1 + Frostfire Rampage Cooldown Recovery Speed) × Π(1 + additional)); duration 5 s × (1 + Frostfire Rampage Duration); uptime min(1, duration ÷ P). Ice-Fire Radiance's end bonus fades linearly over 3 s after each end. With own buffs pre-built the first Rampage starts at t = 0, otherwise at the 5th cast. General Skill Effect Duration / Cooldown Recovery Speed lines are not read (provisional).",
    lines: /Frostfire Rampage/i,
    badge: frostfireBadge,
  },
  {
    key: "coldPulse",
    heroes: /^gemma-frostbitten-heart$/,
    label: "Gemma: Cold Pulse",
    status: "Provisional",
    rule: "Cold Pulse fires at the dummy every 4 s (Dance of Frost: 2 s) from the first Cold hit (t = 0) while an active skill deals Cold Damage, and inflicts Frostbite (held between pulses, as every Frostbite source). Blooming Frost Flower adds a pulse on each Frostbite infliction at most every 2 s (a pulse's own Frostbite counts; another Frostbite source on hit fires it every 2 s). The 6 s buffs and debuffs and Dance of Frost's stacks (hits within 8 s, up to 4) follow the pulse times; the dummy's stacks build from zero in the windows. Cold Pulse's own damage is not published, so it is not counted (provisional).",
    // Cold Pulse lines (B3); the Artificial Moon line "+10 Max Frostbite Rating and +50% additional Cold Pulse Skill Area" is read by
    // packages/engine/src/combat-states.js (its Max Frostbite Rating), so it stays out.
    lines: { test: (text) => /Cold Pulse/i.test(text) && !/^\+\d+ (?:to )?Max Frostbite Rating/i.test(text) },
    badge: coldPulseBadge,
  },
  {
    key: "condensedFrost",
    heroes: /^gemma-frostbitten-heart$/,
    label: "Gemma: Condensed Frost",
    status: "Not modeled",
    rule: 'Glacial Night: "Enemies are inflicted with Condensed Frost". Neither TLIDB nor the readable game records define what Condensed Frost does (buff 81233 has no readable effect), so its effect and "+X% Condensed Frost Effect" are not modeled.',
    lines: /Condensed Frost/i,
  },
]);

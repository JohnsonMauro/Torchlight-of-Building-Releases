// Erika – Lightning Shadow and Vendetta's Sting (hero trait audit batch B5, 2026-10-19, research/hero-traits-audit-2026-10-19.md
// §5 B5, §8 B5, §6 Q-H10 / Q-H12). Pure: reads the build's trait lines (origin "trait") and the hero-exclusive revived lines the
// modules read (Charging Tail, Vengeful Night Wraith; src/hero-exclusive-revivals.js MODULE_LINES) and returns the states the
// engines apply: src/combat-states.js (Numbed on the dummy), src/vendetta-model.js (the Vendetta triggers), src/planner.js (the
// derived lines, the Activation Medium block) and src/hero-trait-modules.js (the badges).
//
// Sourced (TLIDB keyword tooltips, Torchlight_Hyperlink_hover, fetched 2026-10-19 and saved in research/tlidb-ss14/fetch-cache):
// - Electrify (507ee3bc…): "For every stack of Electrify, Feline Figure inflicts 1 stack of Numbed on enemies within the area".
// - Feline Figure (2b9ca14f…): "Inflicts Numbed stacks equal to the number of Electrify stacks on enemies within the area. Skill
//   Tags: Spell, Lightning" (no damage of its own).
// - Numbed (342d9c4d…): "The default duration of Numbed is 2s, and the duration of each stack is calculated independently. Max
//   Numbed stacks: 10. Each stack of Numbed increases the Lightning Damage taken by an additional +5%".
// - Incisive (ef32e8ab…): "Within 5m, damage dealt increases the closer you are to the enemy, up to +20% additional Attack Damage
//   at 2m. Lasts for 3s".
// - Vendetta / Endless Vendetta (815193af… / 77747a08…), Quickness = Hasten (bd896d8a…), Elite (7f49f62b…: rare monsters and
//   bosses, so the training dummy), Effective / Excess (04750ac3… / f3601521…: the part of a value up to / above its fixed cap).
// - Game records (§4.3 table, readable recipes): Lightning Shadow 710001 (Electrify 250771 [1,3,3,10]; Feline Figure 264779
//   [10,3,0.4]; +68% additional Numbed Effect 77242344, attr 3401 add); Vendetta's Sting 720001 (the "+X% additional Attack
//   Damage for skills triggered by Vendetta" lines, the moon's 10% and Swift Stalk's 90% all write attr 5719 add, so they add in
//   one pool); Swift Stalk 19226660 (attr 3402 add = additional Incisive Duration, attr 3401 inc = Incisive Effect).
//
// Provisional readings (src/open-questions.js, Erika only):
// - Q-H10 (recommended reading): Feline Figure deals no damage. On the dummy it fires once per Electrify window (the Electrify
//   duration, 10 s; the best case resets Electrify with the Trait Skill when Skill Effect Duration would make it last longer), and
//   with Charging Equation every 1 s (its per-enemy cooldown; its own Numbed retriggers it). Each trigger inflicts the Electrify
//   stacks (held at max: movement is constant, user rule) as Numbed stacks, each lasting 2 s × (1 + Numbed Duration) (× 2 with
//   Electroplated Motif); the dummy holds at most 10. Movement Speed is held in full (user rule 2026-10-14).
// - Charging Equation's per-stack Numbed Effect reads the stacks the dummy has right after a trigger (steady state).
// - Charging Tail: Feline Figure crits at the Main Skill's crit chance (Feline Figure has no crit rating of its own); its Numbed is
//   +50% additional effect when one of its triggers in the last 10 s crit.
// - Swift as Lightning: buff stacks = min(max, Numbed stacks inflicted per second × 10 s ÷ 4) (the rate, not whole steps).
// - Q-H12 (recommended reading): Active slot 3 holds a Lv. 20 Vendetta (Endless Vendetta with Swift Stalk), the same rule as
//   Youga's Spacetime Dictator (src/trait-board-grants.js).
// - Incisive: held at 2 m (best-case switch "erikaIncisiveClose"); gained at the end of each Vendetta cast; its uptime from the
//   Vendetta cycle (src/vendetta-model.js) once the hit pass measures it, held at 1 before. Incisive Effect scales the +20% and
//   Mortal Gambit's +5% damage taken (an additional base effect).
// - Leisurely Stroll: "Vendetta has no Cooldown" while Hasten is held reaches Vendetta only (Endless Vendetta keeps its 10 s);
//   its +20% additional Attack Speed reaches every Vendetta cast (Endless Vendetta's repeats too).
// - Feline Fury: Effective Critical Strike Chance = the Main Skill's crit chance up to 100%; Excess = the part above 100%
//   (uncapped rating ÷ 100); each extra trigger is a full triggered use.
// - Vengeful Night Wraith: one Phantom per 3 Vendetta casts, each a triggered use at +30% additional (Phantom) damage, taking no
//   player time; the Phantom's cast grants no Incisive.

export const LIGHTNING_SHADOW = "erika-lightning-shadow";
export const VENDETTAS_STING = "erika-vendettas-sting";
export const NUMBED = Object.freeze({
  perStackPercent: 5,
  maxStacks: 10,
  durationSeconds: 2,
  source: "TLIDB keyword Numbed (hyperlink hover 342d9c4d)",
});
export const INCISIVE = Object.freeze({
  additionalAttackDamagePercent: 20,
  atMeters: 2,
  withinMeters: 5,
  durationSeconds: 3,
  source: "TLIDB keyword Incisive (hyperlink hover ef32e8ab)",
});
export const INCISIVE_CLOSE_CONDITION = "erikaIncisiveClose";
const HORIZON_SECONDS = 120;
const EPS = 1e-9;
const round = (value) => Math.round(value * 10000) / 10000;
export const cleanErika = (text) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .replace(/(\d) %/g, "$1%")
    .replace(/ ,/g, ",")
    .replace(/ \./g, ".")
    .trim();

export const LIGHTNING_PATTERNS = Object.freeze({
  electrify:
    /^Start moving or click a Trait Skill to gain (\d+) Electrify stack for every ([\d.]+) m of movement made within the next ([\d.]+) s, up to (\d+) stack\(s\)\. Lasts for ([\d.]+) s\.?(?: Electrify is affected by Skill Effect Duration)?$/i,
  reset: /^Click the Trait Skill again to reset the effect$/i,
  trigger:
    /^When Electrify is owned, triggers Feline Figure on up to (\d+) enemy\(ies\) within ([\d.]+) m\. Cooldown: ([\d.]+) s\. Can only be triggered once on each enemy$/i,
  perStack:
    /^For every (\d+) stack\(s\) of Electrify, Feline Figure inflicts (\d+) stack\(s\) of Numbed on enemies within the area$/i,
  additional: /^([+-]?\d+(?:\.\d+)?)% additional Numbed Effect$/i,
  moonSpeed: /^\+(\d+(?:\.\d+)?)% Movement Speed if you have inflicted Numbed recently$/i,
  maxElectrify: /^\+(\d+) to Max Electrify Stacks$/i,
  speedPerElectrify: /^\+(\d+(?:\.\d+)?)% Movement Speed for every stack of Electrify$/i,
  doubled: /^The Duration of the Numbed inflicted by Feline Figure is doubled$/i,
  wild: /^(\d+(?:\.\d+)?)% additional Numbed Effect for every \+1% Movement Speed, up to \+(\d+(?:\.\d+)?)%$/i,
  swift:
    /^For every (\d+) stack\(s\) of Numbed inflicted on the enemy, \+(\d+(?:\.\d+)?)% Movement Speed, \+?(\d+(?:\.\d+)?)% additional damage, and \+?(\d+(?:\.\d+)?)% Feline Figure Area\. Stacks up to (\d+) time\(s\)\. Lasts for ([\d.]+) s$/i,
  chargingTrigger:
    /^Feline Figure is triggered when inflicting Numbed on enemies\. Cooldown for each enemy: ([\d.]+) s$/i,
  chargingEffect:
    /^When Feline Figure inflicts Numbed, for every stack of Numbed enemies have, \+?(\d+(?:\.\d+)?)% additional Numbed Effect for Erika\. Stacks up to (\d+) time\(s\)\. This is refreshed when Feline Figure is cast again$/i,
  tailCrit: /^Feline Figure can now land Critical Strikes$/i,
  tailEffect:
    /^(?:On Critical Strike, the effect of Numbed inflicted within ([\d.]+) ?s by Feline Figure is increased by an additional|When Feline Figure lands a Critical Strike, the effect of Numbed inflicted within ([\d.]+) ?s by it is additionally increased by) (\d+(?:\.\d+)?)%$/i,
  numbedDuration: /^([+-]?\d+(?:\.\d+)?)% Numbed Duration$/i,
});

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

const traitLinesOf = (modifierTexts, heroId) =>
  modifierTexts
    .filter(
      (line) =>
        line && line.origin !== "derived" && !line.lineEffect && (line.origin === "trait" || line.origin === "memory"),
    )
    .map((line) => ({ ...line, clean: cleanErika(line.text) }));
const matchAll = (lines, pattern) =>
  lines.map((line) => ({ line, match: line.clean.match(pattern) })).filter((item) => item.match);
const first = (lines, pattern) => matchAll(lines, pattern)[0] || null;
const sumOf = (lines, pattern, group = 1) =>
  matchAll(lines, pattern).reduce((sum, item) => sum + Number(item.match[group]) * (item.line.multiplier ?? 1), 0);

/** Numbed stacks on the dummy t s after engagement: triggers at k·T, each `perTrigger` stacks lasting D, capped. */
export function felineNumbedAt(t, { intervalSeconds, durationSeconds, perTrigger, maxStacks = NUMBED.maxStacks }) {
  if (!(t >= -EPS) || !(intervalSeconds > 0) || !(perTrigger > 0)) return 0;
  const last = Math.floor(t / intervalSeconds + EPS);
  let alive = 0;
  for (let k = last; k >= 0; k--) {
    if (k * intervalSeconds + durationSeconds > t + EPS) alive += 1;
    else break;
  }
  return Math.min(maxStacks, perTrigger * alive);
}

/** The stack schedule (src/timed-effects.js "steps") and the long-run average stacks. */
export function felineNumbedSchedule({ intervalSeconds, durationSeconds, perTrigger, maxStacks = NUMBED.maxStacks }) {
  const spec = { intervalSeconds, durationSeconds, perTrigger, maxStacks };
  const edges = new Set([0]);
  for (let k = 0; k * intervalSeconds < HORIZON_SECONDS; k++) {
    edges.add(round(k * intervalSeconds));
    edges.add(round(k * intervalSeconds + durationSeconds));
  }
  const times = [...edges].filter((time) => time <= HORIZON_SECONDS).sort((a, b) => a - b);
  const points = times.map((time) => [time, felineNumbedAt(time, spec)]);
  // Steady state: one interval after every earlier trigger's stacks could have expired.
  const start = Math.ceil(durationSeconds / intervalSeconds + 1) * intervalSeconds;
  const cuts = [start, start + intervalSeconds];
  for (let k = 0; k * intervalSeconds <= start + intervalSeconds; k++)
    for (const at of [k * intervalSeconds, k * intervalSeconds + durationSeconds])
      if (at > start && at < start + intervalSeconds) cuts.push(at);
  cuts.sort((a, b) => a - b);
  let area = 0;
  for (let i = 0; i < cuts.length - 1; i++)
    if (cuts[i + 1] > cuts[i]) area += felineNumbedAt(cuts[i] + EPS * 10, spec) * (cuts[i + 1] - cuts[i]);
  const average = area / intervalSeconds;
  return { points, average, afterTrigger: felineNumbedAt(start, spec) };
}

/**
 * Lightning Shadow's state: Electrify, Feline Figure's cadence and Numbed, the Numbed Effect multipliers, Swift as Lightning.
 * @param {object} p
 * @param {string} p.heroId the selected loadout
 * @param {object[]} p.modifierTexts the build's lines
 * @param {number} p.movementSpeedPercent the character's Movement Speed total (stat sheet)
 * @param {boolean} p.otherNumbed another source keeps the dummy Numbed (the enemy-ailment model; held at 10 stacks)
 * @param {number} p.mainUsesPerSecond the Main Skill's uses per second (other Numbed sources inflict 1 stack per use)
 * @param {number|null} p.critChancePercent the Main Skill's crit chance the hit pass measured (Charging Tail), null before
 * @returns {object|null} null unless Lightning Shadow is the selected loadout and its Feline Figure line is present
 */
export function felineFigureState({
  heroId = "",
  modifierTexts = [],
  movementSpeedPercent = 0,
  otherNumbed = false,
  mainUsesPerSecond = 0,
  critChancePercent = null,
} = {}) {
  if (heroId !== LIGHTNING_SHADOW) return null;
  const lines = traitLinesOf(modifierTexts, heroId);
  const electrify = first(lines, LIGHTNING_PATTERNS.electrify);
  const trigger = first(lines, LIGHTNING_PATTERNS.trigger);
  if (!electrify && !trigger) return null;
  const P = LIGHTNING_PATTERNS;
  const baseMax = electrify ? Number(electrify.match[4]) : 3;
  const maxElectrify = baseMax + sumOf(lines, P.maxElectrify);
  const perStack = first(lines, P.perStack);
  const perTrigger = perStack
    ? Math.floor(maxElectrify / Number(perStack.match[1])) * Number(perStack.match[2])
    : maxElectrify;
  const electrifySeconds = electrify ? Number(electrify.match[5]) : 10;
  const charging = first(lines, P.chargingTrigger);
  const intervalSeconds = charging ? Number(charging.match[1]) : electrifySeconds;
  const doubled = Boolean(first(lines, P.doubled));
  const durationPercent = sumOf(lines, P.numbedDuration);
  const durationSeconds = NUMBED.durationSeconds * Math.max(0, 1 + durationPercent / 100) * (doubled ? 2 : 1);
  const active = Boolean(trigger) && perTrigger > 0;
  const schedule = active
    ? felineNumbedSchedule({ intervalSeconds, durationSeconds, perTrigger })
    : { points: [], average: 0, afterTrigger: 0 };
  const ffStacks = schedule.average;
  const totalStacks = otherNumbed ? NUMBED.maxStacks : Math.min(NUMBED.maxStacks, ffStacks);
  const ffShare = totalStacks > 0 ? Math.min(1, ffStacks / totalStacks) : 0;
  // Swift as Lightning: stacks inflicted per second (Feline Figure's, plus 1 per Main Skill use from another Numbed source).
  const inflictedPerSecond =
    (active ? perTrigger / intervalSeconds : 0) + (otherNumbed ? Math.max(0, Number(mainUsesPerSecond) || 0) : 0);
  const swiftMatch = first(lines, P.swift);
  const swift = swiftMatch
    ? (() => {
        const [, per, speed, damage, area, max, seconds] = swiftMatch.match.map(Number);
        const stacks = Math.min(max, (inflictedPerSecond * seconds) / per);
        return {
          per,
          speedPercentPerStack: speed,
          damagePercentPerStack: damage,
          areaPercentPerStack: area,
          maxStacks: max,
          seconds,
          stacks: round(stacks),
          damagePercent: round(damage * stacks),
          speedPercent: round(speed * stacks),
          source: swiftMatch.line.source,
        };
      })()
    : null;
  const inflicted = active || otherNumbed;
  // Movement Speed: the stat sheet's total plus the trait's conditional lines (held: Electrify at max, Numbed inflicted recently).
  const electrifySpeed = sumOf(lines, P.speedPerElectrify) * maxElectrify;
  const moonSpeed = inflicted ? sumOf(lines, P.moonSpeed) : 0;
  const movementSpeed = (Number(movementSpeedPercent) || 0) + electrifySpeed + moonSpeed + (swift?.speedPercent || 0);
  const additional = matchAll(lines, P.additional).map(({ line, match }) => ({
    source: line.source,
    value: Number(match[1]) * (line.multiplier ?? 1),
    text: line.clean,
  }));
  const wildMatch = first(lines, P.wild);
  const wild = wildMatch
    ? {
        perPercent: Number(wildMatch.match[1]),
        capPercent: Number(wildMatch.match[2]),
        movementSpeedPercent: round(movementSpeed),
        value: round(Math.max(0, Math.min(Number(wildMatch.match[2]), Number(wildMatch.match[1]) * movementSpeed))),
        source: wildMatch.line.source,
      }
    : null;
  const chargingMatch = first(lines, P.chargingEffect);
  const stacksAtTrigger = otherNumbed ? NUMBED.maxStacks : schedule.afterTrigger;
  const chargingEffect =
    chargingMatch && active
      ? {
          perStackPercent: Number(chargingMatch.match[1]),
          maxStacks: Number(chargingMatch.match[2]),
          stacks: Math.min(Number(chargingMatch.match[2]), stacksAtTrigger),
          value: round(Number(chargingMatch.match[1]) * Math.min(Number(chargingMatch.match[2]), stacksAtTrigger)),
          source: chargingMatch.line.source,
        }
      : null;
  const tailMatch = first(lines, P.tailEffect);
  const tail = tailMatch
    ? (() => {
        const window = Number(tailMatch.match[1] ?? tailMatch.match[2]),
          percent = Number(tailMatch.match[3]);
        const critCan = Boolean(first(lines, P.tailCrit));
        const c = critCan && critChancePercent != null ? Math.max(0, Math.min(100, critChancePercent)) / 100 : 0;
        const triggersInWindow = active ? Math.max(1, Math.ceil(window / intervalSeconds - EPS)) : 0;
        const share = active ? 1 - (1 - c) ** triggersInWindow : 0;
        return {
          windowSeconds: window,
          percent,
          critCan,
          critChancePercent: critChancePercent == null ? null : round(c * 100),
          measured: critChancePercent != null,
          triggersInWindow,
          share: round(share),
          factor: round(1 + (percent / 100) * share * ffShare),
          source: tailMatch.line.source,
        };
      })()
    : null;
  const factors = [
    ...additional.map((item) => 1 + item.value / 100),
    1 + (wild?.value || 0) / 100,
    1 + (chargingEffect?.value || 0) / 100,
    tail?.factor || 1,
  ];
  const additionalFactor = factors.reduce((product, value) => product * Math.max(0, value), 1);
  return {
    active,
    maxElectrify,
    baseMaxElectrify: baseMax,
    perTrigger,
    electrifySeconds,
    intervalSeconds,
    charging: Boolean(charging),
    doubled,
    durationPercent,
    durationSeconds: round(durationSeconds),
    stacks: round(ffStacks),
    totalStacks: round(totalStacks),
    otherNumbed: Boolean(otherNumbed),
    ffShare: round(ffShare),
    stacksAtTrigger,
    schedule,
    inflictedPerSecond: round(inflictedPerSecond),
    swift,
    movementSpeed: {
      total: round(movementSpeed),
      sheet: Number(movementSpeedPercent) || 0,
      electrify: round(electrifySpeed),
      moon: moonSpeed,
      swift: swift?.speedPercent || 0,
    },
    additional,
    wild,
    chargingEffect,
    tail,
    additionalFactor: round(additionalFactor),
  };
}

/**
 * Vendetta's Sting state before the triggers settle: the grant, Incisive, the triggered-skill pool, the Vendetta clauses.
 * @param {object} p
 * @param {string} p.heroId
 * @param {object[]} p.modifierTexts
 * @param {object} p.blessingStacks held Blessing stacks (Agility for Mortal Gambit)
 * @param {object} p.requestedConditions the best-case switches (erikaIncisiveClose)
 * @param {object|null} p.vendetta the measured Vendetta cycle (src/planner.js hitRateFacts.erika.vendetta), null before
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

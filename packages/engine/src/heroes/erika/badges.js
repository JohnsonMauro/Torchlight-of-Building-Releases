// Erika's badge modules (packages/engine/src/heroes/hero-trait-modules.js reads them): each row of the module table, the trait
// lines it reads and its badge handler, for Wind Stalker, Lightning Shadow and Vendetta's Sting.
import { cleanErika } from "./trait-lines.js";
import { LIGHTNING_PATTERNS } from "./lightning-shadow.js";
import { VENDETTA_PATTERNS, INCISIVE, INCISIVE_CLOSE_CONDITION } from "./vendettas-sting.js";

/** Erika's hero-exclusive revived lines the modules read (B5): Charging Tail and Vengeful Night Wraith. */
export function erikaRevivedLine(heroId, clean) {
  if (heroId === "erika-lightning-shadow")
    return LIGHTNING_PATTERNS.tailCrit.test(cleanErika(clean)) || LIGHTNING_PATTERNS.tailEffect.test(cleanErika(clean));
  if (heroId === "erika-vendettas-sting")
    return VENDETTA_PATTERNS.phantom.test(cleanErika(clean)) || VENDETTA_PATTERNS.phantomDamage.test(cleanErika(clean));
  return false;
}

const num = (text) => Number(String(text).replace("−", "-"));
const round = (value) => Math.round(value * 10000) / 10000;

// ---- Erika – Lightning Shadow and Vendetta's Sting (hero trait audit B5; packages/engine/src/heroes/erika/lightning-shadow.js, packages/engine/src/heroes/erika/vendettas-sting.js) ----
// `state.felineFigure` (felineFigureState) and `state.erikaVendetta` (vendettaStingState) come from packages/engine/src/planner.js; the engines
// apply them (packages/engine/src/combat-states.js Numbed, packages/engine/src/heroes/erika/vendetta-model.js triggers); these entries carry the badges and the derived lines.
const pct = (value) => Math.round(value * 10000) / 100;
function erikaLightningEntry(line, module, state, { entry, derive, neutral }) {
  const P = LIGHTNING_PATTERNS,
    text = cleanErika(line.clean);
  const ff = state.felineFigure || null;
  if (!ff) {
    entry(line, module, false, "Lightning Shadow's Feline Figure line is not in the build");
    return;
  }
  const active = ff.active;
  const numbedOn = active || ff.otherNumbed;
  const cadence = active
    ? `Feline Figure fires every ${ff.intervalSeconds} s on the dummy (${ff.charging ? "Charging Equation: its own Numbed retriggers it, 1 s per-enemy cooldown" : "once per Electrify window: the Electrify duration"}; Q-H10, provisional)`
    : "Feline Figure does not fire";
  const stacksText = `${ff.perTrigger} Numbed stack(s) per trigger, each ${ff.durationSeconds} s: ${ff.stacks} average Feline Figure stacks${ff.otherNumbed ? " (another Numbed source holds the dummy at 10)" : ""}`;
  const speedFeeds = Boolean(ff.wild);
  // Numbed only raises Lightning Damage taken: with no Lightning damage dealt, the Numbed clauses change no dummy figure.
  const lightning = !state.dealtDamageTypes || state.dealtDamageTypes.has("Lightning");
  if (!lightning && !P.reset.test(text)) {
    neutral(
      "No DPS effect",
      `the build deals no Lightning Damage, so Feline Figure's Numbed (+Lightning Damage taken) changes no dummy figure${active ? ` (${ff.stacks} average Numbed stacks held)` : ""}`,
    );
    return;
  }
  // Another Numbed source already holds the dummy at 10 stacks: Feline Figure's stack count changes the figure only through
  // Swift as Lightning's rate or Charging Tail's share (Charging Equation's per-stack bonus reads the 10 held).
  const countClause = [P.electrify, P.trigger, P.perStack, P.maxElectrify, P.doubled, P.chargingTrigger].some(
    (pattern) => pattern.test(text),
  );
  if (countClause && active && ff.otherNumbed && !ff.swift && !(ff.tail?.share > 0)) {
    neutral(
      "No DPS effect",
      `another Numbed source already holds the dummy at ${ff.totalStacks} stacks (the cap), so Feline Figure's own stacks (${ff.stacks} on average) add none, and nothing in this build reads its trigger rate`,
    );
    return;
  }
  let match;
  if (P.electrify.test(text))
    entry(
      line,
      module,
      active,
      active
        ? `Electrify held at its max, ${ff.maxElectrify} stacks (movement is constant, user rule; Skill Effect Duration does not lengthen the window: provisional): ${stacksText}`
        : "no Feline Figure trigger line",
    );
  else if (P.reset.test(text))
    neutral(
      "No DPS effect",
      "resetting Electrify with the Trait Skill: the planner holds Electrify at max and fires Feline Figure once per Electrify window",
    );
  else if (P.trigger.test(text)) entry(line, module, active, `${cadence}; Feline Figure deals no damage of its own`);
  else if (P.perStack.test(text))
    entry(
      line,
      module,
      active,
      active
        ? `${stacksText}; +5% Lightning Damage taken per stack (packages/engine/src/combat-states.js)`
        : "Feline Figure does not fire",
    );
  else if (P.additional.test(text))
    entry(
      line,
      module,
      numbedOn,
      numbedOn
        ? `multiplies Numbed's Lightning Damage taken (×${ff.additionalFactor} from every additional Numbed Effect line together)`
        : "the dummy is not Numbed",
    );
  else if ((match = text.match(P.moonSpeed))) {
    if (!numbedOn) entry(line, module, false, "no Numbed inflicted");
    else if (speedFeeds)
      entry(
        line,
        module,
        true,
        `Numbed is inflicted all the time: +${match[1]}% Movement Speed, read by Wild Lightning (Movement Speed ${ff.movementSpeed.total}%)`,
      );
    else
      neutral(
        "No DPS effect",
        "Movement Speed only: no Movement Speed reader of damage in this build (Wild Lightning not picked)",
      );
  } else if (P.maxElectrify.test(text))
    entry(
      line,
      module,
      active,
      active
        ? `Electrify ${ff.baseMaxElectrify} → ${ff.maxElectrify} stacks: ${stacksText}`
        : "Feline Figure does not fire",
    );
  else if ((match = text.match(P.speedPerElectrify))) {
    if (speedFeeds)
      entry(
        line,
        module,
        true,
        `+${match[1]}% × ${ff.maxElectrify} Electrify stacks = +${ff.movementSpeed.electrify}% Movement Speed, read by Wild Lightning`,
      );
    else
      neutral(
        "No DPS effect",
        "Movement Speed only: no Movement Speed reader of damage in this build (Wild Lightning not picked)",
      );
  } else if (P.doubled.test(text))
    entry(
      line,
      module,
      active,
      active ? `Feline Figure's Numbed lasts ${ff.durationSeconds} s: ${stacksText}` : "Feline Figure does not fire",
    );
  else if (P.wild.test(text)) {
    const wild = ff.wild;
    if (!wild) {
      entry(line, module, false, "Wild Lightning is not in this build's lines");
      return;
    }
    entry(
      line,
      module,
      numbedOn && wild.value > 0,
      !numbedOn
        ? "the dummy is not Numbed"
        : wild.value > 0
          ? `${wild.perPercent}% × ${wild.movementSpeedPercent}% Movement Speed (the stat sheet ${ff.movementSpeed.sheet}% + Electrify ${ff.movementSpeed.electrify}% + moon ${ff.movementSpeed.moon}% + Swift as Lightning ${ff.movementSpeed.swift}%, held in full: user rule) = +${wild.value}% additional Numbed Effect (cap ${wild.capPercent}%)`
          : "no Movement Speed increase",
    );
  } else if (P.swift.test(text)) {
    const swift = ff.swift;
    if (!swift) {
      entry(line, module, false, "Swift as Lightning is not in this build's lines");
      return;
    }
    const body = `+${swift.damagePercent}% additional damage`;
    entry(
      line,
      module,
      swift.stacks > 0,
      swift.stacks > 0
        ? `${ff.inflictedPerSecond} Numbed stacks inflicted per second × ${swift.seconds} s ÷ ${swift.per} = ${swift.stacks} of ${swift.maxStacks} stacks: ${body} (and +${swift.speedPercent}% Movement Speed; Feline Figure Area: no DPS effect; provisional)`
        : "no Numbed inflicted",
      swift.stacks > 0 ? [body] : [],
    );
    if (swift.stacks > 0) derive(body, line.source, `Swift as Lightning: ${swift.stacks} stacks`);
  } else if (P.chargingTrigger.test(text))
    entry(line, module, active, active ? `${cadence}: ${stacksText}` : "Feline Figure does not fire");
  else if (P.chargingEffect.test(text)) {
    const charging = ff.chargingEffect;
    entry(
      line,
      module,
      Boolean(charging),
      charging
        ? `${charging.stacks} Numbed stacks on the dummy when Feline Figure inflicts (steady state) × ${charging.perStackPercent}% = +${charging.value}% additional Numbed Effect (refreshed every trigger; provisional)`
        : active
          ? "Charging Equation is not in this build's lines"
          : "Feline Figure does not fire",
    );
  } else if (P.tailCrit.test(text) || P.tailEffect.test(text)) {
    const tail = ff.tail;
    const on = Boolean(tail && active && tail.share > 0);
    entry(
      line,
      module,
      on,
      !active
        ? "Feline Figure does not fire"
        : !tail
          ? "Charging Tail's Numbed line is not in the build"
          : !tail.measured
            ? "Feline Figure's crit chance is read from the Main Skill's once the hit pass measures it"
            : tail.share > 0
              ? `Feline Figure crits at the Main Skill's ${tail.critChancePercent}% (provisional): ${tail.triggersInWindow} trigger(s) in ${tail.windowSeconds} s, so ${pct(tail.share)}% of its Numbed is +${tail.percent}% additional effect (×${tail.factor} on the dummy's Numbed)`
              : "the Main Skill has no crit chance",
    );
  } else entry(line, { ...module, status: "Not modeled" }, false, "this Lightning Shadow clause is not read");
}

function erikaVendettaEntry(line, module, state, { entry, derive, timedEffects, neutral }) {
  const P = VENDETTA_PATTERNS,
    text = cleanErika(line.clean);
  const v = state.erikaVendetta || null;
  if (!v) {
    entry(line, module, false, "Vendetta's Sting is not the selected loadout");
    return;
  }
  const facts = v.vendetta || null;
  const inactive = Boolean(facts && facts.modeled === false);
  const noVendetta = !v.granted
    ? "the Vendetta grant line is not in the build"
    : inactive
      ? `the Vendetta trigger is inactive: ${facts.reason || "no eligible Main Skill"}`
      : "";
  const incisive = v.incisive;
  const pending = facts ? "" : " (held at 1 before the hit pass measures the Vendetta cycle)";
  let match;
  if (P.incisiveGain.test(text)) {
    if (!incisive || noVendetta) {
      entry(line, module, false, noVendetta || "no Incisive");
      return;
    }
    const on = incisive.close;
    const value = Math.round(incisive.damagePercent * incisive.uptime * 10000) / 10000;
    const body = `+${value}% additional Attack Damage`;
    timedEffects.push({
      id: INCISIVE_CLOSE_CONDITION,
      label: "Incisive: within 2 m of the dummy",
      source: line.source,
      target: "self",
      toggle: true,
      provisional: true,
      enabled: on,
      active: on,
      summary: `you stand at 2 m from the dummy, so Incisive gives its full +${INCISIVE.additionalAttackDamagePercent}% additional Attack Damage (× Incisive Effect)`,
      reason: on ? "best-case assumption" : "beyond 5 m: Incisive gives nothing",
      parts: [],
    });
    entry(
      line,
      module,
      on && value > 0,
      on
        ? `Incisive: +${INCISIVE.additionalAttackDamagePercent}% × (1 + ${incisive.effectPercent}% Incisive Effect) = +${incisive.damagePercent}% additional Attack Damage at 2 m (best-case switch), up ${pct(incisive.uptime)}% of the time (${incisive.durationSeconds} s after each Vendetta cast${pending}) = ${body} (provisional)`
        : "switched off: you stand beyond 5 m, so Incisive gives nothing",
      on && value > 0 ? [body] : [],
    );
    if (on && value > 0) derive(body, line.source, `Incisive: ${pct(incisive.uptime)}% uptime`);
  } else if (P.areaShare.test(text)) neutral("No DPS effect", "Vendetta's area: the dummy is within its range");
  else if (P.triggered.test(text) || P.moon.test(text))
    entry(
      line,
      module,
      !noVendetta,
      noVendetta ||
        `in the triggered-skill pool of every Vendetta-triggered use (one additional pool with the other such lines: the game records add them; provisional)${P.moon.test(text) ? "; the Skill Area part has no DPS effect" : ""}`,
    );
  else if (P.grant.test(text))
    entry(
      line,
      module,
      Boolean(v.granted) && !inactive,
      inactive
        ? noVendetta
        : `applied: Active slot 3 holds a Lv. 20 ${v.skill} (Q-H12 recommended reading, provisional); the skill placed there is left out of the calculation`,
    );
  else if (P.endless.test(text))
    entry(
      line,
      module,
      Boolean(v.granted) && !inactive,
      inactive ? noVendetta : "applied: the granted Vendetta is Endless Vendetta (30 repeats, 10 s cooldown)",
    );
  else if (P.hasten.test(text)) {
    const hasten = Boolean(state.buffs?.hasHasten);
    entry(
      line,
      module,
      hasten && !noVendetta,
      noVendetta ||
        (hasten
          ? `Hasten is held: ${v.skill === "Vendetta" ? "Vendetta has no cooldown" : "Endless Vendetta keeps its cooldown (the line names Vendetta; provisional)"} and its casts gain +${v.hasten?.attackSpeedPercent || 0}% additional Attack Speed`
          : "no Hasten source"),
    );
  } else if (P.manualPenalty.test(text))
    entry(
      line,
      module,
      Boolean(incisive) && !noVendetta,
      noVendetta ||
        `the manual Main Skill time under Incisive takes -${v.manualPenaltyPercent}% additional damage (taken off the Vendetta net gain, packages/engine/src/heroes/erika/vendetta-model.js; provisional)`,
    );
  else if (P.noActivationMedium.test(text)) {
    const blocked = state.erikaActivationMediumBlocked || [];
    entry(
      line,
      module,
      blocked.length > 0,
      blocked.length
        ? `switched off on the Main Skill: ${blocked.join(", ")}`
        : "the Main Skill has no Activation Medium support",
    );
  } else if (P.elites.test(text))
    entry(
      line,
      module,
      v.endless && !noVendetta,
      noVendetta ||
        (v.endless
          ? `the dummy is a Boss (an Elite): +${v.elitesPercent}% in the triggered-skill pool while Endless Vendetta is active`
          : "Endless Vendetta is not active"),
    );
  else if (P.incisiveDuration.test(text))
    entry(
      line,
      module,
      Boolean(incisive?.close) && !noVendetta,
      noVendetta ||
        (incisive?.close
          ? `Incisive lasts ${incisive.durationSeconds} s, Incisive Effect +${incisive.effectPercent}%`
          : "Incisive is switched off (beyond 5 m)"),
    );
  else if (P.extraTrigger.test(text)) {
    const effective = facts?.critEffectivePercent;
    entry(
      line,
      module,
      !noVendetta && effective !== 0,
      noVendetta ||
        (effective === 0
          ? "the Main Skill has no crit chance"
          : "Vendetta's extra Main Skill triggers from the Main Skill's Effective Critical Strike Chance (packages/engine/src/heroes/erika/vendetta-model.js; whole steps)"),
    );
  } else if (P.excess.test(text)) {
    const raw = facts?.critRawPercent;
    const excess = raw != null && raw > 100;
    entry(
      line,
      module,
      !noVendetta && (raw == null || excess),
      noVendetta ||
        (raw == null
          ? "read on the Vendetta triggers from the Main Skill's uncapped crit chance"
          : excess
            ? `${Math.round((raw - 100) * 100) / 100}% Excess Critical Strike Chance: an expected bonus in the triggered-skill pool`
            : `no Excess Critical Strike Chance (${Math.round(raw * 100) / 100}%)`),
    );
  } else if (P.mortalTaken.test(text)) {
    const value = incisive ? Math.round(incisive.takenPercent * incisive.uptime * 10000) / 10000 : 0;
    const body = `+${value}% additional damage taken`;
    entry(
      line,
      module,
      value > 0 && !noVendetta,
      noVendetta ||
        (!incisive?.close
          ? "Incisive is switched off (beyond 5 m)"
          : `+5% × (1 + ${incisive.effectPercent}% Incisive Effect) = +${incisive.takenPercent}% at 2 m while Incisive is up (${pct(incisive.uptime)}%${pending}): ${body} (provisional)`),
      value > 0 && !noVendetta ? [body] : [],
    );
    if (value > 0 && !noVendetta) derive(body, line.source, `Mortal Gambit: Incisive ${pct(incisive.uptime)}% uptime`);
  } else if ((match = text.match(P.mortalEffect))) {
    const stacks = incisive?.mortalStacks || 0;
    entry(
      line,
      module,
      stacks > 0 && Boolean(incisive?.close) && !noVendetta,
      noVendetta ||
        (stacks > 0
          ? `${stacks} Agility Blessing stack(s) × ${match[1]}% = +${stacks * Number(match[1])}% Incisive Effect`
          : "no Agility Blessing stacks"),
    );
  } else if (P.phantom.test(text) || P.phantomDamage.test(text))
    entry(
      line,
      module,
      !noVendetta,
      noVendetta ||
        "a Phantom Vendetta per 3 casts: a triggered use at +30% additional Phantom Damage, no player time (packages/engine/src/heroes/erika/vendetta-model.js; provisional)",
    );
  else entry(line, { ...module, status: "Not modeled" }, false, "this Vendetta's Sting clause is not read");
}

// Erika (Wind Stalker): packages/engine/src/heroes/erika/wind-stalker.js settles these against the build's multistriking hits (state.windStalker:
// windStalkerState before the hits, resolveWindStalker after them).
export function stalkerBadge(line, module, ctx) {
  const { state, entry, derive, neutral } = ctx;
  let match;
  const ws = state.windStalker || null;
  const text = line.clean.replace(/ ,/g, ",");
  const multistrikes = Boolean(ws?.multistrikes || ws?.eventsPerSecond > 0);
  const maxStacks =
    ws?.maxStacks ?? (ws ? ws.stalker.initialMaxStacks + (multistrikes ? ws.stalker.maxStackBonus : 0) : 3);
  const held = ws?.held ?? (ws?.stalker?.sustained ? maxStacks : 0);
  const noMultistrike = "no active Attack skill Multistrikes";
  const unmodeled = (why) => entry(line, { ...module, status: "Not modeled" }, false, why);
  if (/^Gains \d+ stacks? of Stalker for every [\d.]+ m of movement$/i.test(text)) {
    const moving = Boolean(ws?.moving);
    entry(
      line,
      module,
      moving && held > 0,
      moving
        ? held > 0
          ? `moving (Movement group): Stalker held at ${held} stacks from movement`
          : noMultistrike
        : `standing still (the Movement group's choice): no Stalker from movement${held > 0 ? `; Stalker comes from Max Multistrike Count events (${held} stacks held)` : ""}`,
    );
  } else if (/^Your Multistrike Count will not be interrupted during Stalker$/i.test(text)) {
    neutral(
      line,
      module,
      "No DPS effect",
      `moving or using other skills interrupts Multistrike (game manual 1001020121); the planner never interrupts it on the dummy, so this has no DPS effect`,
    );
  } else if (/^At Max Multistrike Count, \+\d+ to Max Stalker Stacks, up to \+\d+, until Stalker ends$/i.test(text)) {
    entry(
      line,
      module,
      multistrikes && held > 0,
      multistrikes && held > 0
        ? `Max Multistrike Count events keep raising the max: ${maxStacks} Stalker stacks (3 + ${maxStacks - 3}); ${held} held`
        : !multistrikes
          ? noMultistrike
          : "no Stalker on the dummy",
    );
  } else if (/^At Max Multistrike Count, gains \d+ stacks? of Stalker$/i.test(text)) {
    entry(
      line,
      module,
      multistrikes,
      multistrikes
        ? `1 Stalker stack per Max Multistrike Count event (one per Multistrike sequence${ws?.gainPerSecond ? `, ${round(ws.gainPerSecond)}/s` : ""}); ${held} of ${maxStacks} held (4 s each; provisional)`
        : noMultistrike,
    );
  } else if (
    (match = text.match(/^\+(\d+) to the initial Multistrike Count for every (\d+) stack\(s\) of Stalker$/i))
  ) {
    const bonus = Math.floor(held / num(match[2])) * num(match[1]);
    entry(
      line,
      module,
      multistrikes && bonus > 0,
      multistrikes && bonus > 0
        ? `+${bonus} initial Multistrike Count at ${held} Stalker stacks: every count of the sequence shifts by ${bonus} (provisional reading; packages/engine/src/skills/skill-hit-model.js multistrikeSequence)`
        : !multistrikes
          ? noMultistrike
          : `${held} Stalker stacks: below ${match[2]}`,
    );
  } else if (/Multistrike damage increment for [\d.]+ s when the Max Multistrike Count is reached$/i.test(text)) {
    const held4 = ws?.scratchHeld ?? multistrikes;
    entry(
      line,
      module,
      Boolean(held4),
      held4
        ? "held: Max Multistrike Count events come within its 4 s (manual 1001020126: the increment × (1 + X%))"
        : noMultistrike,
    );
  } else if (/^While Stalker is active, marks all enemies within/i.test(text)) {
    // Artificial Moon (2026-10-14; packages/engine/src/heroes/erika/wind-stalker.js windStalkerMoonMark → packages/engine/src/combat/mark-effect.js). The line only arrives
    // when the Artificial Moon gate passes (packages/engine/src/heroes/hero-memory-rules.js artificialMoonGate).
    const moon = ws?.moonMark;
    entry(
      line,
      module,
      Boolean(moon?.active),
      moon?.active
        ? `Stalker is held, so the dummy (within ${moon.meters} m, best case) is Marked: +10% additional Critical Strike Damage taken × (1 + Mark Effect, this line's +${moon.effectPercent}% included) on the crit share of hits (packages/engine/src/combat/mark-effect.js; provisional)`
        : !multistrikes && !ws?.moving
          ? noMultistrike
          : "Stalker is not held on the dummy (standing still with no Stalker gain at Max Multistrike Count)",
    );
  } else if (/^During Multistrike, there is a/i.test(text)) {
    const dive = ws?.catDive;
    const chance = dive?.chancePercent || 0;
    if (!dive) unmodeled("this Cat Dive wording is not read");
    else
      entry(
        line,
        module,
        multistrikes && chance > 0,
        multistrikes && chance > 0
          ? `${dive.perPercent}% × ${round(dive.movementSpeedPercent)}% Movement Speed = ${round(chance)}% chance per repeated attack to deal the Max Multistrike Count attack's damage increment instead of its own (Movement Speed held in full, user rule; reading user-confirmed 2026-10-14; provisional; packages/engine/src/skills/skill-hit-model.js multistrikeSequence)`
          : !multistrikes
            ? noMultistrike
            : "no Movement Speed increase, so no chance",
      );
  } else if (/of the increase\/decrease on Movement Speed is also applied to additional Attack Damage/i.test(text)) {
    const interest = ws?.interest;
    if (!interest) unmodeled("this Interest wording is not read");
    else {
      const body = `${interest.valuePercent >= 0 ? "+" : ""}${round(interest.valuePercent)}% additional Attack Damage`;
      const active = interest.valuePercent !== 0;
      entry(
        line,
        module,
        active,
        active
          ? `${interest.sharePercent}% × ${round(interest.movementSpeedPercent)}% Movement Speed = ${round(interest.rawPercent)}%${interest.capped ? `, capped at +${interest.capPercent}%` : ""} (the build's Movement Speed total, held in full: movement is constant, user rule 2026-10-14)`
          : "no Movement Speed increase",
        active ? [body] : [],
      );
      if (active) derive(body, line.source, "Interest: Movement Speed share");
    }
  } else unmodeled("this Stalker clause is not read");
}

export function lightningShadowBadge(line, module, ctx) {
  const { state, entry, derive, neutral } = ctx;
  erikaLightningEntry(line, module, state, {
    entry,
    derive,
    neutral: (status, why) => neutral(line, module, status, why),
  });
}

export function vendettaStingBadge(line, module, ctx) {
  const { state, entries, timedEffects, entry, derive, neutral } = ctx;
  erikaVendettaEntry(line, module, state, {
    entry,
    derive,
    timedEffects,
    entries,
    neutral: (status, why) => neutral(line, module, status, why),
  });
}

export const ERIKA_MODULES = Object.freeze([
  // Erika (Wind Stalker) batch 2026-10-14 (packages/engine/src/heroes/erika/wind-stalker.js applies the defined clauses through the Multistrike
  // sequence of packages/engine/src/skills/skill-hit-model.js; these entries carry the badges, from state.windStalker).
  {
    key: "stalker",
    heroes: /^erika-wind-stalker$/,
    label: "Erika: Stalker",
    status: "Provisional",
    rule: "TLIDB keyword Stalker: \"+13% additional damage during Multistrike for every stack of Stalker. Initial max stacks: 3. Lasts for 4s\". Stacks held = min(max stacks, gains per second × 4 s): gains from movement (Moving) or 1 per Max Multistrike Count event (Cat's Punches); Cat's Vision raises the max by 1 per event, up to +3; Cat's Punches adds +1 initial Multistrike Count per 3 stacks. Provisional: \"during Multistrike\" = the repeated attacks; the initial count shifts every count of the sequence (packages/engine/src/skills/skill-hit-model.js multistrikeSequence); Cat's Scratch's increment is held while events come within 4 s. 2026-10-14: Interest (share × the build's Movement Speed, capped, as additional Attack Damage), Cat Dive (per-level value × Movement Speed % chance per repeated attack to take the Max Multistrike Count attack's increment; user-confirmed reading, provisional) and Artificial Moon's Mark (+30% Mark Effect while Stalker is held) are read; Movement Speed is held in full (movement is constant, user rule).",
    lines:
      /Stalker|Multistrike damage increment for [\d.]+ s when the Max Multistrike Count|^During Multistrike ?, there is a|of the increase\/decrease on Movement Speed is also applied to additional Attack Damage/i,
    badge: stalkerBadge,
  },
  // Erika – Lightning Shadow and Vendetta's Sting (hero trait audit B5, 2026-10-19; packages/engine/src/heroes/erika/lightning-shadow.js, packages/engine/src/heroes/erika/vendettas-sting.js settles the states,
  // packages/engine/src/combat-states.js applies Feline Figure's Numbed, packages/engine/src/heroes/erika/vendetta-model.js the Vendetta clauses; these entries carry the badges).
  {
    key: "lightningShadow",
    heroes: /^erika-lightning-shadow$/,
    label: "Erika: Feline Figure",
    status: "Provisional",
    rule: "Q-H10 recommended reading (provisional): Electrify is held at its max stacks (movement is constant, user rule); Feline Figure deals no damage and fires on the dummy once per Electrify window (10 s), or every 1 s with Charging Equation; each trigger inflicts Numbed stacks equal to the Electrify stacks, each lasting 2 s × (1 + Numbed Duration) (× 2 with Electroplated Motif), at most 10 on the dummy. The \"additional Numbed Effect\" lines (the base trait, Electroplated Motif, Wild Lightning from the Movement Speed total held in full, Charging Equation per stack the dummy has) multiply Numbed's Lightning Damage taken; Swift as Lightning's stacks follow the Numbed stacks inflicted per second; Charging Tail's crit uses the Main Skill's crit chance.",
    lines: {
      test: (text) =>
        Object.values(LIGHTNING_PATTERNS).some(
          (pattern) => pattern !== LIGHTNING_PATTERNS.numbedDuration && pattern.test(cleanErika(text)),
        ),
    },
    badge: lightningShadowBadge,
  },
  {
    key: "vendettaSting",
    heroes: /^erika-vendettas-sting$/,
    label: "Erika: Vendetta's Sting",
    status: "Provisional",
    rule: "Q-H12 recommended reading (provisional): Active slot 3 holds a Lv. 20 Vendetta (Endless Vendetta with Swift Stalk; packages/engine/src/heroes/trait-board-grants.js), the replaced skill kept and left out. Incisive (TLIDB: up to +20% additional Attack Damage at 2 m, 3 s) is gained after each Vendetta cast, held at 2 m (best-case switch), scaled by Incisive Effect, its uptime from the Vendetta cycle; the triggered-skill lines add in one pool on every triggered use (packages/engine/src/heroes/erika/vendetta-model.js); Leisurely Stroll's -80% reaches the manual Main Skill time under Incisive.",
    lines: { test: (text) => Object.values(VENDETTA_PATTERNS).some((pattern) => pattern.test(cleanErika(text))) },
    badge: vendettaStingBadge,
  },
]);

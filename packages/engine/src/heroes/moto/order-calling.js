// Moto – Order Calling (hero trait audit batch B6, 2026-10-19; research/hero-traits-audit-2026-10-19.md §5 B6, §8 B6, §6 Q-H8):
// Overload on the Minions. Pure; packages/engine/src/heroes/minion-heroes.js dispatches to it, packages/engine/src/minions/minion-damage-model.js applies
// the layers.
//
// Provisional reading (src/app/stats/open-questions.js, shown only for the hero):
// - Q-H8 (recommended): Overload held at uptime 1 while a Summon Skill is recast within every 12 s (best-case switch
//   "motoOverload"); its duration lines change no dummy figure. All In's first-gain bonus is held (each recast summons fresh Minions
//   that gain Overload for the first time). Machine's Joy: 30 stacks with own buffs built (Minion hits, no Trait Skill cast).

import { TROOPS, TROOP_FAMILIES, firstOf, matchesOf, round, sumOf } from "../minion-hero-lines.js";

export const ORDER_CALLING = "moto-order-calling";
export const OVERLOAD_CONDITION = "motoOverload";

export const ORDER_PATTERNS = Object.freeze({
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
});
const KEYS = Object.keys(ORDER_PATTERNS);
// Machine's Joy (revived).
const REVIVED_KEYS = ["machineJoy"];

/** Order Calling's Overload state, or null without an Overload source. */
function state(lines, { requestedConditions, prebuilt, hasMinion, command, empower }) {
  const M = ORDER_PATTERNS;
  const grant = firstOf(lines, M.overloadGrant);
  const program = firstOf(lines, M.programGain);
  if (!grant && !program) return null;
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
  const overload = {
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
  overload.appliesTo = (family) =>
    (overload.held && hasMinion) || (Boolean(overload.programSeconds) && TROOP_FAMILIES.includes(family));
  overload.layersAt = (joyStacks) => {
    const value = basePercent * factorAt(joyStacks);
    const label = `Overload (Order Calling: +${basePercent}% × ${round(factorAt(joyStacks))} Overload Effect${overload.held ? "; held, Q-H8" : "; Overload Program"})`;
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
      ...(overload.minionDamagePercent
        ? [
            {
              kind: "additional",
              value: overload.minionDamagePercent,
              source: "Order Calling (Minions have Overload)",
              text: `+${overload.minionDamagePercent}% additional Minion Damage (Minions have Overload)`,
            },
          ]
        : []),
      ...(overload.selfReconstructPercent
        ? [
            {
              kind: "additional",
              value: overload.selfReconstructPercent,
              source: "Self-Reconstruct (Overload, not at Low Life: the dummy never attacks)",
              text: `+${overload.selfReconstructPercent}% additional Minion Damage (Overload, not at Low Life)`,
            },
          ]
        : []),
      ...(overload.speedPercent
        ? [
            {
              kind: "speed",
              value: overload.speedPercent,
              additional: false,
              attack: true,
              cast: true,
              source: "Veteran (Minions with Overload)",
              text: `+${overload.speedPercent}% Minion Attack and Cast Speed (Overload)`,
            },
          ]
        : []),
    ];
  };
  return overload;
}

const sumAllIn = (o) =>
  round(o.additional.filter((item) => /All In/.test(item.label)).reduce((sum, item) => sum + item.value, 0));

/** The badge of one Order Calling clause, from the settled state and the Minions' results. */
function lineStatus(key, state, { modeled, list, pending, inCalc, inactive, neutral }) {
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

/** The best-case switch of Order Calling. */
function switches(state) {
  return state.overload?.grant
    ? [
        {
          id: OVERLOAD_CONDITION,
          label: "Overload held (a Summon Skill recast within every 12 s)",
          enabled: state.overload.held,
          active: state.overload.held && state.hasMinion,
          summary: "every Minion holds Overload (Q-H8, provisional)",
          reason: state.hasMinion ? "best-case assumption: Order Calling's Overload never lapses" : "no modeled Minion",
        },
      ]
    : [];
}

export const orderCalling = Object.freeze({
  id: ORDER_CALLING,
  slot: "overload",
  patterns: ORDER_PATTERNS,
  keys: KEYS,
  revivedKeys: REVIVED_KEYS,
  state,
  lineStatus,
  switches,
});

// Thea – Blasphemer (hero trait audit batch B7, 2026-10-19): Desecration on the dummy, Sacrificial Pawn, Mountain of Sins, Inverted
// Shrine. The provisional readings are listed in packages/engine/src/heroes/thea/traits.js.

import {
  KEYWORDS,
  THEA_PATTERNS,
  HORIZON_SECONDS,
  EPS,
  round,
  firstOf,
  stepsFrom,
  cycleRead,
  inCalc,
  inactive,
  neutral,
  notOnDummy,
  notModeled,
  CYCLE,
} from "./trait-lines.js";

/** Desecration stacks on the clean dummy t s after engagement: ⌈max ÷ 3⌉ per application, every `interval` s from t = 0. */
export function desecrationStacksAt(
  t,
  { maxStacks, perApplication, intervalSeconds, durationSeconds = KEYWORDS.desecration.durationSeconds },
) {
  if (!(t >= -EPS) || !(maxStacks > 0) || !(intervalSeconds > 0)) return 0;
  // A gap longer than the duration lets every stack expire (no refresh in time): only the last application's stacks remain.
  if (intervalSeconds > durationSeconds + EPS)
    return t % intervalSeconds < durationSeconds - EPS ? Math.min(maxStacks, perApplication) : 0;
  return Math.min(maxStacks, perApplication * (1 + Math.floor(t / intervalSeconds + EPS)));
}

export function blasphemerState(lines, state, facts) {
  const P = THEA_PATTERNS;
  const click = firstOf(lines, P.desecrationClick),
    trigger = firstOf(lines, P.desecrationTrigger);
  const invert = state.thea?.invert || null;
  const maxStacks = invert ? invert.desecrationMax : KEYWORDS.desecration.initialMax;
  const perApplication = Math.ceil(maxStacks / 3 - EPS);
  // Applications: every Blessing gain (one every 2 s while any Blessing type can hold a stack), or the 5 s cooldown when pressed.
  const gains = state.cycle && Boolean(trigger) && CYCLE.order.some((name) => state.blessings[name].maxStacks > 0);
  const cooldownSeconds = click ? Number(click.match[2]) : 5;
  const intervalSeconds = gains ? CYCLE.intervalSeconds : click && state.traitPressed ? cooldownSeconds : null;
  const active = Boolean(click) && intervalSeconds !== null && state.anyDamage && maxStacks > 0;
  const spec = { maxStacks, perApplication, intervalSeconds: intervalSeconds || 0 };
  const stacks = active
    ? intervalSeconds > KEYWORDS.desecration.durationSeconds + EPS
      ? (Math.min(maxStacks, perApplication) * KEYWORDS.desecration.durationSeconds) / intervalSeconds
      : maxStacks
    : 0;
  const factorAt = (n) => (1 + KEYWORDS.desecration.perStackPercent / 100) ** n;
  const takenPercent = active ? round((factorAt(stacks) - 1) * 100) : 0;
  const times = [];
  if (active)
    for (let t = 0; t < HORIZON_SECONDS; t += intervalSeconds) {
      times.push(round(t));
      times.push(round(t + KEYWORDS.desecration.durationSeconds));
    }
  const fullPercent = (factorAt(maxStacks) - 1) * 100;
  // The windows: the multiplicative stack factor as a share of the full-stack factor (level 1 = max stacks held).
  const schedule = active
    ? {
        kind: "steps",
        points: stepsFrom(
          (t) => (fullPercent > 0 ? ((factorAt(desecrationStacksAt(t, spec)) - 1) * 100) / fullPercent : 0),
          times,
        ),
        sustained: fullPercent > 0 ? round(takenPercent / fullPercent) : 0,
      }
    : null;
  const pawnLine = firstOf(lines, P.pawn);
  const pawn = Boolean(pawnLine) && active;
  const crowdControl = [...new Set([...(facts.enemyCrowdControl || []), ...(pawn ? ["Sacrificial Pawn"] : [])])];
  const mountainLine = firstOf(lines, P.onsetMountain);
  const mountain = Boolean(mountainLine) && active && crowdControl.length > 0;
  const sageLine = firstOf(lines, P.sageSpeed);
  const shrineSelf = Boolean(firstOf(lines, P.shrineSelf)) && active;
  const shrineLine = firstOf(lines, P.shrineDamage);
  return {
    click: Boolean(click),
    trigger: Boolean(trigger),
    gains,
    intervalSeconds,
    cooldownSeconds,
    active,
    maxStacks,
    perApplication,
    stacks: round(stacks),
    takenPercent,
    fullPercent: round(fullPercent),
    schedule,
    invert,
    extreme: invert?.extremeCap != null,
    pawn,
    pawnPercent: pawn ? KEYWORDS.sacrificialPawn.erosionTakenPercent : 0,
    crowdControl,
    mountainLine: Boolean(mountainLine),
    mountain,
    mountainPercent: mountain ? KEYWORDS.mountainOfSins.erosionResistancePercent : 0,
    sage: sageLine ? { percent: Number(sageLine.match[1]), active } : null,
    shrine: shrineLine
      ? { percent: Number(shrineLine.match[1]), active: shrineSelf, self: Boolean(firstOf(lines, P.shrineSelf)) }
      : null,
  };
}

/**
 * Mountain of Sins once the crowd control on the dummy is known (packages/engine/src/combat-states.js `crowdControl`, which includes Sacrificial
 * Pawn): a copy of the state with the Blasphemer's crowd control settled. Other loadouts are returned as they are.
 */
export function settleTheaCrowdControl(state, crowdControl = null) {
  const b = state?.blasphemer;
  if (!b || !Array.isArray(crowdControl)) return state;
  const list = [...new Set([...crowdControl, ...(b.pawn ? ["Sacrificial Pawn"] : [])])];
  const mountain = b.active && b.mountainLine && list.length > 0;
  return {
    ...state,
    blasphemer: {
      ...b,
      crowdControl: list,
      mountain,
      mountainPercent: mountain ? KEYWORDS.mountainOfSins.erosionResistancePercent : 0,
    },
  };
}

export function blasphemerRead(key, text, state) {
  const b = state.blasphemer;
  const off = !b.click
    ? "Desecration's line is not in the build"
    : !state.anyDamage
      ? "the build deals no modeled damage"
      : b.maxStacks <= 0
        ? "no Max Desecration Stacks"
        : "Desecration is never inflicted (no Blessing gain triggers it and the Trait Skill switch is off)";
  const noErosion = "the build deals no Erosion Damage, so this Erosion bonus changes no dummy figure";
  const cadence = b.active
    ? `Desecration every ${b.intervalSeconds} s (${b.gains ? "each Blessing gain triggers the Trait Skill" : "pressed on its cooldown"}), ${b.perApplication} of ${b.maxStacks} stacks per application, each refreshing the shared 5 s duration: ${round(b.stacks)} stacks held (provisional)`
    : "";
  switch (key) {
    case "cycle":
      return cycleRead(state);
    case "desecrationClick": {
      if (!b.active) return inactive(off);
      if (!state.dealsErosion) return neutral(`${cadence}; ${noErosion}`);
      const body = `+${b.takenPercent}% additional Erosion Damage taken`;
      return inCalc(
        `${cadence}: (1 + 15%)^${round(b.stacks)} = ${body} on the dummy (TLIDB keyword Desecration; the dummy starts clean)`,
        {
          bodies: [body],
          timed: [
            {
              id: "theaDesecration",
              label: "Desecration on the dummy",
              target: "enemy",
              toggle: false,
              enabled: true,
              active: true,
              parts: [{ type: "Erosion", reach: "all", percent: b.fullPercent, schedule: b.schedule }],
            },
          ],
        },
      );
    }
    case "desecrationConvert": {
      const inv = b.invert;
      if (!inv) return inactive("Blasphemer's conversion line is not in the build");
      const converted = inv.perType.filter((item) => item.converted > 0);
      return converted.length
        ? inCalc(
            `${converted.map((item) => `${item.name} +${item.increases} → max ${item.max}`).join(", ")}: Max Desecration Stacks ${b.maxStacks}`,
          )
        : neutral(`no increase to Max Blessing Stacks in the build: Desecration keeps its ${b.maxStacks} max stacks`);
    }
    case "desecrationTrigger":
      return b.active && b.gains
        ? inCalc(`a Blessing gain every 2 s triggers the Trait Skill (its 0.3 s interval allows it): ${cadence}`)
        : inactive(!b.gains ? "no Blessing can be gained (every Blessing's max is 0)" : off);
    case "elitesOnly":
      return neutral("the training dummy is a Boss, an Elite: Desecration affects it");
    case "pawn": {
      if (!b.pawn) return inactive(off);
      if (!state.dealsErosion) return neutral(`the dummy gains Sacrificial Pawn (a crowd control type); ${noErosion}`);
      const body = `+${b.pawnPercent}% additional Erosion Damage taken`;
      return inCalc(
        `the dummy is the only enemy: Desecrated, it gains Sacrificial Pawn: ${body}, a crowd control type on the dummy (TLIDB keyword)`,
        { bodies: [body] },
      );
    }
    case "spread":
      return notOnDummy("other Elites near the dummy");
    case "sageSpeed": {
      if (!b.active) return inactive(off);
      const body = `+${b.sage.percent}% Attack and Cast Speed`;
      return inCalc(`you damage the Desecrated dummy continuously (5 s, refreshed): ${body}`, { bodies: [body] });
    }
    case "onsetTrue":
      return notOnDummy(
        "once per Elite on its first Desecration (the dummy's Max Life is not modeled): not a sustained figure",
      );
    case "onsetMountain": {
      if (!b.active) return inactive(off);
      if (!b.mountain)
        return inactive(
          "the Desecrated dummy is under no crowd control effect (Sacrificial Pawn, Frostbite, Freeze, Paralysis, …)",
        );
      if (!state.dealsErosion) return neutral(`Mountain of Sins on the dummy; ${noErosion}`);
      const body = `+${b.mountainPercent}% Erosion Penetration`;
      return inCalc(
        `the Desecrated dummy is under crowd control (${b.crowdControl.join(", ")}): Mountain of Sins, -${b.mountainPercent}% Erosion Resistance, applied as ${body} (the planner treats a resistance reduction like penetration; provisional)`,
        { bodies: [body] },
      );
    }
    case "extremeCap": {
      if (!b.extreme) return inactive("not in the build");
      return b.invert?.extremeExtra > 0
        ? inCalc(
            `every Blessing's max is 0: the further increases (+${b.invert.extremeExtra}) also raise Max Desecration Stacks, up to ${b.invert.extremeCap}: ${b.maxStacks}`,
          )
        : inactive(
            b.invert?.allZero ? "no further increase to Max Blessing Stacks" : "not every Blessing's max stacks are 0",
          );
    }
    case "extremeLife":
      return inactive("the dummy never loses Life (Q-H9: 0% Life lost)");
    case "shrineSelf":
      return b.active
        ? b.shrine && state.dealsErosion
          ? inCalc(
              "you Desecrate yourself with each application: held while you Desecrate the dummy (read by the +50% line)",
            )
          : neutral("self Desecration only raises your Erosion Damage taken")
        : inactive(off);
    case "shrineDamage": {
      if (!b.shrine?.active)
        return inactive(!b.active ? off : "Inverted Shrine's self Desecration line is not in the build");
      if (!state.dealsErosion) return neutral(noErosion);
      const body = `+${b.shrine.percent}% additional Erosion Damage`;
      return inCalc(`you have Desecration while you Desecrate the dummy: ${body}`, { bodies: [body] });
    }
    default:
      return notModeled("this Blasphemer clause is not read");
  }
}

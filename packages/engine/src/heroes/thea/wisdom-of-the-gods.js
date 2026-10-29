// Thea – Wisdom of The Gods (hero trait audit batch B7, 2026-10-19; §6 Q-H3): God's Boon's cadence, the Focus it consumes and its
// buffs, The Place of Oracle. The provisional readings are listed in packages/engine/src/heroes/thea/traits.js.

import {
  HORIZON_SECONDS,
  EPS,
  KEYWORDS,
  THEA_PATTERNS,
  round,
  pct,
  matchesOf,
  firstOf,
  stepsFrom,
  cycleRead,
  inCalc,
  inactive,
  neutral,
  notModeled,
  cleanThea,
} from "./trait-lines.js";
import { classifyDoubleDamageLine } from "../../combat/double-damage.js";

/** Focus stacks after a God's Boon at b: 0 for 6 s, then +1 per 6 s up to max, held at max until the next God's Boon. */
export function focusAfterBoon(sinceBoon, { maxStacks, periodSeconds, refillSeconds = 6 }) {
  if (!(maxStacks > 0)) return 0;
  const s = ((sinceBoon % periodSeconds) + periodSeconds) % periodSeconds;
  return Math.min(maxStacks, Math.floor(s / refillSeconds + EPS));
}

/**
 * God's Boon's cadence and the Focus it consumes (Q-H3).
 * @param {object} p
 * @param {number} p.maxFocus Focus Blessing's max stacks
 * @param {number} p.cooldownSeconds God's Boon's cooldown after its Cooldown Recovery Speed
 * @param {boolean} p.instantRefill another Focus gain source holds Focus at max
 * @param {boolean} p.prebuilt own buffs built before engaging
 * @param {number} p.buffSeconds the God's Boon buffs' duration
 */
export function godsBoonCycle({
  maxFocus,
  cooldownSeconds,
  instantRefill = false,
  prebuilt = true,
  buffSeconds = KEYWORDS.godsBoon.buffSeconds,
  perStackSeconds = 6,
} = {}) {
  const F = Math.max(0, Math.floor(maxFocus || 0));
  if (!F) return null;
  const refillSeconds = instantRefill ? 0 : perStackSeconds * F;
  const periodSeconds = Math.max(cooldownSeconds, refillSeconds, EPS);
  const averageFocus = instantRefill
    ? F
    : (3 * F * (F - 1) + F * (periodSeconds - perStackSeconds * F)) / periodSeconds;
  const firstBoonSeconds = prebuilt || instantRefill ? 0 : perStackSeconds * (F - 1);
  const uptime = Math.min(1, buffSeconds / periodSeconds);
  // Focus over the windows: before the first God's Boon (own buffs not built) Focus ramps from 1 at t = 0.
  const focusAt = (t) =>
    instantRefill
      ? F
      : t < firstBoonSeconds - EPS
        ? Math.min(F, 1 + Math.floor(t / perStackSeconds + EPS))
        : focusAfterBoon(t - firstBoonSeconds, { maxStacks: F, periodSeconds, refillSeconds: perStackSeconds });
  const edges = new Set([0]);
  for (let t = 0; t < HORIZON_SECONDS; t += perStackSeconds) edges.add(round(t));
  for (let b = firstBoonSeconds; b < HORIZON_SECONDS; b += periodSeconds) {
    edges.add(round(b));
    for (let k = 1; k <= F; k++) edges.add(round(b + k * perStackSeconds));
    edges.add(round(b + buffSeconds));
  }
  const times = [...edges].filter((time) => time >= 0 && time < HORIZON_SECONDS).sort((a, b) => a - b);
  return {
    maxFocus: F,
    cooldownSeconds: round(cooldownSeconds),
    refillSeconds,
    periodSeconds: round(periodSeconds),
    averageFocus,
    firstBoonSeconds,
    uptime,
    buffSeconds,
    instantRefill,
    prebuilt,
    focusAt,
    times,
  };
}

/** The long-run share of one God's Boon period where `test(focus)` holds (Focus after the Boon). */
function focusShare(cycle, test) {
  if (!cycle) return 0;
  if (cycle.instantRefill) return test(cycle.maxFocus) ? 1 : 0;
  const steps = 2000;
  let hits = 0;
  for (let index = 0; index < steps; index++)
    if (
      test(
        focusAfterBoon(((index + 0.5) / steps) * cycle.periodSeconds, {
          maxStacks: cycle.maxFocus,
          periodSeconds: cycle.periodSeconds,
        }),
      )
    )
      hits++;
  return hits / steps;
}

export function wisdomState(lines, state, facts) {
  const P = THEA_PATTERNS;
  const base = firstOf(lines, P.boonBase),
    auto = firstOf(lines, P.boonAuto),
    maxLine = firstOf(lines, P.boonMax);
  const cdr = matchesOf(lines, P.boonCdr).map(({ line, match }) => ({
    source: line.source,
    value: Number(match[1]) * (line.multiplier ?? 1),
  }));
  const cdrFactor = cdr.reduce((product, item) => product * Math.max(0.01, 1 + item.value / 100), 1);
  const baseCooldown = base ? Number(base.match[1]) : 15;
  const cooldownSeconds = baseCooldown / cdrFactor;
  const focus = state.blessings.Focus;
  // God's Boon is cast at max Focus by its own auto-cast (or by the Trait Skill best case: pressed at max Focus).
  const cast =
    Boolean(base) && (Boolean(auto) || state.traitPressed) && focus.maxStacks > 0 && (state.cycle || focus.otherGain);
  const cycle = cast
    ? godsBoonCycle({
        maxFocus: focus.maxStacks,
        cooldownSeconds,
        instantRefill: focus.otherGain,
        prebuilt: state.prebuilt,
        buffSeconds: maxLine ? Number(maxLine.match[2]) : KEYWORDS.godsBoon.buffSeconds,
      })
    : null;
  const purity = firstOf(lines, P.purity);
  const extraStacks = purity ? Number(purity.match[1]) : 0;
  const consumed = cycle ? cycle.maxFocus : 0;
  const stackBuff = (pattern) => {
    const found = firstOf(lines, pattern);
    if (!found) return null;
    const per = Number(found.match[1]),
      seconds = Number(found.match[2]),
      cap = Number(found.match[3]);
    const stacks = Math.min(cap + extraStacks, consumed);
    return {
      per,
      seconds,
      cap,
      capWithPurity: cap + extraStacks,
      stacks,
      percent: round(per * stacks),
      purityRaises: extraStacks > 0 && consumed > cap,
      source: found.line.source,
    };
  };
  const reincarnation = stackBuff(P.reincarnation),
    farewell = stackBuff(P.farewell);
  const area = (() => {
    const found = firstOf(lines, P.boonArea);
    return found
      ? {
          per: Number(found.match[1]),
          cap: Number(found.match[3]),
          stacks: Math.min(Number(found.match[3]) + extraStacks, consumed),
        }
      : null;
  })();
  const oracle = (() => {
    const found = firstOf(lines, P.oracle);
    if (!found) return null;
    const per = Number(found.match[1]);
    const percent =
      per *
      (state.blessings.Tenacity.stacks * state.blessings.Tenacity.effect +
        state.blessings.Agility.stacks * state.blessings.Agility.effect);
    return {
      per,
      percent: round(percent),
      tenacity: state.blessings.Tenacity.stacks,
      agility: state.blessings.Agility.stacks,
      source: found.line.source,
    };
  })();
  const revelation = (() => {
    const found = firstOf(lines, P.revelation);
    if (!found) return null;
    const others = state.blessings.Agility.stacks > 0 && state.blessings.Tenacity.stacks > 0;
    const share = !others ? 0 : cycle ? focusShare(cycle, (f) => f > 0) : focus.stacks > 0 ? 1 : 0;
    return { percent: Number(found.match[1]), share: round(share), others, source: found.line.source };
  })();
  const punishment = (() => {
    const found = firstOf(lines, P.punishment);
    if (!found) return null;
    const agility = Math.round(state.blessings.Agility.stacks);
    const share = cycle ? focusShare(cycle, (f) => f === agility) : focus.stacks === agility ? 1 : 0;
    // Lucky with share s: the expected best-of-two roll s × 2/3 + (1 − s) × 1/2 of the range = r ÷ (r + 1) with r = (3 + s) ÷ (3 − s).
    const luckyRolls = share > 0 ? (3 + share) / (3 - share) : 1;
    return {
      perStack: Number(found.match[1]),
      agility,
      share: round(share),
      maxDamagePercent: round(Number(found.match[1]) * agility * share),
      luckyRolls: round(luckyRolls),
      source: found.line.source,
    };
  })();
  const quadruple = firstOf(lines, P.quadruple);
  // The build's unscoped Double Damage chance plus Farewell Prophecy's time-averaged share (Quadruple Damage reads the overflow).
  const otherChance = (facts.modifierTexts || [])
    .filter((line) => line && line.origin !== "derived" && !line.lineEffect)
    .reduce((sum, line) => {
      const rule = classifyDoubleDamageLine(line.text);
      return sum + (rule && !rule.tags.length && !rule.perStat && !rule.slot ? rule.value * (line.multiplier ?? 1) : 0);
    }, 0);
  const doubleDamageChancePercent = round(otherChance + (farewell && cycle ? farewell.percent * cycle.uptime : 0));
  return {
    base: Boolean(base),
    auto: Boolean(auto),
    cast,
    baseCooldown,
    cdr,
    cooldownSeconds: round(cooldownSeconds),
    cycle,
    boonPercent: maxLine ? Number(maxLine.match[1]) : 0,
    consumedMax: Boolean(cycle),
    extraStacks,
    purity: Boolean(purity),
    cooldownBinds: Boolean(cycle) && cooldownSeconds > cycle.refillSeconds + EPS,
    reincarnation,
    farewell,
    area,
    oracle,
    revelation,
    punishment,
    quadruple: Boolean(quadruple),
    doubleDamageChancePercent,
    justice: state.thea?.shared || null,
  };
}

export function wisdomRead(key, text, state) {
  const w = state.wisdom,
    c = w?.cycle;
  const noBoon = !w?.base
    ? "God's Boon's line is not in the build"
    : !c
      ? state.blessings.Focus.maxStacks <= 0
        ? "Focus Blessing has no max stacks"
        : "God's Boon is never cast (no auto-cast line and the Trait Skill switch is off)"
      : "";
  const cadence = c
    ? `God's Boon every ${c.periodSeconds} s (max(${w.cooldownSeconds} s cooldown, ${c.instantRefill ? "Focus held at max by another gain source" : `${c.maxFocus} Focus × 6 s refill`}); Q-H3, provisional)`
    : "";
  const boonPeriodic = c
    ? {
        kind: "periodic",
        durationSeconds: c.buffSeconds,
        periodSeconds: c.periodSeconds,
        startSeconds: c.firstBoonSeconds,
      }
    : null;
  const boonTimed = (id, label, percent, reach = "all") =>
    c && percent
      ? [
          {
            id,
            label,
            target: "self",
            toggle: false,
            enabled: true,
            active: true,
            parts: [{ type: null, reach, percent, schedule: boonPeriodic }],
          },
        ]
      : [];
  const uptimeText = c ? `up ${pct(c.uptime)}% of the time (${c.buffSeconds} s every ${c.periodSeconds} s)` : "";
  switch (key) {
    case "cycle": {
      const base = cycleRead(state);
      if (!c || base.status !== "In calc") return base;
      const F = state.blessings.Focus;
      const percent = round(F.perStackDamage * F.effect);
      const timed =
        percent && !c.instantRefill
          ? [
              {
                id: "theaFocus",
                label: "Focus Blessing (God's Boon consumes it)",
                target: "self",
                toggle: false,
                enabled: true,
                active: true,
                parts: [
                  {
                    type: null,
                    reach: "all",
                    percent,
                    schedule: { kind: "steps", points: stepsFrom(c.focusAt, c.times), sustained: c.averageFocus },
                  },
                ],
              },
            ]
          : [];
      return inCalc(
        `${base.reason}; God's Boon consumes Focus: ${c.averageFocus} Focus stacks on average (one per 6 s after each God's Boon)`,
        { timed },
      );
    }
    case "boonClick":
      return neutral(
        w?.auto
          ? 'the auto-cast at max Focus ("Automatically try to use God\'s Boon") already casts it; a press before max Focus would consume fewer stacks'
          : "God's Boon is pressed at max Focus (Trait Skill best case)",
      );
    case "boonBase":
      return c
        ? inCalc(
            `${cadence}: it consumes all ${c.maxFocus} Focus stacks each time${w.cooldownBinds ? " (the cooldown binds)" : ""}`,
          )
        : inactive(noBoon);
    case "boonMax": {
      if (!c) return inactive(noBoon);
      const value = round(w.boonPercent * c.uptime),
        body = `+${value}% additional damage`;
      return inCalc(
        `God's Boon always consumes max Focus (auto-cast at max): +${w.boonPercent}% additional damage ${uptimeText} = ${body} (game data buff 82115; Q-H3, provisional)`,
        { bodies: value ? [body] : [], timed: boonTimed("theaGodsBoon", "God's Boon", w.boonPercent) },
      );
    }
    case "boonAuto":
      return !c
        ? inactive(noBoon)
        : state.traitPressed
          ? neutral(`the Trait Skill best case (pressed at max Focus) casts God's Boon as well: ${cadence}`)
          : inCalc(
              `with the Trait Skill switch off, the auto-cast still casts God's Boon whenever Focus reaches its max (${c.maxFocus}) and the cooldown is ready: ${cadence}`,
            );
    case "boonArea":
      return neutral("Skill Area only: the dummy is inside the skills' areas");
    case "revelation": {
      const r = w?.revelation;
      if (!r || !r.share)
        return inactive(
          !r
            ? "Prophecy of Revelation is not in the build"
            : !r.others
              ? "Agility or Tenacity Blessing holds no stack"
              : "Focus Blessing holds no stack",
        );
      const value = round(r.percent * r.share),
        body = `+${value}% additional damage`;
      const timed =
        c && !c.instantRefill && r.share < 1
          ? [
              {
                id: "theaRevelation",
                label: "Prophecy of Revelation: all three Blessings",
                target: "self",
                toggle: false,
                enabled: true,
                active: true,
                parts: [
                  {
                    type: null,
                    reach: "all",
                    percent: r.percent,
                    schedule: {
                      kind: "steps",
                      points: stepsFrom((t) => (c.focusAt(t) > 0 ? 1 : 0), c.times),
                      sustained: r.share,
                    },
                  },
                ],
              },
            ]
          : [];
      return inCalc(
        `all three Blessings held ${pct(r.share)}% of the time (Focus is 0 for 6 s after each God's Boon): +${r.percent}% × ${round(r.share)} = ${body} (provisional)`,
        { bodies: [body], timed },
      );
    }
    case "revelationTalents":
      return notModeled(
        "the Blessing-related Talents it puts on the 4th activated Talent Panel are not in the readable data",
      );
    case "justiceShare": {
      const shared = state.thea?.shared;
      return shared?.value > 0
        ? inCalc(
            `+${shared.value} to Max Focus Blessing Stacks (the biggest of Agility's / Tenacity's max-stack bonus): Focus max ${state.blessings.Focus.maxStacks}`,
          )
        : inactive("neither Agility nor Tenacity Blessing has a max-stack bonus");
    }
    case "boonCdr": {
      if (!c) return inactive(noBoon);
      return w.cooldownBinds || c.instantRefill
        ? inCalc(`God's Boon's cooldown ${w.baseCooldown} s → ${w.cooldownSeconds} s sets its cadence: ${cadence}`)
        : neutral(
            `the Focus refill (${c.refillSeconds} s) is longer than the cooldown (${w.cooldownSeconds} s), so God's Boon's cadence does not change`,
          );
    }
    case "punishment": {
      const p = w?.punishment;
      if (!p || !p.share)
        return inactive(
          !p
            ? "Prophecy of Punishment is not in the build"
            : c && !c.instantRefill && p.agility === c.maxFocus
              ? `Focus equals Agility (${p.agility}) only at max Focus, which God's Boon consumes at once`
              : `Focus never equals Agility (${p.agility}) in the God's Boon cycle`,
        );
      const body = `+${p.maxDamagePercent}% additional Max Damage`;
      return inCalc(
        `Focus equals Agility (${p.agility}) ${pct(p.share)}% of the time: Lucky Damage for that share (read as ${p.luckyRolls} rolls: the same expected roll) and +${p.perStack}% × ${p.agility} Agility × ${round(p.share)} = ${body} (provisional)`,
        { bodies: [body], lucky: p.luckyRolls },
      );
    }
    case "reincarnation": {
      const r = w?.reincarnation;
      if (!c || !r) return inactive(noBoon || "Predicted Reincarnation is not in the build");
      const value = round(r.percent * c.uptime),
        body = `+${value}% additional damage`;
      return inCalc(
        `${r.stacks} stacks (Focus consumed, up to ${r.capWithPurity}) × ${r.per}% = +${r.percent}% ${uptimeText} = ${body} (provisional)`,
        { bodies: value ? [body] : [], timed: boonTimed("theaReincarnation", "Predicted Reincarnation", r.percent) },
      );
    }
    case "farewell": {
      const f = w?.farewell;
      if (!c || !f) return inactive(noBoon || "Farewell Prophecy is not in the build");
      const value = round(f.percent * c.uptime),
        body = `+${value}% chance to deal Double Damage`;
      return inCalc(
        `${f.stacks} stacks × ${f.per}% = +${f.percent}% Double Damage chance ${uptimeText} = ${body} (hits only; time-averaged: provisional)`,
        {
          bodies: value ? [body] : [],
          timed: boonTimed("theaFarewell", "Farewell Prophecy (Double Damage)", f.percent, "hit"),
        },
      );
    }
    case "quadruple": {
      const chance = Number(w?.doubleDamageChancePercent) || 0;
      return chance > 100
        ? inCalc(
            `${round(chance)}% Double Damage chance: ${round(chance - 100)}% overflow → that chance of Quadruple Damage instead (packages/engine/src/combat/double-damage.js; the time-averaged chance: provisional)`,
          )
        : inactive(`Double Damage chance ${round(chance)}%: no overflow above 100%`);
    }
    case "purity": {
      const raised = [w?.reincarnation, w?.farewell].filter((item) => item?.purityRaises);
      return raised.length
        ? inCalc(
            `the God's Boon buffs stack once more: ${raised.map((item) => `${item.stacks} of ${item.capWithPurity}`).join(", ")} (provisional)`,
          )
        : inactive(
            !c
              ? noBoon
              : `God's Boon consumes ${c.maxFocus} Focus, within the buffs' stack limits (Predicted Reincarnation 5, Farewell Prophecy 8)`,
          );
    }
    case "oracle": {
      const o = w?.oracle;
      if (!c || !o || !o.percent) return inactive(!c ? noBoon : "no Agility or Tenacity Blessing stacks");
      const value = round(o.percent * c.uptime),
        body = `+${value}% additional damage`;
      return inCalc(
        `during God's Boon (${pct(c.uptime)}% of the time): +${o.per}% per stack of Tenacity (${o.tenacity}) and Agility (${o.agility}) × each Blessing's Effect = +${o.percent}% → ${body} (per stack: provisional)`,
        { bodies: [body], timed: boonTimed("theaOracle", "The Place of Oracle", o.percent) },
      );
    }
    case "oracleCap": {
      const match = cleanThea(text).match(THEA_PATTERNS.oracleCap);
      const name = match ? match[2][0].toUpperCase() + match[2].slice(1).toLowerCase() : "";
      const B = state.blessings[name];
      if (!B) return inactive("not a Blessing line");
      const used =
        name === "Focus"
          ? B.perStackDamage > 0 || Boolean(w?.cycle)
          : name === "Agility"
            ? B.stacks > 0
            : Boolean(w?.oracle) || Boolean(w?.revelation) || Boolean(state.thea?.shared?.value);
      return B.stacks > 0 && used
        ? inCalc(
            `${name} Blessing max ${B.maxStacks} (held by the Divine Blessing cycle${name === "Focus" && w?.cycle ? `; God's Boon consumes ${w.cycle.maxFocus}` : ""})`,
          )
        : B.stacks > 0
          ? neutral(`${name} Blessing's stacks change no damage figure in this build`)
          : inactive(`${name} Blessing holds no stack`);
    }
    default:
      return notModeled("this Wisdom of The Gods clause is not read");
  }
}

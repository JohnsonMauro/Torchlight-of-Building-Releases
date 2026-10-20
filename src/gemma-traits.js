// Gemma's trait engines (hero trait audit batch B3, 2026-10-19; research/hero-traits-audit-2026-10-19.md §5 B3, §6 Q-H4).
// Pure helpers: src/hero-trait-modules.js reads the trait lines, calls these, derives the sustained lines and reports the timed
// parts the 5 s / 20 s windows and the recount follow (src/timed-effects.js).
//
// Frostfire Rampage (Ice-Fire Fusion; game affixes 688680704 / 19562364 / 2835869): "Enters Frostfire Rampage after casting Fire
// or Cold Skills 5 time(s)", "lasts for 5 s and has a cooldown of 10 s". Q-H4 recommended reading (provisional): the record
// adds 1 to a counter on every cast and fires the Rampage behind a cooldown check, so casts during the cooldown count. One
// Rampage per period P = max(cooldown, 5 casts ÷ Fire / Cold casts per second); cooldown = 10 s ÷ ((1 + Σ "Frostfire Rampage
// Cooldown Recovery Speed") × Π(1 + "additional Cooldown Recovery Speed for Frostfire Rampage")); duration = 5 s × (1 + Σ
// "Frostfire Rampage Duration"). Uptime = min(1, duration ÷ P). Ice-Fire Radiance's end bonus fades linearly to 0 over 3 s
// after each end (a Rampage that never ends never fires it): its time average is peak × (m − m² ÷ 6) ÷ P, m = min(3, P).
// General Skill Effect Duration and Cooldown Recovery Speed lines are not read (only the Frostfire-scoped ones; provisional).
//
// Cold Pulse (Frostbitten Heart; game affixes 315287 / 592944 / 12682557): "When dealing Cold Damage, triggers Cold Pulse at the
// enemy's location. Interval: 4 s" (Dance of Frost: −2 s). Blooming Frost Flower: "Upon inflicting Frostbite, additionally
// casts Cold Pulse at the Frostbitten target once. Interval: 2 s for the same target": a Cold Pulse hit inflicts Frostbite, so
// every base pulse brings an extra one when 2 s have passed since the last extra; another Frostbite source on hit fires the
// extra pulse every 2 s from t = 0 (provisional). Pulses start with the first Cold hit (t = 0). Cold Pulse's own damage is not
// published (TLIDB and the readable records give none), so it is not a damage source here.
//
// Purgatory (Flame of Pleasure): auto-cast whenever the player is not in Purgatory and a charge is ready (the ≤ 1 s check delay
// ignored, as before); charges ("+1 Max Purgatory Charges", Groaning Echo) recover one at a time on the cooldown (provisional),
// so the long-run uptime stays min(1, duration ÷ cooldown) and the extra charge recasts at once in the windows. Infernal
// Damnation: "+X% additional damage for every second Purgatory is active, until it is lost or a new one is cast": ⌊seconds
// active⌋ stacks.

export const HORIZON_SECONDS = 120;
const EPS = 1e-9;
const round = (value) => Math.round(value * 10000) / 10000;

/** Frostfire Rampage cycle: { durationSeconds, cooldownSeconds, periodSeconds, uptime, castsBound, endsPerSecond, radianceAverage(peak) }. */
export function frostfireCycle({ baseDurationSeconds = 5, baseCooldownSeconds = 10, durationPercent = 0, cooldownRecoveryPercent = 0, cooldownRecoveryAdditional = [], castsNeeded = 5, castsPerSecond = null } = {}) {
  const durationSeconds = Math.max(0, baseDurationSeconds * (1 + durationPercent / 100));
  const recovery = Math.max(EPS, (1 + cooldownRecoveryPercent / 100) * cooldownRecoveryAdditional.reduce((product, value) => product * (1 + value / 100), 1));
  const cooldownSeconds = baseCooldownSeconds / recovery;
  const castSeconds = castsPerSecond > 0 ? castsNeeded / castsPerSecond : castsPerSecond === 0 ? Infinity : 0;
  const periodSeconds = Math.max(cooldownSeconds, castSeconds);
  const uptime = Number.isFinite(periodSeconds) && periodSeconds > 0 ? Math.min(1, durationSeconds / periodSeconds) : 0;
  const ends = Number.isFinite(periodSeconds) && durationSeconds < periodSeconds - EPS;
  const m = Math.min(3, periodSeconds);
  return {
    durationSeconds: round(durationSeconds), cooldownSeconds: round(cooldownSeconds), periodSeconds: Number.isFinite(periodSeconds) ? round(periodSeconds) : Infinity,
    castsBound: castSeconds > cooldownSeconds + EPS, castSeconds: Number.isFinite(castSeconds) ? round(castSeconds) : Infinity, uptime: round(uptime), ends,
    radianceShare: ends ? round((m - m * m / 6) / periodSeconds) : 0
  };
}

/** Level of the Rampage (0 / 1) and of Radiance's fading end bonus (0–1) at time t, entries at start + n × period. */
export function frostfireLevels(cycle, startSeconds, time) {
  if (!Number.isFinite(cycle.periodSeconds) || time < startSeconds - EPS) return { rampage: 0, radiance: 0 };
  const n = Math.floor((time - startSeconds) / cycle.periodSeconds + EPS);
  const phase = time - startSeconds - n * cycle.periodSeconds;
  const rampage = !cycle.ends || phase < cycle.durationSeconds - EPS ? 1 : 0;
  let radiance = 0;
  if (cycle.ends) {
    // The latest end at or before t: this cycle's end if passed, else the previous cycle's.
    const end = phase >= cycle.durationSeconds - EPS ? startSeconds + n * cycle.periodSeconds + cycle.durationSeconds : n > 0 ? startSeconds + (n - 1) * cycle.periodSeconds + cycle.durationSeconds : null;
    if (end !== null && time - end < 3) radiance = Math.max(0, 1 - (time - end) / 3);
  }
  return { rampage, radiance };
}

/** Piecewise-constant steps for a level function (midpoint of each step), from 0 to the horizon. */
export function stepsOf(levelAt, edges, horizon = HORIZON_SECONDS, step = 0.25) {
  const times = new Set([0]);
  for (const edge of edges) if (edge > 0 && edge < horizon) times.add(round(edge));
  for (let t = step; t < horizon; t += step) times.add(round(t));
  const sorted = [...times].sort((a, b) => a - b);
  const points = [];
  for (let index = 0; index < sorted.length; index++) {
    const next = sorted[index + 1] ?? horizon;
    const level = round(levelAt((sorted[index] + next) / 2));
    if (!points.length || points[points.length - 1][1] !== level) points.push([sorted[index], level]);
  }
  return points;
}

/** Cold Pulse hit times from t = 0 (base pulses every interval; Blooming Frost Flower's extra pulses). */
export function coldPulseTimes({ intervalSeconds = 4, blooming = false, otherFrostbiteOnHit = false, horizon = HORIZON_SECONDS * 2 } = {}) {
  const times = [];
  let lastExtra = -Infinity;
  if (blooming && otherFrostbiteOnHit) for (let t = 0; t < horizon; t += 2) times.push(t);
  for (let t = 0; t < horizon; t += intervalSeconds) {
    times.push(t);
    if (blooming && !otherFrostbiteOnHit && t - lastExtra >= 2 - EPS) { times.push(t); lastExtra = t; }
  }
  return times.sort((a, b) => a - b);
}

/** Cold Pulse state: pulses per second, Dance of Frost stacks (hits within 8 s, up to 4) and a debuff's uptime (duration s after each hit). */
export function coldPulseState({ intervalSeconds = 4, blooming = false, otherFrostbiteOnHit = false, stackWindowSeconds = 8, maxStacks = 4, buffSeconds = 6 } = {}) {
  const times = coldPulseTimes({ intervalSeconds, blooming, otherFrostbiteOnHit });
  const horizon = HORIZON_SECONDS * 2;
  const stacksAt = (t) => Math.min(maxStacks, times.filter((at) => at <= t + EPS && at > t - stackWindowSeconds + EPS).length);
  const upAt = (seconds) => (t) => times.some((at) => at <= t + EPS && at > t - seconds + EPS) ? 1 : 0;
  // Long-run averages over the second half of the simulated span (the cycle is periodic by then).
  const average = (levelAt) => { let total = 0, count = 0; for (let t = horizon / 2; t < horizon - stackWindowSeconds; t += 0.05) { total += levelAt(t); count++; } return count ? total / count : 0; };
  const steady = times.filter((t) => t >= horizon / 2 && t < horizon - stackWindowSeconds);
  const pulsesPerSecond = steady.length / (horizon / 2 - stackWindowSeconds);
  const edges = [...new Set(times.flatMap((t) => [t, t + stackWindowSeconds, t + buffSeconds]))].filter((t) => t < HORIZON_SECONDS);
  return {
    intervalSeconds, blooming, otherFrostbiteOnHit, pulsesPerSecond: round(pulsesPerSecond),
    stacks: round(average(stacksAt)), stacksAt,
    buffUptime: (seconds) => round(average(upAt(seconds))), upAt,
    stackSteps: () => stepsOf(stacksAt, edges), upSteps: (seconds) => stepsOf(upAt(seconds), edges)
  };
}

/** Purgatory casts from t = 0: active intervals [[start, end]] with charges recovering one at a time on the cooldown. */
export function purgatoryIntervals({ durationSeconds = 5, cooldownSeconds = 8, charges = 1, horizon = HORIZON_SECONDS } = {}) {
  const intervals = [];
  let held = charges, recoverAt = Infinity, t = 0;
  for (let guard = 0; guard < 10000 && t < horizon; guard++) {
    // Charges that came back before t.
    while (recoverAt <= t + EPS) { held++; recoverAt = held < charges ? recoverAt + cooldownSeconds : Infinity; }
    if (held >= 1) {
      held--;
      if (recoverAt === Infinity) recoverAt = t + cooldownSeconds;
      intervals.push([t, t + durationSeconds]);
      t += durationSeconds;
    } else t = recoverAt;
  }
  return intervals;
}

/** Infernal Damnation's ⌊seconds active⌋ stacks averaged over a cycle of `periodSeconds` (the Purgatory lasts `durationSeconds`). */
export function infernalAverageStacks(durationSeconds, periodSeconds) {
  let integral = 0;
  for (let k = 1; k < durationSeconds - EPS; k++) integral += durationSeconds - k;
  return periodSeconds > 0 ? integral / periodSeconds : 0;
}

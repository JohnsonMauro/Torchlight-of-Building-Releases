// Gemma – Frostbitten Heart's Cold Pulse (hero trait audit batch B3, 2026-10-19; research/hero-traits-audit-2026-10-19.md §5 B3).
// Pure helpers: packages/engine/src/heroes/hero-trait-modules.js reads the trait lines, calls these and derives the sustained lines.
//
// Cold Pulse (Frostbitten Heart; game affixes 315287 / 592944 / 12682557): "When dealing Cold Damage, triggers Cold Pulse at the
// enemy's location. Interval: 4 s" (Dance of Frost: −2 s). Blooming Frost Flower: "Upon inflicting Frostbite, additionally
// casts Cold Pulse at the Frostbitten target once. Interval: 2 s for the same target": a Cold Pulse hit inflicts Frostbite, so
// every base pulse brings an extra one when 2 s have passed since the last extra; another Frostbite source on hit fires the
// extra pulse every 2 s from t = 0 (provisional). Pulses start with the first Cold hit (t = 0). Cold Pulse's own damage is not
// published (TLIDB and the readable records give none), so it is not a damage source here.
//
import { HORIZON_SECONDS, stepsOf } from "./timeline.js";

const EPS = 1e-9;
const round = (value) => Math.round(value * 10000) / 10000;

/** Cold Pulse hit times from t = 0 (base pulses every interval; Blooming Frost Flower's extra pulses). */
export function coldPulseTimes({
  intervalSeconds = 4,
  blooming = false,
  otherFrostbiteOnHit = false,
  horizon = HORIZON_SECONDS * 2,
} = {}) {
  const times = [];
  let lastExtra = -Infinity;
  if (blooming && otherFrostbiteOnHit) for (let t = 0; t < horizon; t += 2) times.push(t);
  for (let t = 0; t < horizon; t += intervalSeconds) {
    times.push(t);
    if (blooming && !otherFrostbiteOnHit && t - lastExtra >= 2 - EPS) {
      times.push(t);
      lastExtra = t;
    }
  }
  return times.sort((a, b) => a - b);
}

/** Cold Pulse state: pulses per second, Dance of Frost stacks (hits within 8 s, up to 4) and a debuff's uptime (duration s after each hit). */
export function coldPulseState({
  intervalSeconds = 4,
  blooming = false,
  otherFrostbiteOnHit = false,
  stackWindowSeconds = 8,
  maxStacks = 4,
  buffSeconds = 6,
} = {}) {
  const times = coldPulseTimes({ intervalSeconds, blooming, otherFrostbiteOnHit });
  const horizon = HORIZON_SECONDS * 2;
  const stacksAt = (t) =>
    Math.min(maxStacks, times.filter((at) => at <= t + EPS && at > t - stackWindowSeconds + EPS).length);
  const upAt = (seconds) => (t) => (times.some((at) => at <= t + EPS && at > t - seconds + EPS) ? 1 : 0);
  // Long-run averages over the second half of the simulated span (the cycle is periodic by then).
  const average = (levelAt) => {
    let total = 0,
      count = 0;
    for (let t = horizon / 2; t < horizon - stackWindowSeconds; t += 0.05) {
      total += levelAt(t);
      count++;
    }
    return count ? total / count : 0;
  };
  const steady = times.filter((t) => t >= horizon / 2 && t < horizon - stackWindowSeconds);
  const pulsesPerSecond = steady.length / (horizon / 2 - stackWindowSeconds);
  const edges = [...new Set(times.flatMap((t) => [t, t + stackWindowSeconds, t + buffSeconds]))].filter(
    (t) => t < HORIZON_SECONDS,
  );
  return {
    intervalSeconds,
    blooming,
    otherFrostbiteOnHit,
    pulsesPerSecond: round(pulsesPerSecond),
    stacks: round(average(stacksAt)),
    stacksAt,
    buffUptime: (seconds) => round(average(upAt(seconds))),
    upAt,
    stackSteps: () => stepsOf(stacksAt, edges),
    upSteps: (seconds) => stepsOf(upAt(seconds), edges),
  };
}

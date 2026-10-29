// Gemma – Flame of Pleasure's Purgatory (hero trait audit batch B3, 2026-10-19; research/hero-traits-audit-2026-10-19.md §5 B3).
// Pure helpers: packages/engine/src/heroes/hero-trait-modules.js reads the trait lines, calls these and derives the sustained lines.
//
// Purgatory (Flame of Pleasure): auto-cast whenever the player is not in Purgatory and a charge is ready (the ≤ 1 s check delay
// ignored, as before); charges ("+1 Max Purgatory Charges", Groaning Echo) recover one at a time on the cooldown (provisional),
// so the long-run uptime stays min(1, duration ÷ cooldown) and the extra charge recasts at once in the windows. Infernal
// Damnation: "+X% additional damage for every second Purgatory is active, until it is lost or a new one is cast": ⌊seconds
// active⌋ stacks.

import { HORIZON_SECONDS } from "./timeline.js";

const EPS = 1e-9;
/** Purgatory casts from t = 0: active intervals [[start, end]] with charges recovering one at a time on the cooldown. */
export function purgatoryIntervals({
  durationSeconds = 5,
  cooldownSeconds = 8,
  charges = 1,
  horizon = HORIZON_SECONDS,
} = {}) {
  const intervals = [];
  let held = charges,
    recoverAt = Infinity,
    t = 0;
  for (let guard = 0; guard < 10000 && t < horizon; guard++) {
    // Charges that came back before t.
    while (recoverAt <= t + EPS) {
      held++;
      recoverAt = held < charges ? recoverAt + cooldownSeconds : Infinity;
    }
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

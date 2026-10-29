// Gemma – Ice-Fire Fusion's Frostfire Rampage (hero trait audit batch B3, 2026-10-19; research/hero-traits-audit-2026-10-19.md §5 B3,
// §6 Q-H4). Pure helpers: packages/engine/src/heroes/hero-trait-modules.js reads the trait lines, calls these, derives the sustained lines and
// reports the timed parts the 5 s / 20 s windows and the recount follow (packages/engine/src/combat/timed-effects.js).
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
const EPS = 1e-9;
const round = (value) => Math.round(value * 10000) / 10000;

/** Frostfire Rampage cycle: { durationSeconds, cooldownSeconds, periodSeconds, uptime, castsBound, endsPerSecond, radianceAverage(peak) }. */
export function frostfireCycle({
  baseDurationSeconds = 5,
  baseCooldownSeconds = 10,
  durationPercent = 0,
  cooldownRecoveryPercent = 0,
  cooldownRecoveryAdditional = [],
  castsNeeded = 5,
  castsPerSecond = null,
} = {}) {
  const durationSeconds = Math.max(0, baseDurationSeconds * (1 + durationPercent / 100));
  const recovery = Math.max(
    EPS,
    (1 + cooldownRecoveryPercent / 100) *
      cooldownRecoveryAdditional.reduce((product, value) => product * (1 + value / 100), 1),
  );
  const cooldownSeconds = baseCooldownSeconds / recovery;
  const castSeconds = castsPerSecond > 0 ? castsNeeded / castsPerSecond : castsPerSecond === 0 ? Infinity : 0;
  const periodSeconds = Math.max(cooldownSeconds, castSeconds);
  const uptime = Number.isFinite(periodSeconds) && periodSeconds > 0 ? Math.min(1, durationSeconds / periodSeconds) : 0;
  const ends = Number.isFinite(periodSeconds) && durationSeconds < periodSeconds - EPS;
  const m = Math.min(3, periodSeconds);
  return {
    durationSeconds: round(durationSeconds),
    cooldownSeconds: round(cooldownSeconds),
    periodSeconds: Number.isFinite(periodSeconds) ? round(periodSeconds) : Infinity,
    castsBound: castSeconds > cooldownSeconds + EPS,
    castSeconds: Number.isFinite(castSeconds) ? round(castSeconds) : Infinity,
    uptime: round(uptime),
    ends,
    radianceShare: ends ? round((m - (m * m) / 6) / periodSeconds) : 0,
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
    const end =
      phase >= cycle.durationSeconds - EPS
        ? startSeconds + n * cycle.periodSeconds + cycle.durationSeconds
        : n > 0
          ? startSeconds + (n - 1) * cycle.periodSeconds + cycle.durationSeconds
          : null;
    if (end !== null && time - end < 3) radiance = Math.max(0, 1 - (time - end) / 3);
  }
  return { rampage, radiance };
}

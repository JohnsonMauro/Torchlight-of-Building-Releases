// Youga – Spacetime Elapse (hero trait audit batch B4, 2026-10-19; research/hero-traits-audit-2026-10-19.md §5 B4, §8 B4, §6 Q-H6).
// Pure helpers: packages/engine/src/heroes/youga/badges.js reads the trait lines into a state, packages/engine/src/planner.js applies
// Spacetime Turbulence to the damage paths, packages/engine/src/combat/dummy-recount.js times the Turbulence releases. Every reading here
// is provisional (src/app/stats/open-questions.js lists them for Youga).
//
// Game records (SS14, rank 5; the audit's readable tables):
//   Spacetime Elapse    1310001: 960936 [2, 6] (cast on DoT 1000030, interval 2 s, 6 s); 728324 [50] records; 374187424 [25]
//   Spacetime Speed-up  1310011: 98606 [1, 11, 5]; Spacetime Pause 1310031: 364421504 [100] to recorded damage
//   Spacetime Upheaval  1310012: 415967 [58] attr 5719 add while buff 81601 (Twisted Spacetime) is up

const EPS = 1e-9;

/**
 * Twisted Spacetime (Spacetime Elapse; Q-H6 recommended reading, provisional). With damage over time on the dummy it is cast at
 * once and recast every casting interval (the trait's 2 s; To Myself in Another Spacetime: 1 s); each recast while it is active
 * moves it and extends it by 2 s, so it never ends (uptime 1). Each move releases Turbulence: the dummy (the only enemy in it, a
 * Boss and so an Elite) takes the whole record, record% × (1 + "to all recorded damage" bonuses) of the DoT and Reaping damage dealt
 * since the last move. Spacetime Speed-up's stacks are the whole seconds the Spacetime has lasted at the release (up to its max).
 * "Additional Damage" (also recorded) has no separate model and is not counted.
 */
export function twistedSpacetime({
  intervalSeconds = 2,
  recordPercent = 0,
  bonusPercent = 0,
  speedUpPercent = 0,
  speedUpMaxStacks = 0,
} = {}) {
  const shareAt = (lastedSeconds) =>
    (recordPercent / 100) *
    (1 +
      (bonusPercent + speedUpPercent * Math.min(speedUpMaxStacks, Math.floor(Math.max(0, lastedSeconds) + EPS))) / 100);
  const sustainedShare = (recordPercent / 100) * (1 + (bonusPercent + speedUpPercent * speedUpMaxStacks) / 100);
  // Released share of a window's DoT and Reaping: the releases at k × interval inside [0, W), each of one interval's record.
  const windowFactor = (seconds) => {
    if (!(seconds > 0)) return sustainedShare;
    let total = 0;
    for (let k = 1; k * intervalSeconds < seconds - EPS; k++) total += shareAt(k * intervalSeconds) * intervalSeconds;
    return total / seconds;
  };
  return {
    intervalSeconds,
    recordPercent,
    bonusPercent,
    speedUpPercent,
    speedUpMaxStacks,
    sustainedShare,
    shareAt,
    windowFactor,
  };
}

/**
 * The Turbulence series of a recount timeline: at each move (k × interval) the share of the builders' damage (every DoT and
 * Reap series) dealt since the previous move lands in that bin. `meta`: { builders, intervalSeconds, recordPercent, bonusPercent,
 * speedUpPercent, speedUpMaxStacks }.
 */
export function turbulenceSeries(bySource, meta, bins, stepSeconds) {
  const series = new Float64Array(bins);
  if (!meta || !(meta.intervalSeconds > 0)) return series;
  const spacetime = twistedSpacetime(meta);
  const builders = (meta.builders || []).map((key) => bySource[key]).filter(Boolean);
  let from = 0;
  for (let k = 1; ; k++) {
    const release = k * meta.intervalSeconds;
    const bin = Math.round(release / stepSeconds);
    if (bin >= bins) break;
    let recorded = 0;
    for (const source of builders) for (let b = from; b < bin; b++) recorded += source[b];
    series[bin] += recorded * spacetime.shareAt(release);
    from = bin;
  }
  return series;
}

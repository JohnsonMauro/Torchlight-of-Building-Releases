// Youga – Spacetime Illusion and Spacetime Elapse (hero trait audit batch B4, 2026-10-19; research/hero-traits-audit-2026-10-19.md
// §5 B4, §8 B4, §6 Q-H5 / Q-H6). Pure helpers: src/engine/heroes/hero-trait-modules.js reads the trait lines into a state, src/engine/planner.js
// applies the Illusion stream to the Main Skill's hit and Spacetime Turbulence to the damage paths, src/engine/combat/dummy-recount.js times the
// Turbulence releases. Every reading here is provisional (src/app/stats/open-questions.js lists them for Youga).
//
// Game records (SS14, rank 5; the audit's readable tables):
//   Spacetime Illusion  1300001: 14091253 [1.5, 8, 10] (on cast 1000069: +1.5% Cooldown Recovery Speed, 8 s, 10 stacks; the moon)
//   Me and Myself       1300011: 103010050 [5, 2.5, 13] convert 60071 (Cooldown Recovery Speed) → 24030002 (Illusion Cast Frequency)
//   Make it Quick       1300021: 101140027 [70] convert 60021 (Cast Speed) → 57191 (additional Illusion Damage), cap 300%
//   Eeeendless Mana     1300022: 314310 [25] Mana sealed; 257393 [4, 1.6] convert 24030002 → 57191
//   I'm Out of Mana     1300032: 103010051 [10, 10] on 1001280 (Illusion Mana consumption), buff 81520 for 4 s, 10 stacks
//   Spacetime Elapse    1310001: 960936 [2, 6] (cast on DoT 1000030, interval 2 s, 6 s); 728324 [50] records; 374187424 [25]
//   Spacetime Speed-up  1310011: 98606 [1, 11, 5]; Spacetime Pause 1310031: 364421504 [100] to recorded damage
//   Spacetime Upheaval  1310012: 415967 [58] attr 5719 add while buff 81601 (Twisted Spacetime) is up

export const ILLUSION_RECENT_SECONDS = 4;
const EPS = 1e-9;
const round = (value) => Math.round(value * 10000) / 10000;

/** Me and Myself: one step per +5% Cooldown Recovery Speed and one per 2.5% additional (each counted whole; provisional). */
export function meAndMyselfFrequency({ increasedPercent = 0, additionalPercent = 0, perStepPercent = 0 } = {}) {
  const fromIncreased = Math.floor(Math.max(0, increasedPercent) / 5 + EPS);
  const fromAdditional = Math.floor(Math.max(0, additionalPercent) / 2.5 + EPS);
  const steps = fromIncreased + fromAdditional;
  return { steps, fromIncreased, fromAdditional, percent: steps * perStepPercent };
}

/** Stacks held from a steady event rate: min(max, rate × seconds) (expected events in the window; provisional). */
export function stacksHeld(eventsPerSecond, seconds, maxStacks) {
  if (!(eventsPerSecond > 0) || !(seconds > 0)) return 0;
  return Math.min(maxStacks, eventsPerSecond * seconds);
}

/**
 * The Illusion's use rate (Q-H5, recommended reading, provisional).
 *   - default: Cast Frequency limits it: count × (1 + Cast Frequency) ÷ interval (its casting action is not modeled);
 *   - Eeeendless Mana: no Cast Frequency limit, so its own casting action at the player's Main Skill cast rate: count × that rate;
 *   - Eeeendless Mana and Make it Quick: no limit left; the planner keeps the Eeeendless Mana rate and asks for an in-game count.
 * `playerCastsPerSecond` null (the first pass, before the hits): the frequency rate stands in.
 */
export function illusionRate({
  intervalSeconds = 1.5,
  count = 1,
  castFrequencyPercent = 0,
  endlessMana = false,
  makeItQuick = false,
  playerCastsPerSecond = null,
} = {}) {
  const frequencyRate = (count * (1 + castFrequencyPercent / 100)) / intervalSeconds;
  if (!endlessMana) return { usesPerSecond: frequencyRate, basis: "frequency", frequencyRate, open: false };
  const measured = Number.isFinite(playerCastsPerSecond) && playerCastsPerSecond > 0;
  return {
    usesPerSecond: measured ? count * playerCastsPerSecond : frequencyRate,
    basis: measured ? "casting action" : "frequency (no cast rate measured yet)",
    frequencyRate,
    open: Boolean(makeItQuick),
  };
}

/** Eeeendless Mana: +X% additional Illusion Damage for every +4% Cast Frequency (whole steps). */
export const endlessManaDamage = (castFrequencyPercent, perStepPercent, stepPercent = 4) =>
  Math.floor(Math.max(0, castFrequencyPercent) / stepPercent + EPS) * perStepPercent;
/** Make it Quick: share% of the Cast Speed bonuses (increased) as additional Illusion Damage, up to the cap. */
export const makeItQuickDamage = (castSpeedIncreasedPercent, sharePercent, capPercent = 300) =>
  Math.min(capPercent, (Math.max(0, castSpeedIncreasedPercent) * sharePercent) / 100);

/**
 * The Main Skill's hit with the Illusion stream (src/engine/planner.js). Spell Burst (game manual; src/engine/skills/skill-hit-model.js): the Illusion's
 * castings are considered your castings, so a Spell Main Skill that can Spell Burst does so on the Illusion's casts too, with its
 * own charge (same Max Spell Burst and charge time as yours; provisional). Telepathy Expert (revived): each Illusion Spell Burst
 * also attempts yours, so your activations come from your casts and the Illusion's consumptions.
 * Returns the settled rates and per-use damage, or null without an Illusion.
 */
export function settleIllusionStream({ hit, illusion, telepathy = false }) {
  if (!hit || !illusion) return null;
  const sb = hit.rate?.spellBurst || null;
  const perUse = hit.combat.perUse;
  const base = sb ? perUse / (sb.averageDamageFactor || 1) : perUse;
  const B = sb ? sb.bonusFactor || 1 : 1;
  const N = sb ? sb.maxSpellBurst || 0 : 0;
  const charge = sb ? sb.fullChargeSeconds : Infinity;
  const ownManual = illusion.playerCasts
    ? Math.max(0, (hit.rate.usesPerSecond || 0) - (sb?.extraUsesPerSecond || 0))
    : 0;
  const uI = illusion.usesPerSecond;
  const D = illusion.damageFactor;
  let usesP,
    burstP,
    usesI,
    burstI,
    aI = 0,
    aP = 0;
  if (sb) {
    aI = uI > 0 ? 1 / Math.max(charge, 1 / uI) : 0;
    const attempts = ownManual + (telepathy ? aI : 0);
    aP = attempts > 0 ? 1 / Math.max(charge, 1 / attempts) : 0;
    const fromOwn = attempts > 0 ? ownManual / attempts : 0;
    usesP = ownManual + N * aP;
    burstP = N * aP + aP * fromOwn;
    usesI = uI + N * aI;
    burstI = (1 + N) * aI;
  } else {
    usesP = illusion.playerCasts ? hit.rate.usesPerSecond || 0 : 0;
    burstP = 0;
    usesI = uI;
    burstI = 0;
  }
  const playerDps = base * (usesP + (B - 1) * burstP);
  const illusionDps = base * D * (usesI + (B - 1) * burstI);
  const totalRate = usesP + usesI;
  const dps = playerDps + illusionDps;
  return {
    playerUsesPerSecond: usesP,
    illusionUsesPerSecond: usesI,
    totalRate,
    dps,
    perUse: totalRate > 0 ? dps / totalRate : 0,
    playerDps,
    illusionDps,
    spellBurst: sb
      ? {
          maxSpellBurst: N,
          fullChargeSeconds: charge,
          bonusFactor: B,
          illusionActivationsPerSecond: aI,
          playerActivationsPerSecond: aP,
          telepathy: Boolean(telepathy),
          playerBurstCastsPerSecond: burstP,
          illusionBurstCastsPerSecond: burstI,
        }
      : null,
    note: sb
      ? `Spell Burst on the Illusion's casts: ${round(aI)} activations/s (its own charge, ${N} stack(s), ${round(charge)} s)${telepathy ? `; Telepathy Expert: each also attempts yours, ${round(aP)} activations/s of yours` : ""} (provisional)`
      : "",
  };
}

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

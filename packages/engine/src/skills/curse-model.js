// Scorch ("+X% additional Fire Damage taken by Cursed enemies", "+10% chance to be Ignited when you are hit by a Cursed
// enemy", a player-side effect not modeled) and Entangled Pain ("+X% additional Damage Over Time taken by Cursed enemies")
// by skill level. X follows the
// curse level curve GetLevel {1: 20, 21: 40, 41: 50} (the Vulnerability game record, curse-effects.js): +1 per level to
// Lv.21, +0.5 per level after. Checked on TLIDB's Scorch and Entangled Pain progression tables, all 40 levels
// (2026-10-23).

/** The curse level curve at `level` (clamped to 1–40). */
export function curseTakenPercentAtLevel(level) {
  const clamped = Math.max(1, Math.min(40, Math.floor(Number(level) || 1)));
  return clamped <= 21 ? 19 + clamped : 40 + (clamped - 21) * 0.5;
}

const levelOf = (setup) => setup.effectiveLevel ?? (setup.baseLevel ?? 20) + (setup.addedLevels ?? 0);

// The curses' values for the build's Scorch and Entangled Pain setups; 0 for one the build does not have.
export function curseEffects(setups = []) {
  const at = (name) => {
    const setup = setups.find((item) => item.name === name);
    return setup ? curseTakenPercentAtLevel(levelOf(setup)) : 0;
  };
  return {
    scorchDamagePercent: at("Scorch"),
    entangledPainDamagePercent: at("Entangled Pain"),
  };
}

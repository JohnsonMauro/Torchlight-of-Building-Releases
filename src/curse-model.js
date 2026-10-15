// Uses the captured level endpoints until complete curse progression is available.
export function curseEffects(setups = []) {
  const effect = (name, key, fallback) => {
    const setup = setups.find(item => item.name === name);
    if (!setup) return fallback;
    const at20 = setup.databaseLevel20?.[key];
    const captured = setup.observed?.[key];
    const level = setup.effectiveLevel ?? setup.baseLevel + setup.addedLevels;
    const capturedLevel = setup.baseLevel + setup.addedLevels;
    if (!Number.isFinite(at20)) return captured ?? fallback;
    if (!Number.isFinite(captured) || level <= 20 || !(capturedLevel > 20)) return at20;
    return at20 + (captured - at20) * (level - 20) / (capturedLevel - 20);
  };
  return {
    scorchDamagePercent: effect("Scorch", "cursedEnemyAdditionalFireDamageTakenPercent", 45),
    scorchSelfIgniteChancePercent: effect("Scorch", "chanceToBeIgnitedWhenHitByCursedEnemyPercent", 10),
    entangledPainDamagePercent: effect("Entangled Pain", "cursedEnemyAdditionalDamageOverTimeTakenPercent", 42.5)
  };
}

import { auraLevelRecordsSs14 } from "./aura-level-records-ss14.generated.js";

// Buff affix IDs from the installed SS13 tables. A line index refers to the
// skill's first displayed effect, after its introductory "Activates" line.
const affixStats = {
  538865344: { stat: "meleeCriticalStrikeRatingPercent", line: 1, digits: 1 },
  902035584: { stat: "additionalMeleeSkillDamagePercent", line: 2, digits: 1 },
  707968: { stat: "meleeAttackSpeedPercent", line: 3, digits: 1 },
  200000399: { stat: "additionalPhysicalDamagePercent", line: 1, digits: 1 },
  101010489: { stat: "lifeRegenerationPerSecond", line: 1, digits: 0 },
  32061338: { stat: "lifeRegenerationPercentPerSecond", line: 1, digits: 1 },
  919705: { stat: "additionalLightningDamagePercent", line: 1, digits: 1 },
  869686: { stat: "additionalColdDamagePercent", line: 1, digits: 1 },
  183600: { stat: "evasion", line: 1, digits: 0 },
  101010327: { stat: "additionalEvasionPercent", line: 2, digits: 1 },
  10091901: { stat: "additionalSpellDamagePercent", line: 1, digits: 1 },
  13978: { stat: "maxEnergyShield", line: 1, digits: 1 },
  101010379: { stat: "additionalMaxEnergyShieldPercent", line: 2, digits: 2 },
  101010397: { stat: "manaRegenerationPerSecond", line: 1, digits: 0 },
  101010174: { stat: "manaRegenerationSpeedPercent", line: 2, digits: 1 },
  200000401: { stat: "additionalProjectileDamagePercent", line: 1, digits: 1 },
  101010524: { stat: "additionalProjectileAilmentDamagePercent", line: 2, digits: 1 },
  382580: { stat: "projectileSpeedPercent", line: 3, digits: 1 },
  5830: { stat: "elementalResistancePercent", line: 1, digits: 1 },
  6800890: { stat: "additionalElementalDamageTakenPercent", line: 2, digits: 1 },
  579241344: { stat: "elementalAilmentAvoidancePercent", line: 3, digits: 1 },
  200000402: { stat: "movementSpeedPercent", line: 1, digits: 1 },
  200000403: { stat: "additionalDamageOverTimePercent", line: 1, digits: 1 },
  8665442: { stat: "afflictionPerSecond", line: 2, digits: 0 },
  319376192: { stat: "additionalErosionDamagePercent", line: 1, digits: 1 },
  6779909: { stat: "additionalFireDamagePercent", line: 1, digits: 1 },
  101010015: { stat: "armor", line: 1, digits: 0 },
  101010326: { stat: "additionalArmorPercent", line: 2, digits: 1 },
  749046: { stat: "additionalMinionDamagePercent", line: 1, digits: 1 },
  929288640: { stat: "minionAggressivenessPercent", line: 2, digits: 1 },
  247322000: { stat: "additionalMinionMaxLifePercent", line: 3, digits: 1 },
  101010078: { stat: "additionalAttackDamagePercent", line: 1, digits: 1 },
  871242: { stat: "additionalAreaDamagePercent", line: 1, digits: 1 },
  183965584: { stat: "additionalAreaAilmentDamagePercent", line: 2, digits: 1 },
  363414400: { stat: "additionalAilmentDamagePercent", line: 1, digits: 1 },
  101080017: { stat: "ailmentChancePercent", line: 2, digits: 1 },
  101010359: { stat: "ailmentDurationPercent", line: 3, digits: 1 }
};

export const auraScalingSs14 = auraLevelRecordsSs14;

function affixValueAtLevel(affix, level) {
  if (affix.fixedParameters) return Number(affix.fixedParameters[0]);
  const anchors = Object.entries(affix.levelMap || {}).map(([at, value]) => [Number(at), Number(value)]).sort((a, b) => a[0] - b[0]);
  if (!anchors.length || !Number.isFinite(level)) return null;
  const selected = Math.max(1, Math.min(40, level));
  if (selected <= anchors[0][0]) return anchors[0][1];
  for (let index = 1; index < anchors.length; index++) {
    const [nextLevel, nextValue] = anchors[index];
    if (selected <= nextLevel) {
      const [previousLevel, previousValue] = anchors[index - 1];
      const interpolated = previousValue + (selected - previousLevel) * (nextValue - previousValue) / (nextLevel - previousLevel);
      return Math.round(interpolated * 1e6) / 1e6;
    }
  }
  return anchors.at(-1)[1];
}

export function auraValueAtLevel(name, stat, level) {
  const affix = auraScalingSs14[name]?.affixes.find((item) => affixStats[item.affixId]?.stat === stat);
  return affix ? affixValueAtLevel(affix, level) : null;
}

export function auraValuesAtLevel(name, level) {
  const record = auraScalingSs14[name];
  if (!record) return null;
  return Object.fromEntries(record.affixes.flatMap((affix) => {
    const stat = affixStats[affix.affixId]?.stat;
    const value = affixValueAtLevel(affix, level);
    return stat && Number.isFinite(value) ? [[stat, value]] : [];
  }));
}

export function auraStatUsesEffectScale(name, stat) {
  const affix = auraScalingSs14[name]?.affixes.find((item) => affixStats[item.affixId]?.stat === stat);
  return affix?.usesGetEffectScale !== false;
}

function displayedValue(value, digits) {
  return String(Number((value + Number.EPSILON).toFixed(digits)));
}

export function scaledAuraEffects(name, level, effects) {
  const record = auraScalingSs14[name];
  if (!record || !Number.isFinite(level) || level < 1 || level > 40 || !effects?.length) return null;
  const lines = effects[0].split("\n");
  let changed = false;
  for (const affix of record.affixes) {
    const metadata = affixStats[affix.affixId];
    if (!metadata || !affix.levelMap || !lines[metadata.line]) continue;
    const value = affixValueAtLevel(affix, level);
    const replacement = displayedValue(value, metadata.digits);
    const updated = lines[metadata.line].replace(/([+-]?)(\d+(?:\.\d+)?)/, (_match, sign) => sign + replacement);
    if (updated !== lines[metadata.line]) changed = true;
    lines[metadata.line] = updated;
  }
  return { effects: [lines.join("\n"), ...effects.slice(1)], exact: true, changed };
}

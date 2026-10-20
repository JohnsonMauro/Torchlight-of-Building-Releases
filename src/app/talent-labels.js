// How a talent node and its effects are named on the page: the effect labels, a formatted effect value, a node's title
// and its fallback symbol. Shared by the talent trees (src/app/bridge/talents-view-model.ts) and the planner's tooltips.
const effectLabels = {
  afflictionPerSecond: "Affliction per second",
  damageOverTimePercent: "Damage over time",
  movementSpeedPercent: "Movement speed",
  skillAreaPercent: "Skill area",
  skillEffectDurationPercent: "Skill effect duration",
  damagePercent: "Damage",
  maxEnergyShieldPercent: "Maximum energy shield",
  energyShieldChargeSpeedPercent: "Energy shield charge speed",
  reapingRecoverySpeedPercent: "Reaping recovery speed",
  focusBlessingStacksOnReap: "Focus Blessing stacks on Reap",
  afflictionEffectPercent: "Affliction effect",
  enemyAllResistanceAtMaxAfflictionPercent: "Enemy all resistance at max Affliction",
  reapingDurationPercent: "Reaping duration",
  startsEnergyShieldChargeOnReap: "Starts energy shield charge on Reap",
  intervalSeconds: "Interval",
  chanceToGainBlurOnReapPercent: "Chance to gain Blur on Reap",
  maxLifePercent: "Maximum life",
  firePenetrationAgainstIgnitedPercent: "Fire penetration against Ignited enemies",
  inflictsFireInfiltrationAgainstIgnited: "Inflicts Fire Infiltration",
  igniteChanceAgainstNotIgnitedPercent: "Ignite chance against enemies not Ignited",
  igniteChancePercent: "Ignite chance",
  fireDamageOverTimePercent: "Fire damage over time",
  baseIgniteDamage: "Base Ignite damage",
  additionalIgniteStacks: "Additional Ignite stacks",
  attackAndCastSpeedPercent: "Attack and cast speed",
  allSkillLevels: "All skill levels",
  gainsBlurWhenEnergyShieldStartsCharging: "Gain Blur when shield starts charging",
  blurEffectPercent: "Blur effect",
  movementSpeedWhileBlurPercent: "Movement speed while Blur is active",
  movementSpeedCannotFallBelowBaseWhileBlur: "Movement speed cannot fall below base",
  sealedManaCompensationPercent: "Sealed mana compensation",
  blockRatioPercent: "Block Ratio",
};
export const effectLabel = (key) =>
  effectLabels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
export const formatEffect = (key, value) => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key.endsWith("Percent")) return `${value > 0 ? "+" : ""}${value}%`;
  if (key.endsWith("Seconds")) return `${value} s`;
  return `${value > 0 ? "+" : ""}${value}`;
};
export const nodeTitle = (node) => {
  if (node.replacedBy) return node.replacedBy;
  const effects = node.effectsPerRank || node.effects || {};
  return effectLabel(Object.keys(effects)[0] || "Talent node");
};
export const nodeIcon = (node) => {
  const keys = Object.keys(node.effectsPerRank || node.effects || {});
  if (node.replacedBy) return "◆";
  if (keys.some((key) => /shield|life|defense/i.test(key))) return "⬡";
  if (keys.some((key) => /speed|duration|reaping/i.test(key))) return "⌛";
  if (keys.some((key) => /affliction|ignite|damage|fire/i.test(key))) return "✦";
  return "◇";
};

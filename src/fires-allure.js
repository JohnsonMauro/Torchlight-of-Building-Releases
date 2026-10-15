// The later Volcano on/off test contradicts the proposed duration immunity.
// Use ordinary duration scaling provisionally; exact Scorch timing is pending.
export function firesAllureDurationSources(sources) {
  return sources;
}

export function calculateFiresAllure({ active, limit, canApply, nearby = true, stacks, baseResistance, fixedResistance = false }) {
  const activeStacks = active && canApply ? Math.max(0, Math.min(limit, Number.isFinite(stacks) ? stacks : limit)) : 0;
  // Scorch buff 131 applies -20 to every resistance at ordinary effect scale;
  // Fire's Allure separately applies -10 Fire Resistance per stack within 10m.
  const scorchBaseResistanceReductionPercent = activeStacks > 0 && !fixedResistance ? 20 : 0;
  const allureFireResistanceReductionPercent = activeStacks > 0 && nearby && !fixedResistance ? activeStacks * 10 : 0;
  const reduction = scorchBaseResistanceReductionPercent + allureFireResistanceReductionPercent;
  return { active, activeStacks, nearby, scorchBaseResistanceReductionPercent, allureFireResistanceReductionPercent, resistanceReductionPercent: reduction,
    effectiveResistancePercent: fixedResistance ? 0 : baseResistance - reduction,
    stackAssumption: Number.isFinite(stacks) ? "Configured active Scorch stacks" : "Maximum Scorch stacks · best case",
    durationAssumption: "4-second base; duration scaling provisional pending timing test" };
}

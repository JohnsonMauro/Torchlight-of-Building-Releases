// The later Volcano on/off test contradicts the proposed duration immunity.
// Use ordinary duration scaling provisionally; exact Scorch timing is pending.
export function firesAllureDurationSources(sources) {
  return sources;
}

// Scorch lowers all of the target's Resistances by 20% in Profound and by 30% in Deep Space (TLIDB Scorch, read 2026-10-26);
// Profound unless the Config tab says otherwise.
export const SCORCH_RESISTANCE_REDUCTION_PERCENT = 20;

// `fixedResistance`: false, true (fixed at 0: Fueling) or the fixed value (Ice to Blaze's Frostbitten line, hero trait audit B2).
export function calculateFiresAllure({
  active,
  limit,
  canApply,
  nearby = true,
  stacks,
  baseResistance,
  fixedResistance = false,
  scorchResistanceReductionPercent = SCORCH_RESISTANCE_REDUCTION_PERCENT,
}) {
  const fixedValue =
    fixedResistance === true
      ? 0
      : typeof fixedResistance === "number" && Number.isFinite(fixedResistance)
        ? fixedResistance
        : null;
  const activeStacks = active && canApply ? Math.max(0, Math.min(limit, Number.isFinite(stacks) ? stacks : limit)) : 0;
  // Scorch buff 131 lowers every resistance (-20 in Profound, -30 in Deep Space: the Config tab's number);
  // Fire's Allure separately applies -10 Fire Resistance per stack within 10m.
  const scorchBaseResistanceReductionPercent =
    activeStacks > 0 && fixedValue == null ? scorchResistanceReductionPercent : 0;
  const allureFireResistanceReductionPercent = activeStacks > 0 && nearby && fixedValue == null ? activeStacks * 10 : 0;
  const reduction = scorchBaseResistanceReductionPercent + allureFireResistanceReductionPercent;
  return {
    active,
    activeStacks,
    nearby,
    scorchBaseResistanceReductionPercent,
    allureFireResistanceReductionPercent,
    resistanceReductionPercent: reduction,
    effectiveResistancePercent: fixedValue != null ? fixedValue : baseResistance - reduction,
    stackAssumption: Number.isFinite(stacks) ? "Configured active Scorch stacks" : "Maximum Scorch stacks · best case",
    durationAssumption: "4-second base; duration scaling provisional pending timing test",
  };
}

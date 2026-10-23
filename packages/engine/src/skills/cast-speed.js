const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

// The character's Cast Speed for one setup, as a factor on the skill's own use rate: the increased lines in one sum, the
// additional ones (gear "more", Quick Decision on the setup, resolved conditional lines, Ceaseless Tide's Loud Song) each
// multiplying. Channel-only lines are in: a caller strips them for a skill that does not channel. Conditional Aim speed
// uses its configured uptime.
export function characterCastSpeed({
  blessings,
  ceaselessTide = false,
  main,
  talentSlate,
  equipment,
  pact,
  aimCastSpeedPercent = 0,
  lineSpeed = null,
} = {}) {
  const talent = talentSlate?.candidateTalent || {};
  const slate = talentSlate?.candidateSlate || {};
  const gear = equipment?.candidate || {};
  const spirits = pact?.totals || {};
  const increasedPercent =
    number(blessings?.castSpeedPercent) +
    number(aimCastSpeedPercent) +
    number(talent.attackAndCastSpeedPercent) +
    number(talent.castSpeedPercent) +
    number(talent.channeledAttackAndCastSpeedPercent) +
    // Talent and slate lines share one parser (packages/engine/src/text/talent-text-effects.js); before talent batch T1 only captured
    // Selena nodes filled the talent keys, and slates had no channel-only key.
    number(slate.attackAndCastSpeedPercent) +
    number(slate.castSpeedPercent) +
    number(slate.channeledAttackAndCastSpeedPercent) +
    number(gear["castSpeedPercent:increased"]) +
    number(spirits.attackAndCastSpeedPercent) +
    number(spirits.castSpeedPercent) +
    // Conditional and per-stat lines the shared resolver made active (packages/engine/src/text/line-effects.js, talent batch chunk 2).
    number(lineSpeed?.increasedPercent);
  const supportPercent = (main?.supports || [])
    .filter((support) => support.enabled !== false && support.name === "Quick Decision")
    .reduce(
      (total, support) =>
        total +
        (Number(support.effects?.join(" ").match(/([+-]\d+(?:\.\d+)?)\s*%\s+additional Attack and Cast Speed/i)?.[1]) ||
          0),
      0,
    );
  const additionalPercent = number(gear["castSpeedPercent:more"]) + supportPercent;
  const increasedFactor = Math.max(0, 1 + increasedPercent / 100);
  const additionalFactor =
    Math.max(0, 1 + additionalPercent / 100) *
    (ceaselessTide ? 0.8 : 1) *
    (lineSpeed?.additionalPercents || []).reduce((factor, value) => factor * Math.max(0, 1 + number(value) / 100), 1);
  return {
    ceaselessTideSpeedFactor: ceaselessTide ? 0.8 : 1,
    aimCastSpeedPercent: number(aimCastSpeedPercent),
    increasedPercent,
    additionalPercent,
    factor: increasedFactor * additionalFactor,
  };
}

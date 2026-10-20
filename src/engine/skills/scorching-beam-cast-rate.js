import { selenaScorchingBeamStrippedBaseline } from "../../data/stats/selena-scorching-beam-stripped-baseline.js";

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

// Conditional Aim speed uses its configured uptime in the five-second forecast.
export function scorchingBeamCastRate({
  blessings,
  ceaselessTide = false,
  main,
  talentSlate,
  equipment,
  pact,
  aimCastSpeedPercent = 0,
  lineSpeed = null,
} = {}) {
  const baseRate = selenaScorchingBeamStrippedBaseline.damage.castsPerSecond;
  const talent = talentSlate?.candidateTalent || {};
  const slate = talentSlate?.candidateSlate || {};
  const gear = equipment?.candidate || {};
  const spirits = pact?.totals || {};
  // Scorching Beam is a Channeled Skill, so channel-only speed applies to it.
  const increasedPercent =
    number(blessings?.castSpeedPercent) +
    number(aimCastSpeedPercent) +
    number(talent.attackAndCastSpeedPercent) +
    number(talent.castSpeedPercent) +
    number(talent.channeledAttackAndCastSpeedPercent) +
    // Talent and slate lines share one parser (src/engine/text/talent-text-effects.js); before talent batch T1 only captured
    // Selena nodes filled the talent keys, and slates had no channel-only key.
    number(slate.attackAndCastSpeedPercent) +
    number(slate.castSpeedPercent) +
    number(slate.channeledAttackAndCastSpeedPercent) +
    number(gear["castSpeedPercent:increased"]) +
    number(spirits.attackAndCastSpeedPercent) +
    number(spirits.castSpeedPercent) +
    // Conditional and per-stat lines the shared resolver made active (src/engine/text/line-effects.js, talent batch chunk 2).
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
    baseRate,
    ceaselessTideSpeedFactor: ceaselessTide ? 0.8 : 1,
    aimCastSpeedPercent: number(aimCastSpeedPercent),
    increasedPercent,
    additionalPercent,
    castsPerSecond: baseRate * increasedFactor * additionalFactor,
  };
}

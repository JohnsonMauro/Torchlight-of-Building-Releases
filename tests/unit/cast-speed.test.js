// The character's Cast Speed is a factor on the skill's own use rate (packages/engine/src/skills/cast-speed.js), never a
// rate built on the captured Scorching Beam baseline (3.003003 casts per second) that callers divided back out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { characterCastSpeed } from "../../packages/engine/src/skills/cast-speed.js";
import { activationMediumDotTrigger } from "../../packages/engine/src/skills/trigger-interval.js";

const close = (actual, expected) => Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected));

test("increased Cast Speed adds up, additional Cast Speed and Loud Song multiply", () => {
  const speed = characterCastSpeed({
    talentSlate: { candidateTalent: { castSpeedPercent: 12 }, candidateSlate: { attackAndCastSpeedPercent: 8 } },
    equipment: { candidate: { "castSpeedPercent:more": 10 } },
    ceaselessTide: true,
  });
  assert.equal(speed.increasedPercent, 20);
  assert.equal(speed.additionalPercent, 10);
  assert.ok(close(speed.factor, 1.2 * 1.1 * 0.8));
  assert.equal("castsPerSecond" in speed, false);
});

test("no Cast Speed is a factor of 1", () => {
  assert.equal(characterCastSpeed({}).factor, 1);
});

test("an Activation Medium's Cast Speed share reads the additional part of the factor", () => {
  const setup = {
    supportEffects: {
      trigger: [{ kind: "interval", interval: 1, status: "In calc", support: "Medium", castSpeedScaled: true }],
      triggerDetail: [{ kind: "castSpeedShare", support: "Medium", share: 1 }],
      cooldown: [],
    },
  };
  const castRate = characterCastSpeed({
    talentSlate: { candidateTalent: { castSpeedPercent: 50 } },
    equipment: { candidate: { "castSpeedPercent:more": 20 } },
  });
  const trigger = activationMediumDotTrigger({ setup, castRate });
  assert.ok(close(trigger.castAdditionalFactor, 1.2));
  assert.equal(trigger.castIncreasedPercent, 50);
});

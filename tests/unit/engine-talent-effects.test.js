import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateTalentEffects } from "../../src/engine.js";

const setup = (effectsPerRank) => ({
  panels: [{ name: "Test", allocatedNodes: [{ coordinate: [0, 0], rank: 2, effectsPerRank }] }],
});

test("aggregateTalentEffects sums each stat per rank", () => {
  assert.deepEqual(aggregateTalentEffects(setup({ afflictionPerSecond: 6, damageOverTimePercent: 9 })), {
    afflictionPerSecond: 12,
    damageOverTimePercent: 18,
  });
});

// No talent carries this stat today; the talent aggregator used to push it into a defenseSources list that only the pact
// aggregator declares, so the first talent with it would throw a ReferenceError.
test("aggregateTalentEffects totals Additional Damage Taken without throwing", () => {
  assert.deepEqual(aggregateTalentEffects(setup({ additionalDamageTakenPercent: 4 })), {
    additionalDamageTakenPercent: 8,
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateTalentEffects } from "../../packages/engine/src/engine.js";
import { resolveTalentCandidate } from "../../packages/engine/src/candidate-sources.js";
import { allProfessionTalentCatalogue } from "../../packages/engine/data/talents/all-profession-trees.generated.js";

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

// Every allocated node reads its game text, whichever tree (2026-10-23): the captured Selena node data no longer
// stands in for it. Psychic (5,2) "1.5% Blur Effect" (micro, max rank 3) was marked replaced by the captured build's
// Fire's Allure prism and counted 0 in every build; no prism is installed here.
test("a talent node's effect comes from its game text, with no captured node data", () => {
  const selections = { selectedTrees: ["Psychic", "Lich", "", ""], coreSelections: {}, prismInventory: [] };
  const ranks = { "Psychic:5,2": 3, "Lich:6,4": 1 };
  const { setup } = resolveTalentCandidate(allProfessionTalentCatalogue, ranks, selections);
  const totals = aggregateTalentEffects(setup, ranks);
  assert.equal(totals.blurEffectPercent, 4.5);
  // Lich (6,4) "+8% Sealed Mana Compensation" (legendary, max rank 1).
  assert.equal(totals.sealedManaCompensationPercent, 8);
});

// Golden master: every planner result must hash to the value recorded in expected.json. A failure means the calculation
// changed; see what moved with `pnpm golden:diff` (compares against HEAD) and, if the change is intended, `pnpm golden:update`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { goldenInputs, calculateGoldenCase } from "./cases.js";
import { canonicalJson, resultSummary, sha256 } from "./canonical.js";

const expected = JSON.parse(readFileSync(new URL("./expected.json", import.meta.url), "utf8"));
const inputs = goldenInputs();

test("golden cases match the recorded set", () => {
  assert.deepEqual(
    inputs.map(({ id }) => id),
    Object.keys(expected.cases),
  );
});

for (const { id, state } of inputs) {
  test(`golden: ${id}`, () => {
    const result = calculateGoldenCase(state);
    const recorded = expected.cases[id];
    assert.ok(recorded, `no recorded result for ${id}; run pnpm golden:update`);
    assert.deepEqual(resultSummary(result), recorded.summary, `${id}: headline figures changed`);
    assert.equal(
      sha256(canonicalJson(result)),
      recorded.sha256,
      `${id}: result changed; run pnpm golden:diff -- HEAD "${id}"`,
    );
  });
}

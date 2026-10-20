// Rewrites tests/golden/expected.json from the current code. Run only when a calculation change is intended:
//   pnpm golden:update
import { writeFileSync } from "node:fs";
import { goldenInputs, calculateGoldenCase } from "./cases.js";
import { canonicalJson, resultSummary, sha256 } from "./canonical.js";

const cases = {};
for (const { id, state } of goldenInputs()) {
  const result = calculateGoldenCase(state);
  cases[id] = { sha256: sha256(canonicalJson(result)), summary: resultSummary(result) };
}
const expected = { node: process.version, cases };
writeFileSync(new URL("./expected.json", import.meta.url), `${JSON.stringify(expected, null, 2)}\n`);
console.log(`golden: wrote ${Object.keys(cases).length} cases`);

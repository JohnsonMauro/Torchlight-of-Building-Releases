// Import keeps reading the compact build codes ("TLB3:", "TLB2:") that players may still hold
// (packages/engine/src/state/build-code-compact.js expandBuildCode): each expands to the original Export code, byte for byte.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expandBuildCode } from "../../packages/engine/src/state/build-code-compact.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/compact-build-codes.json", import.meta.url), "utf8"));
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

test("a TLB3 and a TLB2 code expand to the Export code they were made from", async () => {
  for (const code of [fixture.tlb3, fixture.tlb2]) {
    const expanded = await expandBuildCode(code);
    assert.equal(expanded.length, fixture.exportLength);
    assert.equal(sha256(expanded), fixture.exportSha256);
  }
});

test("any other text comes back trimmed", async () => {
  assert.equal(await expandBuildCode("  eyJhIjoxfQ  "), "eyJhIjoxfQ");
});

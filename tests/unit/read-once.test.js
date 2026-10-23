// A game text is read once (packages/engine/src/text/read-once.js): the reading is kept by its text, shared and frozen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readOnce } from "../../packages/engine/src/text/read-once.js";
import { cleanGameText } from "../../packages/engine/src/text/percentage-text.js";
import { classifyDamageLine } from "../../packages/engine/src/text/damage-line-classifier.js";

test("a text is read once and every caller gets the same reading", () => {
  let reads = 0;
  const read = readOnce((text) => {
    reads += 1;
    return { length: text.length, parts: text.split(" ") };
  });
  const first = read("+12% Fire Damage");
  assert.equal(read("+12% Fire Damage"), first);
  assert.equal(reads, 1);
  assert.notEqual(read("+12% Cold Damage"), first);
  assert.equal(reads, 2);
});

test("a reading of null is kept too, and texts of several arguments are kept apart", () => {
  let reads = 0;
  const read = readOnce((item, text) => {
    reads += 1;
    return item === "Kaleidoscope" ? `${item}: ${text}` : null;
  });
  assert.equal(read("Other", "a"), null);
  assert.equal(read("Other", "a"), null);
  assert.equal(reads, 1);
  assert.equal(read("Kaleidoscope", "a"), "Kaleidoscope: a");
  assert.equal(read("Kaleido", "scope\u0000a"), null);
});

test("a reading is frozen: changing it throws instead of changing it for every caller", () => {
  const reading = classifyDamageLine("+12% additional Fire Damage");
  assert.equal(reading.kind, "damage");
  assert.throws(() => {
    reading.value = 99;
  }, TypeError);
  assert.equal(classifyDamageLine("+12% additional Fire Damage").value, 12);
});

test("cleanGameText joins a percentage to its number and collapses the spaces", () => {
  assert.equal(cleanGameText("  +12 %   additional\nFire Damage "), "+12% additional Fire Damage");
  assert.equal(cleanGameText(undefined), "");
});

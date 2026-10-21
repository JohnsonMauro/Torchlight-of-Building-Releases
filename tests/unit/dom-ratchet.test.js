// A ratchet on the planner's DOM coupling. src/app is moving to commands and view sources while React owns the markup
// (CLAUDE.md, "The planner in src/app"), so the ways src/app still reaches into the page are counted here and the counts
// may only go down: a change that adds one fails, and a change that removes some must lower its baseline (so the
// ratchet stays tight). Comment lines are not counted.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const files = readdirSync(join(root, "src/app"), { recursive: true })
  .filter((file) => /\.(js|ts)$/.test(file))
  .map((file) => join("src/app", file));
const codeLines = (file) =>
  readFileSync(join(root, file), "utf8")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));

/** What is counted: occurrences, except `markupFiles` (files that build HTML strings with classes). */
const patterns = {
  domLookups: /querySelector(?:All)?\(|getElementById\(|\$\(["'`]/g,
  classListWrites: /classList\.(?:add|remove|toggle|replace)\(/g,
  styleWrites: /\.style\.\w+\s*=[^=]|\.style\.(?:setProperty|removeProperty)\(/g,
  hiddenWrites: /\.hidden\s*=[^=]/g,
  htmlWrites: /\.innerHTML\s*=[^=]|\.outerHTML\s*=[^=]|insertAdjacentHTML\(/g,
  eventListeners: /addEventListener\(/g,
};
const baseline = {
  domLookups: 128,
  classListWrites: 30,
  styleWrites: 15,
  hiddenWrites: 9,
  htmlWrites: 9,
  eventListeners: 48,
  markupFiles: 29,
};

function measure() {
  const counts = Object.fromEntries(Object.keys(baseline).map((key) => [key, 0]));
  for (const file of files) {
    const lines = codeLines(file);
    for (const [key, pattern] of Object.entries(patterns))
      for (const line of lines) counts[key] += line.match(pattern)?.length ?? 0;
    if (lines.some((line) => line.includes('class="'))) counts.markupFiles += 1;
  }
  return counts;
}

test("src/app's DOM coupling only goes down", () => {
  const counts = measure();
  const up = Object.keys(baseline).filter((key) => counts[key] > baseline[key]);
  const down = Object.keys(baseline).filter((key) => counts[key] < baseline[key]);
  assert.deepEqual(
    up.map((key) => `${key}: ${counts[key]} > ${baseline[key]}`),
    [],
    "new DOM coupling in src/app: render it in React from a view source instead",
  );
  assert.deepEqual(
    down.map((key) => `${key}: ${counts[key]} < ${baseline[key]}`),
    [],
    "coupling went down: lower the baseline in tests/unit/dom-ratchet.test.js to the new counts",
  );
});

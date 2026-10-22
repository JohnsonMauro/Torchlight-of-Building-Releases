// src/app/gear/safe-regex.ts: a typed regex that could backtrack catastrophically is refused before it runs; the useful
// ones pass. Each refused pattern is also run in a child process with a timeout, to prove it would have frozen the page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { unsafePattern } from "../../src/app/gear/safe-regex.ts";

const EXPLOSIVE = ["(.*)*z$", "(a|a)+$", "((.)|.)*z$", "(.{1,40}){1,40}z$", "(\\w+\\s?)+$"];
const REFUSED = [...EXPLOSIVE, "(a)\\1", ".*.*.*.*z", "a".repeat(101)];
const USEFUL = [
  "^ice",
  "spell damage$",
  "frost|cold",
  "\\+\\d+% (attack|cast) speed",
  "[(]\\d+–\\d+[)]",
  "(?:max )?life",
];

test("explosive, backreferenced, many-quantifier and long patterns are refused; useful ones pass", () => {
  for (const pattern of REFUSED) assert.notEqual(unsafePattern(pattern), "", pattern);
  for (const pattern of USEFUL) assert.equal(unsafePattern(pattern), "", pattern);
});

test("the explosive patterns do backtrack: run unguarded, they do not finish in a second", () => {
  const subject = "a".repeat(30) + "!";
  for (const pattern of EXPLOSIVE) {
    const run = spawnSync(
      process.execPath,
      ["-e", `new RegExp(${JSON.stringify(pattern)}).test(${JSON.stringify(subject)})`],
      {
        timeout: 1000,
      },
    );
    assert.equal(run.signal, "SIGTERM", `${pattern} finished: it would not freeze the page`);
  }
});

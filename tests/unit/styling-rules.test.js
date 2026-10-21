// The styling rules of CLAUDE.md that a test can hold. apps/web/src/styles/app.css is the only stylesheet. No utility
// spells a word the e2e tests look for in a class list (`toHaveClass(/\bselected\b/)`): Playwright matches the pattern
// against the whole class attribute, so `[&.selected]:x`, `aria-selected:x` or `empty:x` would match whatever the
// element's state (a string, `toHaveClass("rare")`, must equal the whole attribute and is safe). A utility is a token of the sources Tailwind scans (apps/web, and the @source
// folders src/app and src/game-log) that the page's own compiler turns into CSS; tokens built at run time ("${…}") and
// comment lines are not checked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { compile } from "tailwindcss";

const root = fileURLToPath(new URL("../..", import.meta.url));
const stylesheet = "apps/web/src/styles/app.css";
const filesIn = (folder, pattern) =>
  readdirSync(join(root, folder), { recursive: true })
    .filter((file) => pattern.test(file) && !/(^|\/)(node_modules|dist[^/]*)\//.test(file))
    .map((file) => join(folder, file));
const codeLines = (file) =>
  readFileSync(join(root, file), "utf8")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));

test("app.css is the only stylesheet", () => {
  const sheets = [...filesIn("src", /\.(css|scss|sass|less)$/), ...filesIn("apps", /\.(css|scss|sass|less)$/)];
  assert.deepEqual(sheets, [stylesheet]);
});

test("no utility spells a word the e2e tests read off a class list", async () => {
  const words = new Set();
  for (const file of filesIn("tests/e2e", /\.(js|ts)$/))
    for (const [, word] of readFileSync(join(root, file), "utf8").matchAll(
      /toHaveClass\(\/(?:\\b)?([\w-]+)(?:\\b)?\//g,
    ))
      words.add(word);
  assert.ok(words.has("selected") && words.size > 20, `only ${words.size} words found: the reader is broken`);
  const spellsWord = new RegExp(`\\b(${[...words].join("|")})\\b`);

  const require = createRequire(join(root, "package.json"));
  const compiler = await compile(readFileSync(join(root, stylesheet), "utf8"), {
    base: dirname(join(root, stylesheet)),
    loadStylesheet: async (id, base) => {
      const path = require.resolve(id, { paths: [base] });
      return { path, base: dirname(path), content: readFileSync(path, "utf8") };
    },
  });
  let css = compiler.build([]);
  const isUtility = (token) => {
    const next = compiler.build([token]);
    const added = next !== css;
    css = next;
    return added;
  };

  const sources = [
    ...filesIn("apps/web", /\.(js|ts|tsx|html)$/),
    ...filesIn("src/app", /\.(js|ts)$/),
    ...filesIn("src/game-log", /\.(js|ts)$/),
  ];
  let checked = 0;
  const offending = [];
  for (const file of sources)
    for (const line of codeLines(file))
      for (const token of line.split(/[\s"'`]+/)) {
        if (!spellsWord.test(token)) continue;
        checked += 1;
        if (isUtility(token)) offending.push(`${file}: ${token}`);
      }
  assert.ok(checked > 100, `only ${checked} tokens spell a word: the reader is broken`);
  assert.deepEqual(offending, []);
});

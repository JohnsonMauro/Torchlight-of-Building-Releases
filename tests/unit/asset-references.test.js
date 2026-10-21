// Every image the sources name exists on disk: "./src/assets/…" strings (page-relative, as the game data and the views
// write them) in src/ and apps/web, and the url(…) of the stylesheets (relative to the stylesheet). Strings built at
// run time ("${…}") and comment lines are not checked. Guards the layout rework, which deletes layout images.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const sourceFiles = (folder) =>
  readdirSync(join(root, folder), { recursive: true })
    .map((file) => join(folder, file))
    .filter((file) => /\.(js|ts|tsx|css|html)$/.test(file) && !file.startsWith(join("src", "assets")));
const files = [...sourceFiles("src"), ...sourceFiles("apps/web")];
const codeLines = (file) =>
  readFileSync(join(root, file), "utf8")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));

test("every ./src/assets path in the sources exists", () => {
  let checked = 0;
  const missing = [];
  for (const file of files)
    for (const line of codeLines(file))
      for (const match of line.matchAll(/\.\/src\/assets\/[^"'`)\s]+/g)) {
        if (line.slice(match.index + match[0].length).startsWith("${") || match[0].includes("${")) continue;
        checked += 1;
        if (!existsSync(join(root, match[0]))) missing.push(`${file}: ${match[0]}`);
      }
  assert.ok(checked > 1000, `only ${checked} paths found: the reader is broken`);
  assert.deepEqual(missing, []);
});

test("every url() of the stylesheets exists", () => {
  const missing = [];
  for (const file of files.filter((name) => name.endsWith(".css")))
    for (const line of codeLines(file))
      for (const [, url] of line.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
        if (/^(data:|https?:|#)/.test(url)) continue;
        if (!existsSync(join(root, dirname(file), url))) missing.push(`${file}: ${url}`);
      }
  assert.deepEqual(missing, []);
});

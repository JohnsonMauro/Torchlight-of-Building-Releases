// The shape of the import graph of src/ and the engine package (packages/engine: the engine in src/, its game data in
// data/): no import cycles; the folders depend one way (the engine, the pure domain, imports only itself and its data;
// src/game-log does not import the page in src/app); and the calculation (everything the engine's planner.js reaches)
// loads no page code: no document / storage access and no HTML helpers. Imports are read from the source text (static
// `import` / `export … from` with a relative path or `#engine`; `import type` is erased and does not count).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const ENGINE = join("packages", "engine", "src"),
  DATA = join("packages", "engine", "data");
// The engine package's entry: what `#engine` (package.json "imports") names.
const entry = join(ENGINE, "index.ts");
const walk = (folder) =>
  readdirSync(join(root, folder), { recursive: true })
    .filter((file) => /\.(js|ts)$/.test(file) && !file.startsWith("assets"))
    .map((file) => join(folder, file));
const files = [...walk("src"), ...walk(ENGINE), ...walk(DATA)];
// "engine" and "data" for the package's two folders, else the src/ folder ("app", "game-log").
const area = (file) =>
  file.startsWith(ENGINE + "/") ? "engine" : file.startsWith(DATA + "/") ? "data" : file.split(/[\\/]/)[1];
const source = Object.fromEntries(files.map((file) => [file, readFileSync(join(root, file), "utf8")]));
const imports = new Map(
  files.map((file) => {
    const targets = new Set();
    for (const match of source[file].matchAll(/(?:import|export)\s+(type\s+)?[^"'`]*?\s*from\s*["']([^"']+)["']/g)) {
      if (match[1] || !(match[2].startsWith(".") || match[2] === "#engine")) continue;
      const target =
        match[2] === "#engine" ? entry : relative(root, join(root, normalize(join(dirname(file), match[2]))));
      if (source[target] !== undefined) targets.add(target);
    }
    return [file, [...targets]];
  }),
);

function cycles() {
  let index = 0;
  const stack = [],
    onStack = new Set(),
    order = new Map(),
    low = new Map(),
    found = [];
  const visit = (file) => {
    order.set(file, index);
    low.set(file, index++);
    stack.push(file);
    onStack.add(file);
    for (const target of imports.get(file)) {
      if (!order.has(target)) {
        visit(target);
        low.set(file, Math.min(low.get(file), low.get(target)));
      } else if (onStack.has(target)) low.set(file, Math.min(low.get(file), order.get(target)));
    }
    if (low.get(file) !== order.get(file)) return;
    const component = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      component.push(member);
    } while (member !== file);
    if (component.length > 1) found.push(component.sort());
  };
  for (const file of files) if (!order.has(file)) visit(file);
  return found;
}

test("src/ and the engine package have no import cycles", () => {
  assert.deepEqual(cycles(), []);
});

test("the calculation reaches no page code", () => {
  const reached = new Set();
  const queue = [join(ENGINE, "planner.js")];
  while (queue.length) {
    const file = queue.pop();
    if (reached.has(file)) continue;
    reached.add(file);
    queue.push(...imports.get(file));
  }
  assert.ok(reached.size > 100, `only ${reached.size} modules reached: the import reader is broken`);
  const pageCode = [...reached].filter(
    (file) =>
      file === join("src", "app", "html.js") ||
      /\bdocument\.|\b(?:localStorage|sessionStorage)\b/.test(source[file].replace(/^\s*\/\/.*$/gm, "")),
  );
  assert.deepEqual(pageCode, []);
});

test("the engine imports only itself and its data; src/game-log does not import src/app", () => {
  const allowed = { engine: ["engine", "data"], "game-log": ["game-log", "engine", "data"] };
  const crossings = files.flatMap((file) =>
    (allowed[area(file)] ? imports.get(file) : [])
      .filter((target) => !allowed[area(file)].includes(area(target)))
      .map((target) => `${file} -> ${target}`),
  );
  assert.deepEqual(crossings, []);
});

// The engine's boundary: code outside the package (the planner page, the game log import, the React app) reaches the engine
// and its game data only through `#engine`, type imports and on-demand import() included; the engine never imports its
// own entry.
test("outside code reaches the engine package only through #engine", () => {
  const outside = ["src/app", "src/game-log", "apps/web/src"].flatMap((area) =>
    readdirSync(join(root, area), { recursive: true })
      .filter((file) => /\.(js|ts|tsx)$/.test(file))
      .map((file) => join(area, file)),
  );
  assert.ok(outside.length > 200, `only ${outside.length} outside files: the file walk is broken`);
  const resolve = (file, spec) =>
    spec.startsWith("@legacy/")
      ? join("src", spec.slice("@legacy/".length))
      : spec.startsWith(".")
        ? normalize(join(dirname(file), spec))
        : null;
  const pattern = /(?:\b(?:import|export)\s[^"'`;]*?\bfrom\s*|\bimport\(\s*)["']([^"']+)["']/g;
  const reachesInside = (file) =>
    [...readFileSync(join(root, file), "utf8").matchAll(pattern)]
      .map((match) => resolve(file, match[1]))
      .filter((target) => target && /^packages[\\/]engine[\\/]/.test(target))
      .map((target) => `${file} -> ${target}`);
  assert.deepEqual(outside.flatMap(reachesInside), []);
  assert.deepEqual(
    files.filter((file) => area(file) === "engine" && file !== entry && imports.get(file).includes(entry)),
    [],
    "the engine imports its own entry",
  );
});

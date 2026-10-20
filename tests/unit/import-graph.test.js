// The shape of src/'s import graph: no import cycles, and the calculation (everything src/planner.js reaches) loads no
// page code: no document / storage access and no HTML helpers. Imports are read from the source text (static `import` /
// `export … from` with a relative path; `import type` is erased and does not count).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const files = readdirSync(join(root, "src"), { recursive: true })
  .filter((file) => /\.(js|ts)$/.test(file) && !file.startsWith("assets"))
  .map((file) => join("src", file));
const source = Object.fromEntries(files.map((file) => [file, readFileSync(join(root, file), "utf8")]));
const imports = new Map(
  files.map((file) => {
    const targets = new Set();
    for (const match of source[file].matchAll(/(?:import|export)\s+(type\s+)?[^"'`]*?\s*from\s*["']([^"']+)["']/g)) {
      if (match[1] || !match[2].startsWith(".")) continue;
      const target = relative(root, join(root, normalize(join(dirname(file), match[2]))));
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

test("src/ has no import cycles", () => {
  assert.deepEqual(cycles(), []);
});

test("the calculation reaches no page code", () => {
  const reached = new Set();
  const queue = ["src/planner.js"];
  while (queue.length) {
    const file = queue.pop();
    if (reached.has(file)) continue;
    reached.add(file);
    queue.push(...imports.get(file));
  }
  assert.ok(reached.size > 100, `only ${reached.size} modules reached: the import reader is broken`);
  const pageCode = [...reached].filter(
    (file) =>
      file === join("src", "html.js") ||
      /\bdocument\.|\b(?:localStorage|sessionStorage)\b/.test(source[file].replace(/^\s*\/\/.*$/gm, "")),
  );
  assert.deepEqual(pageCode, []);
});

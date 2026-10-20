// Shows what changed in planner results between a git ref and the working tree:
//   pnpm golden:diff                  # HEAD vs working tree, every case
//   pnpm golden:diff -- main "youga-l94"
// The ref's src/ and tests/golden/ are extracted to a temp folder (src/assets left out: the planner never reads it) and
// its own cases.js runs there, so file moves between the two sides do not matter.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalValue, differingPaths, resultSummary } from "./canonical.js";

const [ref = "HEAD", onlyId] = process.argv.slice(2).filter((arg) => arg !== "--");
const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const folder = mkdtempSync(join(tmpdir(), "tli-golden-"));

try {
  const archive = join(folder, "ref.tar");
  execFileSync("git", ["-C", repoRoot, "archive", "--format=tar", `--output=${archive}`, ref, "--", "src", "tests/golden", ":(exclude)src/assets"]);
  execFileSync("tar", ["-xf", archive, "-C", folder]);
  writeFileSync(join(folder, "package.json"), JSON.stringify({ type: "module" }));
  const before = await import(pathToFileURL(join(folder, "tests/golden/cases.js")).href);
  const after = await import("./cases.js");
  const beforeInputs = new Map(before.goldenInputs().map(({ id, state }) => [id, state]));
  let changed = 0;
  for (const { id, state } of after.goldenInputs()) {
    if (onlyId && id !== onlyId) continue;
    if (!beforeInputs.has(id)) { console.log(`+ ${id}: new case`); continue; }
    const left = canonicalValue(before.calculateGoldenCase(beforeInputs.get(id)));
    const right = canonicalValue(after.calculateGoldenCase(state));
    const paths = differingPaths(left, right);
    if (!paths.length) continue;
    changed++;
    console.log(`\n~ ${id}`);
    console.log(`  summary ${JSON.stringify(resultSummary(left))}\n       -> ${JSON.stringify(resultSummary(right))}`);
    for (const { path, before: was, after: now } of paths) console.log(`  ${path}\n    - ${was}\n    + ${now}`);
  }
  console.log(changed ? `\ngolden diff: ${changed} case(s) changed vs ${ref}` : `golden diff: no change vs ${ref}`);
} finally {
  rmSync(folder, { recursive: true, force: true });
}

---
name: engine-guide
description: Rules for the calculation engine and game data — packages/engine/src purity, packages/engine/data kept byte for byte, TypeScript that Node runs with the types stripped, and the golden master workflow (pnpm golden:diff before pnpm golden:update). Use before changing anything under packages/engine/src or packages/engine/data, the planner state shape or its normalization, or when the golden test goes red.
---

# Engine and game data

## 0. The game's rules, for any character (owner, 2026-10-23)

The engine is the game's rules, in layers: the rules and formulas → applied to the character (stats, gear, talents,
skills, hero, pacts) → damage and survival. It is calibrated against real characters read from game logs, but a
calibration corrects a rule for every character: never a constant, baseline, snapshot or setup captured from one
character (the inherited Selena capture is being removed for that reason). A number that does not
match the game is an open question about a rule, checked against logs of more than one character.

## 1. Boundaries

- `packages/engine/src/` is the pure domain: it imports only `packages/engine/src` and `packages/engine/data`. No DOM, no storage, no HTML helpers:
  `tests/unit/import-graph.test.js` also checks that nothing `packages/engine/src/planner.js` reaches loads page code.
- The engine is a package, `@tob/engine` (`packages/engine/package.json`, major version = the game season). Its public
  entry `packages/engine/src/index.ts` is `#engine` (the root `package.json` "imports"), the only module outside code
  (`src/app`, `src/game-log`, `apps/web`) imports from the engine or its data, type imports and `import()` included
  (import-graph test). The page
  needs something new from the engine: add its name to the entry, in its domain's group. The engine never imports its own
  entry. Data loaded on demand stays on demand through a function there (`importGameIdMap`). The engine follows the
  game's seasons: this surface is what the page relies on when the engine moves to the next season.
- Seasons: the engine calculates the last season of `packages/engine/src/state/season.ts`. A stored build carries `season` (the
  rules its contents follow), `seasonOrigin` (the season it was made in) and `seasonChange` (what carrying it forward
  removed, until the user dismisses it). `normalizePlannerState` first runs `migrateBuildSeason`
  (`packages/engine/src/state/season-migration.js`): a build of an earlier season goes through `seasonSteps` and then
  `removeIncompatible` (`season-compatibility.js`, one pass per domain: talent ranks on missing trees or nodes or above a
  node's max, missing cores, prisms on missing nodes, then the ranks whose prerequisites went; legendaries out of the
  catalog; a missing hero, traits, loadouts; missing skills and supports; missing Pactspirits and Kismets. Each removal
  is listed and its talent points returned. Only references by name are checked: texts copied into the build are the
  season step's work. Every golden build must go through it untouched); an unknown season is
  refused. A new season: an entry in `season.ts`, the step from the one before in `seasonSteps`, the package's major version, the data replaced in place,
  and a migration test with a build of the season before.
- Game text is read once (`packages/engine/src/text/read-once.js`): a reader whose result depends on the text alone is wrapped in
  `readOnce` (or uses `cleanGameText`), and what depends on the build is applied to the reading by the caller. A reading
  is frozen and shared: copy it before changing it.
- The entry is `calculatePlanner(state)` (`packages/engine/src/planner.js`); the state shape and its normalization live in
  `packages/engine/src/state/planner-state.ts` (`defaultPlannerState`, `normalizePlannerState`), and
  `packages/engine/src/state/state-validation.ts` (`validatePlannerState`) rejects unknown keys. A new state field gets a
  default and a normalization rule, a validation entry (or every stored build carrying it is rejected), and cases in
  `tests/unit/planner-state.test.js` and `state-validation.test.js`.
- `packages/engine/data/` is game data, mostly `*.generated.js` from upstream's data tools: kept byte for byte (Prettier ignores
  the folder) so a new upstream copy diffs cleanly. Never hand-edit a generated file; a correction goes in engine code
  or a non-generated data module, with the reason in a comment. The one sanctioned difference: no season in names.
  Upstream's file names and identifiers carry a season label (`-ss13`, `Ss13`); ours do not (owner, 2026-10-23: the
  season lives in `season.ts`, the package's major version and the stored build, so a new season renames nothing).

## 2. TypeScript run by Node

`.ts` files under `src/` run in Node with the types stripped (the golden and unit tests import them directly), so
`tsconfig.json` sets `erasableSyntaxOnly`: no `enum`, no `namespace`, no parameter properties. Imports name the
`.ts` file (`allowImportingTsExtensions`); type-only imports use `import type` (`verbatimModuleSyntax`).

## 3. Golden master

`tests/golden/` hashes the full planner result of each case (`cases.js`: the default build, a real imported build —
Youga The Ultimate One, L94, from a game log —, every hero with two trait picks on that build's gear, and combat
setting variants) against `expected.json`, plus a readable summary per case.

- Red golden test = the calculation changed. Run `pnpm golden:diff` (HEAD vs working tree; `pnpm golden:diff -- main
  "youga-l94"` for one case against a ref) and read which JSON paths moved.
- Unintended movement is a bug: fix it, do not update.
- Intended change (a formula fix, new game data): `pnpm golden:update`, and commit `expected.json` with the change
  that caused it, the commit body naming what moved and why.
- A structure-only change (move, rename, split) must leave the golden master untouched: that is its proof.
- Removing result keys nothing reads, or renaming one, changes the hashes but no value: list every changed path
  against HEAD (no cap) and accept only `value → undefined` for removals; for a rename, compare the new key under its
  old name (zero paths) and once without that mapping as a control (both keys show). Then `pnpm golden:update`, and
  the commit body names the removed or renamed keys.

## 4. Testing engine code

A focused rule gets a unit test next to the existing ones (`tests/unit/engine-talent-effects.test.js` style),
written first for a bug (`verify-guide` §3). The golden master is the broad net, not a substitute for the test that
names the rule.

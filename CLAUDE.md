# Torchlight of Building — agent guide

Build planner and damage calculator for Torchlight: Infinite (SS14). Web app (Vite + React 19 + TypeScript) that
Electron also loads. Forked from TomSelleck09's project (MIT, his copyright line stays in `LICENSE`); developed here
independently, his repo is reference only (`upstream-port` skill). Code, comments and commits in English.

## Commands

```bash
pnpm install
pnpm dev                 # Vite dev server, http://127.0.0.1:4173 (also serves /api/game-log/snapshots)
pnpm lint                # ESLint (flat config; legacy findings frozen in eslint-suppressions.json)
pnpm typecheck           # tsc for apps/web and the repository
pnpm format:check        # Prettier (printWidth 120)
pnpm test                # node --test: engine golden master + unit tests (~20 s)
pnpm test:e2e            # builds, then Playwright on the dev server and on the build (430 tests, ~6.5 min)
pnpm test:desktop        # Electron smoke
pnpm golden:diff         # what changed in the golden master; pnpm golden:update rewrites it (only for a wanted change)
```

Before a commit: lint, typecheck, format:check and `pnpm test` green; e2e green when the commit touches the UI or
`src/app`. While iterating, the owner decides how much runs between edits; a targeted run
(`pnpm exec playwright test tests/e2e/skills.spec.js`, after `pnpm build:web` for the `build` project) is the default.

## Layout

| Path | What | Rule |
|---|---|---|
| `src/engine/` | the calculation (pure domain), one season of the game | imports only `src/engine` and `src/data`; no DOM, no storage; outside code uses only `src/engine/index.ts` |
| `src/data/` | game data, mostly `*.generated.js` from upstream's tools | kept byte for byte (Prettier ignores it) |
| `src/game-log/` | game log reader and import | never imports `src/app` |
| `src/app/` | the planner page: state, commands, view models (`planner-guide`) | |
| `src/app/bridge/` | view models and the two channels to React (`view-sources.ts`, `planner-commands.js`) | pure view models |
| `apps/web/src/shell/` | the app frame: `AppShell`, header, view rail, build strip, footer, tooltip host, toast | |
| `apps/web/src/pages/<page>/` | a page's composition: `build/` (one view per build tab), `stats/`, `configuration/`, `builds/` | composes features; little markup |
| `apps/web/src/features/<feature>/` | a feature's components, dialogs and `*-classes.ts` | renders view sources, calls commands |
| `apps/web/src/ui/` | shared React pieces and class constants several features use, the theme switch | |
| `apps/web/src/styles/app.css` | the only stylesheet: Tailwind 4, tokens, shared utilities and variants (`styling-guide`) | no `.css` beside components |
| `src/assets/` | images; every content image stays, also unreferenced ones | layout images go once unused |
| `tests/unit`, `tests/golden`, `tests/e2e` | unit, engine golden master, Playwright (page objects in `tests/e2e/pages`) | |

Dependencies point down: `apps/web` → `src/app` (bridge) → `src/engine` → `src/data`. Guards that fail the build:
`tests/unit/import-graph.test.js` (no cycles, the folder rules above, `src/app`, `src/game-log` and `apps/web` reach the
engine and its data only through `src/engine/index.ts`), `dom-ratchet.test.js` (the planner's DOM
coupling only goes down), `styling-rules.test.js` (one stylesheet, no state word in a utility),
`asset-references.test.js` (every `./src/assets/…` path exists).

## Data flow

A React view reads a view source (`useViewSource("skills")`); a user action calls a planner command
(`plannerCommands().resetSkills()`); the command edits `plannerState` and calls `persistPlannerState()` (save, one
queued render) or `viewSourceChanged(name)`; the view re-reads its source. What is read only on demand (a tooltip's
details) is a planner query (`plannerQueries()…`). Page state the UI shows (the open view) is a source too, never the
DOM. Recipes: `planner-guide`; tooltips: `tooltip-guide`.

## Skills — which to load for which change

Skills live in `.claude/skills/<name>/SKILL.md`; each `description` says when it applies. This table is the other
direction: **before editing, find the rows for the change and load every skill in them** (the union when several
rows fit). Loading a skill after the code is written is too late.

| Change | Load |
|---|---|
| **Any change** (always, on top of the rows below) | `verify-guide` |
| Any UI touched: markup, classes, layout, spacing, a new screen part | `styling-guide`, `react-guide` |
| A new React component, hook or dialog | `react-guide`, `styling-guide`, `e2e-guide` |
| A command, a view source, a query, a controller, `plannerState` | `planner-guide` |
| A tooltip (new kind, content, a card another tooltip shows) | `tooltip-guide`, `planner-guide`, `styling-guide` |
| The calculation (`src/engine`), game data (`src/data`), state normalization | `engine-guide` |
| A bug fix | `verify-guide` (regression test first) + the rows for the area |
| An e2e test, a page object, a class or id a test reads | `e2e-guide` |
| Deleting legacy code, moving or renaming files, a sweep | `refactor-guide` + the rows for what moves |
| Porting a change from TomSelleck09's repo | `upstream-port` + the rows for what it touches |
| A new or bumped dependency | run `/deps-update` (only when the owner asks) |

## Design system, in one paragraph

Density first: no space that holds nothing (no min-heights to fill a panel, no padding stacked on padding). Every
build tab's content opens with `BuildTabs` (every build tab, its "?" beside its label, the open one lit; the user
drags them into the order they want); a tab's figures and buttons sit beside what they act on (Skills: on the board's tab row; Gear: Craft beside
the Inventory's Sort); panels inside a section card use one rhythm (`m-3 p-3`). A pattern that a second
place needs becomes a shared constant or component in `apps/web/src/ui/` the same day, and the copies it replaces
are deleted. Details and the reference screen: `styling-guide`.

## Never

- Never claim a change works without having seen it work (test output, a screenshot, a probe): `verify-guide`.
- Never leave dead code behind a replacement: the old component, class, field, test helper and asset reference go in
  the same change.
- Never write a colour, a gradient or a glow in a component; never add a `.css` file; never spell a state word in a
  utility (`styling-guide`).
- Never touch `src/data/**/*.generated.js` by hand; never run `pnpm golden:update` to make a red test green without
  reading `pnpm golden:diff` first.
- Never lower a guard to make it pass (eslint-suppressions, dom-ratchet baseline up, a skipped test).
- `package.json` `build.publish` still points at upstream's releases: electron-updater would replace our build with
  his. Repoint or disable it before a desktop build of ours.

## Git

Commit messages: one imperative sentence that says what changed for the user or the code ("Move the Skills reset into
the section heading"), body only when the why is not obvious. Structure and behaviour in separate commits when both
happen (`refactor-guide`). No AI attribution of any kind.

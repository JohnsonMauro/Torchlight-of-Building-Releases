# Torchlight of Building — agent guide

Build planner and damage calculator for Torchlight: Infinite (SS14). Web app (Vite + React 19 + TypeScript) that
Electron also loads. Forked from TomSelleck09's project (MIT, his copyright line stays in `LICENSE`); developed here
independently. Code, comments and commits in English.

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

Every change: lint, typecheck, format:check and `pnpm test` green; e2e green before a commit that touches the UI or
`src/app`.

## Layout

| Path | What | Rule |
|---|---|---|
| `src/engine/` | the calculation (pure domain) | imports only `src/engine` and `src/data`; no DOM, no storage |
| `src/data/` | game data, mostly `*.generated.js` from upstream's tools | kept byte for byte (Prettier ignores it) |
| `src/game-log/` | game log reader and import | never imports `src/app` |
| `src/app/` | the planner page: state, commands, view models | see below |
| `src/app/bridge/` | view models and the two channels to React (`view-sources.ts`, `planner-commands.js`) | pure view models |
| `apps/web/src/` | React: `shell/` (page, header, dialogs), `features/<section>/`, `ui/` | renders view sources, calls commands |
| `src/styles.css` | the legacy stylesheet (23k lines) | only shrinks; new styling goes with its component |
| `tests/unit`, `tests/golden`, `tests/e2e` | unit, engine golden master, Playwright (page objects in `tests/e2e/pages`) | |

`tests/unit/import-graph.test.js` locks the import graph: no cycles anywhere in `src/`, and the folder rules above.

## The planner in `src/app`

- `app.js` — boot only: registers every section's commands and view sources, installs the document listeners in a
  fixed order, restores where the user was, first render.
- `planner/session.js` — the open build: `plannerState` (a live export; replace it only through
  `applyPlannerState`), derived collections (`talentRanks`, `equippedSlateIds`, slate placements via setters…),
  `capturePlannerState`, `persistPlannerState` (save + queued render), `currentPlanner` (cached calculation),
  `renderCandidateViews` (calls the renderer `planner/workspace.js` registers).
- `planner/ui-state.js` — `ui`: where the user is (view, open tree, stats panel, selections several sections share).
  Section-private UI state stays a `let` in its controller.
- `planner/page.js` — DOM helpers (`$`, `showToast`, `artwork`, header status).
- `<section>/*-controller.js` — one per section (gear, talents + prisms, slates, skills board + selector, hero +
  memories + follower, pacts, stats, configuration, builds + game log, feedback): its state, its commands object
  (`gearCommands`…) and its view sources (`gearViewSources`…).
- `tooltips/` — `tooltip-host.js` (position, hide; low level) and the content per kind; `planner-tooltips.js` shows
  them and owns their listeners.

An imported binding cannot be assigned: a module that must change another module's `let` calls a setter or function
that module exports. Dependencies point down: `app.js` → controllers → `planner/session.js` → `planner/ui-state.js`.

## Data flow

A React view reads a view source (`useViewSource("equipment")`); a user action calls a planner command; the command edits
`plannerState`, calls `persistPlannerState()` (save, then one queued render) or `viewSourceChanged(name)`; the view
re-reads its source.

## Refactor direction (2026-10-20)

Refactor by exclusion: delete legacy code and CSS in large blocks and write the replacement for this architecture. The
safety net is e2e + the engine golden master + typecheck. New layout styling: Tailwind 4 utilities plus a `.css` next
to the component for real drawing (backgrounds and frames that replace layout PNGs). Layout images (backgrounds,
frames, wordmarks) may go once nothing uses them; every content image (items, heroes, skills, pacts, slates) stays,
also unreferenced ones (`tests/unit/asset-references.test.js` guards the references).

## Styling (Tailwind 4 beside the legacy sheet)

- `apps/web/src/styles/app.css` is the page's stylesheet: layers `theme, base, legacy, components, utilities`;
  `src/styles.css` is imported into `legacy`, so utilities win over it. Tokens (`bg-surface`, `text-ember`,
  `font-display`…) are its `@theme`. Preflight is off while legacy rules still style most of the page.
- A legacy `!important` beats any utility (important declarations reverse the layer order): delete that legacy
  declaration instead of fighting it.
- No Preflight means buttons keep the browser's border and background: a new button sets them (`border-0
  bg-transparent`, or its own border).
- Tailwind writes a utility for every source word that is a utility name (`hidden`, `grid`, `fixed`…). Never give
  legacy markup such a class name; it would get the utility.
- A screen moving to the new layout drops its legacy rules (every selector that names the component's classes goes)
  and keeps the class names JS or tests still look up (`site-header`, `view-tab`, `loadout-tab`, `loadout-status`).

## Porting upstream

Upstream (`upstream` remote) is reference only: read `git diff <last-ported>..upstream/main` and port by hand. His
`src/` root modules live in folders here (`src/engine/<domain>/` for pure domain code, `src/app/` for the page,
`src/game-log/` for the log import), and his `src/app.js` code is split into the section
controllers above. His `src/data/**` paths are unchanged.

## Before a desktop build of ours

`package.json` `build.publish` still points at upstream's releases: electron-updater would replace our build with his.
Repoint or disable it first.

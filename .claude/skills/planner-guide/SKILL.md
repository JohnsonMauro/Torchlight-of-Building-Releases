---
name: planner-guide
description: How the planner in src/app works and how to extend it — plannerState and session.js, section controllers, view sources, planner commands, planner queries, the DOM ratchet and the import direction. Use before adding or changing a command, a view source, a query, a view model in src/app/bridge, a controller, or anything that reads or writes plannerState, and before a React view reads new planner data.
---

# The planner (`src/app`)

§1 and §4 hold for every change here; the recipe depends on what the UI needs:

| The UI needs | Mechanism | Section |
|---|---|---|
| data to render, kept up to date | a view source (+ a pure view model with a unit test) | §2 "React needs new data" |
| to change the build or the page | a command | §2 "A user action" |
| details only when asked (a tooltip, a preview) | a query inside `withRenderPass` | §2 "Read on demand" (+ `tooltip-guide`) |
| page state (open view, a mode, a selection) | a source, never the DOM | §3 |
| to drop a field or command its UI no longer uses | delete it everywhere in the same change | §2 last paragraph |

## 1. Modules

- `app.js` — boot only: registers every section's commands (`providePlannerCommands`), queries
  (`providePlannerQueries`) and view sources (`provideViewSource`), installs the document listeners in a fixed
  order, restores where the user was, first render.
- `planner/session.js` — the open build: `plannerState` (a live export; replace it only through `applyPlannerState`),
  derived collections (`talentRanks`, `equippedSlateIds`, slate placements via setters…), `capturePlannerState`,
  `persistPlannerState` (save + one queued render), `currentPlanner` (cached calculation), `withRenderPass` (one
  calculation for everything a read needs), `renderCandidateViews`.
- `planner/ui-state.js` — `ui`: where the user is (view, open tree, stats panel, selections several sections share).
  Section-private UI state stays a `let` in its controller.
- `planner/page.js` — DOM helpers (`$`, `artwork`) and what the page says about the open build: the `buildStatus`,
  `toast` and `otherTabNotice` sources (`updateStorageStatus`, `showToast`: plain text, never escaped).
- `<section>/*-controller.js` (and `skills/skill-board.js`) — one per section: its state, its commands object
  (`gearCommands`…), its queries (`gearQueries`…) and its view sources (`gearViewSources`…).

An imported binding cannot be assigned: a module that must change another module's `let` calls a setter or function
that module exports. Dependencies point down: `app.js` → controllers → `planner/session.js` → `planner/ui-state.js`.
`tests/unit/import-graph.test.js` fails on a cycle.

## 2. Recipes

**React needs new data → a view source.**
1. The shape: an interface in `src/app/bridge/<domain>-view-model.ts` and a **pure** builder that takes what it needs
   (`skillsView(planner, skillsState, tab)`), with a unit test in `tests/unit/<domain>-view-model.test.js`.
2. The name and type: an entry in `ViewSources` (`src/app/bridge/view-sources.ts`).
3. The reader: in the controller's `xViewSources` object (`skills: () => skillsView(currentPlanner(), …)`); `app.js`
   provides it.
4. The component: `useViewSource("name")` (null until the planner has provided it — render a placeholder).
5. When it changes outside a save: `viewSourceChanged("name")`. A save already re-renders through
   `persistPlannerState()`.

**A user action → a command.** Typedef in `PlannerCommands` (`src/app/bridge/planner-commands.js`), the function in
the controller's `xCommands`, spread into `providePlannerCommands` in `app.js`. The component calls
`plannerCommands().name(...)`. The command edits `plannerState` and ends with `persistPlannerState()`.

**Read on demand (a tooltip's details) → a query.** In the controller's `xQueries`, wrapped in `withRenderPass`,
provided in `app.js`, read through `plannerQueries()` when the UI asks. Never published ahead, never changes the build.

**A field nothing reads any more** (a view model field after its UI went): delete it from the interface, the builder
and the unit asserts in the same change (2026-10-22: `setupCount` left with the "Skill setups" counter).

## 3. Page state is a source, never the DOM

The open view is the `workspace` source: each section hides itself with `useViewOpen`, the rail and the build strip
light their tab, `PageMain` picks the layout. New page state the UI shows (a mode, a selection) goes the same way.

The planner still reaches into the page in many places (DOM lookups, `classList`, `style`, `hidden`, `innerHTML`,
listeners, HTML strings). `tests/unit/dom-ratchet.test.js` counts them and they may only go down: a change that
removes some lowers its baseline in the same commit; a change that adds one is redesigned as a source or command.

## 4. Purity of the layers

- `src/app/bridge/*-view*.ts` builders are pure: no DOM, no storage, no `plannerState` import; what depends on the
  open build is passed in. That is what makes them unit-testable.
- `src/engine` never imports `src/app` (`engine-guide`); `src/game-log` never imports `src/app`. Both `src/app` and
  `src/game-log` reach the engine and game data only through `src/engine/index.ts` (`engine-guide` §1).
- A React component never imports a controller or `planner/session.js`: it reaches the planner through
  `@legacy/app/bridge/*` (commands, queries, view sources, view model types) and may import pure helpers from other
  `src/app` folders (`gear/tier-badge.ts`, `stats/number-text.ts`, `notice-classes.js`…); what it needs from the engine
  or the game data (keywords, a catalog) comes from `@legacy/engine/index.ts`.

---
name: design-guide
description: Design principles and patterns as this planner applies them — cohesion and coupling, a pure calculation core with effects at the edge, one owner per piece of state, dependency direction, parse at the boundary, names with units, patterns chosen by symptom (strategy as a map, registry, memoization) — and the symptom → principle → move table for the procedural code inherited from upstream (giant modules, state keyed by display names, rounding and HTML inside the calculation). Use before deciding where code lives or how to split a module, before adding an abstraction or a pattern, when reviewing a design, and before restructuring legacy code in packages/engine/src or src/app.
---

# Design

The upstream code is procedural: `packages/engine/src/planner.js` is 6,742 lines, `combat-states.js` 2,718
(2026-10-23), one calculation reaching into everything. We restructure it toward the principles below, by exclusion
and behind the safety net (`refactor-guide`). This guide says **why** and **where code goes**; `refactor-guide` says
how to move it safely.

## 1. Principles, as they hold here

- **Cohesion and coupling first.** A module hides one decision that may change (a game mechanic, a data format, a
  screen) and changes for one reason. Split a giant module by the decision it hides, not by step ("parse",
  "compute", "format" across every mechanic is the procedural shape).
- **Pure core, effects at the edge.** The calculation is a function of the build: `packages/engine/src` has no DOM, no
  storage, no clock, no randomness (`engine-guide` §1); view models in `src/app/bridge` are pure builders
  (`planner-guide` §4). Effects (storage, DOM, the game log, toasts) live in controllers, `session.js` and React.
  Anything that reads `Date.now()`, storage or the page in the middle of a rule gets it as a parameter.
- **One owner per piece of state.** The open build is `plannerState`, replaced only through `applyPlannerState` and
  changed only by commands (`planner-guide`). Page state is a view source, never the DOM. A second writer is a bug
  waiting.
- **Dependencies point toward the pure core:** `apps/web` → `src/app` → `#engine` → data, locked by
  `tests/unit/import-graph.test.js`. A cycle is broken by moving the shared piece down, never by a late import.
- **Parse at the boundary, trust inside.** Stored builds go through `normalizePlannerState` and `validatePlannerState`;
  game text through the readers (`readOnce`). Code past the boundary does not re-check `if (!x) return` on every line;
  a new input (a field, an import format) gets its parser at the boundary.
- **Make illegal states unrepresentable** where it is cheap: a mode is one field with a closed set of values, not two
  booleans that can disagree.
- **Names carry the unit** (`seconds`, `percent` vs `factor`, `perHit`) and the identity is an id, the name an
  attribute (`data-guide` §2).
- **KISS, DRY of knowledge, YAGNI.** Share at the second real consumer (`CLAUDE.md` design system, `refactor-guide`
  §7); unite only what changes together; a shared piece that keeps gaining flags goes back inline (Metz, "The Wrong
  Abstraction").

## 2. Patterns, by symptom

| Symptom | Pattern as written here | Where it already is |
|---|---|---|
| A `switch` / `if` chain on a kind, repeated in several places | strategy as a **map** from kind to function or record | — (the inherited code branches on strings; new code uses a map) |
| Many producers, one place that lists them | **registry** | `provideViewSource`, `providePlannerCommands`, `providePlannerQueries` (`app.js`) |
| The UI must react to changes | **observer** through the view source channel | `useViewSource` + `viewSourceChanged` |
| A user action changes the build | **command** (a named function that edits the state and persists) | `src/app/<section>/*-controller.js` |
| The same pure result asked for many times | **memoization** with a key that is the whole input | `readOnce` (game text), `currentPlanner` (one calculation per render pass) |
| Outside data in another shape | **adapter** at the boundary | `src/game-log/game-log-import.js` (log → build) |

A pattern earns its place when it removes conditionals from the callers. If a caller keeps its `if`s plus one more
indirection, the abstraction is wrong. With first-class functions, most GoF patterns are a function or a map, not a
class hierarchy.

## 3. From procedural to structured: symptom → move

| Symptom in inherited code | Principle | Move |
|---|---|---|
| A module of thousands of lines doing every mechanic | cohesion, information hiding | extract one mechanic at a time into `packages/engine/src/<domain>/`, golden master untouched (a structure commit) |
| State keyed by display names (`"Goddess of Knowledge:0,2"`, `setupEnabled["Scorching Beam"]`) | identity vs label | new state keyed by id; old builds translated once at the boundary (normalize / season step), with the owner's decision since it changes the stored build |
| Strings compared in many places (`=== "Scorching Beam"`: 21 times in 5 engine modules, 2026-10-23) | closed set, strategy as a map | one constant or one map per kind; the mechanic of one skill in its own module |
| A fallback for an empty field buried in the calculation | parse at the boundary | the default lives in `defaultPlannerState` / normalization, the calculation reads what it is given |
| Rounding or HTML inside the calculation | pure core, separated presentation | the calculation returns numbers and plain data; formatting in the formatters or the view model (`numbers-guide`) |
| A function taking the whole state to read two fields | narrow parameters | pass what it reads; the caller chooses |
| A mode parameter and per-caller `if`s inside a shared function | wrong abstraction | inline into each caller, delete what each does not use, extract what is really common |
| Copy-paste with small differences | DRY of knowledge | unite only what changes together; the rest stays duplicated on purpose |
| `init1(); init2(); init3()` in an order that must not change | explicit dependency | pass dependencies as parameters; compose in one entry (`app.js`) |

Order of attack that tends to work: safety net (golden, e2e) → owner of the state → pure calculation separated from
effects → boundary parsing and types → names. Each step makes the next cheaper.

Sources: Parnas, "On the Criteria To Be Used in Decomposing Systems into Modules" (1972); Martin, "Solid Relevance"
(2020); Fowler, "Is Design Dead?", "Yagni", "Presentation Domain Data Layering"; Metz, "The Wrong Abstraction";
Bernhardt, "Functional Core, Imperative Shell"; King, "Parse, don't validate"; Norvig, "Design Patterns in Dynamic
Languages".

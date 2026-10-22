---
name: verify-guide
description: How to prove a change in this planner before saying it works — read the real code path, see UI changes rendered (throwaway Playwright screenshot spec), write the regression test first for a bug, prove a test catches the bug by planting it, and report what was verified, inferred and not checked. Use on every change, before any claim that something works, is fixed, is unused or is safe to delete, and before a bug fix.
---

# Verify before claiming

A claim ("works", "fixed", "nothing uses it", "same output") needs evidence from this session: test output, a
screenshot, a grep, a probe. Plausibility is not evidence. §1, §5 and §6 hold for every change; the proof itself
depends on the claim:

| The claim | The proof | Read |
|---|---|---|
| "It looks right" (classes, layout, sizes, a heading, a theme) | screenshots at the widths it targets | **[seeing-the-ui.md](seeing-the-ui.md)** (§2) |
| "Fixed" (a bug) | a regression test that failed before the fix | **[tests-that-can-fail.md](tests-that-can-fail.md)** (§3) |
| "Covered" (a new or changed test) | the test fails with the bug planted | **[tests-that-can-fail.md](tests-that-can-fail.md)** (§4) |
| "Unused", "safe to delete" | grep of every consumer (§1; `refactor-guide` §3) | — |
| "Same calculation" | `pnpm golden:diff` shows nothing (`engine-guide` §3) | — |
| "Works" (behaviour) | the feature's e2e spec or a unit test of its view model, run | `e2e-guide` |

## 1. Read the path, not the names

- Behaviour of the planner: the command in the section controller (`src/app/<section>/*-controller.js`), the view
  model builder in `src/app/bridge/`, the component in `apps/web/src/features/`. A name like `setupCount` says nothing
  about who reads it: grep `src`, `apps/web/src` and `tests` before calling it unused.
- Behaviour of a library: the installed code in `node_modules` (React, Tailwind, Playwright), not memory.
- Behaviour of the calculation: run it (`pnpm golden:diff`, or a node script calling `calculatePlanner`), not the
  reading of a formula.
- After any mechanical replacement (`sed`, a Python script), grep the expected result: a pattern that no longer
  matches changes nothing and exits 0.

## 2. A UI change is seen, not imagined

Throwaway screenshot spec with the page objects, the sticky-header trap, the owner's arrows:
**[seeing-the-ui.md](seeing-the-ui.md)**. Read before saying a visual change is done.

## 3–4. Regression test first · prove the test can fail

Which layer shows the bug, planting the bug, restoring the file without `git stash`, surviving mutations:
**[tests-that-can-fail.md](tests-that-can-fail.md)**. Read before a bug fix and before trusting a new test.

## 5. Before a commit

`pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm test`; `pnpm test:e2e` when the UI or `src/app` changed.
A red check stops the commit: fix the cause, never the guard (suppressions, ratchet baselines, skips).

## 6. Report with labels

Say what was verified (and how), what is inferred, and what was not checked ("not run: the full e2e suite"). When new
evidence contradicts something already said, correct it at once.

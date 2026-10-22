---
name: refactor-guide
description: How to restructure this planner without breaking it and without leaving debris — refactor by exclusion (delete legacy in blocks, write the replacement for the new architecture), the safety net (e2e, golden master, typecheck, guards), separate structure and behaviour commits, finding every consumer before deleting, and the asset and hook rules. Use before deleting legacy code, moving, renaming or splitting files, removing a component, class, field or asset, or sweeping a pattern across many files.
---

# Refactoring and cleanup

§1, §2 and §4 hold for every restructuring; pick the rest by what you are doing:

| You are | Approach | Section |
|---|---|---|
| replacing a legacy piece (screen, component, planner DOM code) | write the new one for this architecture, delete the old in the same change | §1, §2, §3 |
| deleting something (component, class, field, command, asset) | find every consumer first, delete them all | §3 (assets: §6) |
| moving, renaming, splitting files; a sweep across many files | closest common folder, import direction, scripted and grepped | §5 |
| making a piece shared, or a shared piece keeps gaining flags | share at the second consumer; inline back when flags pile up | §5, §7 |

## 1. Direction (owner, 2026-10-20)

Refactor by exclusion: delete legacy code in large blocks and write the replacement for this architecture
(`planner-guide`, `react-guide`, `styling-guide`), instead of wrapping the old code. The legacy stylesheet is gone
(2026-10-21): every screen, dialog and tooltip is Tailwind 4. The look follows the old one loosely.

The safety net is the e2e suite + the engine golden master + typecheck + the unit guards (import graph, DOM ratchet,
styling rules, asset references). A step is done when they are green, not when the diff looks right.

## 2. Nothing left behind

A replacement removes what it replaces **in the same change**:

- the old component, its classes module entries, constants that only it used (`PANEL` went with the Energy panel);
- view model fields nothing reads (and their unit asserts), commands and sources nothing calls, typedef entries;
- page object methods whose element is gone, and spec lines that asserted it;
- hook classes and ids nobody looks up any more (grep first, §3);
- the DOM ratchet baseline, lowered when the change removed DOM coupling.

Leaving "unused for now" code is how the tabs ended up with three heading variants. If something cannot go yet,
the owner decides, and the reason goes in a comment where it lives.

## 3. Find every consumer before deleting

```bash
grep -rn "<name>" src apps/web/src tests --include='*.js' --include='*.ts' --include='*.tsx'
```

Also look for the name built at run time (`` `${kind}-tooltip` ``), in HTML strings under `src/app`, in
`index.html`, and in test regexes (`toHaveClass(/name/)`). A class that only a test reads is still a consumer: move the
test target with it (`e2e-guide` §3).

## 4. Two hats, separate commits

Structure (move, rename, extract, delete dead code) and behaviour (anything the user, a test or the stored build can
observe) go in separate commits. A structure commit leaves the golden master and every e2e assertion untouched; when
its diff needs an assertion changed, it is a behaviour change and gets its own commit. Already mixed? Split with
`git add -p` or redo in order.

## 5. Moving code

- Where it goes: the closest common folder of its consumers (`react-guide` §1); up to `apps/web/src/ui/` only when a
  second feature uses it.
- `src/` folders follow the import direction (`CLAUDE.md` Layout); `tests/unit/import-graph.test.js` fails on a cycle
  or a wrong-way import. Never silence it.
- A mechanical sweep across many files is a script, checked afterwards with `grep` for the expected result: `sed`
  that does not match exits 0 and changes nothing.

## 6. Assets

Every content image (items, heroes, skills, pacts, slates) stays, also unreferenced ones. Layout images
(backgrounds, frames, wordmarks) go once nothing uses them. `tests/unit/asset-references.test.js` checks every
`./src/assets/…` path in the sources. A new UI image (the Energy icon) goes in `src/assets/tli/` as `.webp`, cropped to
its content.

## 7. When a shared piece grows flags

A shared component that gains a parameter and a conditional for each new caller is the wrong abstraction: inline it
back into the callers, delete what each caller does not use, then extract what is really common. Duplication is
cheaper than the wrong abstraction.

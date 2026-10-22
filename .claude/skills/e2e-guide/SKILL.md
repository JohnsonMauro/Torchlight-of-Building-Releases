---
name: e2e-guide
description: How the Playwright suite of this planner is built and how to write or change a test — the dev and build projects, PlannerPage.open(state) seeding, page objects that hold every selector, role and accessible-name locators, state read from class lists, expectNoErrors, responsive specs, deterministic waits. Use before writing or changing an e2e spec or page object, and before renaming a class, id, label or aria-label that a test reads.
---

# E2E tests (`tests/e2e`)

§1–4 hold for every spec; then by task:

| You are | Do | Section |
|---|---|---|
| writing a new test | behaviour first, seed with `open(state)`, plant the bug | §2, §6 |
| renaming or removing something a test reads (label, class, id, element) | change the page object (or the target) in the same change | §3 |
| changing sizes or the layout of a row or heading | run the responsive specs | §5 |
| fixing a flaky test | find the timing assumption, wait for the published state | §4 |

## 1. The setup

- `playwright.config.js` runs every spec twice: project `dev` (Vite dev server, port 4174) and project `build` (the
  build in `dist-web/` through `vite preview`, port 4175: what the web deploy and Electron load). `pnpm test:e2e`
  builds first; run one spec with `pnpm exec playwright test tests/e2e/<spec>` (`pnpm build:web` before, for the
  `build` project). The dev server's own port 4173 is left alone.
- Locally at most 2 workers, installed Google Chrome (`channel: "chrome"`), trace kept on failure
  (`test-results/`).
- Electron has its own config and spec (`pnpm test:desktop`, `tests/e2e/desktop/`).

## 2. Page objects hold the selectors

- `tests/e2e/pages/<area>-page.js`: every selector the specs use lives there (`SkillsPage.resetButton()`,
  `energyTotal()`, `row(skill)`). A spec says what the user does and sees; it does not spell `#ids` or classes.
- `PlannerPage.open(state)` seeds a one-build library in `localStorage` and waits for the boot flag to clear (the views
  are in the static HTML, so a click before boot is lost). `open()` with no state uses the app's default library
  (Selena's Scorching Beam build); the golden fixture's Youga build (`tests/golden/fixtures/`) covers trait-granted
  skills and supports.
- End each test with `await planner.expectNoErrors()`: it fails on any `pageerror` or console error collected during
  the test.

## 3. Locators

- Prefer role + accessible name, exact: `getByRole("button", { name: "Replace Aim", exact: true })`. Rows are found
  by what they hold (`rows().filter({ has: … })`), tooltips by `getByRole("tooltip")` and their content.
- Ids and hook classes (`#energy-total`, `.compendium-tabs`, `.skill-row-energy`) are for elements without a role or
  for state; keep them in the page object.
- State read from a class list (`toHaveClass(/\bactive\b/)`) only works while no utility spells that word
  (`styling-guide` §6). `toHaveClass("x")` with a string must equal the whole attribute.
- Element removed or renamed in the UI → move the page object (or the test's target) in the same change. Example:
  the invalid-drop test used `.energy-panel` as "somewhere off the board"; when that panel went, the target became
  `.compendium-tabs` (2026-10-22).

## 4. Determinism

- Never `waitForTimeout` and never `networkidle`: wait for the thing with `expect(...)`, which retries.
- Assert on what the app publishes (a toast's text, the stored library via the page object's `stored()`), not on
  timing.
- Hover tests: move the mouse away first (`page.mouse.move(0, 0)`) and use `expect(async () => …).toPass()` when a
  tooltip from the previous hover may still show.
- Each test opens its own state; no order between tests.

## 5. Layout checks

`*-responsive.spec.js` checks phone widths (390 and 360 px): no sideways scroll, every control on screen. A change to
row or heading sizes (`styling-guide` §3) runs them before the commit. Visual checks while iterating are throwaway
screenshot specs (`verify-guide` §2), never committed.

## 6. A new test

Behaviour first: what the user does, what they see, what is stored. Plant the bug and see the test fail before
trusting it (`verify-guide` §4). Name the test by the behaviour ("Reset Skills empties both tabs").

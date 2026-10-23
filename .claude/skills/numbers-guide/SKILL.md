---
name: numbers-guide
description: Floating-point rules for the damage calculation and the figures the planner shows — IEEE 754 doubles, rounding only for display through the shared formatters, game-integer counts with a tolerance, additive vs multiplicative ("(multiplies)") bonuses kept in separate stacks, comparing floats in tests, and why reordering float operations moves the golden master. Use before writing or changing a formula, a bonus stack, an aggregation or an average in packages/engine/src, before rounding or formatting a figure anywhere, and before asserting a numeric value in a test.
---

# Numbers

The calculation runs on IEEE 754 doubles (`Number`): an approximation with a bounded relative error. Calculate in
floats without rounding in between, round **once** for display with a named rule, compare **with a tolerance**.

## 1. What a double holds

- Integers up to 2^53 are exact; `0.1`, `0.2`, `1.1` are not (`0.1 + 0.2` = `0.30000000000000004`). The error exists
  before the first operation.
- **Order changes the result:** float sums and products are not associative. Measured (Node 24):
  `100 * 1.1 * 1.25 * 1.3` = `178.75000000000006`, `100 * (1.1 * 1.25 * 1.3)` = `178.75`. Iterating a `Map` instead of
  an object, fusing two loops, or summing in another order can move the last digit.
- Long sums accumulate error (adding `0.1` ten million times gives `999999.9998389754`). Our sums are short; a sum over
  thousands of terms (a timeline) is where it would show.

## 2. The golden master sees the last digit

`tests/golden/canonical.js` hashes the result with `JSON.stringify`: every double at full precision. So a
**structure-only** change that reorders float operations turns the golden test red although nothing is wrong. Read
`pnpm golden:diff`: values that differ only in the last digits (`…06` vs `…00`) are reordering; anything larger is a
behaviour change. A structure commit keeps the operation order (`engine-guide` §3); if it cannot, it says so in its
body and becomes a behaviour commit.

## 3. Rounding

- **Inside the calculation, round only what the game rounds**, with its source in a comment: whole hits, casts and
  stacks in a time window are counted with `Math.floor(x + EPS)` (`combat/dummy-recount.js`, `EPS = 1e-9`), so a value
  that should be exactly 3 but is `2.9999999999999996` still counts 3. Any other `Math.round` / `toFixed` in the
  middle of a formula is a display rounding in the wrong place.
- **For display, use the shared formatters** of `packages/engine/src/text/number-format.js` (`formatRecountInteger`,
  `formatShortNumber`, `formatRecountMagnitude`, through `#engine`), `src/app/stats/number-text.ts` for the Stats
  toggle. About 80 `toFixed` / `Math.round(x * 100)` sites remain spread over the engine, `src/app` and `apps/web`
  (2026-10-23): a new figure goes through a formatter, and a formatter a second kind of figure needs goes in
  `number-format.js` the same day.
- `toFixed` and `Math.round(x * 100) / 100` read the stored double, not the typed decimal: `(1.005).toFixed(2)` is
  `"1.00"`, `(2.55).toFixed(1)` is `"2.5"`. `Math.round` breaks ties toward +∞ (`Math.round(-2.5)` = `-2`).

## 4. Bonus stacks

The game's texts mark the two kinds: "+X% damage" adds to one sum; "+X% additional damage (multiplies)" multiplies.
Keep them as two stacks (a sum of percents, a product of factors), apply each once, and keep the unit in the name
(`firePercent` vs `fireFactor`). A percent turned into a factor in one place only.

## 5. Tests

- Never `strictEqual` on a computed double unless the value is an exact integer or the point is bit-for-bit stability
  (the golden master). Otherwise a tolerance: `Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected))`.
- Expected values in a unit test come from the game or a hand calculation with the source in the test name or a
  comment, not from the engine's own output.

Sources: Goldberg, "What Every Computer Scientist Should Know About Floating-Point Arithmetic"; floating-point-gui.de;
MDN `Number.EPSILON`, `toFixed`, `Math.round`. The measured values above: Node 24.22, 2026-10-23.

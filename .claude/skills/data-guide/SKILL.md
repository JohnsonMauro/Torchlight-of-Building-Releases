---
name: data-guide
description: How to choose and model data and judge code that transforms or searches it, anywhere in the repo (engine, src/app view models, React components) — pick the structure by the operations (Map/Set index instead of a search in a loop), stable ids vs display names as keys, normalized vs nested, derived data and caches, copies; Big-O first, then a profile; what each JS list form costs on V8. Use before modelling state or a view model, before writing or reviewing code that loops over, searches or aggregates a list, before rewriting a chain into a reduce "for performance", and before optimizing a slow path.
---

# Data and lists

Concept first, then the language, then the engine. This is plain JavaScript, not a React rule: the same in
`packages/engine/src`, `src/app` and `apps/web`. React only changes how often the code runs (a view model or component
on every render), not its complexity.

## 1. Choose the structure by the operations

List the operations the code performs, how often (once at load, per item, per render) and how large n is; pick the
structure that makes them cheap.

| Dominant operation | Structure in JS |
|---|---|
| Find by key | `Map` (or a plain object for a fixed, JSON-shaped record) |
| "Seen it?" / membership / dedupe | `Set` |
| Ordered sequence, position | `Array` |
| Smallest/largest first with inserts | sort once, or a heap (none built in) |

- **Index once, query many.** A search inside a loop (`.find` / `.includes` / `.indexOf` / `.some` / `.filter` in the
  callback of another `.map` / `.filter` / loop) is O(n·m): build `new Map(items.map((i) => [i.id, i]))` or
  `new Set(ids)` **outside** the loop. Measured: 5,000 × 5,000 with `.includes` 6.3 ms, with a `Set` 0.24 ms. An index
  is derived data: the source stays the list; whoever writes the source rebuilds or updates the index in the same place.
- **Game data catalogs** (`packages/engine/data`) are arrays as upstream generates them (byte for byte,
  `engine-guide`): index them in engine code, once per module, never edit the data.

## 2. Model the data

- **Keys: stable ids, not display names.** A name changes with a season or a translation; an id does not. The stored
  build is keyed by names today (verified 2026-10-23): `talentRanks` by `"Goddess of Knowledge:0,2"`,
  `skills.setupEnabled` by skill name (`"Scorching Beam"`), `hero.selectedTraits` by trait name. A season that renames
  a skill or a tree turns those entries into "missing" for the season compatibility pass, which removes them
  (`engine-guide` §1). New state, maps and cross references: key by the
  game's id where the data has one; a name coming from outside (a game log, an old build) is translated to an id once,
  at the boundary. Composite keys: one `keyOf(…)` function, not `` `${a}:${b}` `` rebuilt at each use.
- **Ownership → nest; reference → id.** A fact stored in two places is a cache: it needs an owner and an invalidation
  rule, or it goes.
- **Store the minimum, derive the rest** (totals, filters, "is selected"). Store a derived value only when computing it
  is expensive **and measured**.
- **Copies:** mutate locally inside the function that builds a new value, publish it as immutable (`readOnce` readings
  are frozen and shared: copy before changing, `engine-guide` §1). Copy at the ownership boundary, only what changes;
  `structuredClone` "to be safe" is a cost without an owner.

## 3. Complexity first, then a profile

Chaining (`.map().filter().map()`) is fine: it is O(n), like the `reduce` that would replace it; the difference is a
constant (intermediate arrays, callback calls), never an order.

- **Rewrite on sight, no measurement needed:** the O(n·m) search above, and a spread accumulator
  (`reduce((acc, x) => [...acc, x])`, `({ ...acc, [k]: v })`: O(n²); n = 5,000 took 7.6 ms, a `for` ~5 µs) →
  `push` / assignment on the reduce's own accumulator, `Object.fromEntries(pairs)`, or a `for`. Same family:
  `.filter(…)[0]` → `.find`; `.filter(…).length > 0` → `.some`; `arr.indexOf(x) === i` to dedupe → `new Set(arr)`;
  a sort, `structuredClone` or a text parse repeated per item inside a loop → hoist it.
- **Everything else stays readable unless a profile names it.** Measured 2026-10-23 on Node 24.22 (V8), µs per call
  for `x*2 → %3 → +1`:

| n | chain | flatMap | reduce + push | for…of | iterator helpers |
|---|---|---|---|---|---|
| 100 | 0.27 | 0.73 | 0.11 | 0.10 | 2.08 |
| 1,000 | 2.5 | 6.7 | 1.1 | 1.0 | 20.0 |
| 100,000 | 1,076 | 691 | 170 | 161 | 2,122 |

- A chain costs ~2.5× a `for`: microseconds up to n ≈ 1,000. Our lists (gear, skills, talent nodes, affix lines) are
  that size.
- In the calculation (Youga L94, 152 ms) array builtins do not show in the profile (V8 inlines them into the caller),
  and the garbage collector, the ceiling of what removing every intermediate array could save, is 2%. The time goes to
  reading game text (regex, `readOnce`, `splitCondition`, the `clean` helpers) and to `compareExclusiveGroup`.
- `reduce` beats a chain only when it mutates its accumulator, and then it is a `for` that is harder to read. A short
  chain with clear names beats a `reduce` with three steps tangled in one callback.

## 4. When a profile does name it

- Hot path with a large n: a `for` with `push`.
- Not `flatMap` by reflex: slower than the chain below n ≈ 1,000 on V8 (one array per item).
- Not iterator helpers (`.values().filter().map().toArray()`): lazy and without intermediate arrays, but 4–8× slower than
  the chain on V8 (2026-10). Worth it only for laziness (stop early, an endless source). Re-measure when V8 changes.
- Profile the engine: a scratchpad script that runs `calculateGoldenCase` from `tests/golden/cases.js` warm, under
  `node --cpu-prof`; aggregate self time per function. A React view: the React profiler or Chrome's performance panel
  on the real interaction, not a microbenchmark.
- Reordering float operations (a sum over a `Map` instead of an object, a fused loop) can move the last digit and the
  golden master: `numbers-guide`.

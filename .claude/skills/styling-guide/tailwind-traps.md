# Type, sizes and Tailwind scanning traps

Part of the skill [styling-guide](SKILL.md) (§5, §7).

## 5. Type and sizes

- Type, spacing and radius from Tailwind's scales; the closest step wins over an exact arbitrary value (a "+30%" on
  `text-xs` is `text-base`). Arbitrary values only for a measured geometry (`grid-cols-[77px_76px_…]` matching a
  socket size).
- Preflight sets `line-height: 1.5`; the screens were measured against `normal`, so their roots carry
  `leading-[normal]`. `text-<size>` also sets a line height (`text-sm/[normal]` keeps `normal`).
- `max-[1100px]:` is `width < 1100px`; the screens use `max-[1101px]`/`min-[1101px]` where the legacy media query
  included 1100.

## 7. Tailwind scanning traps

- Tailwind scans `apps/web` (Vite's root) plus the `@source` folders in app.css (`src/app`, `src/game-log`): markup
  built as HTML strings there takes utilities too.
- A utility written right before `${` in a template literal is not generated: keep a space, or use a constant.
- Tailwind writes a utility for every source word that is a utility name (`hidden`, `grid`, `fixed`…). Never give
  markup such a class name as a hook; it would get the utility.
- `url()` paths in app.css (and in `bg-[url(...)]`, emitted into app.css) are relative to app.css; never `/src/...`
  (the desktop build opens `file://`). An `<img src>` uses the page-relative `./src/assets/…` form, which
  `asset-references.test.js` checks.

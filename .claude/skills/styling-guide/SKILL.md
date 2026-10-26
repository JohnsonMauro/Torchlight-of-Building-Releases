---
name: styling-guide
description: Tailwind 4 and design-system rules of this planner — the one stylesheet, colour tokens, shared utilities, the neutral state variants, density (no empty space), the section heading pattern, the panel rhythm and the default typeface (Inter). Use before writing or changing any className, layout, spacing, size, font or typeface, icon size or heading in apps/web or in HTML strings under src/app and src/game-log, and before adding a shared class constant.
---

# Styling and design system

The look follows the old one loosely ("similar is enough"); consistency between tabs and density matter more than
matching it pixel for pixel. §1–2 hold for every class you write; the rest is by kind of change:

| You are changing | Read |
|---|---|
| spacing, sizes, a panel, a heading, a counter or button in a tab, icon sizes, a new block in a tab | **[density-and-headings.md](density-and-headings.md)** (§3–4) |
| a state's look (active, selected, disabled, hover, rarity, tier), a class or id that JS or a test reads, a hook class | **[test-read-classes.md](test-read-classes.md)** (§6, §8) |
| font size, line height, a breakpoint, an arbitrary value, `url()`, classes inside HTML strings under `src/app` | **[tailwind-traps.md](tailwind-traps.md)** (§5, §7) |
| the typeface, font weights, figures in columns (`tabular-nums`), a font feature | **[typography.md](typography.md)** (§9) |

A change that fits several rows reads every file in them.

## 1. One stylesheet, utilities in the markup

- `apps/web/src/styles/app.css` is the only stylesheet: layers `theme, base, components, utilities`, Preflight on. It
  holds the tokens, the page frame (`@layer base`), the shared `@utility` classes (`panel`, `panel-head`, `btn`,
  `btn-primary`, `btn-danger`, `tab`, `field`, `field-search`, `chip`, `dialog-panel`, `dialog-head`, `dialog-title`,
  `dialog-close`) and the custom variants. `tests/unit/styling-rules.test.js` fails on any other stylesheet.
- No `.css` beside a component. Long or repeated class lists go in a `.ts` module beside the component
  (`*-classes.ts`): a `.tsx` exports only components (`react-refresh/only-export-components` is an error).
- A shared `@utility` sets colour, border and shape only; size, padding and type stay in the markup. When both set the
  same property, the winner is the generated order, not the class order.

## 2. Colour: tokens only

- Semantic tokens with a dark and a light value: `bg`, `surface`, `raised`, `sunken`, `line`, `line-strong`, `text`,
  `muted`, `dim`, `accent`, `accent-strong`, `on-accent`, `info`, `ok`, `warn`, `danger`, `violet`, `rarity-*`,
  `dmg-*`, `overlay`, `shadow`. The default Tailwind palette is off (`--color-*: initial`): `text-red-500` generates
  nothing.
- A component never writes a colour of its own: tokens and opacity modifiers (`bg-accent/15`) only, so a theme
  changes in app.css alone. No decoration: no gradients, glows, inset highlights, chamfers.
- Themes: `<html data-theme="dark|light">`, set before the first render by `apps/web/src/ui/theme.ts`. A change that
  touches colour is looked at in both themes. A game image with its own background (the Energy icon) stays as it is.

## 3–4. Density, rhythm and the section heading

No filler space, one padding rhythm per level, the build tabs open each section and a tab's figures and actions sit beside what they act on, icons in proportion,
a shared pattern the same day a second place needs it: **[density-and-headings.md](density-and-headings.md)**. Read
before any spacing, size or heading change.

## 5. Type and sizes · 7. Tailwind scanning traps

Scale steps over arbitrary values, Preflight's line height, breakpoint semantics, what Tailwind scans and generates,
`url()` paths: **[tailwind-traps.md](tailwind-traps.md)**. Read before a type or breakpoint change and before writing
classes in an HTML string.

## 6. Classes tests read · 8. Hooks that look unstyled

Never spell a state word (or any word a test reads with `toHaveClass(/…/)`) inside a utility; use the neutral variants
`on:`, `group-on:`, `chosen:`, `group-chosen:`, `off:`, `pressed:`, `editmode:`, `compact:`. Hook classes stay even when
unstyled. Details and the reasons: **[test-read-classes.md](test-read-classes.md)**. Read before styling a state or
removing a class.

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
| `apps/web/src/shell/` | the app frame: `AppShell`, header, view rail, build strip (the build's tabs), footer, tooltip, toast | |
| `apps/web/src/pages/<page>/` | a page's composition: `build/` (one view per build tab: hero, follower, skills, equipment, pacts, talents), `stats/`, `configuration/`, `builds/` | composes features; little markup |
| `apps/web/src/features/<feature>/` | a feature's components, its dialogs and its `*-classes.ts` | renders view sources, calls commands |
| `apps/web/src/ui/` | shared React pieces, class constants several features use, the theme switch (`theme.ts`) | |
| `apps/web/src/styles/app.css` | the only stylesheet: Tailwind 4, tokens, shared utilities and variants | no `.css` beside components |
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
- `planner/page.js` — DOM helpers (`$`, `artwork`) and what the page says about the open build: the `buildStatus`,
  `toast` and `otherTabNotice` sources (`updateStorageStatus`, `showToast`: plain text, never escaped).
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
What is read only when the user asks (a tooltip's details) is a planner query (`plannerQueries().gearTooltip(target)`,
`src/app/bridge/planner-queries.js`): computed on demand, never published ahead, never changing the build.

Page state the UI shows belongs in a source too, not in the DOM: the open view is the `workspace` source (each section
hides itself with `useViewOpen`, the rail and the build strip light their tab, `PageMain` picks the layout). The
planner still reaches into the page in many places (DOM lookups, `classList`, `style`, `hidden`, `innerHTML`, listeners,
HTML strings); `tests/unit/dom-ratchet.test.js` counts them and they may only go down — lower its baseline when a
change removes some.

Tooltips are components (`apps/web/src/ui/tooltip/`: `<Tooltip content>` around one element; `TooltipHost` places it,
follows the pointer, hides it on scroll and shows it inside an open dialog). A drag (pointer capture keeps the anchor
"hovered" until the drop) or an edit of the element hides it with `hideTooltip()` from `tooltip-store.ts`. Each domain
owns its tooltip, the way gear does (the guide for the others):
- the item's display model and its pure builder in `src/app/bridge/<domain>-…-view.ts` (`gear-item-view.ts`
  `gearTooltipView`), with a unit test; what depends on the open build is passed in;
- a query in the domain's controller that gathers that input (`gear-controller.js` `gearTooltip`, inside
  `withRenderPass`), provided in `app.js`;
- a wrapper component in the feature (`features/gear/GearTooltip.tsx`: `<GearTooltip target>{element}</GearTooltip>`)
  that reads the query when the tooltip opens and renders the content, with its classes in `*-tooltip-classes.ts`;
  pieces several domains share sit in `ui/` (`ModifierText` with Alt via `useAltHeld`, `CoverageBadge`);
- the domain's selector and kind leave the legacy tooltip (`src/app/tooltips/planner-tooltips.js`, `#planner-tooltip`),
  which serves the kinds not moved yet. Tests find either by `getByRole("tooltip")`.

## Refactor direction (2026-10-20)

Refactor by exclusion: delete legacy code in large blocks and write the replacement for this architecture. The safety
net is e2e + the engine golden master + typecheck. The legacy stylesheet is gone (2026-10-21); every screen, dialog and
tooltip is Tailwind 4. The look follows the old one loosely ("similar is enough"). Layout images (backgrounds, frames,
wordmarks) go once nothing uses them; every content image (items, heroes, skills, pacts, slates) stays, also
unreferenced ones (`tests/unit/asset-references.test.js` guards the references).

## Styling (Tailwind 4 only)

- `apps/web/src/styles/app.css` is the only stylesheet: layers `theme, base, components, utilities`, Preflight on.
  It holds the design system: semantic colour tokens with a dark and a light value (`bg`, `surface`, `raised`,
  `sunken`, `line`, `line-strong`, `text`, `muted`, `dim`, `accent`, `accent-strong`, `on-accent`, `info`, `ok`,
  `warn`, `danger`, `violet`, `rarity-*`, `dmg-*`, `overlay`, `shadow`; the default Tailwind palette is off), the
  page frame (`base`), shared utilities (`panel`, `panel-head`, `btn`, `btn-primary`, `btn-danger`, `tab`, `field`,
  `field-search`, `chip`, `dialog-panel`, `dialog-head`, `dialog-title`, `dialog-close`) and custom variants. No
  `.css` file beside a component: utilities in the markup; long or repeated class lists in a `.ts` module beside the
  component (`*-classes.ts`; a `.tsx` exports only components).
- Themes: `<html data-theme="dark|light">`, set before the first render by `apps/web/src/ui/theme.ts` (stored choice,
  else the system's) and switched from the header. A component never writes a colour of its own: tokens and opacity
  modifiers (`bg-accent/15`) only, so a theme changes in app.css alone. No decoration (gradients, glows, inset
  highlights, chamfers); type, spacing and radius from Tailwind's scales.
- Tailwind scans `apps/web` (Vite's root) plus the `@source` folders in app.css (`src/app`, `src/game-log`): markup
  built as HTML strings there takes utilities too. A utility written right before `${` in a template literal is not
  generated: keep a space, or use a constant.
- **Never spell a state word inside a utility.** The e2e tests read states off class lists (`/\bactive\b/`,
  `/\bselected\b/`, `/\bdisabled\b/`…), so `[&.active]:x`, `aria-selected:x`, `disabled:x` or `active:x` would match
  whatever the state. Use the neutral variants in app.css: `on:` (`.active`), `group-on:`, `chosen:`
  (`[aria-selected=true]`), `group-chosen:`, `off:` (`:disabled`), `pressed:` (`:active`), `editmode:` (inside
  `.editing`), `compact:` (a wide, short window); or pick the classes in code from the state. The same holds for any
  word a test reads with `toHaveClass(/…/)` (`rarity-legendary`, `tier-t1`, `follower-tint-ult`…), also inside an
  arbitrary value, a custom property's name or a `url()`'s file name (the magic card art is the `--art-magic` token for
  that reason): pick the classes in code (`itemCardLook`, `tierBadgeClasses`) or key a variant on a `data-*` attribute.
  `tests/unit/styling-rules.test.js` fails on such a utility and on any stylesheet besides app.css.
- Preflight sets `line-height: 1.5`; the screens were measured against `normal`, so their roots carry
  `leading-[normal]`. `text-<size>` also sets a line height (`text-sm/[normal]` keeps `normal`).
- `url()` paths in app.css (and in `bg-[url(...)]` utilities, emitted into app.css) are relative to app.css; never
  `/src/...` (the desktop build opens `file://`).
- Tailwind writes a utility for every source word that is a utility name (`hidden`, `grid`, `fixed`…). Never give
  markup such a class name as a hook; it would get the utility.
- Class names that JS or tests look up stay as hooks even when nothing styles them (`site-header`, `view-tab`,
  `loadout-tab`, `loadout-status`, `talent-node`, `pact-slot`…): grep `src/app`, `tests`, `apps/web/src` before removing
  one.

## Porting upstream

Upstream (`upstream` remote) is reference only: read `git diff <last-ported>..upstream/main` and port by hand. His
`src/` root modules live in folders here (`src/engine/<domain>/` for pure domain code, `src/app/` for the page,
`src/game-log/` for the log import), and his `src/app.js` code is split into the section
controllers above. His `src/data/**` paths are unchanged.

## Before a desktop build of ours

`package.json` `build.publish` still points at upstream's releases: electron-updater would replace our build with his.
Repoint or disable it first.

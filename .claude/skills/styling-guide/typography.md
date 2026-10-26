# Typography: the default typeface

Part of the skill [styling-guide](SKILL.md) (§9). The planner's default (owner, 2026-10-26): it holds until the owner
asks for something else. A new screen, a dialog or a tooltip never picks a typeface of its own.

## 9. One family: Inter, shipped with the app

| | |
|---|---|
| Family | **Inter** (rsms/inter, release 4.1 on 2026-10-26), OFL-1.1 |
| File | variable WOFF2 (weight axis) inside the bundle, split by `unicode-range` so only the latin file loads |
| Stack | `--font-sans: "Inter Variable", system-ui, sans-serif` in app.css; `body` takes `var(--font-sans)` |
| Where | `@fontsource-variable/inter` (devDependency: Vite copies the files into `dist-web`, the desktop package needs nothing more), imported in `apps/web/src/main.ts`: `wght.css` and `wght-italic.css` (italic is in use) |
| Loading | `font-display: swap`; never a CDN (Electron opens `file://`, the app runs offline) |

- **One family for everything.** Names, headings, labels, figures and body text are all Inter; hierarchy comes from
  size, weight and tracking (`sectionTitleClass`: bold, wide tracking, uppercase). No second family for "flavour".
- **Weights in use:** `font-semibold` (600) and `font-bold` (700) for emphasis and names, `font-black` only for the small
  badges and counters that carry it today (five places). Regular for running text.
- **Figures:** a number in a column, a total or a counter that changes takes `tabular-nums`, so digits do not shift
  sideways as the value changes.
- **Optional features** (only where they help, not globally): `slashed-zero` where 0 and O can be confused (ids, codes),
  `[font-feature-settings:"ss02"]` to tell I / l / 1 apart.

### Why (2026-10-26)

- The old stacks (replaced 2026-10-26) were not a choice: `--font-sans` (`"Segoe UI", system-ui, Arial`) and `--font-display`
  (`"Palatino Linotype", "Book Antiqua", Georgia, serif`) render as whatever the OS has (Noto Sans and Noto Serif on
  the owner's Linux, `fc-match`), so the app looked different per machine, and serif names over sans text on one
  dense screen read as noise.
- Inter is built for dense interfaces: a tall x-height (perceived size and legibility at 11–13 px follow the x-height,
  not the font size: Beier 2012, Cooreman & Beier), tabular figures, a slashed zero and disambiguation sets.
  IBM Plex Sans and Source Sans 3 were the alternatives (also tabular figures); Inter won on x-height and coverage of
  the features above.
- Sources: [rsms.me/inter](https://rsms.me/inter/), [x-height and legibility](https://readabilitymatters.org/?p=57664),
  [fonts for dashboards](https://madegooddesigns.com/best-fonts-for-dashboards/).

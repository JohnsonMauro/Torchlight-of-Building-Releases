# Classes that tests and JS read

Part of the skill [styling-guide](SKILL.md) (§6, §8).

## 6. Never spell a state word in a utility

The e2e tests read states off class lists (`toHaveClass(/\bactive\b/)`, `/\bselected\b/`, `/\bdisabled\b/`…), and
the regex matches the whole `class` attribute. So `[&.active]:x`, `aria-selected:x`, `disabled:x` or `active:x` would
match whatever the state — the positive test passes without testing anything. `tests/unit/styling-rules.test.js`
fails on such a utility.

- Use the neutral variants in app.css: `on:` (`.active`), `group-on:`, `chosen:` (`[aria-selected=true]`),
  `group-chosen:`, `off:` (`:disabled`), `pressed:` (`:active`), `editmode:` (inside `.editing`), `compact:` (a wide,
  short window). Or pick the classes in code from the state.
- The same holds for any word a test reads with `toHaveClass(/…/)` (`rarity-legendary`, `tier-t1`,
  `follower-tint-ult`…), also inside an arbitrary value, a custom property's name or a `url()`'s file name (the magic
  card art is the `--art-magic` token for that reason): pick the classes in code (`itemCardLook`, `tierBadgeClasses`)
  or key a variant on a `data-*` attribute.
- A frame shared by several kinds (tooltips) spells every kind in its class list; tests tell kinds apart by content.

## 8. Hooks that look unstyled

Class names that JS or tests look up stay as hooks even when nothing styles them (`site-header`, `view-tab`,
`loadout-tab`, `loadout-status`, `talent-node`, `pact-slot`, `compendium-tabs`, `energy-total` as an id…). Before
removing or renaming one, grep `src/app`, `tests`, `apps/web/src`; when a test used it as a target, move the test to
another element in the same change.

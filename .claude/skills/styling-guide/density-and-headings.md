# Density, rhythm and the section heading

Part of the skill [styling-guide](SKILL.md) (§3–4). The owner's rule: never spend space on nothing.

## 3. Density and rhythm

Reference screen: the Skills tab (2026-10-22). Other tabs move to it as they are touched.

- **No filler space.** No `min-h-*` that only stretches a panel past its content, no empty footer, no padding on a
  wrapper whose child already pads. A panel ends where its content ends.
- **One rhythm per level.** Section card → `BuildTabs` (`min-h-[50px]`, `px-2`) → panels inside the card `m-3 p-3` → rows
  `px-3 py-2`, `gap-2` between rows. A new value needs a reason (a measured overflow, a touch target).
- **A figure or an action sits beside what it acts on** (owner, 2026-10-22, reversing the earlier "heading carries
  them" rule): Skills' Energy total and Reset Skills on the right of the board's Skills/Auras tab row, Gear's Craft
  right of the Inventory's Sort button. Never in a footer of its own.
- **Icons in proportion, not in px picked by eye.** On the skill board the support art is 85% of the skill art at
  every breakpoint (70/60 px; 56/48 px under 720 px). Change one, change both, and keep the comment beside the
  classes that states the ratio.
- **A label the screen already explains goes.** A caption that repeats what an icon or the column says becomes a
  `title` (Energy total: icon + number, "Energy used / available" in the `title`).
- Check the narrow layouts when the heading or a row gains content: `flex-wrap` with `gap-x-*`/`gap-y-*` and
  `whitespace-nowrap` on short captions, so the heading wraps instead of clipping (measured at 400 px). Size changes
  on the skill board also run `tests/e2e/skills-responsive.spec.js` (390 and 360 px) before the commit.

## 4. The section heading pattern

- Every build tab's content opens with `apps/web/src/ui/BuildTabs.tsx` (2026-10-22, in place of a title per section):
  all six build tabs, each label with its "?" (`HelpButton`) right beside it, the open one lit (accent label,
  `aria-current`) and underlined across label and "?" by one bar that slides from tab to tab on a switch (250 ms,
  off under reduced motion), across the whole top of the section; nothing else goes in it. A label dragged onto another tab
  moves it there (`usePointerDrag`); the order is the viewer's (`ui/build-tabs.ts`, localStorage, cleared by "Reset view
  settings"). They are the only build tabs: the strip under the header holds the open build's name, save state and
  actions (Import from Game, Import, Export, Reset Build), the header keeps Builds and Theme. Under 520 px the tabs wrap. Hero Trait and Follower
  show it through `CharacterPanel`; on the Talent tab it spans both the tree tabs and the open tree's panel.
- The label type is `sectionTitleClass` (`apps/web/src/ui/section-card.ts`): body font, bold, wide tracking,
  uppercase, `text-base`; the colour is `buildTabButton`'s (muted, accent when open). A dialog's title
  (`dialog-title`) has the same type.
- Not yet on the pattern (move them when touched, then delete the old classes): the Slates toolbar's "?" beside
  Inventory, `panel-head` (only `ConfigurationPanel` still uses it).
- The open talent tree has no heading of its own (2026-10-22, after the game): its tab on the left names it, and the
  bar inside its panel holds the cores (round art, the unlock points in a badge at the lower left, name and state in
  the accessible name and the tooltip), "N Talent Points spent in current panel" with Reselect and Reset, and Install
  Prism at the far end. The tree tabs carry no points.
- **A pattern a second place needs becomes shared the same day**: a constant or component in `apps/web/src/ui/`, and
  the copies it replaces are deleted in the same change. Three hand-written variants of one heading is how the tabs
  drifted apart. The owner's standing order (2026-10-22): componentize as soon as the chance shows, without asking
  first; say so in the report. Shared so far: `BuildTabs`, `sectionTitleClass` (and `dialog-title`, the same
  type for a dialog), `HINT_BUTTON`, `RangeInput` with `range-classes.ts`, `SearchField`.

# Density, rhythm and the section heading

Part of the skill [styling-guide](SKILL.md) (§3–4). The owner's rule: never spend space on nothing.

## 3. Density and rhythm

Reference screen: the Skills tab (2026-10-22). Other tabs move to it as they are touched.

- **No filler space.** No `min-h-*` that only stretches a panel past its content, no empty footer, no padding on a
  wrapper whose child already pads. A panel ends where its content ends.
- **One rhythm per level.** Section card → `SectionHeading` (`px-4 py-3`) → panels inside the card `m-3 p-3` → rows
  `px-3 py-2`, `gap-2` between rows. A new value needs a reason (a measured overflow, a touch target).
- **The heading carries the tab's figures and actions.** A total, a counter or a reset button goes into
  `SectionHeading` `actions`, not into a panel or footer of its own (Skills: Energy total + Reset Skills).
- **Icons in proportion, not in px picked by eye.** On the skill board the support art is 85% of the skill art at
  every breakpoint (70/60 px; 56/48 px under 720 px). Change one, change both, and keep the comment beside the
  classes that states the ratio.
- **A label the screen already explains goes.** A caption that repeats what an icon or the column says becomes a
  `title` (Energy total: icon + number, "Energy used / available" in the `title`).
- Check the narrow layouts when the heading or a row gains content: `flex-wrap` with `gap-x-*`/`gap-y-*` and
  `whitespace-nowrap` on short captions, so the heading wraps instead of clipping (measured at 400 px). Size changes
  on the skill board also run `tests/e2e/skills-responsive.spec.js` (390 and 360 px) before the commit.

## 4. The section heading pattern

- Every build tab's content opens with `apps/web/src/ui/SectionHeading.tsx`: the title, its "?" (`HelpButton`) right
  beside it, then `total` or `actions` on the right. Hero Trait and Follower use it through `CharacterPanel`.
- The title type is `sectionTitleClass` (`apps/web/src/ui/section-card.ts`): body font, bold, wide tracking,
  uppercase, `text-base`, accent. Any other "title of a tab" (the talent column's "Talent trees") uses the same
  constant, with its "?" beside it, never at the far end of the strip.
- Not yet on the pattern (move them when touched, then delete the old classes): the Slates toolbar's "?" beside
  Inventory, `panel-head` (only `ConfigurationPanel` still uses it), the talent tree's name in `font-display`.
- **A pattern a second place needs becomes shared the same day**: a constant or component in `apps/web/src/ui/`, and
  the copies it replaces are deleted in the same change. Three hand-written variants of one heading is how the tabs
  drifted apart. The owner's standing order (2026-10-22): componentize as soon as the chance shows, without asking
  first; say so in the report. Shared so far: `SectionHeading`, `sectionTitleClass` (and `dialog-title`, the same
  type for a dialog), `HINT_BUTTON`, `RangeInput` with `range-classes.ts`, `SearchField`.

# Seeing a UI change

Part of the skill [verify-guide](SKILL.md) (§2).

## 2. A UI change is seen, not imagined

Class changes compile in your head and render differently on the page (wrapping, clipping, overflow at a breakpoint,
a theme). Look at it at the widths it targets (at least desktop and 400 px).

Throwaway screenshot spec, using the page objects so it opens the planner the way the tests do:

```js
// tests/e2e/.tmp-shot/shot.spec.js  (inside testDir; delete the folder afterwards)
import { test } from "@playwright/test";
import { PlannerPage } from "../pages/planner-page.js";
import { SkillsPage } from "../pages/skills-page.js";
test("shot", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await new PlannerPage(page).open();
  const skills = new SkillsPage(page);
  await skills.open();
  await skills.view().screenshot({ path: "<scratchpad>/skills.png" });
});
```

`pnpm build:web && pnpm exec playwright test tests/e2e/.tmp-shot --project=build`, read the PNG, then
`rm -rf tests/e2e/.tmp-shot`. Save the PNG to the session scratchpad, never in the repo.

- An element screenshot scrolls the element into view and the sticky site header covers its top (measured
  2026-10-22: the heading's first line was hidden at 400 and 800 px). Judge the top edge from a `page.screenshot()`
  with the page scrolled to the top, not from the element shot.
- A colour change is looked at in both themes (`document.documentElement.dataset.theme = "light"` in the spec).
- When the owner sends a screenshot with arrows, the arrows name the defect; measure the fix in the same view.

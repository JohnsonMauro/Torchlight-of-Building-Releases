// The Build page must fit a phone's width. The skill board rows used to need about 350 px (skill, name, five support
// sockets and Energy side by side), so on a phone the whole page scrolled sideways.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { SkillsPage } from "./pages/skills-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);

for (const [name, viewport] of [
  ["phone", { width: 390, height: 844 }],
  ["small phone", { width: 360, height: 740 }],
]) {
  test.describe(name, () => {
    test.use({ viewport });

    test("the Build page does not scroll sideways, and every support socket is on screen", async ({ page }) => {
      const planner = new PlannerPage(page);
      await planner.open(youga);
      const skills = new SkillsPage(page);
      await skills.open();
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width).toBeLessThanOrEqual(viewport.width);
      for (const row of await skills.rows().all()) {
        const box = await row.boundingBox();
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
      const last = skills.support("Homing Frost Bolt", "Replace Homing Frost Bolt: Deep Chill (Noble)");
      const box = await last.boundingBox();
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      await skills.support("Ice Bond", "Add support 5 to Ice Bond").click();
      await expect(skills.selector()).toBeVisible();
      await planner.expectNoErrors();
    });
  });
}

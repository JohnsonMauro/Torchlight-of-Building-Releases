// The hero panel (hero, traits, memories, follower) must be reachable at every width. Below 1050 px the layout used to
// hide it entirely, so a tablet or phone user could not change the hero or reach the follower.
import { test, expect } from "@playwright/test";
import { PlannerPage } from "./pages/planner-page.js";
import { FollowerPage } from "./pages/follower-page.js";

for (const [name, viewport] of [
  ["tablet", { width: 900, height: 1000 }],
  ["phone", { width: 390, height: 844 }],
]) {
  test.describe(name, () => {
    test.use({ viewport });

    test("the hero panel is shown: Change Hero and the Follower tab work", async ({ page }) => {
      const planner = new PlannerPage(page);
      await planner.open();
      const panel = page.locator(".planner-hero-panel");
      await expect(panel).toBeVisible();
      await page.getByRole("button", { name: /Change Hero$/ }).click();
      await expect(page.locator("#hero-selector")).toBeVisible();
      await page.keyboard.press("Escape");
      const follower = new FollowerPage(page);
      await follower.tab().click();
      await expect(follower.panel()).toBeVisible();
      await expect(follower.panel()).toContainText("No follower selected");
      const box = await panel.boundingBox();
      expect(box.width).toBeLessThanOrEqual(viewport.width);
      await planner.expectNoErrors();
    });
  });
}

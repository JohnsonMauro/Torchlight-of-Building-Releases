// Smoke: the planner boots and every main view renders, with the default library and with a real imported build
// (the golden-master Youga fixture), without uncaught errors or console errors.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage, VIEWS } from "./pages/planner-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);

const builds = [
  { name: "default library", state: null, heroTrait: "Sing with the Tide" },
  { name: "Youga The Ultimate One L94", state: youga, heroTrait: "The Ultimate One" },
];

for (const build of builds) {
  test.describe(build.name, () => {
    test("every main view renders", async ({ page }) => {
      const planner = new PlannerPage(page);
      await planner.open(build.state);
      await expect(planner.selectedHeroTrait()).toHaveText(build.heroTrait);
      for (const name of VIEWS) {
        await planner.showView(name);
        await expect(planner.view(name)).not.toBeEmpty();
      }
      await planner.expectNoErrors();
    });

    test("stats panels and hero panels switch", async ({ page }) => {
      const planner = new PlannerPage(page);
      await planner.open(build.state);
      await planner.showView("character");
      for (const panel of ["damage-path", "sheet"]) {
        await planner.statsPanelTab(panel).click();
        await expect(planner.statsPanelTab(panel)).toHaveAttribute("aria-selected", "true");
      }
      await planner.showView("talents");
      for (const panel of ["follower", "hero"]) {
        await planner.heroPanelTab(panel).click();
        await expect(planner.heroPanelTab(panel)).toHaveAttribute("aria-selected", "true");
      }
      await planner.expectNoErrors();
    });
  });
}

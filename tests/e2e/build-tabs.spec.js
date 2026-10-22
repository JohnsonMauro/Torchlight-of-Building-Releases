// The build tabs at the top of each build section: every tab with its "?" help, the open one lit, a click opens its
// section, and a tab dragged onto another takes its place and keeps it after a reload.
import { test, expect } from "@playwright/test";
import { PlannerPage } from "./pages/planner-page.js";

const DEFAULT_ORDER = ["Hero Trait", "Follower", "Skills", "Gear", "Pacts", "Talent"];

test("each build section opens with the build tabs: the open one lit, each with its help, a click opens its section", async ({
  page,
}) => {
  const planner = new PlannerPage(page);
  await planner.open();
  await expect(planner.buildTabLabels("hero")).toHaveText(DEFAULT_ORDER);
  await expect(planner.buildTab("hero", "Hero Trait")).toHaveAttribute("aria-current", "page");
  for (const label of DEFAULT_ORDER)
    await expect(
      planner.buildTabs("hero").getByRole("button", { name: `${label} controls`, exact: true }),
    ).toBeVisible();

  await planner.buildTab("hero", "Gear").click();
  await expect(planner.view("equipment")).toBeVisible();
  await expect(planner.buildTab("equipment", "Gear")).toHaveAttribute("aria-current", "page");
  await expect(planner.buildTab("equipment", "Hero Trait")).not.toHaveAttribute("aria-current", "page");
  await planner.expectNoErrors();
});

test("a tab dragged onto another takes its place, without opening it, and keeps it after a reload", async ({
  page,
}) => {
  const planner = new PlannerPage(page);
  await planner.open();
  await planner.dragBuildTab("hero", "Talent", "Follower");
  const moved = ["Hero Trait", "Talent", "Follower", "Skills", "Gear", "Pacts"];
  await expect(planner.buildTabLabels("hero")).toHaveText(moved);
  await expect(planner.view("hero")).toBeVisible();

  await planner.dragBuildTab("hero", "Hero Trait", "Skills");
  const again = ["Talent", "Follower", "Skills", "Hero Trait", "Gear", "Pacts"];
  await expect(planner.buildTabLabels("hero")).toHaveText(again);

  await page.reload();
  await planner.waitUntilReady();
  await planner.enterBuild();
  await expect(planner.buildTabLabels("hero")).toHaveText(again);
  await planner.showView("pacts");
  await expect(planner.buildTabLabels("pacts")).toHaveText(again);
  await planner.expectNoErrors();
});

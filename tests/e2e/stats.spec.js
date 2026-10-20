// Stats view: the build status, the Stat sheet / Damage path switch, the active skill picker, the damage banner, the
// Character stats tabs (click and arrow keys) with their rows that open to their lines, the damage path tabs, and the
// report button. Written against the legacy view before it moves to React, so both must pass it unchanged. The
// golden-master Youga build has five active skills and a Thunder Magus minion.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { StatsPage } from "./pages/stats-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
test.use({ viewport: { width: 1440, height: 1000 } });

async function openStats(page, state = youga) {
  const planner = new PlannerPage(page);
  await planner.open(state);
  const stats = new StatsPage(page);
  await stats.open();
  return { planner, stats };
}

test("shows the build status and the stat sheet of the first active skill", async ({ page }) => {
  const { planner, stats } = await openStats(page);
  await expect(stats.status()).toHaveText("9 active");
  await expect(stats.panelTab("Stat sheet")).toHaveAttribute("aria-selected", "true");
  await expect(stats.sheet()).toBeVisible();
  await expect(stats.damagePath()).toBeHidden();
  await expect(stats.skillSelect()).toHaveValue("game-log-skill-1");
  await expect(stats.skillSelect().locator("option")).toHaveText([
    "Homing Frost Bolt",
    "Ice Bond",
    "Speed Phantom",
    "Selves of All Realms",
    "Timid",
  ]);
  await expect(stats.banner()).toContainText("Homing Frost Bolt Level 26");
  await expect(stats.banner()).toContainText("Average DPS in a span of time");
  await planner.expectNoErrors();
});

test("the active skill picker shows another skill's sheet", async ({ page }) => {
  const { planner, stats } = await openStats(page);
  await stats.skillSelect().selectOption("game-log-skill-2");
  await expect(stats.banner()).toContainText("Ice Bond");
  await expect(stats.skillSelect()).toHaveValue("game-log-skill-2");
  await planner.expectNoErrors();
});

test("the Character stats tabs switch by click and by arrow keys; a row opens to its lines", async ({ page }) => {
  const { planner, stats } = await openStats(page);
  await expect(stats.statTab("Offense")).toHaveAttribute("aria-selected", "true");
  await expect(stats.statPanel()).toHaveCount(1);
  await expect(stats.statPanel()).toHaveAttribute("id", "stat-tabpanel-offense");
  await stats.statTab("Defense").click();
  await expect(stats.statTab("Defense")).toHaveAttribute("aria-selected", "true");
  await expect(stats.statTab("Offense")).toHaveAttribute("aria-selected", "false");
  await expect(stats.statPanel()).toHaveAttribute("id", "stat-tabpanel-defense");
  await page.keyboard.press("ArrowRight");
  await expect(stats.statTab("Utility")).toBeFocused();
  await expect(stats.statPanel()).toHaveAttribute("id", "stat-tabpanel-utility");
  await page.keyboard.press("Home");
  await expect(stats.statTab("Offense")).toBeFocused();

  const row = stats.statPanel().locator(".stat-sheet-row-drill").first();
  await expect(row.locator(".stat-drill")).toBeHidden();
  await row.locator("summary").click();
  await expect(row.locator(".stat-drill")).toBeVisible();
  await planner.expectNoErrors();
});

test("Damage path shows the first path; a tab shows another, arrow keys move between tabs", async ({ page }) => {
  const { planner, stats } = await openStats(page);
  await stats.panelTab("Damage path").click();
  await expect(stats.panelTab("Damage path")).toHaveAttribute("aria-selected", "true");
  await expect(stats.damagePath()).toBeVisible();
  await expect(stats.sheet()).toBeHidden();
  await expect(stats.pathTab("Homing Frost Bolt hits")).toHaveAttribute("aria-selected", "true");
  await expect(stats.pathViews()).toHaveCount(1);
  await stats.pathTab("All paths").click();
  await expect(stats.pathTab("All paths")).toHaveAttribute("aria-selected", "true");
  await expect(stats.pathViews()).toHaveCount(1);
  await expect(stats.pathViews()).toHaveAttribute("data-damage-path-view", "combined");
  await page.keyboard.press("Home");
  await expect(stats.pathTab("Homing Frost Bolt hits")).toBeFocused();
  await expect(stats.pathTab("Homing Frost Bolt hits")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(stats.pathTab("Ice Bond hits")).toBeFocused();
  await stats.panelTab("Stat sheet").click();
  await expect(stats.sheet()).toBeVisible();
  await planner.expectNoErrors();
});

test("the report button opens the calculation report", async ({ page }) => {
  const { planner, stats } = await openStats(page);
  await stats
    .sheet()
    .getByRole("button", { name: /Report calculation issue/ })
    .click();
  await expect(stats.feedbackDialog()).toBeVisible();
  await page.keyboard.press("Escape");
  await planner.expectNoErrors();
});

test("the default library's stat sheet renders", async ({ page }) => {
  const { planner, stats } = await openStats(page, null);
  await expect(stats.skillSelect()).toBeVisible();
  await expect(stats.banner()).toBeVisible();
  await expect(stats.statTab("Offense")).toBeVisible();
  await planner.expectNoErrors();
});

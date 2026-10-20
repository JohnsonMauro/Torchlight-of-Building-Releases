// Stats view: the build status, the Stat sheet / Damage path switch, the active skill picker, the damage banner with its
// recount (short / full number toggles, sources left out of the view), the Effective HP banner, the Character stats tabs
// (click, arrow keys, kept across renders and reloads) with their rows that open to their lines, the damage path tabs,
// a path's hero figure and stages, the open questions (copy, submit an answer), and the report buttons. Written against the legacy view before it moves to React, so both must pass it unchanged. The
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

test("the minion's damage path tab shows its path, and stays after a reload", async ({ page }) => {
  const { planner, stats } = await openStats(page);
  await stats.panelTab("Damage path").click();
  await stats.pathTab("Thunder Magus (Minion)").click();
  await expect(stats.pathTab("Thunder Magus (Minion)")).toHaveAttribute("aria-selected", "true");
  await expect(stats.pathViews()).toHaveCount(1);
  await expect(stats.pathViews()).toHaveAttribute("data-damage-path-view", "minion:thunder-magus");
  await page.reload();
  await planner.waitUntilReady();
  await expect(stats.pathTab("Thunder Magus (Minion)")).toHaveAttribute("aria-selected", "true");
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

test("a skill whose damage is not modeled says so", async ({ page }) => {
  const { planner, stats } = await openStats(page);
  await stats.skillSelect().selectOption({ label: "Timid" });
  await expect(stats.banner()).toContainText("Timid Level 22");
  await expect(stats.banner()).toContainText("Damage not modeled");
  await expect(stats.recount()).toHaveCount(0);
  await expect(stats.sheet().locator(".stat-sheet-controls > span")).toHaveText("Active");
  await planner.expectNoErrors();
});

test("a large figure shows its full number on click or Enter, and keeps it after the sheet re-renders", async ({
  page,
}) => {
  const { planner, stats } = await openStats(page);
  const average = stats.recountValue("averageDps");
  await expect(average).toHaveText("1.59 Billion");
  await expect(average).toHaveAttribute("aria-expanded", "false");
  await average.click();
  await expect(average).toHaveText("1,593,002,745");
  await expect(average).toHaveAttribute("aria-expanded", "true");
  await expect(average).toHaveAttribute("aria-label", "1,593,002,745. Click to shorten");
  await expect(stats.recountValue("highest5sDps")).toHaveText("1.63 Billion");
  await page.keyboard.press("Enter");
  await expect(average).toHaveText("1.59 Billion");
  await page.keyboard.press("Space");
  await expect(average).toHaveText("1,593,002,745");

  await stats.skillSelect().selectOption("game-log-skill-2");
  await expect(stats.banner()).toContainText("Ice Bond");
  await expect(stats.recountValue("averageDps")).toHaveText("1,593,002,745");
  const ehp = stats.effectiveHp().locator('[data-ehp-field="pool"] .number-toggle');
  await expect(ehp).toHaveText("2.26 Thousand");
  await ehp.click();
  await expect(ehp).toHaveText("2,256");
  await planner.expectNoErrors();
});

test("a recount source can be left out of the view and shown again", async ({ page }) => {
  const { planner, stats } = await openStats(page);
  const frostBolt = stats.recountSource("Homing Frost Bolt hits");
  await expect(stats.recount().locator(".dummy-recount-mix-legend [role=button]")).toHaveCount(4);
  await expect(frostBolt).toHaveAttribute("aria-pressed", "true");
  await expect(stats.totalModeled()).toHaveText("1.63 Billion");
  await stats.recountDetails().locator("summary").click();
  await expect(stats.recountDetails()).toHaveAttribute("open", "");

  await frostBolt.click();
  await expect(stats.recountSource("Homing Frost Bolt hits")).toHaveAttribute("aria-pressed", "false");
  await expect(stats.recountSource("Homing Frost Bolt hits")).toHaveText(/off$/);
  await expect(stats.recountSource("Homing Frost Bolt hits")).toBeFocused();
  await expect(stats.recount()).toContainText("Showing 3 of 4 sources");
  await expect(stats.recountValue("averageDps")).not.toHaveText("1.59 Billion");
  await expect(stats.totalModeled()).not.toHaveText("1.63 Billion");
  await expect(stats.recountDetails()).toHaveAttribute("open", "");
  await expect(stats.recountDetails().locator("tbody tr").first()).toContainText("off");

  // The view-only exclusion stays while the sheet re-renders.
  await stats.skillSelect().selectOption("game-log-skill-2");
  await expect(stats.banner()).toContainText("Ice Bond");
  await expect(stats.recountSource("Homing Frost Bolt hits")).toHaveAttribute("aria-pressed", "false");

  await stats.recount().getByRole("link", { name: "Show all" }).click();
  await expect(stats.recountSource("Homing Frost Bolt hits")).toHaveAttribute("aria-pressed", "true");
  await expect(stats.recount()).not.toContainText("Showing");
  await expect(stats.recountValue("averageDps")).toHaveText("1.59 Billion");
  await expect(stats.totalModeled()).toHaveText("1.63 Billion");

  // Space on a focused legend item toggles it too.
  await stats.recountSource("Ice Bond hits").focus();
  await page.keyboard.press("Space");
  await expect(stats.recountSource("Ice Bond hits")).toHaveAttribute("aria-pressed", "false");
  await expect(stats.recountSource("Ice Bond hits")).toBeFocused();
  await planner.expectNoErrors();
});

test("the Effective HP banner shows the pools, the damage types and the ailment checklist", async ({ page }) => {
  const { planner, stats } = await openStats(page);
  const ehp = stats.effectiveHp();
  await expect(ehp).toContainText("Character Lv.100 assumed");
  await expect(ehp.locator('[data-ehp-field="weakest"]')).toContainText("Effective HP · weakest: Physical");
  await expect(ehp.locator(".ehp-types tbody th")).toHaveText(["Physical", "Fire", "Cold", "Lightning", "Erosion"]);
  await expect(ehp.locator(".ehp-types tbody tr").nth(1)).toContainText("Ignite 3,269");
  const checklist = ehp.getByRole("complementary", { name: "Ailment and crowd control immunity" });
  await expect(checklist.locator("li")).toHaveCount(14);
  await expect(checklist.locator("li", { hasText: "Blinding" })).toContainText("Immune");
  await expect(ehp.locator(".ehp-layer", { hasText: "Max Life" })).toContainText("2,337 · 96.4% sealed");
  const details = ehp.locator("details");
  await details.locator("summary").click();
  await expect(details).toContainText("Guaranteed EHP = pool");
  await planner.expectNoErrors();
});

test("the Character stats tab stays while the sheet re-renders and after a reload", async ({ page }) => {
  const { planner, stats } = await openStats(page);
  await stats.statTab("Defense").click();
  await stats.skillSelect().selectOption("game-log-skill-3");
  await expect(stats.banner()).toContainText("Speed Phantom");
  await expect(stats.statTab("Defense")).toHaveAttribute("aria-selected", "true");
  await expect(stats.statPanel()).toHaveAttribute("id", "stat-tabpanel-defense");
  await page.reload();
  await planner.waitUntilReady();
  await expect(stats.statTab("Defense")).toHaveAttribute("aria-selected", "true");
  await expect(stats.skillSelect()).toHaveValue("game-log-skill-3");
  await planner.expectNoErrors();
});

test("a path's hero figure shows its full number on click or Enter, and keeps it across tabs", async ({ page }) => {
  const { planner, stats } = await openStats(page);
  await stats.panelTab("Damage path").click();
  const hero = stats.pathHeroValue();
  await expect(hero).toHaveText("1.63 Billion");
  await expect(hero.locator(".damage-path-hero-magnitude")).toHaveText("Billion");
  await hero.click();
  await expect(hero).toHaveText(/^1,6\d\d,\d{3},\d{3}$/);
  await expect(hero).toHaveAttribute("aria-expanded", "true");
  await expect(hero.locator(".damage-path-hero-magnitude")).toHaveCount(0);
  await stats.pathTab("Ice Bond hits").click();
  await expect(stats.pathHeroValue()).toHaveText("553.64 Thousand");
  await stats.pathTab("Homing Frost Bolt hits").click();
  await expect(stats.pathHeroValue()).toHaveText(/^1,6\d\d,\d{3},\d{3}$/);
  await stats.pathHeroValue().focus();
  await page.keyboard.press("Enter");
  await expect(stats.pathHeroValue()).toHaveText("1.63 Billion");
  await planner.expectNoErrors();
});

test("a path's stages open and close, and list the sources that feed them", async ({ page }) => {
  const { planner, stats } = await openStats(page);
  await stats.panelTab("Damage path").click();
  const first = stats.pathStages().first();
  await expect(first).toHaveAttribute("open", "");
  await expect(first.locator("summary")).toContainText("Homing Frost Bolt · base hit");
  await expect(first.locator(".damage-feed").first()).toContainText("Homing Frost Bolt · Frost Bolt Lv.20");
  await first.locator("summary").click();
  await expect(first).not.toHaveAttribute("open", "");
  await expect(stats.pathViews().locator(".damage-chain-stage.result")).toContainText("Hit DPS");
  await stats.pathTab("All paths").click();
  await expect(stats.pathViews()).toContainText("Share by source over 10 s (recount)");
  await planner.expectNoErrors();
});

test("the damage path's report button opens the calculation report", async ({ page }) => {
  const { planner, stats } = await openStats(page);
  await stats.panelTab("Damage path").click();
  await stats
    .damagePath()
    .getByRole("button", { name: /Report calculation issue/ })
    .click();
  await expect(stats.feedbackDialog()).toBeVisible();
  await page.keyboard.press("Escape");
  await planner.expectNoErrors();
});

test.describe("open questions", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("Copy questions puts them on the clipboard; Submit an answer opens the answer form", async ({ page }) => {
    const { planner, stats } = await openStats(page);
    await stats.panelTab("Damage path").click();
    const questions = stats.openQuestions();
    await expect(questions).toHaveAttribute("open", "");
    await expect(questions.locator("> summary")).toContainText("Open questions5");
    await expect(questions.locator(".open-question")).toHaveCount(5);
    const title = (await questions.locator(".open-question-title").first().textContent()).trim();
    const copy = questions.getByRole("button", { name: "Copy questions" });
    await copy.click();
    await expect(questions.locator(".open-questions-copy")).toHaveText("Copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(title);
    await expect(questions.locator(".open-questions-copy")).toHaveText("Copy questions");

    const row = questions.locator(".open-question").first();
    await row.locator("summary").click();
    await row.getByRole("button", { name: "Submit an answer" }).click();
    await expect(stats.feedbackDialog()).toBeVisible();
    await expect(stats.feedbackDialog()).toContainText(title);
    await page.keyboard.press("Escape");
    await planner.expectNoErrors();
  });
});

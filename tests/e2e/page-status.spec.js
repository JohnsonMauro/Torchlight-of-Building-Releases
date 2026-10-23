// What the page says about the open build and the saved library: the build strip's name (renamed in place), the
// strip's save status, the toast, and the notices (another tab changed the build, saved builds that could not be read,
// safe mode). Written against the planner's own DOM writes before they moved to view sources, so both must pass it
// unchanged.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { GearPage } from "./pages/gear-page.js";

// A stored one-build library ("E2E build"): the default library stays in memory until the first edit, and the tests
// below need one both tabs read (or one to add a broken build to).
const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);

const LIBRARY_STORAGE_KEY = "tli-builder:build-library:v1";
const SAFE_MODE_KEY = "tli-builder:safe-mode:v1";
const DEFAULT_BUILD = "Selena — Scorching Beam";
test.use({ viewport: { width: 1440, height: 1000 } });

const strip = (page) => page.locator(".loadout-tab");
const stripName = (page) => strip(page).locator("strong");
const renameInput = (page) => strip(page).getByRole("textbox", { name: "Build name", exact: true });
const renameButton = (page) => strip(page).getByRole("button", { name: "Rename build", exact: true });
const saveStatus = (page) => page.locator(".loadout-status");
const toast = (page) => page.locator("#toast");
const storedNames = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key))?.builds.map((build) => build.name), LIBRARY_STORAGE_KEY);

test("the strip names the open build and says it is autosaved", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.open();
  await expect(strip(page)).toContainText("Active build");
  await expect(stripName(page)).toHaveText(DEFAULT_BUILD);
  await expect(saveStatus(page)).toContainText("Autosaved locally");
  await planner.expectNoErrors();
});

test("the pencil beside the name renames the open build; Enter saves the name", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.open();
  await renameButton(page).click();
  await expect(renameInput(page)).toBeFocused();
  await expect(renameInput(page)).toHaveValue(DEFAULT_BUILD);
  await expect(stripName(page)).toBeHidden();
  await renameInput(page).fill("  Frost Bolt  ");
  await renameInput(page).press("Enter");
  await expect(renameInput(page)).toHaveCount(0);
  await expect(stripName(page)).toHaveText("Frost Bolt");
  await expect(toast(page)).toHaveText("Build renamed");
  await expect(renameButton(page)).toBeFocused();
  expect(await storedNames(page)).toEqual(["Frost Bolt"]);
  await planner.expectNoErrors();
});

test("Escape keeps the name, a blank name keeps it, leaving the field saves", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  await renameButton(page).click();
  await renameInput(page).fill("Discarded");
  await renameInput(page).press("Escape");
  await expect(renameInput(page)).toHaveCount(0);
  await expect(stripName(page)).toHaveText("E2E build");
  await expect(renameButton(page)).toBeFocused();

  await page.keyboard.press("Enter");
  await renameInput(page).fill("   ");
  await renameInput(page).press("Enter");
  await expect(stripName(page)).toHaveText("E2E build");
  expect(await storedNames(page)).toEqual(["E2E build"]);

  await renameButton(page).click();
  await renameInput(page).fill("Kept on blur");
  await page.locator(".site-header a").first().focus();
  await expect(renameInput(page)).toHaveCount(0);
  await expect(stripName(page)).toHaveText("Kept on blur");
  await expect(toast(page)).toHaveText("Build renamed");
  await planner.expectNoErrors();
});

test("the toast prints names as they are, apostrophes included", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  await planner.showView("equipment");
  const gear = new GearPage(page);
  await gear.slot("chest").click({ button: "right" });
  await expect(toast(page)).toHaveText("Chest unequipped");
  await gear.cardButton("Long Night Sorcerer's Robe").click({ button: "right" });
  await expect(toast(page)).toHaveText("Long Night Sorcerer's Robe equipped");
  await planner.expectNoErrors();
});

test("with no build left, the Workspace asks for one and shows no build strip", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.open();
  await planner.showView("builds");
  await page.locator("#builds-view").getByRole("button", { name: "Delete all builds", exact: true }).click();
  await page
    .locator("#delete-all-builds-confirm")
    .getByRole("button", { name: "Delete All Builds", exact: true })
    .click();
  await expect(planner.view("builds")).toBeVisible();
  await expect(page.locator("#builds-view")).toContainText("No saved builds");
  await expect(strip(page)).toHaveCount(0);
  await planner.expectNoErrors();
});

test("another tab's change to the open build offers a reload; Reload it takes that version", async ({
  page,
  context,
}) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  const notice = page.getByRole("status").filter({ hasText: "This build was changed in another tab" });
  await expect(notice).toHaveCount(0);

  const other = await context.newPage();
  const otherPlanner = new PlannerPage(other);
  await otherPlanner.open(youga);
  await other.locator(".build-actions").getByRole("button", { name: "Reset Build" }).click();
  await other.getByRole("dialog", { name: "Reset this build?" }).getByRole("button", { name: "Reset Build" }).click();
  await expect(other.locator("#toast")).toHaveText("Build reset to empty");

  await expect(notice).toBeVisible();
  await expect(page.locator("#selected-hero-name")).not.toHaveText("No hero selected");
  await notice.getByRole("button", { name: "Reload it", exact: true }).click();
  await expect(notice).toHaveCount(0);
  await expect(toast(page)).toHaveText("Build reloaded");
  await expect(page.locator("#selected-hero-name")).toHaveText("No hero selected");
  await planner.expectNoErrors();
  await otherPlanner.expectNoErrors();
});

test("the other-tab notice can be dismissed, and stays dismissed for that version", async ({ page, context }) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  const notice = page.getByRole("status").filter({ hasText: "This build was changed in another tab" });
  const other = await context.newPage();
  await new PlannerPage(other).open(youga);
  await other.locator(".build-actions").getByRole("button", { name: "Reset Build" }).click();
  await other.getByRole("dialog", { name: "Reset this build?" }).getByRole("button", { name: "Reset Build" }).click();

  await expect(notice).toBeVisible();
  await notice.getByRole("button", { name: "Dismiss", exact: true }).click();
  await expect(notice).toHaveCount(0);
  await expect(page.locator("#selected-hero-name")).not.toHaveText("No hero selected");
  // Another tab's write of something else (a new build there) does not bring the notice back.
  await other
    .getByRole("navigation", { name: "Builder sections" })
    .getByRole("button", { name: "Back to Workspace", exact: true })
    .click();
  await other.locator("#builds-view").getByRole("button", { name: "New Build", exact: true }).click();
  await expect(other.locator("#toast")).toHaveText("New build ready · Rename it in Build Library");
  await expect(page.locator("#build-count")).toHaveText("2");
  await expect(notice).toHaveCount(0);
  await planner.expectNoErrors();
});

test("saved builds that cannot be read are kept, and a new library can be started", async ({ page }) => {
  await page.addInitScript((key) => {
    if (!sessionStorage.getItem("e2e-seeded")) {
      sessionStorage.setItem("e2e-seeded", "1");
      localStorage.setItem(key, "{not json");
    }
  }, LIBRARY_STORAGE_KEY);
  const planner = new PlannerPage(page);
  await planner.load();
  const notice = page.getByRole("status").filter({ hasText: "Your saved builds couldn't be read." });
  await expect(notice).toBeVisible();
  await expect(notice.getByRole("button", { name: "Download backup", exact: true })).toBeVisible();

  await notice
    .getByRole("button", { name: "Start a new library (your unreadable data stays backed up)", exact: true })
    .click();
  await expect(toast(page)).toHaveText("New library started · Your unreadable data stays backed up");
  await expect(notice).toHaveCount(0);
  await planner.enterBuild();
  await expect(saveStatus(page)).toContainText("Autosaved locally");
  await expect(stripName(page)).toHaveText(DEFAULT_BUILD);
  const kept = await page.evaluate(
    (prefix) => Object.keys(localStorage).filter((key) => key.startsWith(prefix)).length,
    `${LIBRARY_STORAGE_KEY}:unreadable:`,
  );
  expect(kept).toBe(1);
});

test("a saved build that fails validation is named in a notice, and the others load", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  // The reload finds a broken build beside the stored one.
  await page.evaluate((key) => {
    const library = JSON.parse(localStorage.getItem(key));
    library.builds.push({
      id: "broken",
      name: "Broken build",
      notes: "",
      createdAt: "2026-10-19T00:00:00.000Z",
      updatedAt: "2026-10-19T00:00:00.000Z",
      state: { schemaVersion: 1, combat: { afflictionAverage: "lots" } },
      revisions: [],
      shareHistory: [],
    });
    localStorage.setItem(key, JSON.stringify(library));
  }, LIBRARY_STORAGE_KEY);
  await page.reload();
  await planner.waitUntilReady();
  const notice = page
    .getByRole("status")
    .filter({ hasText: "1 build couldn't be loaded and is kept unchanged: Broken build." });
  await expect(notice).toBeVisible();
  await expect(notice.getByRole("button", { name: "Download backup", exact: true })).toBeVisible();
  await planner.enterBuild();
  await expect(stripName(page)).toHaveText("E2E build");
  await expect(saveStatus(page)).toContainText("Autosaved locally");
  await planner.expectNoErrors();
});

test("safe mode opens the Builds view with calculations paused until resumed", async ({ page }) => {
  await page.addInitScript((key) => {
    if (sessionStorage.getItem("e2e-seeded")) return;
    sessionStorage.setItem("e2e-seeded", "1");
    sessionStorage.setItem(key, "1");
  }, SAFE_MODE_KEY);
  const planner = new PlannerPage(page);
  await planner.load();
  const notice = page.locator("#builds-view").getByRole("status").filter({ hasText: "Safe mode: calculations paused" });
  await expect(notice).toBeVisible();
  await expect(planner.view("builds")).toBeVisible();
  await Promise.all([
    page.waitForEvent("framenavigated"),
    notice.getByRole("button", { name: "Resume calculations", exact: true }).click(),
  ]);
  await planner.waitUntilReady();
  await expect(notice).toHaveCount(0);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), SAFE_MODE_KEY)).toBeNull();
});

// ---- Seasons ------------------------------------------------------------------------------------------------------

const header = (page) => page.locator(".site-header");
const season = (page) => page.locator(".build-season");
const dismissSeasonChange = (page) => page.getByRole("button", { name: "Dismiss the season change", exact: true });
const storedState = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key))?.builds[0].state, LIBRARY_STORAGE_KEY);

// The Youga build as an SS13 save: a legendary SS14 no longer has in its inventory and two ranks on a Lich node that
// does not exist.
const ss13Youga = () => ({
  ...structuredClone(youga),
  season: "ss13",
  seasonOrigin: "ss13",
  talentRanks: { ...youga.talentRanks, "Lich:9,9": 2 },
  equipmentInventory: [
    ...youga.equipmentInventory,
    { id: "gear-gone", name: "Vanished Crown", base: "DEX Helmet", slot: "helmet", rarity: "legendary" },
  ],
});

test("the header names the season the planner calculates; a build of that season shows no season", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  await expect(header(page)).toContainText("SS14 · Tartarus");
  await expect(season(page)).toHaveCount(0);
  await planner.expectNoErrors();
});

test("a build from an earlier season says so and lists what moving it removed; dismissing keeps the season", async ({
  page,
}) => {
  const planner = new PlannerPage(page);
  await planner.open(ss13Youga());
  await expect(season(page)).toContainText("SS13 build");
  const summary = season(page).getByText(
    "Moved from SS13 to SS14: 2 incompatible parts removed, 2 talent points returned",
    { exact: true },
  );
  await summary.click();
  await expect(season(page).getByRole("listitem")).toHaveText(["Talent Lich 9,9", "Vanished Crown (inventory)"]);

  await dismissSeasonChange(page).click();
  await expect(summary).toHaveCount(0);
  await expect(season(page)).toHaveText("SS13 build");
  const stored = await storedState(page);
  expect([stored.season, stored.seasonOrigin, stored.seasonChange]).toEqual(["ss14", "ss13", null]);
  expect(stored.talentRanks["Lich:9,9"]).toBeUndefined();
  expect(stored.equipmentInventory.some((item) => item.id === "gear-gone")).toBe(false);

  // The build keeps the season it was made in.
  await page.reload();
  await planner.waitUntilReady();
  await planner.enterBuild();
  await expect(season(page)).toHaveText("SS13 build");
  await planner.expectNoErrors();
});

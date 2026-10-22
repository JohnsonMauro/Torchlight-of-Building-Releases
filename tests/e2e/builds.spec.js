// The Workspace (the Builds view, the home page): the build library flows a user reaches from there. Written against the legacy view
// before it moved to React, so both implementations must pass it unchanged.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { BuildsPage } from "./pages/builds-page.js";

const DEFAULT_BUILD = "Selena — Scorching Beam";

async function openBuilds(page) {
  const planner = new PlannerPage(page);
  await planner.open();
  const builds = new BuildsPage(page);
  await builds.open();
  return { planner, builds };
}

test("the planner opens on the Workspace; a build opens on the page it was left on; the title and the rail go back", async ({
  page,
}) => {
  const planner = new PlannerPage(page);
  await planner.load();
  const rail = page.getByRole("navigation", { name: "Builder sections" });
  await expect(planner.view("builds")).toBeVisible();
  await expect(rail).toHaveCount(0);
  await expect(page.locator(".loadout-tab")).toHaveCount(0);
  await planner.enterBuild();
  await expect(planner.view("hero")).toBeVisible();
  await expect(page.locator(".loadout-tab")).toBeVisible();
  await planner.showView("skills");
  await page.getByRole("link", { name: "Torchlight of Building home" }).click();
  await expect(planner.view("builds")).toBeVisible();
  await expect(rail).toHaveCount(0);
  await planner.enterBuild();
  await expect(planner.view("skills")).toBeVisible();
  await rail.getByRole("button", { name: "Back to Workspace", exact: true }).click();
  await expect(planner.view("builds")).toBeVisible();
  await page.reload();
  await planner.waitUntilReady();
  await expect(planner.view("builds")).toBeVisible();
  await planner.enterBuild();
  await expect(planner.view("skills")).toBeVisible();
  await planner.expectNoErrors();
});

test("lists the default build as the active one, with its details", async ({ page }) => {
  const { planner, builds } = await openBuilds(page);
  await expect(builds.count()).toHaveText("1");
  await expect(builds.cards()).toHaveCount(1);
  await expect(builds.activeCard()).toContainText(DEFAULT_BUILD);
  await expect(builds.activeCard()).toContainText("ACTIVE BUILD");
  await expect(builds.editorSummaryName()).toHaveText(DEFAULT_BUILD);
  await expect(builds.nameInput()).toHaveValue(DEFAULT_BUILD);
  await expect(builds.notesInput()).toHaveValue("Captured Selena 1 / Sing with the Tide build.");
  await expect(builds.duplicateButton()).toBeEnabled();
  await expect(builds.deleteAllButton()).toBeEnabled();
  await planner.expectNoErrors();
});

test("a new build becomes active, asks for its hero and opens the Build view", async ({ page }) => {
  const { planner, builds } = await openBuilds(page);
  await builds.newBuildButton().click();
  await builds.expectToast("New build ready · Rename it in Build Library");
  const heroSelector = page.locator("#hero-selector");
  await expect(heroSelector).toBeVisible();
  await heroSelector.locator('[data-select-hero="selena-sing-with-the-tide"]').click();
  await expect(heroSelector).toBeHidden();
  await expect(planner.view("hero")).toBeVisible();
  await expect(page.locator("#selected-hero-name")).toHaveText("Selena");
  await expect(builds.loadoutTabName()).toHaveText("New build");
  await builds.open();
  await expect(builds.count()).toHaveText("2");
  await expect(builds.activeCard()).toContainText("New build");
  await expect(builds.card(DEFAULT_BUILD)).toContainText("SAVED BUILD");
  await planner.expectNoErrors();
});

test("an edit in the planner shows in the build list (autosave)", async ({ page }) => {
  const { planner, builds } = await openBuilds(page);
  await expect(builds.activeCard()).not.toContainText("Youga");
  await page.locator("#build-editor").getByRole("button", { name: "Change Hero", exact: true }).click();
  const youga = page.locator('[data-select-hero="youga-the-ultimate-one"]');
  const heroName = (await youga.locator("strong").textContent()).trim();
  await youga.click();
  await builds.open();
  await expect(builds.activeCard()).toContainText(heroName);
  await planner.expectNoErrors();
});

test("saving details renames the build everywhere and keeps the notes", async ({ page }) => {
  const { planner, builds } = await openBuilds(page);
  await builds.nameInput().fill("Frost Bolt test");
  await builds.notesInput().fill("Trying crit gear");
  await builds.saveDetailsButton().click();
  await builds.expectToast("Build details saved");
  await expect(builds.activeCard()).toContainText("Frost Bolt test");
  await expect(builds.editorSummaryName()).toHaveText("Frost Bolt test");
  await planner.enterBuild();
  await expect(builds.loadoutTabName()).toHaveText("Frost Bolt test");
  await page.reload();
  await planner.waitUntilReady();
  await builds.open();
  await expect(builds.nameInput()).toHaveValue("Frost Bolt test");
  await expect(builds.notesInput()).toHaveValue("Trying crit gear");
  await planner.expectNoErrors();
});

test("duplicate, then open each build from its card", async ({ page }) => {
  const { planner, builds } = await openBuilds(page);
  await builds.duplicateButton().click();
  await builds.expectToast("Build duplicated — safe to experiment");
  await expect(builds.count()).toHaveText("2");
  await expect(builds.cards()).toHaveCount(2);
  const copyName = (await builds.activeCard().locator("strong").textContent()).trim();
  expect(copyName).not.toBe(DEFAULT_BUILD);

  await builds.openCard(DEFAULT_BUILD);
  await expect(planner.view("hero")).toBeVisible();
  await expect(builds.loadoutTabName()).toHaveText(DEFAULT_BUILD);
  await builds.open();
  await expect(builds.activeCard()).toContainText(DEFAULT_BUILD);

  await builds.openCard(copyName);
  await expect(planner.view("hero")).toBeVisible();
  await expect(builds.loadoutTabName()).toHaveText(copyName);
  await planner.expectNoErrors();
});

test("deleting a build asks first, and cancel keeps it", async ({ page }) => {
  const { planner, builds } = await openBuilds(page);
  await builds.duplicateButton().click();
  await expect(builds.cards()).toHaveCount(2);

  await builds.deleteCard(DEFAULT_BUILD);
  await expect(builds.deleteDialog()).toBeVisible();
  await expect(builds.deleteDialogMessage()).toContainText(`“${DEFAULT_BUILD}”`);
  await builds.cancelDelete();
  await expect(builds.deleteDialog()).toBeHidden();
  await expect(builds.cards()).toHaveCount(2);

  await builds.deleteCard(DEFAULT_BUILD);
  await builds.confirmDelete();
  await builds.expectToast("Build deleted");
  await expect(builds.view()).toBeVisible();
  await expect(builds.cards()).toHaveCount(1);
  await expect(builds.card(DEFAULT_BUILD)).toHaveCount(0);
  await expect(builds.count()).toHaveText("1");
  await planner.expectNoErrors();
});

test("deleting all builds leaves the empty state", async ({ page }) => {
  const { planner, builds } = await openBuilds(page);
  await builds.deleteAllButton().click();
  await expect(builds.deleteAllDialog()).toBeVisible();
  await builds.confirmDeleteAll();
  await builds.expectToast("All builds deleted");
  await expect(builds.emptyState()).toContainText("No saved builds");
  await expect(builds.count()).toHaveText("0");
  await expect(builds.duplicateButton()).toBeDisabled();
  await expect(builds.deleteAllButton()).toBeDisabled();

  await builds.emptyStateNewBuildButton().click();
  await builds.expectToast("New build ready · Rename it in Build Library");
  await page.locator('#hero-selector [data-select-hero="selena-sing-with-the-tide"]').click();
  await builds.open();
  await expect(builds.count()).toHaveText("1");
  await planner.expectNoErrors();
});

test("backing up downloads the library as JSON", async ({ page }) => {
  const { planner, builds } = await openBuilds(page);
  const download = page.waitForEvent("download");
  await builds.backupButton().click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.json$/);
  await expect(builds.toast()).toContainText(`Backup downloaded · ${file.suggestedFilename()}`);
  // The starter library was never edited (it lived in memory only): the backup holds it all the same.
  const backup = JSON.parse(readFileSync(await file.path(), "utf8"));
  expect(backup.library.builds.map((build) => build.name)).toEqual([DEFAULT_BUILD]);
  await planner.expectNoErrors();
});

test("Restore from backup brings deleted builds back from a downloaded backup", async ({ page }) => {
  const { planner, builds } = await openBuilds(page);
  const download = page.waitForEvent("download");
  await builds.backupButton().click();
  const backupPath = await (await download).path();
  await builds.deleteAllButton().click();
  await builds.confirmDeleteAll();
  await expect(builds.count()).toHaveText("0");

  const chooser = page.waitForEvent("filechooser");
  await builds.button("Restore from backup").click();
  await (await chooser).setFiles(backupPath);
  await builds.expectToast("Restored 1 build");
  await expect(builds.count()).toHaveText("1");
  await expect(builds.card(DEFAULT_BUILD)).toBeVisible();

  // The same backup again: the build is already there.
  const again = page.waitForEvent("filechooser");
  await builds.button("Restore from backup").click();
  await (await again).setFiles(backupPath);
  await builds.expectToast("Restored 0 builds · 1 already in library");
  await planner.expectNoErrors();
});

test("Restore from backup says when the file is not a backup", async ({ page }) => {
  const { planner, builds } = await openBuilds(page);
  const chooser = page.waitForEvent("filechooser");
  await builds.button("Restore from backup").click();
  await (await chooser).setFiles({ name: "notes.json", mimeType: "application/json", buffer: Buffer.from("not json") });
  await builds.expectToast("That file is not a valid backup (not JSON)");

  const again = page.waitForEvent("filechooser");
  await builds.button("Restore from backup").click();
  await (await again).setFiles({ name: "other.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(builds.toast()).not.toHaveText("That file is not a valid backup (not JSON)");
  await expect(builds.count()).toHaveText("1");
  await planner.expectNoErrors();
});

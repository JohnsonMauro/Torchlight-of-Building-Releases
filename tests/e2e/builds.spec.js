// Builds view (the "Notes" tab): the build library flows a user reaches from there. Written against the legacy view
// before it moved to React, so both implementations must pass it unchanged.
import { test, expect } from "@playwright/test";
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

test("a new build becomes active and opens the Build view", async ({ page }) => {
  const { planner, builds } = await openBuilds(page);
  await builds.newBuildButton().click();
  await builds.expectToast("New build ready · Rename it in Build Library");
  await expect(planner.view("talents")).toBeVisible();
  await expect(builds.loadoutTabName()).toHaveText("New build");
  await builds.open();
  await expect(builds.count()).toHaveText("2");
  await expect(builds.activeCard()).toContainText("New build");
  await expect(builds.card(DEFAULT_BUILD)).toContainText("SAVED BUILD");
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
  await expect(builds.loadoutTabName()).toHaveText("Frost Bolt test");
  await page.reload();
  await planner.waitUntilReady();
  await builds.open();
  await expect(builds.nameInput()).toHaveValue("Frost Bolt test");
  await expect(builds.notesInput()).toHaveValue("Trying crit gear");
  await planner.expectNoErrors();
});

test("duplicate, open another build, and edit it", async ({ page }) => {
  const { planner, builds } = await openBuilds(page);
  await builds.duplicateButton().click();
  await builds.expectToast("Build duplicated — safe to experiment");
  await expect(builds.count()).toHaveText("2");
  await expect(builds.cards()).toHaveCount(2);
  const copyName = (await builds.activeCard().locator("strong").textContent()).trim();
  expect(copyName).not.toBe(DEFAULT_BUILD);

  await builds.openCard(DEFAULT_BUILD);
  await builds.expectToast("Build selected");
  await expect(builds.view()).toBeVisible();
  await expect(builds.activeCard()).toContainText(DEFAULT_BUILD);
  await expect(builds.loadoutTabName()).toHaveText(DEFAULT_BUILD);

  await builds.editCard(copyName);
  await builds.expectToast("Build opened for editing");
  await expect(planner.view("talents")).toBeVisible();
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
  await expect(builds.loadoutTabName()).toHaveText("Start a new build");

  await builds.emptyStateNewBuildButton().click();
  await builds.expectToast("New build ready · Rename it in Build Library");
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
  await planner.expectNoErrors();
});

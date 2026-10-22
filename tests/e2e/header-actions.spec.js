// The build strip's actions and the Workspace's Import: Reset Build (with its confirmation), Export (the build code to the clipboard) and Import
// (a pasted build code becomes a new library build). Written against the legacy header and dialogs before they move to
// React, so both must pass it unchanged.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const LIBRARY_STORAGE_KEY = "tli-builder:build-library:v1";
test.use({ viewport: { width: 1440, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });

const header = (page) => page.locator(".build-actions");
const workspace = (page) => page.locator(".workspace-actions");
const toast = (page) => page.locator("#toast");
const library = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), LIBRARY_STORAGE_KEY);
const activeState = async (page) => {
  const stored = await library(page);
  return stored.builds.find((build) => build.id === stored.activeBuildId).state;
};

test("Reset Build asks first: Keep Build changes nothing, Reset Build empties the open build", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  const dialog = page.getByRole("dialog", { name: "Reset this build?" });
  await header(page).getByRole("button", { name: "Reset Build" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Other saved builds will remain available.");
  await expect(dialog.getByRole("button", { name: "Keep Build" })).toBeFocused();
  await dialog.getByRole("button", { name: "Keep Build" }).click();
  await expect(dialog).toBeHidden();
  expect((await activeState(page)).hero.selectedHeroId).toBe("youga-the-ultimate-one");

  await header(page).getByRole("button", { name: "Reset Build" }).click();
  await dialog.getByRole("button", { name: "Reset Build" }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page)).toHaveText("Build reset to empty");
  await expect(page.locator("#selected-hero-name")).toHaveText("No hero selected");
  const state = await activeState(page);
  expect(state.hero.selectedHeroId).toBe("");
  expect(state.talents.selectedTrees.filter(Boolean)).toEqual([]);
  await planner.expectNoErrors();
});

test("Export copies the build code; Import adds it as a new active build", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  await header(page).getByRole("button", { name: "Export" }).click();
  await expect(toast(page)).toHaveText("Build code copied to clipboard");
  const code = await page.evaluate(() => navigator.clipboard.readText());
  expect(code.length).toBeGreaterThan(100);

  await planner.showView("builds");
  const dialog = page.getByRole("dialog", { name: "Import build" });
  await workspace(page).getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await workspace(page).getByRole("button", { name: "Import", exact: true }).click();
  await dialog.getByRole("textbox", { name: "Paste a build code" }).fill(code);
  await dialog.getByRole("button", { name: "Import Code" }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page)).toHaveText(/ imported and active$/);
  await expect(planner.view("builds")).toBeVisible();
  const stored = await library(page);
  expect(stored.builds).toHaveLength(2);
  expect(stored.activeBuildId).not.toBe("e2e-build");
  expect((await activeState(page)).hero.selectedHeroId).toBe("youga-the-ultimate-one");
  await planner.expectNoErrors();
});

test("Import keeps the dialog open on a code it cannot read", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.load(youga);
  const dialog = page.getByRole("dialog", { name: "Import build" });
  await workspace(page).getByRole("button", { name: "Import", exact: true }).click();
  await dialog.getByRole("textbox", { name: "Paste a build code" }).fill("not a build code");
  await dialog.getByRole("button", { name: "Import Code" }).click();
  await expect(toast(page)).toHaveText("That build code could not be read");
  await expect(dialog).toBeVisible();
  expect((await library(page)).builds).toHaveLength(1);
  await page.keyboard.press("Escape");
  // The pasted text stays for the next opening.
  await workspace(page).getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: "Paste a build code" })).toHaveValue("not a build code");
  await planner.expectNoErrors();
});

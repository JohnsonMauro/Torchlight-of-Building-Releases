// The feedback dialog (Report bug in the loadout strip, Report calculation issue on the stat sheet, Submit an answer on
// an open question): the title and the GitHub form's fields, the title following its default until edited, validation,
// drafts kept on close, the build code (copied, or opted in), and Send to GitHub (a new tab with the pre-filled form).
// Written against the legacy dialog before it moves to React, so both must pass it unchanged.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const DRAFTS_KEY = "tlib.feedbackDrafts";
test.use({ viewport: { width: 1440, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });

async function openBug(page) {
  // window.open is recorded instead of opening a tab.
  await page.addInitScript(() => {
    window.__opened = [];
    window.open = (url) => {
      window.__opened.push(String(url));
      return null;
    };
  });
  const planner = new PlannerPage(page);
  await planner.open(youga);
  await page.locator("[data-report-bug]").click();
  const dialog = page.locator("#feedback-dialog");
  await expect(dialog).toBeVisible();
  return { planner, dialog };
}
const send = (dialog) => dialog.getByRole("button", { name: "Send to GitHub", exact: true });
const drafts = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null"), DRAFTS_KEY);

test("Report bug: the title, the form's fields; the title follows the Area until it is edited", async ({ page }) => {
  const { planner, dialog } = await openBug(page);
  await expect(dialog.locator("#feedback-dialog-title")).toHaveText("Report a planner bug");
  await expect(dialog.locator("[data-feedback-field]")).toHaveCount(7);
  const area = dialog.locator('[data-feedback-input="area"]');
  const title = dialog.locator('[data-feedback-input="title"]');
  // The open build tab names the area: the planner opens on Hero Trait.
  await expect(area).toHaveValue("Hero");
  await expect(title).toHaveValue("[Bug] Hero: ");
  await expect(title).toBeFocused();
  await expect(dialog.locator("[data-feedback-auto]")).toHaveCount(2);
  await expect(dialog.locator('[data-feedback-auto="app_version"]')).toHaveText(/\S/);
  const include = dialog.getByLabel("Include my build code");
  await expect(include).toBeEnabled();
  await expect(include).not.toBeChecked();

  await area.selectOption("Slates");
  await expect(title).toHaveValue("[Bug] Slates: ");
  await expect(send(dialog)).toBeDisabled();
  await dialog.locator('[data-feedback-input="what_happened"]').fill("The slate turned the wrong way");
  await expect(send(dialog)).toBeEnabled();
  await title.fill("[Bug] My own title");
  await area.selectOption("Gear");
  await expect(title).toHaveValue("[Bug] My own title");
  await planner.expectNoErrors();
});

test("validation: an emptied required field shows its error on leaving it; Area on change", async ({ page }) => {
  const { planner, dialog } = await openBug(page);
  const what = dialog.locator('[data-feedback-input="what_happened"]');
  const error = dialog.locator("#feedback-field-what_happened-error");
  // Tabbing through an untouched field stays quiet.
  await what.focus();
  await page.keyboard.press("Tab");
  await expect(error).toBeHidden();
  await what.fill("x");
  await what.fill("");
  await what.blur();
  await expect(error).toBeVisible();
  await expect(what).toHaveAttribute("aria-invalid", "true");
  await what.fill("Back");
  await expect(error).toBeHidden();
  await expect(what).toHaveAttribute("aria-invalid", "false");
  await dialog.locator('[data-feedback-input="area"]').selectOption("");
  await expect(dialog.locator("#feedback-field-area-error")).toBeVisible();
  await expect(send(dialog)).toBeDisabled();
  await planner.expectNoErrors();
});

test("drafts: Escape keeps what was typed and the build code choice; reopening restores them; Cancel too", async ({
  page,
}) => {
  const { planner, dialog } = await openBug(page);
  await dialog.locator('[data-feedback-input="what_happened"]').fill("Kept text");
  await dialog.getByLabel("Include my build code").check();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(await drafts(page)).toEqual({ bug: { values: { what_happened: "Kept text" }, includeBuildCode: true } });
  await page.locator("[data-report-bug]").click();
  await expect(dialog.locator('[data-feedback-input="what_happened"]')).toHaveValue("Kept text");
  await expect(dialog.getByLabel("Include my build code")).toBeChecked();
  await dialog.locator('[data-feedback-input="steps"]').fill("One step");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect((await drafts(page)).bug.values).toEqual({ what_happened: "Kept text", steps: "One step" });
  await planner.expectNoErrors();
});

test("Send to GitHub opens the pre-filled issue form, copies the build code when opted in, and clears the draft", async ({
  page,
}) => {
  const { planner, dialog } = await openBug(page);
  await dialog.locator('[data-feedback-input="area"]').selectOption("Gear");
  await dialog.locator('[data-feedback-input="what_happened"]').fill("The helmet vanished");
  await dialog.getByLabel("Include my build code").check();
  await send(dialog).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("#toast")).toHaveText(/^GitHub opened/);
  const opened = await page.evaluate(() => window.__opened);
  expect(opened).toHaveLength(1);
  const url = new URL(opened[0]);
  expect(url.origin + url.pathname).toBe("https://github.com/TomSelleck09/Torchlight-of-Building-Releases/issues/new");
  expect(url.searchParams.get("template")).toBe("planner-bug.yml");
  expect(url.searchParams.get("title")).toBe("[Bug] Gear: The helmet vanished");
  expect(url.searchParams.get("what_happened")).toBe("The helmet vanished");
  expect(await drafts(page)).toBeNull();
  await planner.expectNoErrors();
});

test("Report calculation issue: the build code is shown read-only and Copy puts it on the clipboard", async ({
  page,
}) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  await planner.showView("character");
  await page
    .getByRole("button", { name: /Report calculation issue/ })
    .first()
    .click();
  const dialog = page.locator("#feedback-dialog");
  await expect(dialog.locator("#feedback-dialog-title")).toHaveText("Report calculation issue");
  const code = dialog.locator("[data-feedback-build-code]");
  await expect(code).toHaveAttribute("readonly", "");
  const value = await code.inputValue();
  expect(value.length).toBeGreaterThan(20);
  await expect(dialog.locator('[data-feedback-input="skill"]')).not.toHaveValue("");
  await expect(dialog.locator('[data-feedback-input="title"]')).toHaveValue(/^\[Calc\] .+ – $/);
  const copy = dialog.locator("[data-feedback-copy-code]");
  await copy.click();
  await expect(copy).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(value);
  await expect(copy).toHaveText("Copy");
  await expect(dialog.getByRole("button", { name: "Send to GitHub", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
  await planner.expectNoErrors();
});

test("Tab from the last control comes back to the first", async ({ page }) => {
  const { planner, dialog } = await openBug(page);
  await dialog.locator('[data-feedback-input="area"]').selectOption("Gear");
  await dialog.locator('[data-feedback-input="what_happened"]').fill("x");
  await send(dialog).focus();
  await page.keyboard.press("Tab");
  await expect(dialog.locator("[data-feedback-close]")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(send(dialog)).toBeFocused();
  await planner.expectNoErrors();
});

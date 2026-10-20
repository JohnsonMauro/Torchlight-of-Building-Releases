// The header's "Import from game" dialog: the lookup through the planner's local reader (/api/game-log/snapshots,
// answered here by the test with the reader's own output for synthetic logs), the file picker when there is no reader,
// a chosen log's logins and its read problems, a login's summary, and Import as new build. Written against the legacy
// dialog before it moves to React, so both must pass it unchanged. Times are UTC (the dialog shows local time).
import { test, expect } from "@playwright/test";
import { mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readGameLogSnapshots } from "../../src/game-log/game-log-local.js";
import { PlannerPage } from "./pages/planner-page.js";
import { TWO_LOGINS, gameLogText, login } from "./fixtures/game-log.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const LIBRARY_STORAGE_KEY = "tli-builder:build-library:v1";
const NO_READER = "Automatic lookup needs the planner's local dev server (pnpm dev) or the desktop app.";
test.use({ viewport: { width: 1440, height: 1000 }, timezoneId: "UTC" });

const dialog = (page) => page.getByRole("dialog", { name: "Import from game" });
const fileInput = (page) => dialog(page).getByLabel("Game log");
const importButton = (page) => dialog(page).getByRole("button", { name: "Import as new build" });
const logins = (page) => dialog(page).locator(".game-log-snapshots button");
const status = (page) => dialog(page).getByRole("status");
const library = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), LIBRARY_STORAGE_KEY);
const logFile = (text, name = "UE_game.log") => ({ name, mimeType: "text/plain", buffer: Buffer.from(text) });

// What a static host answers (its page, not JSON): the planner reads that as "no local reader".
const NOT_JSON = { contentType: "text/html", body: "<!doctype html>" };
/** Answers the local reader's endpoint with `body` (JSON), or as a static host when null. */
const reader = (page, body) =>
  page.route("**/api/game-log/snapshots", (route) => (body ? route.fulfill({ json: body }) : route.fulfill(NOT_JSON)));
/** The reader's real answer for a folder holding these files ({ name: text }), each modified at `modified`. */
async function readerOutput(files, modified = "2026-10-19T14:05:00Z") {
  const dir = mkdtempSync(join(tmpdir(), "tli-game-log-"));
  try {
    for (const [name, text] of Object.entries(files)) {
      writeFileSync(join(dir, name), text);
      utimesSync(join(dir, name), new Date(modified), new Date(modified));
    }
    return JSON.parse(JSON.stringify(await readGameLogSnapshots({ dir })));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
async function openDialog(page, body = null) {
  const planner = new PlannerPage(page);
  await reader(page, body);
  await planner.open(youga);
  await page.locator(".header-actions").getByRole("button", { name: "Import from game" }).click();
  await expect(dialog(page)).toBeVisible();
  return planner;
}

test("without the local reader it says so and asks for the log file", async ({ page }) => {
  const planner = new PlannerPage(page);
  let answer;
  const answered = new Promise((resolve) => (answer = resolve));
  await page.route("**/api/game-log/snapshots", async (route) => {
    await answered;
    await route.fulfill(NOT_JSON);
  });
  await planner.open(youga);
  await page.locator(".header-actions").getByRole("button", { name: "Import from game" }).click();
  await expect(status(page)).toHaveText("Looking for UE_game.log…");
  await expect(fileInput(page)).toBeHidden();
  answer();
  await expect(dialog(page).locator(".game-log-reason")).toHaveText(NO_READER);
  await expect(status(page)).toBeHidden();
  await expect(fileInput(page)).toBeVisible();
  await expect(dialog(page)).toContainText("The log is read in this browser only. It is not uploaded or stored.");
  await expect(dialog(page)).toContainText("The game writes your build to it each time you log in to a character.");
  await expect(dialog(page).getByRole("button", { name: "Choose a different file…" })).toBeHidden();
  await expect(dialog(page).locator(".game-log-found")).toBeHidden();
  await expect(importButton(page)).toBeDisabled();
  await planner.expectNoErrors();
});

test("the reader's reason shows when it finds no log", async ({ page }) => {
  const planner = await openDialog(page, {
    found: false,
    reason: "The game's log folder was not found on this computer.",
  });
  await expect(dialog(page).locator(".game-log-reason")).toHaveText(
    "The game's log folder was not found on this computer.",
  );
  await expect(fileInput(page)).toBeVisible();
  await planner.expectNoErrors();
});

test("a chosen log lists its logins newest first; a login shows its summary and imports as a new active build", async ({
  page,
}) => {
  const planner = await openDialog(page);
  await fileInput(page).setInputFiles(logFile(gameLogText(TWO_LOGINS)));
  await expect(dialog(page).getByText("Characters found in this log", { exact: true })).toBeVisible();
  await expect(logins(page)).toHaveText([
    "Divineshot Carino · Ranger of GloryLv 60 · 2026-10-19 13:30",
    "Berserker Rehan · AngerLv 80 · 2026-10-19 12:00",
  ]);
  await expect(logins(page).first()).toHaveAttribute("aria-pressed", "false");
  await expect(status(page)).toBeHidden();
  await expect(dialog(page).locator(".game-log-reason")).toBeHidden();
  await expect(importButton(page)).toBeDisabled();

  await logins(page).first().click();
  await expect(logins(page).first()).toHaveAttribute("aria-pressed", "true");
  await expect(logins(page).first()).toHaveClass(/\bactive\b/);
  await expect(logins(page).nth(1)).toHaveAttribute("aria-pressed", "false");
  const summary = dialog(page).locator("#import-game-log-summary");
  await expect(summary.getByText("Snapshot from 2026-10-19 13:30", { exact: true })).toBeVisible();
  await expect(summary.locator("table th[scope=row]")).toHaveText([
    "Character",
    "Gear",
    "Talents",
    "Skills",
    "Slates",
    "Pacts",
    "Hero traits and memories",
  ]);
  await expect(summary.locator("thead th")).toHaveText(["Section", "Imported", "Not imported", "From"]);
  await expect(summary).toContainText("Some sections weren't in the game log: Equipped gear, ");
  await expect(summary).toContainText("Followers are not imported: the game log does not record your active follower.");
  await expect(importButton(page)).toBeEnabled();

  await importButton(page).click();
  await expect(dialog(page)).toBeHidden();
  await expect(planner.view("builds")).toBeVisible();
  const stored = await library(page);
  expect(stored.builds).toHaveLength(2);
  const imported = stored.builds.find((build) => build.id === stored.activeBuildId);
  expect(imported.id).not.toBe("e2e-build");
  expect(imported.name).toMatch(/^.+ · game log 2026-10-19 13:30$/);
  expect(imported.notes).not.toBe("");
  expect(imported.state.hero.selectedHeroId).toBe("carino-ranger-of-glory");
  await expect(page.locator("#toast")).toHaveText(`${imported.name} imported and active`);
  await planner.expectNoErrors();
});

test("a chosen file that holds no login says why, with its details", async ({ page }) => {
  const planner = await openDialog(page);
  const cases = [
    [
      logFile("", "empty.log"),
      "This file could not be read as a game log. Choose UE_game.log, or pick a UE_game-backup-*.log file from the same folder.",
      "Details: not a game log (empty file) · empty.log",
    ],
    [
      logFile(gameLogText([])),
      "No character data in this log yet. Log in to a character in game, then choose UE_game.log again, or pick a UE_game-backup-*.log file from the same folder.",
      "Details: game log, 0 character logins · UE_game.log",
    ],
    [
      logFile(["Log file open, 10/19/26 11:59:00", ...login(TWO_LOGINS[0]), ""].join("\n")),
      "The game is still writing the character data to this log. Wait a few seconds, then choose UE_game.log again, or pick a UE_game-backup-*.log file from the same folder.",
      "Details: game log, 0 complete character logins, 1 still being written · UE_game.log",
    ],
  ];
  for (const [file, message, details] of cases) {
    await fileInput(page).setInputFiles(file);
    await expect(status(page).locator("span")).toHaveText(message);
    await expect(status(page).locator(".game-log-details")).toHaveText(details);
    await expect(logins(page)).toHaveCount(0);
    await expect(importButton(page)).toBeDisabled();
  }
  // A complete login with a newer one still being written: the complete one is listed, with a note.
  await fileInput(page).setInputFiles(
    logFile([gameLogText([TWO_LOGINS[0]], { end: false }), ...login(TWO_LOGINS[1]), ""].join("\n")),
  );
  await expect(status(page).locator("span")).toHaveText(
    "The newest login in this log is still being written and was left out. Choose UE_game.log again in a few seconds to include it.",
  );
  await expect(status(page).locator(".game-log-details")).toHaveText(
    "Details: game log, 1 complete character login, 1 still being written · UE_game.log",
  );
  await expect(logins(page)).toHaveText(["Berserker Rehan · AngerLv 80 · 2026-10-19 12:00"]);
  await planner.expectNoErrors();
});

test("the local reader's log: found, best combined login chosen, and a different file on request", async ({ page }) => {
  const body = await readerOutput({
    "UE_game.log": gameLogText([
      ...TWO_LOGINS,
      { stamp: "2026.10.19-14.00.00:000", player: "p-carino", hero: "2001", level: "61" },
    ]),
  });
  const planner = await openDialog(page, body);
  await expect(dialog(page).locator(".game-log-found")).toHaveText("Found UE_game.log (updated 2026-10-19 14:05)");
  await expect(dialog(page)).toContainText("Read from the game's log folder on this computer by the planner.");
  await expect(logins(page)).toHaveText([
    "Best combined · Divineshot Carino · Ranger of GloryLv 61 · newest login 2026-10-19 14:00 · gaps filled from 1 older login",
    "Best combined · Berserker Rehan · AngerLv 80 · newest login 2026-10-19 12:00",
    "Divineshot Carino · Ranger of GloryLv 61 · 2026-10-19 14:00",
    "Divineshot Carino · Ranger of GloryLv 60 · 2026-10-19 13:30",
    "Berserker Rehan · AngerLv 80 · 2026-10-19 12:00",
  ]);
  await expect(logins(page).first()).toHaveAttribute("aria-pressed", "true");
  await expect(dialog(page).locator("#import-game-log-summary thead th")).toHaveText([
    "Section",
    "Imported",
    "Not imported",
    "From",
  ]);
  await expect(importButton(page)).toBeEnabled();
  await expect(fileInput(page)).toBeHidden();
  await expect(dialog(page).locator(".game-log-reason")).toBeHidden();

  await logins(page).nth(3).click();
  await expect(logins(page).nth(3)).toHaveAttribute("aria-pressed", "true");
  await expect(logins(page).first()).toHaveAttribute("aria-pressed", "false");
  await expect(dialog(page).getByText("Snapshot from 2026-10-19 13:30", { exact: true })).toBeVisible();

  await dialog(page).getByRole("button", { name: "Choose a different file…" }).click();
  await expect(dialog(page).getByRole("button", { name: "Choose a different file…" })).toBeHidden();
  await expect(fileInput(page)).toBeVisible();
  await expect(fileInput(page)).toBeFocused();
  // The found file and its logins stay until a file is chosen.
  await expect(logins(page)).toHaveCount(5);
  await fileInput(page).setInputFiles(logFile(gameLogText([TWO_LOGINS[0]])));
  await expect(dialog(page).locator(".game-log-found")).toBeHidden();
  await expect(logins(page)).toHaveText(["Berserker Rehan · AngerLv 80 · 2026-10-19 12:00"]);
  await expect(importButton(page)).toBeDisabled();
  await planner.expectNoErrors();
});

test("a login that cannot be turned into a build says so and keeps Import off", async ({ page }) => {
  const body = await readerOutput({ "UE_game.log": gameLogText(TWO_LOGINS) });
  // The second file's login (another account) has no data at all, so the importer throws on it.
  const broken = structuredClone(body.files[0]);
  broken.name = "UE_game-backup-1.log";
  broken.scan.dumps = [{ ...broken.scan.dumps[0], character: 9, accountGroup: 9, tree: null }];
  broken.snapshots = [{ ...broken.snapshots[0], stamp: "2026-10-19T15:00:00.000Z", character: 9 }];
  body.files.push(broken);
  const planner = await openDialog(page, body);
  await expect(logins(page).first()).toContainText("newest login 2026-10-19 15:00");
  await expect(status(page)).toHaveText("This snapshot could not be turned into a build.");
  await expect(dialog(page).locator("#import-game-log-summary")).toBeEmpty();
  await expect(importButton(page)).toBeDisabled();
  await logins(page).nth(1).click();
  await expect(status(page)).toBeHidden();
  await expect(importButton(page)).toBeEnabled();
  await planner.expectNoErrors();
});

test("Cancel closes the dialog, and the next opening starts over", async ({ page }) => {
  const planner = await openDialog(page);
  await fileInput(page).setInputFiles(logFile(gameLogText(TWO_LOGINS)));
  await logins(page).first().click();
  await expect(importButton(page)).toBeEnabled();
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(dialog(page)).toBeHidden();
  expect((await library(page)).builds).toHaveLength(1);

  await page.locator(".header-actions").getByRole("button", { name: "Import from game" }).click();
  await expect(dialog(page).locator(".game-log-reason")).toHaveText(NO_READER);
  await expect(logins(page)).toHaveCount(0);
  await expect(dialog(page).locator("#import-game-log-summary")).toBeEmpty();
  await expect(fileInput(page)).toHaveValue("");
  await expect(importButton(page)).toBeDisabled();
  // Escape closes it too, and the file chosen before is dropped as well.
  await fileInput(page).setInputFiles(logFile(gameLogText(TWO_LOGINS)));
  await expect(logins(page)).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await page.locator(".header-actions").getByRole("button", { name: "Import from game" }).click();
  await expect(logins(page)).toHaveCount(0);
  await planner.expectNoErrors();
});

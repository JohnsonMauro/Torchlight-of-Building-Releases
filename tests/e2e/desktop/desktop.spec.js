// Desktop smoke: the Electron app loads the web build (dist-web) through planner://, every main view renders, and the
// preload bridge reads the game log. Opens a real window, so it runs only with `pnpm test:desktop`, never in test:e2e.
// The window closes within the 5 s before the app's own update check.
import { test, expect, _electron as electron } from "@playwright/test";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { VIEWS } from "../pages/planner-page.js";

// Steam + Proton default on Linux; TLI_GAME_LOG_DIR overrides it (same variable the app reads).
const gameLogDir =
  process.env.TLI_GAME_LOG_DIR ||
  join(homedir(), ".local/share/Steam/steamapps/common/Torchlight Infinite/UE_game/TorchLight/Saved/Logs");

test("desktop app loads the planner and reads the game log", async () => {
  const testInfo = test.info();
  // VS Code's terminal exports ELECTRON_RUN_AS_NODE=1, which turns the Electron binary into plain Node (no window).
  const env = { ...process.env, TLI_GAME_LOG_DIR: gameLogDir };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: [".", `--user-data-dir=${testInfo.outputPath("profile")}`],
    env,
  });
  const errors = [];
  try {
    const window = await app.firstWindow();
    window.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    window.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    await expect(window).toHaveURL(/^planner:\/\/app\//);
    // boot.tsx removes this session key once the planner's first render has painted.
    await window.waitForFunction(
      () => document.getElementById("selected-hero-name") && sessionStorage.getItem("tli-builder:booting") === null,
    );
    for (const name of VIEWS) {
      await expect(async () => {
        await window.locator(`button.view-tab[data-view="${name}"]`).click();
        await expect(window.locator(`#${name}-view`)).toBeVisible({ timeout: 500 });
      }).toPass({ timeout: 10_000 });
      await expect(window.locator(`#${name}-view`)).not.toBeEmpty();
    }
    if (existsSync(gameLogDir)) {
      // The bridge answers from the main process. Whether a character is found depends on the log: the reader keeps
      // the last 50 MB of each file and the game writes the build only at login, so a long session pushes it out.
      const snapshots = await window.evaluate(() => window.tliDesktop.gameLogSnapshots());
      expect(typeof snapshots.found, JSON.stringify(snapshots).slice(0, 300)).toBe("boolean");
      if (!snapshots.found) testInfo.annotations.push({ type: "game-log", description: snapshots.reason });
    } else {
      testInfo.annotations.push({ type: "skipped-check", description: `no game log folder at ${gameLogDir}` });
    }
    expect(errors, errors.join("\n")).toEqual([]);
  } finally {
    await app.close();
  }
});

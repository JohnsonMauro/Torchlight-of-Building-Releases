// Where the local game log reader (src/game-log/game-log-local.js) looks: TLI_GAME_LOG_DIR, then each Steam install
// and the libraries its libraryfolders.vdf lists; the first folder holding a UE_game log is read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GAME_LOG_READ_LIMIT_BYTES } from "../../src/game-log/game-log-import.js";
import { MAX_GAME_LOG_BYTES, gameLogDirs, readGameLogSnapshots } from "../../src/game-log/game-log-local.js";

const LOG_PATH = "steamapps/common/Torchlight Infinite/UE_game/TorchLight/Saved/Logs";

function withHome(run) {
  const home = mkdtempSync(join(tmpdir(), "tli-home-"));
  return Promise.resolve(run(home)).finally(() => rmSync(home, { recursive: true, force: true }));
}

test("Linux: TLI_GAME_LOG_DIR first, then native Steam, its other libraries, and Flatpak Steam; a linked install once", () =>
  withHome(async (home) => {
    const steam = join(home, ".local/share/Steam");
    mkdirSync(join(steam, "steamapps"), { recursive: true });
    writeFileSync(
      join(steam, "steamapps/libraryfolders.vdf"),
      `"libraryfolders"\n{\n\t"0"\n\t{\n\t\t"path"\t\t"${steam}"\n\t}\n\t"1"\n\t{\n\t\t"path"\t\t"/mnt/hdd/SteamLibrary"\n\t}\n}\n`,
    );
    mkdirSync(join(home, ".steam"));
    symlinkSync(steam, join(home, ".steam/steam"));
    const dirs = await gameLogDirs({ env: { TLI_GAME_LOG_DIR: "/games/logs" }, platform: "linux", home });
    assert.deepEqual(dirs, [
      { label: "TLI_GAME_LOG_DIR", path: "/games/logs" },
      { label: "Steam", path: join(steam, LOG_PATH) },
      { label: "Steam library", path: `/mnt/hdd/SteamLibrary/${LOG_PATH}` },
      { label: "Steam (Flatpak)", path: join(home, ".var/app/com.valvesoftware.Steam/.local/share/Steam", LOG_PATH) },
    ]);
  }));

test("Windows: the Program Files Steam installs, with Windows paths", async () => {
  const dirs = await gameLogDirs({ env: {}, platform: "win32", home: "C:\\Users\\me" });
  const logPath = LOG_PATH.replaceAll("/", "\\");
  assert.deepEqual(dirs, [
    { label: "Steam", path: `C:\\Program Files (x86)\\Steam\\${logPath}` },
    { label: "Steam", path: `C:\\Program Files\\Steam\\${logPath}` },
  ]);
});

test("the first folder holding a UE_game log is read; the folders looked in come back either way", () =>
  withHome(async (home) => {
    const missing = { label: "Steam", path: join(home, "missing") };
    const empty = { label: "Steam library", path: join(home, "empty") };
    const logs = { label: "Steam (Flatpak)", path: join(home, "logs") };
    mkdirSync(empty.path);
    mkdirSync(logs.path);
    writeFileSync(join(logs.path, "UE_game.log"), "nothing the scan keeps\n");

    assert.deepEqual(await readGameLogSnapshots({ dirs: [missing] }), {
      found: false,
      reason: "The game's log folder was not found on this computer.",
      searched: [missing],
    });
    assert.deepEqual(await readGameLogSnapshots({ dirs: [missing, empty] }), {
      found: false,
      reason: "UE_game.log was not found in the game's log folder.",
      searched: [missing, empty],
    });
    const read = await readGameLogSnapshots({ dirs: [missing, empty, logs] });
    assert.equal(read.found, false);
    assert.match(read.reason, /^No character data in the game logs yet\./);
    assert.equal(read.folder, logs.path);
    assert.deepEqual(read.searched, [missing, empty, logs]);
  }));

test("the reader takes as much of a log as a picked file: a day's log passes 50 MB with its first logins at the start", () => {
  assert.equal(MAX_GAME_LOG_BYTES, GAME_LOG_READ_LIMIT_BYTES);
  assert.ok(MAX_GAME_LOG_BYTES >= 200 * 1024 * 1024);
});

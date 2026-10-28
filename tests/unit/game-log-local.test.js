// Where the local game log reader (src/game-log/game-log-local.js) looks: TLI_GAME_LOG_DIR, then each Steam install
// and the libraries its libraryfolders.vdf lists; the first folder holding a UE_game log is read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gameLogLineFilter, scanGameLog } from "../../src/game-log/game-log-import.js";
import { gameLogDirs, readGameLogSnapshots } from "../../src/game-log/game-log-local.js";

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
    // The session archive lives in the test's home, never the user's (game-log-local.js gameLogArchiveDir).
    const archive = join(home, "archive");
    mkdirSync(empty.path);
    mkdirSync(logs.path);
    writeFileSync(join(logs.path, "UE_game.log"), "nothing the scan keeps\n");

    assert.deepEqual(await readGameLogSnapshots({ dirs: [missing], archive }), {
      found: false,
      reason: "The game's log folder was not found on this computer.",
      searched: [missing],
    });
    assert.deepEqual(await readGameLogSnapshots({ dirs: [missing, empty], archive }), {
      found: false,
      reason: "UE_game.log was not found in the game's log folder.",
      searched: [missing, empty],
    });
    const read = await readGameLogSnapshots({ dirs: [missing, empty, logs], archive });
    assert.equal(read.found, false);
    assert.match(read.reason, /^No character data in the game logs yet\./);
    assert.equal(read.folder, logs.path);
    assert.deepEqual(read.searched, [missing, empty, logs]);
  }));

// The reader goes through a whole log keeping only these lines (2026-10-28: a 333 MB log's four dumps sat before the
// last 256 MB the reader used to read, so a long session lost every dump).
test("the line filter keeps a dump and the change lines, and a later message's tree never joins the dump", () => {
  const log = [
    "[2026.10.28-09.16.19:176][452]TLNetGame: Display: [Game] ----Socket SendMessage STT----GetPlayerData----SynId = 8",
    "[2026.10.28-09.16.19:477][470]TLNetGame: Display: [Game] ----Socket RecvMessage STT----GetPlayerData----SynId = 8",
    "+player+PlayerId [p-1]",
    "|      +Level [90]",
    "[2026.10.28-09.20.00:000][  1]TLLua: Display: [Game] noise",
    "+otherMessage+field [x]",
    "[2026.10.28-10.19.04:005][389]TLLua: Display: [Game] ItemChange@ ProtoName=PutOn start",
    "[2026.10.28-10.19.05:000][  1]TLLua: Display: [Game] more noise",
    "",
  ];
  const filter = gameLogLineFilter();
  for (const line of log.slice(0, -1)) filter.push(line);
  const scan = scanGameLog(filter.text(""), { partialTail: true });
  assert.equal(scan.dumps.length, 1);
  assert.equal(scan.dumps[0].tree.player.Level, "90");
  assert.equal(scan.dumps[0].tree.otherMessage, undefined);
  assert.equal(scan.dumps[0].changesAfter, 1);
});

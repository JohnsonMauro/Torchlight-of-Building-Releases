// Where the local game log reader (src/game-log/game-log-local.js) looks: TLI_GAME_LOG_DIR, then each Steam install
// and the libraries its libraryfolders.vdf lists; the first folder holding a UE_game log is read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gameLogLineFilter, scanGameLog } from "../../src/game-log/game-log-import.js";
import {
  clearGameLogBackups,
  gameLogDirs,
  handleGameLogBackupsRequest,
  readGameLogSnapshots,
} from "../../src/game-log/game-log-local.js";
import { gameLogText, TWO_LOGINS } from "../e2e/fixtures/game-log.js";

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

// "Delete old game logs" (owner, 2026-10-30, as log trackers do): the game's rotated UE_game-backup-*.log files go; the
// live UE_game.log stays, and each backup's session is kept in the planner's archive first, so no build dump is lost.
const BACKUP = "UE_game-backup-2026.10.18-10.00.00.log";
function gameFolder(home) {
  const logs = { label: "", path: join(home, "logs") };
  mkdirSync(logs.path);
  writeFileSync(join(logs.path, "UE_game.log"), gameLogText([TWO_LOGINS[1]]));
  writeFileSync(
    join(logs.path, BACKUP),
    gameLogText([TWO_LOGINS[0]]).replace("10/19/26 11:59:00", "10/18/26 10:00:00"),
  );
  writeFileSync(join(logs.path, "notes.txt"), "not a game log");
  return logs;
}

test("the reader says how many old game logs the folder holds and their size", () =>
  withHome(async (home) => {
    const logs = gameFolder(home);
    const read = await readGameLogSnapshots({ dirs: [logs], archive: null });
    assert.equal(read.found, true);
    assert.equal(read.backups.count, 1);
    assert.ok(read.backups.bytes > 0);
  }));

test("clearing deletes only the game's old logs, after keeping their sessions in the archive", () =>
  withHome(async (home) => {
    const logs = gameFolder(home);
    const archive = join(home, "archive");
    const cleared = await clearGameLogBackups({ dirs: [logs], archive });
    assert.equal(cleared.removed, 1);
    assert.equal(cleared.folder, logs.path);
    assert.deepEqual(readdirSync(logs.path).sort(), ["UE_game.log", "notes.txt"]);
    assert.ok(existsSync(join(archive, "session-20261018-100000.log")), "the backup's session is kept first");
    // Its login still reads, from the archive.
    const read = await readGameLogSnapshots({ dirs: [logs], archive });
    assert.equal(read.backups.count, 0);
    assert.deepEqual(read.files.map((file) => file.name).sort(), ["UE_game.log", "archived session-20261018-100000"]);
  }));

test("clearing with no game log folder removes nothing", () =>
  withHome(async (home) => {
    assert.deepEqual(await clearGameLogBackups({ dirs: [{ label: "", path: join(home, "missing") }], archive: null }), {
      removed: 0,
      bytes: 0,
      folder: null,
    });
  }));

/** A request and a response for the endpoint handlers: what they write comes back in `sent`. */
function exchange({ method = "DELETE", host = "127.0.0.1:4173", origin } = {}) {
  const sent = {};
  const request = { method, headers: { host, ...(origin ? { origin } : {}) } };
  const response = {
    writeHead: (status, headers) => Object.assign(sent, { status, headers }),
    end: (body) => Object.assign(sent, { body: body ? JSON.parse(body) : null }),
  };
  return { request, response, sent };
}

test("the old-logs endpoint deletes on DELETE from this machine and refuses anything else", () =>
  withHome(async (home) => {
    const logs = gameFolder(home);
    const options = { dirs: [logs], archive: null };
    const refuse = async (request, status) => {
      const call = exchange(request);
      await handleGameLogBackupsRequest(call.request, call.response, options);
      assert.equal(call.sent.status, status, JSON.stringify(request));
      assert.ok(existsSync(join(logs.path, BACKUP)));
    };
    await refuse({ method: "GET" }, 405);
    await refuse({ method: "POST" }, 405);
    await refuse({ host: "evil.example:4173" }, 403);
    await refuse({ origin: "https://evil.example" }, 403);

    const call = exchange({ origin: "http://127.0.0.1:4173" });
    await handleGameLogBackupsRequest(call.request, call.response, options);
    assert.equal(call.sent.status, 200);
    assert.equal(call.sent.body.removed, 1);
    assert.ok(!existsSync(join(logs.path, BACKUP)));
    assert.ok(existsSync(join(logs.path, "UE_game.log")));
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

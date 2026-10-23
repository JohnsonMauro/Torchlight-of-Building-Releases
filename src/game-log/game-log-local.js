// Node-only (apps/web/vite.config.ts and electron/main.cjs; the browser never imports this file). Looks for the game's
// own UE_game.log and its backups in the usual folders (TLI_GAME_LOG_DIR, then every Steam library on Windows or on
// Linux with Proton), runs the importer's scan + sanitise (src/game-log/game-log-import.js) and returns only the
// sanitised build dumps and the folders it looked in. The raw log text, tokens, account ids and names never leave here.
import { open, readFile, readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, posix, win32 } from "node:path";
import {
  GAME_LOG_READ_LIMIT_BYTES,
  decodeGameLogBytes,
  detectGameLogEncoding,
  listSnapshots,
  loadGameIdMap,
  scanGameLog,
} from "./game-log-import.js";

export const GAME_LOG_ENDPOINT = "/api/game-log/snapshots";
export const MAX_GAME_LOG_FILES = 5;
// The page's own limit for a picked log. A day's UE_game.log passes 50 MB, and the logins at its start fill what later
// logins' dumps cut, so the reader takes as much as a picked file would.
export const MAX_GAME_LOG_BYTES = GAME_LOG_READ_LIMIT_BYTES;
const LOG_NAME = /^UE_game(?:-backup-[\w.-]+)?\.log$/i;
// The log folder inside a Steam library.
const LOG_SUBPATH = ["steamapps", "common", "Torchlight Infinite", "UE_game", "TorchLight", "Saved", "Logs"];
const FOLDER_MISSING = "The game's log folder was not found on this computer.";
const LOG_MISSING = "UE_game.log was not found in the game's log folder.";

/** The Steam installs to look in, [label, root]: the Windows defaults, or Linux's native and Flatpak Steam. */
function steamRoots(platform, home) {
  if (platform === "win32")
    return [
      ["Steam", "C:\\Program Files (x86)\\Steam"],
      ["Steam", "C:\\Program Files\\Steam"],
    ];
  return [
    ["Steam", posix.join(home, ".local/share/Steam")],
    ["Steam", posix.join(home, ".steam/steam")],
    ["Steam (Flatpak)", posix.join(home, ".var/app/com.valvesoftware.Steam/.local/share/Steam")],
  ];
}

/** The libraries a Steam install lists in steamapps/libraryfolders.vdf (its "path" entries); none when unreadable. */
async function steamLibraries(root, paths) {
  let text;
  try {
    text = await readFile(paths.join(root, "steamapps", "libraryfolders.vdf"), "utf8");
  } catch {
    return [];
  }
  return [...text.matchAll(/"path"\s+"((?:[^"\\]|\\.)*)"/gi)].map((match) => match[1].replace(/\\(.)/g, "$1"));
}

/**
 * The folders to look for the game's log in, in order, as [{ label, path }]: TLI_GAME_LOG_DIR when set, then each
 * Steam install's own library and the other libraries it lists. A folder reached twice (~/.steam/steam is a link to
 * ~/.local/share/Steam) is listed once.
 */
export async function gameLogDirs({ env = process.env, platform = process.platform, home = homedir() } = {}) {
  const paths = platform === "win32" ? win32 : posix;
  const dirs = [],
    seen = new Set();
  // `base` is resolved, not the whole path: the log folder itself need not exist for two links to the same library.
  const add = async (label, base, rest = []) => {
    const key = paths.join(await realpath(base).catch(() => base), ...rest);
    if (seen.has(key)) return;
    seen.add(key);
    dirs.push({ label, path: paths.join(base, ...rest) });
  };
  if (env.TLI_GAME_LOG_DIR) await add("TLI_GAME_LOG_DIR", env.TLI_GAME_LOG_DIR);
  for (const [label, root] of steamRoots(platform, home)) {
    await add(label, root, LOG_SUBPATH);
    for (const library of await steamLibraries(root, paths)) await add(`${label} library`, library, LOG_SUBPATH);
  }
  return dirs;
}

/** The UE_game logs of a folder as [{ name, info }], newest first; null when the folder cannot be read. */
async function gameLogFiles(dir) {
  let names;
  try {
    names = await readdir(dir);
  } catch {
    return null;
  }
  const files = [];
  for (const name of names.filter((entry) => LOG_NAME.test(entry))) {
    try {
      const info = await stat(join(dir, name));
      if (info.isFile()) files.push({ name, info });
    } catch {
      /* vanished or locked */
    }
  }
  return files.sort((a, b) => b.info.mtimeMs - a.info.mtimeMs);
}

/** Reads at most the last `maxBytes` of a file (UTF-8, or UTF-16 with or without a BOM); a cut first line is dropped. */
async function readTail(file, size, maxBytes) {
  const handle = await open(file, "r");
  try {
    const head = Buffer.alloc(Math.min(size, 4096));
    await handle.read(head, 0, head.length, 0);
    const encoding = detectGameLogEncoding(head);
    let start = size - Math.min(size, maxBytes);
    if (encoding.startsWith("utf-16") && start % 2) start += 1;
    const buffer = Buffer.alloc(size - start);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
    const text = decodeGameLogBytes(buffer.subarray(0, bytesRead), encoding);
    return size > maxBytes ? text.slice(text.indexOf("\n") + 1) : text;
  } finally {
    await handle.close();
  }
}

/**
 * Finds UE_game.log and its UE_game-backup-*.log files in the first folder of `dirs` (gameLogDirs; `dir` alone when
 * given) that holds any and returns { found: true, folder, searched, files: [{ name, modified, truncated, scan, snapshots }] } or
 * { found: false, reason, searched }. `searched` is the folders looked in ([{ label, path }]); `scan` is scanGameLog's
 * sanitised result; `snapshots` is listSnapshots' rows (hero, level, stamp, counts).
 */
export async function readGameLogSnapshots({
  dir,
  dirs,
  maxFiles = MAX_GAME_LOG_FILES,
  maxBytes = MAX_GAME_LOG_BYTES,
} = {}) {
  const searched = dirs ?? (dir ? [{ label: "", path: dir }] : await gameLogDirs());
  let reason = FOLDER_MISSING;
  for (const { path } of searched) {
    const candidates = await gameLogFiles(path);
    if (!candidates) continue;
    if (!candidates.length) {
      reason = LOG_MISSING;
      continue;
    }
    return { ...(await readGameLogFolder(path, candidates, maxFiles, maxBytes)), folder: path, searched };
  }
  return { found: false, reason, searched };
}

/** readGameLogSnapshots for one folder's logs (newest first): the dumps of up to `maxFiles` of them. */
async function readGameLogFolder(dir, candidates, maxFiles, maxBytes) {
  const idMap = await loadGameIdMap();
  const files = [];
  // One account map, one character map and one item-token map for every file, so `accountGroup`, `character` and item
  // tokens match across files and the client can merge dumps from different files (the ids themselves stay here).
  const accountGroups = new Map(),
    characterGroups = new Map(),
    tokens = new Map();
  for (const { name, info } of candidates.slice(0, maxFiles)) {
    let text;
    try {
      text = await readTail(join(dir, name), info.size, maxBytes);
    } catch {
      continue;
    }
    // The live UE_game.log may be mid-write: skip its partial last line and a dump with nothing after it.
    let scan;
    try {
      scan = scanGameLog(text, { accountGroups, characterGroups, tokens, partialTail: /^UE_game\.log$/i.test(name) });
    } catch {
      continue;
    } finally {
      text = null;
    }
    if (!scan.dumps.length) continue;
    files.push({
      name,
      modified: info.mtime.toISOString(),
      truncated: info.size > maxBytes,
      scan,
      snapshots: listSnapshots(scan, idMap),
    });
  }
  accountGroups.clear();
  characterGroups.clear();
  tokens.clear();
  if (!files.length)
    return {
      found: false,
      reason: "No character data in the game logs yet. Log in to a character in the game, then reopen this dialog.",
    };
  // Owned-pactspirit star levels are account-wide and cut at 30 per dump: give each file the other files' lists
  // (star levels only) so an import can fill the levels its own dumps lack (mergeDumps).
  for (const file of files) {
    file.scan.servantDonors = files
      .filter((other) => other !== file)
      .flatMap((other) => other.scan.dumps)
      .filter((dump) => dump.accountGroup != null && dump.tree.ServantInfos)
      .map((dump) => ({
        stamp: dump.stamp,
        accountGroup: dump.accountGroup,
        tree: {
          ServantInfos: {
            servantData: Object.fromEntries(
              Object.entries(dump.tree.ServantInfos.servantData || {})
                .filter(([, entry]) => entry?.servantId)
                .map(([key, entry]) => [
                  key,
                  { servantId: entry.servantId, ...(entry.starLevel != null ? { starLevel: entry.starLevel } : {}) },
                ]),
            ),
          },
        },
      }));
    // Pact board points are cut at 30 per dump too: give each file the same character's point listings from the other
    // files (point id, active, contract choice, kismet base and rolls only).
    file.scan.pointDonors = files
      .filter((other) => other !== file)
      .flatMap((other) => other.scan.dumps)
      .filter((dump) => dump.tree.ContractInfosV2?.pointDatas)
      .map((dump) => ({
        stamp: dump.stamp,
        character: dump.character,
        tree: {
          ContractInfosV2: {
            ContractDatas: Object.fromEntries(
              Object.entries(dump.tree.ContractInfosV2.ContractDatas || {})
                .filter(([, entry]) => entry?.areaId)
                .map(([key, entry]) => [key, { areaId: entry.areaId, servantId: entry.servantId }]),
            ),
            pointDatas: Object.fromEntries(
              Object.entries(dump.tree.ContractInfosV2.pointDatas)
                .filter(([, entry]) => entry?.contractPointId)
                .map(([key, entry]) => [
                  key,
                  {
                    contractPointId: entry.contractPointId,
                    ...(entry.isActive ? { isActive: entry.isActive } : {}),
                    selectContract: entry.selectContract,
                    ...(entry.tattoInfo
                      ? { tattoInfo: { BaseId: entry.tattoInfo.BaseId }, Modifiers: entry.Modifiers || {} }
                      : {}),
                  },
                ]),
            ),
          },
        },
      }));
  }
  return { found: true, files };
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
/** DNS-rebinding guard: the Host header must name this machine (any port). */
export function isLocalHostHeader(host) {
  const match = /^([^:]+)(?::\d{1,5})?$/.exec(
    String(host || "")
      .trim()
      .toLowerCase(),
  );
  return Boolean(match && LOCAL_HOSTS.has(match[1]));
}

const sendJson = (response, status, body, extra = {}) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  });
  response.end(JSON.stringify(body));
};

/** Handles GET /api/game-log/snapshots. No path parameter, no CORS headers. */
export async function handleGameLogSnapshotsRequest(request, response, options = {}) {
  if (!isLocalHostHeader(request.headers.host)) {
    sendJson(response, 403, { error: "Forbidden host" });
    return;
  }
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" }, { Allow: "GET" });
    return;
  }
  try {
    sendJson(response, 200, await readGameLogSnapshots(options));
  } catch {
    sendJson(response, 500, { found: false, reason: "The game log could not be read." });
  }
}

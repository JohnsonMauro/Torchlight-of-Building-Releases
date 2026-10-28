// Node-only (apps/web/vite.config.ts and electron/main.cjs; the browser never imports this file). Looks for the game's
// own UE_game.log and its backups in the usual folders (TLI_GAME_LOG_DIR, then every Steam library on Windows or on
// Linux with Proton), runs the importer's scan + sanitise (src/game-log/game-log-import.js) and returns only the
// sanitised build dumps and the folders it looked in. The raw log text, tokens, account ids and names never leave here.
// The game keeps only its current log and two backups, so each read also keeps the lines the scan reads of every session
// in a local archive (gameLogArchiveDir: about 1 MB a session, on this computer only) and reads the archived sessions the
// game has since deleted (owner, 2026-10-28: a dump with the gear was lost to the rotation).
import { mkdir, open, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, posix, win32 } from "node:path";
import {
  detectGameLogEncoding,
  gameLogLineFilter,
  listSnapshots,
  loadGameIdMap,
  scanGameLog,
} from "./game-log-import.js";

export const GAME_LOG_ENDPOINT = "/api/game-log/snapshots";
export const MAX_GAME_LOG_FILES = 5;
/** Archived sessions read besides the game's own logs, newest first. */
export const MAX_ARCHIVED_SESSIONS = 30;

/**
 * Where the archive of past sessions lives: TLI_GAME_LOG_ARCHIVE ("none": no archive, as the tests run), else the user's
 * application data folder.
 */
export function gameLogArchiveDir(platform = process.platform, env = process.env, home = homedir()) {
  if (env.TLI_GAME_LOG_ARCHIVE === "none") return null;
  if (env.TLI_GAME_LOG_ARCHIVE) return env.TLI_GAME_LOG_ARCHIVE;
  if (platform === "win32")
    return join(env.LOCALAPPDATA || join(home, "AppData", "Local"), "Torchlight of Building", "game-log-archive");
  if (platform === "darwin")
    return join(home, "Library", "Application Support", "Torchlight of Building", "game-log-archive");
  return join(home, ".local", "share", "torchlight-of-building", "game-log-archive");
}
// A session's name in the archive: its "Log file open, MM/DD/YY HH:MM:SS" first line, which the game keeps when it
// renames the live log to a backup.
const OPENED = /^\uFEFF?Log file open, (\d{2})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
const sessionKey = (firstLine) => {
  const m = OPENED.exec(firstLine || "");
  return m ? `session-20${m[3]}${m[1]}${m[2]}-${m[4]}${m[5]}${m[6]}` : null;
};
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

const CHUNK_BYTES = 16 * 1024 * 1024;
/**
 * Reads a whole log in chunks (UTF-8, or UTF-16 with or without a BOM) and keeps only the lines scanGameLog reads
 * (gameLogLineFilter). The dumps are written at login, near the start of the file: a read of the file's end alone lost
 * every dump of a long session (2026-10-28: a 333 MB log's four dumps sat before its last 256 MB).
 */
async function readScannedLines(file, size) {
  const handle = await open(file, "r");
  try {
    const head = Buffer.alloc(Math.min(size, 4096));
    await handle.read(head, 0, head.length, 0);
    const encoding = detectGameLogEncoding(head);
    const firstLine = new TextDecoder(encoding, { fatal: false }).decode(head).split(/\r?\n/)[0];
    const decoder = new TextDecoder(encoding, { fatal: false });
    const filter = gameLogLineFilter();
    const buffer = Buffer.alloc(Math.min(size, CHUNK_BYTES) || 1);
    let rest = "",
      position = 0;
    while (position < size) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, position);
      if (!bytesRead) break;
      position += bytesRead;
      const lines = (rest + decoder.decode(buffer.subarray(0, bytesRead), { stream: true })).split(/\r?\n|\0+/);
      rest = lines.pop();
      for (const line of lines) filter.push(line);
    }
    rest += decoder.decode();
    return { text: filter.text(rest.replace(/\r$/, "")), firstLine };
  } finally {
    await handle.close();
  }
}

/**
 * Finds UE_game.log and its UE_game-backup-*.log files in the first folder of `dirs` (gameLogDirs; `dir` alone when
 * given) that holds any and returns { found: true, folder, searched, files: [{ name, modified, scan, snapshots }] } or
 * { found: false, reason, searched }. `searched` is the folders looked in ([{ label, path }]); `scan` is scanGameLog's
 * sanitised result; `snapshots` is listSnapshots' rows (hero, level, stamp, counts).
 */
export async function readGameLogSnapshots({
  dir,
  dirs,
  maxFiles = MAX_GAME_LOG_FILES,
  archive = gameLogArchiveDir(),
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
    return { ...(await readGameLogFolder(path, candidates, maxFiles, archive)), folder: path, searched };
  }
  return { found: false, reason, searched };
}

/** Keeps a session's scanned lines in the archive (best effort: a read never fails for it). */
async function archiveSession(archive, key, text) {
  try {
    await mkdir(archive, { recursive: true });
    await writeFile(join(archive, `${key}.log`), text, "utf8");
  } catch {
    // An unwritable archive (a read-only home, a full disk) only means no history; the logs themselves still read.
  }
}
/** The archived sessions the game's folder no longer has, newest first, as reader sources. */
async function archivedSessions(archive, sessionsRead) {
  let names;
  try {
    names = await readdir(archive);
  } catch {
    return [];
  }
  const keys = names
    .filter((name) => /^session-\d{8}-\d{6}\.log$/.test(name))
    .map((name) => name.slice(0, -4))
    .filter((key) => !sessionsRead.has(key))
    .sort()
    .reverse()
    .slice(0, MAX_ARCHIVED_SESSIONS);
  const sources = [];
  for (const key of keys) {
    try {
      const path = join(archive, `${key}.log`);
      sources.push({
        name: `archived ${key}`,
        modified: (await stat(path)).mtime.toISOString(),
        text: await readFile(path, "utf8"),
        live: false,
      });
    } catch {
      continue;
    }
  }
  return sources;
}

/** readGameLogSnapshots for one folder's logs (newest first): the dumps of up to `maxFiles` of them. */
async function readGameLogFolder(dir, candidates, maxFiles, archive) {
  const idMap = await loadGameIdMap();
  const files = [];
  // One account map, one character map and one item-token map for every file, so `accountGroup`, `character` and item
  // tokens match across files and the client can merge dumps from different files (the ids themselves stay here).
  const accountGroups = new Map(),
    characterGroups = new Map(),
    tokens = new Map();
  const sessionsRead = new Set();
  const sources = [];
  for (const { name, info } of candidates.slice(0, maxFiles)) {
    try {
      const { text, firstLine } = await readScannedLines(join(dir, name), info.size);
      const key = sessionKey(firstLine);
      if (key) {
        sessionsRead.add(key);
        if (archive) await archiveSession(archive, key, text);
      }
      sources.push({ name, modified: info.mtime.toISOString(), text, live: /^UE_game\.log$/i.test(name) });
    } catch {
      continue;
    }
  }
  if (archive) for (const archived of await archivedSessions(archive, sessionsRead)) sources.push(archived);
  for (const source of sources) {
    const { name, modified, live } = source;
    // The live UE_game.log may be mid-write: skip its partial last line and a dump with nothing after it.
    let scan;
    try {
      scan = scanGameLog(source.text, { accountGroups, characterGroups, tokens, partialTail: live });
    } catch {
      continue;
    } finally {
      source.text = null;
    }
    if (!scan.dumps.length) continue;
    files.push({
      name,
      modified,
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

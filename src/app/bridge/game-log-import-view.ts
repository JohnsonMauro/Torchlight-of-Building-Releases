// What the "Import from game" dialog shows (src/app/builds/game-log-import-controller.js gameLogImportSource; apps/web/src/shell/dialogs/
// ImportGameLogDialog.tsx). Pure: logins and reports come from src/game-log/game-log-import.js and carry no account
// data. Texts go through displayTexts at the source, as the legacy markup printed them.

const SECTION_LABELS: Record<string, string> = {
  character: "Character",
  gear: "Gear",
  talents: "Talents",
  skills: "Skills",
  slates: "Slates",
  pacts: "Pacts",
  hero: "Hero traits and memories",
};
const pad = (value: number) => String(value).padStart(2, "0");

/** Local "YYYY-MM-DD HH:MM" for a UTC log stamp. */
export function gameLogLocalTime(stamp: string | null | undefined): string {
  const date = new Date(stamp as string);
  if (Number.isNaN(date.getTime())) return "unknown time";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const BACKUP_HINT = "pick a UE_game-backup-*.log file from the same folder.";
/** Status line for a chosen log file, by readGameLogFile's status ("" when snapshots were found). */
export const GAME_LOG_FILE_MESSAGES: Record<string, string> = {
  ok: "",
  "no-login": `No character data in this log yet. Log in to a character in game, then choose UE_game.log again, or ${BACKUP_HINT}`,
  writing: `The game is still writing the character data to this log. Wait a few seconds, then choose UE_game.log again, or ${BACKUP_HINT}`,
  unreadable: `The browser could not read this file. If the game is running, it is still writing UE_game.log: choose it again (or close the game first), or ${BACKUP_HINT}`,
  "unknown-format": `This file could not be read as a game log. Choose UE_game.log, or ${BACKUP_HINT}`,
};
export const gameLogFileMessage = (status: string | undefined): string =>
  GAME_LOG_FILE_MESSAGES[status as string] ?? GAME_LOG_FILE_MESSAGES["unknown-format"];
/** Shown above the logins when a complete login was found but the newest one is still being written. */
export const GAME_LOG_WRITING_NOTE =
  "The newest login in this log is still being written and was left out. Choose UE_game.log again in a few seconds to include it.";
/** The log was read, but the planner failed to list its logins (its id map or snapshot list threw). */
export const GAME_LOG_LIST_FAILED =
  "The log was read, but the planner could not list its characters. Reload the page and choose the file again.";

/** readGameLogFile's result, as far as the dialog reads it. */
export interface GameLogRead {
  status: string;
  incompleteDumps?: number;
  details?: {
    errorName?: string;
    gameLog?: boolean;
    kind?: string;
    decodeError?: string;
    logins?: number;
    incompleteDumps?: number;
    skippedDumps?: number;
    scanError?: string;
    partial?: boolean;
  };
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const KIND_LABELS: Record<string, string> = {
  empty: "empty file",
  binary: "binary data",
  text: "text without game log lines",
};
/**
 * The muted "Details: …" support line for readGameLogFile's result: the browser's error name, or what the file was
 * (game log or not, login counts). Never file contents; only the file name. "" for a plain ok.
 */
export function gameLogFileDetails(read: GameLogRead | null | undefined, fileName = ""): string {
  const details = read?.details || {};
  let text = "";
  if (read?.status === "unreadable") text = details.errorName || "Error";
  else if (read?.status === "unknown-format" && !details.gameLog)
    text = `not a game log (${KIND_LABELS[details.kind as string] || "unknown content"}${details.decodeError ? `, ${details.decodeError}` : ""})`;
  else if (read?.status !== "ok" || details.incompleteDumps) {
    const parts = [
      `game log, ${plural(details.logins || 0, details.incompleteDumps ? "complete character login" : "character login")}`,
    ];
    if (details.incompleteDumps) parts.push(`${details.incompleteDumps} still being written`);
    if (details.skippedDumps) parts.push(`${plural(details.skippedDumps, "login")} could not be parsed`);
    if (details.scanError) parts.push(`scan failed (${details.scanError})`);
    text = parts.join(", ");
  }
  if (!text) return "";
  if (details.partial) text += ", end of the file read";
  return `Details: ${text}${fileName ? ` · ${fileName}` : ""}`;
}

/** The dialog's status line: plain text, or a message with its muted Details line. */
export type GameLogStatus = { text: string } | { message: string; details: string };

/** The status for a chosen file: the message (or the still-writing note on ok) and its Details; null for a plain ok. */
export function gameLogFileStatus(read: GameLogRead | null | undefined, fileName = ""): GameLogStatus | null {
  const message =
    read?.status === "ok" ? (read.incompleteDumps ? GAME_LOG_WRITING_NOTE : "") : gameLogFileMessage(read?.status);
  return message ? { message, details: gameLogFileDetails(read, fileName) } : null;
}
/** The status when listing the logins failed after a good read. */
export function gameLogListFailedStatus(error: unknown, fileName = ""): GameLogStatus {
  const raw = (error as { name?: unknown } | null)?.name;
  const name = typeof raw === "string" && raw ? raw : "Error";
  return {
    message: GAME_LOG_LIST_FAILED,
    details: `Details: game log read, listing failed (${name})${fileName ? ` · ${fileName}` : ""}`,
  };
}

/** "<Hero> · game log <date time>" */
export function gameLogBuildName(heroName: string | null | undefined, stamp: string | null | undefined): string {
  return `${heroName || "Unknown hero"} · game log ${gameLogLocalTime(stamp)}`;
}

/** A login row (listSnapshots, or gameLogAutoSnapshots' combined rows). */
export interface GameLogRow {
  id: string;
  stamp: string;
  character?: number;
  hero?: string;
  level?: number | null;
  changesAfter?: number;
  combined?: boolean;
  logins?: number;
  dumpId?: string;
}
/** A login as the list shows it. */
export interface GameLogLoginView {
  id: string;
  title: string;
  /** "Lv 60 · 2026-10-19 13:30" (a combined row: its newest login and the older ones it fills from). */
  when: string;
  /** "Build changed after this login (2 changes)", or "". */
  changed: string;
}
export function gameLogLogins(rows: GameLogRow[]): GameLogLoginView[] {
  return rows.map((row) => {
    const hero = String(row.hero || "Unknown hero").replace(/\s*\|\s*/g, " · ");
    const older =
      row.combined && (row.logins ?? 0) > 1
        ? ` · gaps filled from ${(row.logins ?? 0) - 1} older login${row.logins === 2 ? "" : "s"}`
        : "";
    const when = row.combined ? `newest login ${gameLogLocalTime(row.stamp)}${older}` : gameLogLocalTime(row.stamp);
    return {
      id: row.id,
      title: row.combined ? `Best combined · ${hero}` : hero,
      when: `${row.level ? `Lv ${row.level}` : "Level unknown"} · ${when}`,
      changed: row.changesAfter
        ? `Build changed after this login (${row.changesAfter} change${row.changesAfter === 1 ? "" : "s"})`
        : "",
    };
  });
}

interface SectionReport {
  imported: unknown[];
  unresolved: { item: string; reason?: string }[];
  missing: { item: string; reason?: string }[];
  notes: { item: string; reason?: string }[];
}
/** importSnapshot's report, as far as the summary reads it. */
export interface GameLogReport {
  source?: { stamp?: string; changesAfter?: number };
  sections: Record<string, SectionReport>;
  sources?: Record<string, { chosen?: boolean; from: string[]; stale: { stamp: string; reason: string }[] }>;
  provisional: string[];
  logGaps?: { label: string }[];
  notices?: string[];
}
/** The "From" cell of a section: none (no source), "—", or the logins it came from (an older one flagged). */
export type GameLogFromView = null | { text: string; stale: string | null };
export interface GameLogSummaryView {
  /** The sections that were cut or left out of the log, for the line above the result. */
  gaps: string;
  stamp: string;
  fromColumn: boolean;
  sections: { label: string; imported: number; skipped: number; from: GameLogFromView }[];
  changed: boolean;
  skipped: { section: string; item: string; reason: string }[];
  notices: string[];
  /** The provisional readings, "; "-joined, or "". */
  provisional: string;
}

function sectionFrom(report: GameLogReport, key: string, value: SectionReport): GameLogFromView {
  const source = report.sources?.[key];
  if (!source) return null;
  const stamps = [...(source.chosen && report.source?.stamp ? [report.source.stamp] : []), ...source.from];
  if (!stamps.length || (!value.imported.length && !source.from.length)) return { text: "—", stale: null };
  return {
    text: [...new Set(stamps.map(gameLogLocalTime))].join(" + "),
    stale: source.stale.length
      ? source.stale.map((entry) => `${gameLogLocalTime(entry.stamp)}: ${entry.reason}`).join("; ")
      : null,
  };
}

export function gameLogSummary(report: GameLogReport): GameLogSummaryView {
  const sections = Object.entries(report.sections);
  const skippedOf = (value: SectionReport) => [...value.unresolved, ...value.missing, ...value.notes];
  return {
    // A cut or dropped section changes the whole build (talents, gear…), so it also gets one line above the result.
    gaps: [...new Set((report.logGaps || []).map((gap) => gap.label))].join(", "),
    stamp: gameLogLocalTime(report.source?.stamp),
    fromColumn: Boolean(report.sources),
    sections: sections.map(([key, value]) => ({
      label: SECTION_LABELS[key] || key,
      imported: value.imported.length,
      skipped: skippedOf(value).length,
      from: sectionFrom(report, key, value),
    })),
    changed: Boolean(report.source?.changesAfter),
    skipped: sections.flatMap(([key, value]) =>
      skippedOf(value).map((entry) => ({
        section: SECTION_LABELS[key] || key,
        item: entry.item,
        reason: entry.reason || "",
      })),
    ),
    notices: report.notices || [],
    provisional: report.provisional.join("; "),
  };
}

/** A file of the local reader (src/game-log/game-log-local.js). */
export interface GameLogLocalFile {
  name?: string;
  modified?: string;
  scan?: { dumps?: { id: string }[] };
  snapshots?: GameLogRow[];
}
/** The dump a row imports, in the scan holding it. */
export interface GameLogSource {
  scan: { dumps: { id: string }[] };
  dumpId: string;
}

/**
 * Flattens the local reader's files (src/game-log/game-log-local.js: UE_game.log and backups) into picker rows, newest first,
 * and a row id -> { scan, dumpId } lookup for importSnapshot. Every row imports from one scan that holds the dumps of
 * all files (the reader numbers characters and item tokens once across files), so the chosen dump's gaps are filled
 * from the same character's dumps in any file. A "Best combined" row per character comes first: its newest dump with
 * every other dump of the character filling what that dump lacks.
 */
export function gameLogAutoSnapshots(files: GameLogLocalFile[] = []): {
  rows: GameLogRow[];
  sources: Map<string, GameLogSource>;
} {
  const rows: GameLogRow[] = [],
    dumps: { id: string }[] = [];
  files.forEach((file, index) => {
    const byId = new Map((file.snapshots || []).map((row) => [row.id, row]));
    for (const dump of file.scan?.dumps || []) {
      const id = `${index}:${dump.id}`;
      dumps.push({ ...dump, id });
      const row = byId.get(dump.id);
      if (row) rows.push({ ...row, id });
    }
  });
  rows.sort((a, b) => (a.stamp < b.stamp ? 1 : -1));
  const scan = { dumps };
  const best: (GameLogRow & { dumpId: string })[] = [];
  for (const row of rows) {
    if (best.some((entry) => entry.character === row.character)) continue;
    best.push({
      ...row,
      id: `best:${row.character}`,
      combined: true,
      dumpId: row.id,
      logins: rows.filter((other) => other.character === row.character).length,
    });
  }
  const sources = new Map<string, GameLogSource>([
    ...best.map((row): [string, GameLogSource] => [row.id, { scan, dumpId: row.dumpId }]),
    ...rows.map((row): [string, GameLogSource] => [row.id, { scan, dumpId: row.id }]),
  ]);
  return { rows: [...best, ...rows], sources };
}

/** The local reader's newest file: its name, when it was last written (local time) and the folder it is in. */
export function gameLogFound(file: GameLogLocalFile | undefined, folder = ""): GameLogFoundView {
  return { name: file?.name || "UE_game.log", updated: gameLogLocalTime(file?.modified), folder };
}
export interface GameLogFoundView {
  name: string;
  updated: string;
  /** The folder the local reader read it from, or "". */
  folder: string;
}

/** A folder the game's log may be in, with what it is ("Steam", "Windows · Steam"…; "" when nothing to say). */
export interface GameLogFolderView {
  label: string;
  path: string;
}
const LOG_SUBPATH = ["steamapps", "common", "Torchlight Infinite", "UE_game", "TorchLight", "Saved", "Logs"];
/** Where Steam puts the log by default, for a page without the local reader (it cannot see this computer's folders). */
export const GAME_LOG_DEFAULT_FOLDERS: GameLogFolderView[] = [
  { label: "Windows · Steam", path: ["C:\\Program Files (x86)\\Steam", ...LOG_SUBPATH].join("\\") },
  { label: "Linux · Steam (Proton)", path: ["~/.local/share/Steam", ...LOG_SUBPATH].join("/") },
  {
    label: "Linux · Steam (Flatpak)",
    path: ["~/.var/app/com.valvesoftware.Steam/.local/share/Steam", ...LOG_SUBPATH].join("/"),
  },
];
/** The folders to offer: the ones the local reader looked in (this computer's own paths), else Steam's defaults. */
export function gameLogFolders(searched: GameLogFolderView[] | null | undefined): GameLogFolderView[] {
  return searched?.length ? searched : GAME_LOG_DEFAULT_FOLDERS;
}

/** Everything the dialog shows, but the opening count (src/app/bridge/view-sources.ts adds it). */
export interface GameLogImportView {
  /** The local reader's file, while the dialog shows it (until a file is chosen). */
  found: GameLogFoundView | null;
  /** "Choose a different file…": shown with the found file until it is used. */
  chooseOther: boolean;
  /** The file picker and its help. */
  picker: boolean;
  /** The folders the picker's help offers to copy (gameLogFolders). */
  folders: GameLogFolderView[];
  /** Why the planner could not look the log up itself, or "". */
  reason: string;
  status: GameLogStatus | null;
  logins: GameLogLoginView[];
  selectedId: string | null;
  summary: GameLogSummaryView | null;
}

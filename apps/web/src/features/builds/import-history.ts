// The Import dialog's recent imports: the last build codes imported here, newest first, with when (owner, 2026-10-28).
// Stored like the build tabs' order: this browser's convenience, not part of a build; a storage that throws (a private
// window, blocked site data) only means no history.

const KEY = "tli-builder:import-code-history:v1";
export const IMPORT_HISTORY_LIMIT = 3;

export interface ImportedCode {
  code: string;
  /** ISO time of the import. */
  importedAt: string;
}

export function loadImportHistory(): ImportedCode[] {
  try {
    const value: unknown = JSON.parse(globalThis.localStorage?.getItem(KEY) || "[]");
    return Array.isArray(value)
      ? value
          .filter(
            (entry): entry is ImportedCode => typeof entry?.code === "string" && typeof entry?.importedAt === "string",
          )
          .slice(0, IMPORT_HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
}

/** The history with `code` imported now on top (an earlier copy of the same code moves up), kept to the limit. */
export function rememberImport(history: ImportedCode[], code: string, now = new Date()): ImportedCode[] {
  const next = [{ code, importedAt: now.toISOString() }, ...history.filter((entry) => entry.code !== code)].slice(
    0,
    IMPORT_HISTORY_LIMIT,
  );
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // Unwritable storage: the history lasts this page only.
  }
  return next;
}

const pad = (value: number) => String(value).padStart(2, "0");
/** Local "YYYY-MM-DD HH:MM". */
export function importTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "unknown time"
    : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

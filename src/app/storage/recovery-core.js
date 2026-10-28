// Storage-only helpers for safe mode and build backups. This module must not import the calculator or the planner
// modules: a backup has to work even when those fail to load.

// Library data (never cleared by any recovery action).
export const LIBRARY_KEY = "tli-builder:build-library:v1";
// Older versions kept a full copy of the active build here (build-library.ts).
export const LEGACY_STATE_KEY = "tli-builder:selena-candidate:v1";
export const LIBRARY_KEYS = Object.freeze([LIBRARY_KEY, LEGACY_STATE_KEY]);
// Unreadable library values kept aside by build-library.ts (never cleared here).
export const QUARANTINE_PREFIX = `${LIBRARY_KEY}:unreadable:`;

export const SAFE_MODE_KEY = "tli-builder:safe-mode:v1";

export const BACKUP_FORMAT = "tli-builder-backup";
export const BACKUP_VERSION = 1;

const safeGet = (storage, key) => {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};
export function quarantineKeys(storage) {
  try {
    const keys = [];
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (typeof key === "string" && key.startsWith(QUARANTINE_PREFIX)) keys.push(key);
    }
    return keys.sort();
  } catch {
    return [];
  }
}
// ---- Safe mode -----------------------------------------------------------

export function isSafeMode(session) {
  return safeGet(session, SAFE_MODE_KEY) === "1";
}
export function setSafeMode(session, enabled) {
  try {
    if (enabled) session?.setItem(SAFE_MODE_KEY, "1");
    else session?.removeItem(SAFE_MODE_KEY);
  } catch {}
}

// ---- Backup --------------------------------------------------------------

// Builds the backup object from raw storage. Parsed JSON is kept as-is (all
// builds, revisions and share history, unnormalized); a value that is not
// valid JSON is kept as its raw string under `raw` so nothing is lost.
export function createBackup(storage, now = new Date()) {
  const backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    library: null,
    legacyState: null,
  };
  const raw = {},
    errors = {};
  for (const [key, field] of [
    [LIBRARY_KEY, "library"],
    [LEGACY_STATE_KEY, "legacyState"],
  ]) {
    const text = safeGet(storage, key);
    if (text === null) continue;
    try {
      backup[field] = JSON.parse(text);
    } catch (error) {
      raw[key] = text;
      errors[key] = String(error?.message || error);
    }
  }
  if (Object.keys(raw).length) {
    backup.raw = raw;
    backup.errors = errors;
  }
  const quarantine = {};
  for (const key of quarantineKeys(storage)) {
    const text = safeGet(storage, key);
    if (text !== null) quarantine[key] = text;
  }
  if (Object.keys(quarantine).length) backup.quarantine = quarantine;
  return backup;
}
export function backupFileName(now = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `tli-builder-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}
export function serializeBackup(storage, now = new Date()) {
  try {
    return JSON.stringify(createBackup(storage, now), null, 2);
  } catch {
    // Last resort: the raw strings only (always serializable).
    const raw = {};
    for (const key of [...LIBRARY_KEYS, ...quarantineKeys(storage)]) {
      const text = safeGet(storage, key);
      if (text !== null) raw[key] = text;
    }
    return JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: now.toISOString(),
      library: null,
      legacyState: null,
      raw,
    });
  }
}
// Browser download of the backup file. Returns the file name.
export function downloadBackup(storage = globalThis.localStorage, doc = globalThis.document, now = new Date()) {
  const name = backupFileName(now);
  const blob = new Blob([serializeBackup(storage, now)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = doc.createElement("a");
  link.href = url;
  link.download = name;
  link.style.display = "none";
  doc.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}

// Returns the library object stored in a backup (or a bare exported library),
// or null. Falls back to parsing the raw string when the library failed to
// parse at backup time.
export function libraryFromBackup(backup) {
  if (!backup || typeof backup !== "object") return null;
  if (Array.isArray(backup.builds)) return backup;
  if (backup.library && Array.isArray(backup.library.builds)) return backup.library;
  const raw = backup.raw?.[LIBRARY_KEY];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.builds)) return parsed;
    } catch {}
  }
  return null;
}

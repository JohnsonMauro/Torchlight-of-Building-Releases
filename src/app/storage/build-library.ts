// The saved-build library: the builds in localStorage (shared by every tab, each tab keeping its own open build),
// conflicts between tabs, unreadable data kept aside, revisions, share codes and backups. The build state itself and its
// normalization are src/engine/state/planner-state.ts.
import { libraryFromBackup } from "./recovery-core.js";
import { decodePlannerState, defaultPlannerState, normalizePlannerState } from "../../engine/state/planner-state.ts";
import type { PlannerState } from "../../engine/state/planner-state.ts";

// ---- Types ----------------------------------------------------------------------------------------------------------

export interface BuildRevision {
  timestamp: string;
  label: string;
  state: PlannerState;
}
export interface ShareRecord {
  timestamp: string;
  code: string;
}
export interface LibraryBuild {
  id: string;
  name: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  state: PlannerState;
  /** The last 10 states this build had, oldest first. */
  revisions: BuildRevision[];
  /** The last 5 build codes shared from this build. */
  shareHistory: ShareRecord[];
}
/** The saved-build library as loadBuildLibrary returns it. activeBuildId is this tab's open build. */
export interface BuildLibrary {
  schemaVersion: 1;
  activeBuildId: string | null;
  /** Never the open build. */
  compareBuildId: string | null;
  builds: LibraryBuild[];
}

/** A build record as read from storage or a backup. Not checked here: only its state is validated (normalized). */
interface StoredBuildRecord {
  id?: string | number;
  name?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  state?: unknown;
  revisions?: StoredRevision[];
  shareHistory?: StoredShareRecord[];
}
interface StoredRevision {
  timestamp?: string;
  label?: string;
  state?: unknown;
}
interface StoredShareRecord {
  timestamp?: string;
  code?: string;
}
interface StoredLibrary {
  schemaVersion?: number;
  builds?: StoredBuildRecord[];
  activeBuildId?: string | null;
  compareBuildId?: string | null;
  /** Builds that failed validation, kept verbatim. */
  quarantinedBuilds?: StoredBuildRecord[];
}
interface WriteOptions {
  /** Also make the open build the stored "last used" one (open, create, delete). */
  lastUsed?: boolean;
}
/** The stored library could not be read: where its raw value was copied (null when it could not be) and why. */
export interface UnreadableLibrary {
  quarantineKey: string | null;
  error: string;
}
export interface LibraryLoadIssues {
  unreadable: UnreadableLibrary | null;
  quarantinedBuilds: { id: string; name: string }[];
}
export type ExternalLibraryChange =
  { kind: "none" | "dismissed" | "changed" } | { kind: "deleted"; state: PlannerState };
export interface NewBuild {
  name?: string;
  notes?: string;
  state?: unknown;
  activate?: boolean;
}
export interface RestoreSummary {
  added: number;
  renamed: number;
  unchanged: number;
  skipped: number;
  skippedNames: string[];
  /** False when the browser rejected the write (the restored builds are kept in memory). */
  saved: boolean;
}

// ---- Storage --------------------------------------------------------------------------------------------------------

const storageKey = "tli-builder:selena-candidate:v1";
const libraryStorageKey = "tli-builder:build-library:v1";
let unsavedLibrary: BuildLibrary | null = null;
let storageFailure = false;
let cachedStorage: Storage | null = null;
let cachedSerializedLibrary: string | null = null;
let cachedLibrary: BuildLibrary | null = null;
// Activity across browser tabs. The library in localStorage is shared by every
// tab; each tab keeps its own open build in sessionStorage (distinct per tab and
// kept across a reload of that tab). The stored library's activeBuildId is only
// the "last used" build, used to pick a build for a brand-new tab.
const tabActiveBuildKey = "tli-builder:tab-active-build:v1";
export const plannerLibraryStorageKey = libraryStorageKey;
let tabActiveBuildId: string | null = null;
let storedActiveBuildId: string | null = null;
// The build this tab's planner state belongs to, and that build's stored state
// (serialized) when this tab last loaded or saved it. A stored state different
// from this base means another tab changed the build since.
let baseBuildId: string | null = null;
let baseStateJson: string | null = null;

function sessionStore(): Storage | null {
  try {
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
}
function readTabActiveBuildId(): string | null {
  if (tabActiveBuildId) return tabActiveBuildId;
  try {
    return sessionStore()?.getItem(tabActiveBuildKey) || null;
  } catch {
    return null;
  }
}
function rememberTabActiveBuildId(id: string | null): void {
  tabActiveBuildId = id || null;
  try {
    const session = sessionStore();
    if (!session) return;
    if (id) session.setItem(tabActiveBuildKey, id);
    else session.removeItem(tabActiveBuildKey);
  } catch {
    // sessionStorage unavailable: the in-memory id still holds for this page.
  }
}
// Point the (shared, cached) library object at this tab's build.
function withTabView(library: BuildLibrary): BuildLibrary {
  const has = (id: string | null) => !!id && library.builds.some((build) => build.id === id);
  const tabId = readTabActiveBuildId();
  const id = has(tabId) ? tabId : has(storedActiveBuildId) ? storedActiveBuildId : library.builds[0]?.id || null;
  if (id !== tabActiveBuildId) rememberTabActiveBuildId(id);
  library.activeBuildId = id;
  if (library.compareBuildId === id) library.compareBuildId = null;
  return library;
}
function setBase(id: string | null | undefined, stateJson: string | null): void {
  baseBuildId = id || null;
  baseStateJson = id ? stateJson : null;
}
// This tab's state right after it loaded its build, before any user edit
// (stableJson; set by markPlannerStateClean). Load-time repairs in the app make
// the in-memory state differ from the stored one; a save equal to this clean
// state is not an edit and is never written, so an idle tab never writes and
// never makes another tab's "changed elsewhere" notice appear.
let cleanStateStable: string | null = null;
let cleanMarkPending = false;
// The stored version (stableJson) whose notice the user dismissed.
let dismissedStable: string | null = null;

export function plannerStorageStatus(): "saved" | "unsaved" {
  return storageFailure ? "unsaved" : "saved";
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
// A build's stored state must never share objects with the caller's in-memory state. normalizePlannerState copies only
// the top levels (equipmentInventory, equipmentOverrides, slates, talentRanks and others pass through by reference), so
// a library state built straight from the live planner state would change with it: the next in-place edit (an inventory
// item edited twice) would already be in the cached library, savePlannerState would see no difference and skip the write.
const ownedState = (state: unknown): PlannerState => normalizePlannerState(clone(state));
const now = (): string => new Date().toISOString();
const makeId = (): string =>
  globalThis.crypto?.randomUUID?.() || `build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const MAX_REVISIONS = 10;
const MAX_SHARE_CODES = 5;

// Throws when the revision's state is invalid (or the revision is not a record).
function normalizeRevision(revision: StoredRevision): BuildRevision {
  return {
    timestamp: revision.timestamp || now(),
    label: String(revision.label || "Autosave"),
    state: normalizePlannerState(revision.state),
  };
}
// The last share codes; entries that are not records or have no code are dropped.
function normalizeShareHistory(entries: unknown): ShareRecord[] {
  return (Array.isArray(entries) ? (entries as (StoredShareRecord | null | undefined)[]) : [])
    .slice(-MAX_SHARE_CODES)
    .map((entry) => ({ timestamp: entry?.timestamp || now(), code: String(entry?.code || "") }))
    .filter((entry) => entry.code);
}

function normalizeBuildRecord(build: StoredBuildRecord, index: number, fallbackState: unknown): LibraryBuild {
  return {
    id: String(build.id || makeId()),
    name: String(build.name || `Build ${index + 1}`),
    notes: String(build.notes || ""),
    createdAt: build.createdAt || now(),
    updatedAt: build.updatedAt || now(),
    state: normalizePlannerState(build.state || fallbackState),
    // An invalid revision sets the whole build aside (loadBuildLibrary), so nothing stored is lost.
    revisions: (Array.isArray(build.revisions) ? build.revisions : []).slice(-MAX_REVISIONS).map(normalizeRevision),
    shareHistory: normalizeShareHistory(build.shareHistory),
  };
}

export function normalizeBuildLibrary(
  value: StoredLibrary = {},
  fallbackState: unknown = defaultPlannerState,
  normalizedBuilds: LibraryBuild[] | null = null,
): BuildLibrary {
  const rawBuilds = Array.isArray(value.builds) ? value.builds : [];
  const builds = normalizedBuilds || rawBuilds.map((build, index) => normalizeBuildRecord(build, index, fallbackState));
  if (!builds.length && !Array.isArray(value.builds))
    builds.push({
      id: makeId(),
      name: "Selena — Scorching Beam",
      notes: "Captured Selena 1 / Sing with the Tide build.",
      createdAt: now(),
      updatedAt: now(),
      state: normalizePlannerState(fallbackState),
      revisions: [],
      shareHistory: [],
    });
  const activeBuildId = builds.find((build) => build.id === value.activeBuildId)?.id ?? (builds[0]?.id || null);
  const compareBuildId =
    builds.find((build) => build.id === value.compareBuildId && build.id !== activeBuildId)?.id ?? null;
  return { schemaVersion: 1, activeBuildId, compareBuildId, builds };
}

// Unreadable stored data is never overwritten.
// - The stored library value cannot be read (not JSON, or not a library): the
//   raw string is copied to a quarantine key (at most 3 kept, never deleted
//   automatically) and writes to the library key are blocked until the user
//   chooses startNewLibrary(). Edits stay in memory meanwhile.
// - Individual builds fail validation: the other builds load; the failing
//   entries are kept verbatim in the stored library's `quarantinedBuilds` list,
//   which every save writes back unchanged.
export const libraryQuarantinePrefix = `${libraryStorageKey}:unreadable:`;
const maxQuarantineCopies = 3;
let unsavedStorage: Storage | null = null;
let libraryWriteBlock: UnreadableLibrary | null = null;
let quarantinedBuilds: StoredBuildRecord[] = [];

function storageKeys(storage: Storage): string[] {
  try {
    if (typeof storage.key === "function" && Number.isInteger(storage.length))
      return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
        (key): key is string => key !== null,
      );
  } catch {
    // A storage backend without key enumeration: no quarantine copies to find.
  }
  return [];
}
// Copies an unreadable stored value to a quarantine key. Returns the key
// holding it (an existing identical copy is reused), or null when it could not
// be kept (three copies already, or the write failed).
function quarantineRawLibrary(storage: Storage, serialized: string | null | undefined): string | null {
  if (serialized === null || serialized === undefined) return null;
  const existing = storageKeys(storage)
    .filter((key) => key.startsWith(libraryQuarantinePrefix))
    .sort();
  for (const key of existing) {
    try {
      if (storage.getItem(key) === serialized) return key;
    } catch {
      // Unreadable copy: compare the next one.
    }
  }
  if (existing.length >= maxQuarantineCopies) return null;
  let key = `${libraryQuarantinePrefix}${new Date().toISOString()}`;
  for (let number = 2; existing.includes(key); number++)
    key = `${libraryQuarantinePrefix}${new Date().toISOString()}-${number}`;
  try {
    storage.setItem(key, serialized);
    return storage.getItem(key) === serialized ? key : null;
  } catch {
    return null;
  }
}

// What could not be loaded from storage, for the planner's notices.
export function libraryLoadIssues(): LibraryLoadIssues {
  loadBuildLibrary();
  return {
    unreadable: libraryWriteBlock ? { ...libraryWriteBlock } : null,
    quarantinedBuilds: quarantinedBuilds.map((build, index) => ({
      id: typeof build?.id === "string" ? build.id : "",
      name: typeof build?.name === "string" && build.name.trim() ? build.name.trim() : `Unnamed build ${index + 1}`,
    })),
  };
}

// The user chose to start a new library while the stored one is unreadable.
// The unreadable value stays in its quarantine key.
export function startNewLibrary(): BuildLibrary {
  loadBuildLibrary();
  if (!libraryWriteBlock) return loadBuildLibrary();
  const storage = globalThis.localStorage;
  const current = storage.getItem(libraryStorageKey);
  const keptAt = current === null ? null : quarantineRawLibrary(storage, current);
  if (current !== null && !keptAt)
    throw new Error("There is no room to keep another copy of the unreadable data. Download a backup first.");
  // Set whenever libraryWriteBlock is (blockUnreadableLibrary, storeBuildLibrary).
  const library = unsavedLibrary as BuildLibrary;
  libraryWriteBlock = null;
  unsavedLibrary = null;
  unsavedStorage = null;
  cachedLibrary = null;
  cachedSerializedLibrary = null;
  quarantinedBuilds = [];
  return writeBuildLibrary(library, { lastUsed: true });
}

function blockUnreadableLibrary(
  storage: Storage,
  serialized: string | null,
  legacy: PlannerState,
  error: unknown,
): BuildLibrary {
  libraryWriteBlock = {
    quarantineKey: quarantineRawLibrary(storage, serialized),
    error: String((error as Error | undefined)?.message || error),
  };
  quarantinedBuilds = [];
  if (cachedStorage && cachedStorage !== storage) setBase(null, null);
  unsavedLibrary = normalizeBuildLibrary({}, legacy);
  unsavedStorage = storage;
  cachedLibrary = null;
  cachedSerializedLibrary = null;
  cachedStorage = storage;
  storageFailure = true;
  storedActiveBuildId = unsavedLibrary.activeBuildId;
  return withTabView(unsavedLibrary);
}

export function loadBuildLibrary(): BuildLibrary {
  const storage = globalThis.localStorage;
  if (unsavedLibrary && unsavedStorage === storage) return withTabView(unsavedLibrary);
  // A different storage object (tests, or a swapped backend) is a different library.
  if (unsavedLibrary) {
    unsavedLibrary = null;
    unsavedStorage = null;
    libraryWriteBlock = null;
    storageFailure = false;
  }
  const serialized = storage.getItem(libraryStorageKey);
  if (cachedLibrary && cachedStorage === storage && cachedSerializedLibrary === serialized)
    return withTabView(cachedLibrary);
  let legacy = normalizePlannerState();
  try {
    legacy = normalizePlannerState(JSON.parse(storage.getItem(storageKey) || "{}"));
  } catch {
    // The old single-build copy is unreadable: start from the defaults.
  }
  let parsed: StoredLibrary;
  try {
    parsed = JSON.parse(serialized || "{}");
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      (parsed.builds !== undefined && !Array.isArray(parsed.builds))
    )
      throw new TypeError("The stored build library has an unexpected shape");
  } catch (error) {
    return blockUnreadableLibrary(storage, serialized, legacy, error);
  }
  try {
    if (cachedStorage && cachedStorage !== storage) setBase(null, null);
    const valid: LibraryBuild[] = [],
      rejected = Array.isArray(parsed.quarantinedBuilds) ? [...parsed.quarantinedBuilds] : [];
    (parsed.builds || []).forEach((build, index) => {
      try {
        valid.push(normalizeBuildRecord(build, index, legacy));
      } catch {
        rejected.push(build);
      }
    });
    cachedLibrary = normalizeBuildLibrary(parsed, legacy, valid);
    quarantinedBuilds = rejected;
    cachedStorage = storage;
    cachedSerializedLibrary = serialized;
    storedActiveBuildId = cachedLibrary.activeBuildId;
    return withTabView(cachedLibrary);
  } catch (error) {
    return blockUnreadableLibrary(storage, serialized, legacy, error);
  }
}

const libraryListeners = new Set<() => void>();

/**
 * Calls `listener` after every write of the build library from this tab (stored, or kept in memory when storage
 * fails). Changes made by other tabs arrive as `storage` events instead. Returns the unsubscribe function.
 */
export function subscribeBuildLibrary(listener: () => void): () => void {
  libraryListeners.add(listener);
  return () => libraryListeners.delete(listener);
}

function writeBuildLibrary(normalized: BuildLibrary, options?: WriteOptions): BuildLibrary {
  const written = storeBuildLibrary(normalized, options);
  for (const listener of libraryListeners) {
    try {
      listener();
    } catch (error) {
      console.error(error);
    }
  }
  return written;
}

// `normalized.activeBuildId` is this tab's build. It becomes the stored
// "last used" build only when this tab explicitly opens, creates or deletes a
// build (`lastUsed`); ordinary saves keep the stored value, so a background tab
// never moves another tab's (or a new tab's) starting build.
function storeBuildLibrary(normalized: BuildLibrary, { lastUsed = false }: WriteOptions = {}): BuildLibrary {
  const tabId = normalized.activeBuildId;
  rememberTabActiveBuildId(tabId);
  const keepStored =
    !lastUsed && storedActiveBuildId && normalized.builds.some((build) => build.id === storedActiveBuildId);
  const stored = keepStored ? { ...normalized, activeBuildId: storedActiveBuildId } : normalized;
  if (stored.compareBuildId === stored.activeBuildId) stored.compareBuildId = null;
  if (libraryWriteBlock) {
    // The stored library could not be read: never write over it.
    unsavedLibrary = normalized;
    unsavedStorage = globalThis.localStorage;
    storageFailure = true;
    return normalized;
  }
  try {
    const storage = globalThis.localStorage;
    let serialized = serializeLibrary(stored);
    try {
      storage.setItem(libraryStorageKey, serialized);
      revisionsTrimmed = false;
    } catch {
      // Older versions kept a second full copy of the active build. Reclaim it
      // only when a library is already saved, then retry the authoritative write.
      if (storage.getItem(libraryStorageKey)) storage.removeItem(storageKey);
      serialized = storeWithFewerRevisions(storage, stored);
    }
    try {
      storage.removeItem(storageKey);
    } catch {
      // The old copy stays; the library write above is what counts.
    }
    unsavedLibrary = null;
    unsavedStorage = null;
    storageFailure = false;
    cachedLibrary = normalized;
    cachedStorage = storage;
    cachedSerializedLibrary = serialized;
    storedActiveBuildId = stored.activeBuildId;
  } catch {
    // Keep the current session usable and retain edits in memory. Never claim
    // they were saved when the browser rejected the write.
    unsavedLibrary = normalized;
    unsavedStorage = globalThis.localStorage;
    storageFailure = true;
  }
  return normalized;
}

const serializeLibrary = (library: BuildLibrary): string =>
  JSON.stringify(quarantinedBuilds.length ? { ...library, quarantinedBuilds } : library);

// Revisions kept per build, tried in turn when the browser refuses a write (its per-origin storage is full; about 5 MB
// in Chromium, and every revision is a full copy of a build). The oldest go first.
const revisionCapsWhenFull = [MAX_REVISIONS, 5, 2, 1, 0];
let revisionsTrimmed = false;

/** True when the last write fitted in storage only after dropping older revisions. */
export function revisionsTrimmedToFit(): boolean {
  return revisionsTrimmed;
}

// Writes `stored` with fewer revisions per build until the browser accepts it, and then drops the same revisions from
// the in-memory library (its builds are shared with `stored`). Returns what was written; throws when not even a library
// without revisions fits, leaving every revision in memory.
function storeWithFewerRevisions(storage: Storage, stored: BuildLibrary): string {
  const capped = (revisions: BuildRevision[], cap: number) => (cap ? revisions.slice(-cap) : []);
  let lastError: unknown;
  for (const cap of revisionCapsWhenFull) {
    const serialized = serializeLibrary({
      ...stored,
      builds: stored.builds.map((build) => ({ ...build, revisions: capped(build.revisions, cap) })),
    });
    try {
      storage.setItem(libraryStorageKey, serialized);
    } catch (error) {
      lastError = error;
      continue;
    }
    revisionsTrimmed = stored.builds.some((build) => build.revisions.length > cap);
    for (const build of stored.builds) build.revisions = capped(build.revisions, cap);
    return serialized;
  }
  revisionsTrimmed = false;
  throw lastError;
}

// Writes a library this module loaded and changed. Its builds are already normalized (loaded, or made by ownedState
// and normalizeRevision), so only the open and compared ids are checked again; renormalizing every build and revision
// cost ~40 ms per rename with 20 builds.
function saveBuildLibrary(library: BuildLibrary, options?: WriteOptions): BuildLibrary {
  return writeBuildLibrary(normalizeBuildLibrary(library, defaultPlannerState, library.builds), options);
}

/**
 * Writes the library when storage holds none yet: the starter library lives in memory until the first edit, and a
 * backup (recovery-core.js createBackup) reads storage. A library that could not be read is never written over.
 */
export function storeLibraryIfMissing(): void {
  const library = loadBuildLibrary();
  if (libraryWriteBlock || globalThis.localStorage.getItem(libraryStorageKey) !== null) return;
  saveBuildLibrary(library);
}

export function loadPlannerState(): PlannerState {
  const library = loadBuildLibrary();
  const build = library.builds.find((entry) => entry.id === library.activeBuildId);
  setBase(build?.id, build ? JSON.stringify(build.state) : null);
  cleanStateStable = null;
  cleanMarkPending = true;
  dismissedStable = null;
  return clone(build?.state || defaultPlannerState);
}

// The app calls this once its freshly loaded state (loadPlannerState) has
// been applied and rendered, with the state it would save. Ignored unless a
// load is pending, so a state that was never stored can't be marked clean.
export function markPlannerStateClean(state: unknown): void {
  if (!cleanMarkPending) return;
  cleanMarkPending = false;
  cleanStateStable = stableJson(ownedState(state));
}

// Saves this tab's state into the build it was loaded from, read-merge-write
// against the latest stored library: only that build's record changes, so other
// builds, names and deletions made by other tabs are kept, and a build deleted
// by another tab is never recreated.
// Conflict policy when another tab saved the same build since this tab loaded
// it (stored state != this tab's base):
// - this tab has no edits of its own: nothing is written (a stale tab, e.g.
//   flushing on pagehide, never reverts the newer save);
// - otherwise the last save wins: this tab's state replaces the stored one.
//   The replaced version is kept in the build's revisions ("Other tab
//   version"). This tab's in-memory state is never replaced by another tab's;
//   the app shows a notice instead (openBuildChangedElsewhere) and reloads
//   only when the user asks.
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
// Key-order-insensitive comparison (rebuilt maps such as talent ranks can list
// the same entries in a different order).
const stableJson = (value: unknown): string =>
  JSON.stringify(value, (key, item) =>
    isPlainObject(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((name) => [name, item[name]]),
        )
      : item,
  );
const same = (a: unknown, b: unknown): boolean => stableJson(a) === stableJson(b);
// Same build state, ignoring key order (both sides normalized states).
const sameStateJson = (json: string, state: unknown): boolean =>
  json === JSON.stringify(state) || stableJson(JSON.parse(json)) === stableJson(state);
// Another tab saved a different state of this tab's build since this tab last
// loaded or saved it. Metadata (name, notes, timestamps, revisions, the shared
// last-used id) and key order are not part of the comparison.
function storedChangedSinceBase(build: LibraryBuild | undefined): boolean {
  return Boolean(
    build && baseBuildId === build.id && baseStateJson !== null && !sameStateJson(baseStateJson, build.state),
  );
}
export function savePlannerState(state: unknown): BuildLibrary {
  const library = loadBuildLibrary();
  const build = library.builds.find((entry) => entry.id === (baseBuildId || library.activeBuildId));
  if (!build) return library;
  const next = ownedState(state);
  if (cleanStateStable !== null) {
    // No edit since this tab loaded the build: nothing to write.
    if (stableJson(next) === cleanStateStable) return library;
    cleanStateStable = null;
    cleanMarkPending = false;
  }
  const storedJson = JSON.stringify(build.state);
  const nextJson = JSON.stringify(next);
  const otherTab = storedChangedSinceBase(build);
  const unchanged = storedJson === nextJson || same(next, build.state);
  // otherTab implies a base state (storedChangedSinceBase).
  if (otherTab && !unchanged && sameStateJson(baseStateJson as string, next)) return library;
  if (!unchanged) {
    build.revisions = [
      ...build.revisions,
      { timestamp: now(), label: otherTab ? "Other tab version" : "Autosave", state: clone(build.state) },
    ].slice(-MAX_REVISIONS);
    build.state = next;
    build.updatedAt = now();
  } else if (!storageFailure) {
    setBase(build.id, storedJson);
    return library;
  }
  setBase(build.id, JSON.stringify(build.state));
  return writeBuildLibrary(library);
}

// True when another tab saved a different version of the build this tab has
// open since this tab last loaded or saved it.
export function openBuildChangedElsewhere(): boolean {
  const library = loadBuildLibrary();
  const build = baseBuildId ? library.builds.find((entry) => entry.id === baseBuildId) : undefined;
  return storedChangedSinceBase(build);
}

// The user dismissed the notice: don't show it again for this stored version.
export function dismissOpenBuildChange(): void {
  const build = baseBuildId ? loadBuildLibrary().builds.find((entry) => entry.id === baseBuildId) : undefined;
  if (build) dismissedStable = stableJson(build.state);
}

// Call when another tab changed the stored library (`storage` event), with this
// tab's current in-memory planner state. Never switches this tab's build and
// never replaces its in-memory state, except when the build was deleted.
// Returns { kind, state? }:
// - "none": this tab's build is unchanged (the library list may have changed),
//   or the other tab saved exactly what this tab already shows.
// - "dismissed": as "changed", but the user already dismissed the notice for
//   this stored version (don't show it again).
// - "changed": another tab saved a different version of this tab's build.
//   The app offers a reload (loadPlannerState); until then this tab keeps its
//   own state, and its next own edit overwrites the stored one (last save wins).
// - "deleted": another tab deleted this build; `state` is the build this tab
//   shows now (the last-used or first build, or the empty default).
export function reconcileExternalLibraryChange(currentState?: unknown): ExternalLibraryChange {
  const library = loadBuildLibrary();
  if (baseBuildId && !library.builds.some((build) => build.id === baseBuildId))
    return { kind: "deleted", state: loadPlannerState() };
  const build = library.builds.find((entry) => entry.id === (baseBuildId || library.activeBuildId));
  if (!build) return { kind: "none" };
  const storedJson = JSON.stringify(build.state);
  if (baseStateJson === null || !storedChangedSinceBase(build)) {
    setBase(build.id, storedJson);
    return { kind: "none" };
  }
  if (currentState && same(ownedState(currentState), build.state)) {
    setBase(build.id, storedJson);
    return { kind: "none" };
  }
  if (dismissedStable !== null && dismissedStable === stableJson(build.state)) return { kind: "dismissed" };
  return { kind: "changed" };
}

export function clearPlannerState(): void {
  savePlannerState(defaultPlannerState);
}

export function createBuild({
  name = "New build",
  notes = "",
  state = defaultPlannerState,
  activate = true,
}: NewBuild = {}): LibraryBuild {
  const library = loadBuildLibrary();
  const build: LibraryBuild = {
    id: makeId(),
    name,
    notes,
    createdAt: now(),
    updatedAt: now(),
    state: ownedState(state),
    revisions: [],
    shareHistory: [],
  };
  library.builds.push(build);
  const opened = activate || !library.activeBuildId;
  if (opened) {
    library.activeBuildId = build.id;
    library.compareBuildId = null;
  }
  saveBuildLibrary(library, { lastUsed: opened });
  return clone(build);
}

export function importBuildCode(code: string): LibraryBuild {
  const state = decodePlannerState(code);
  const library = loadBuildLibrary();
  const baseName = "Imported build";
  const names = new Set(library.builds.map((build) => build.name));
  let name = baseName,
    number = 2;
  while (names.has(name)) name = `${baseName} ${number++}`;
  return createBuild({ name, state });
}

export function duplicateActiveBuild(name?: string): LibraryBuild | null {
  const library = loadBuildLibrary();
  const source = library.builds.find((build) => build.id === library.activeBuildId);
  if (!source) return null;
  return createBuild({ name: name || `${source.name} copy`, notes: source.notes, state: source.state });
}

export function setActiveBuild(id: string): BuildLibrary {
  const library = loadBuildLibrary();
  if (library.builds.some((build) => build.id === id)) library.activeBuildId = id;
  if (library.compareBuildId === id) library.compareBuildId = null;
  return saveBuildLibrary(library, { lastUsed: true });
}

export function setCompareBuild(id: string | null): BuildLibrary {
  const library = loadBuildLibrary();
  library.compareBuildId = library.builds.some((build) => build.id === id && id !== library.activeBuildId) ? id : null;
  return saveBuildLibrary(library);
}

export function updateActiveBuildMetadata({ name, notes }: { name?: string; notes?: string }): LibraryBuild | null {
  const library = loadBuildLibrary();
  const build = library.builds.find((entry) => entry.id === library.activeBuildId);
  if (!build) return null;
  if (name !== undefined && String(name).trim()) build.name = String(name).trim();
  if (notes !== undefined) build.notes = String(notes);
  build.updatedAt = now();
  saveBuildLibrary(library);
  return clone(build);
}

export function deleteBuild(id: string): BuildLibrary {
  const library = loadBuildLibrary();
  library.builds = library.builds.filter((build) => build.id !== id);
  const openedRemoved = library.activeBuildId === id;
  if (openedRemoved) library.activeBuildId = library.builds[0]?.id || null;
  if (library.compareBuildId === id) library.compareBuildId = null;
  return saveBuildLibrary(library, { lastUsed: openedRemoved });
}

export function deleteAllBuilds(): BuildLibrary {
  return saveBuildLibrary(
    { schemaVersion: 1, activeBuildId: null, compareBuildId: null, builds: [] },
    { lastUsed: true },
  );
}

// Restore from a backup file (recovery-core.js format, or a bare library):
// merges into the stored library and never removes or replaces a build. Each
// build is validated (normalizePlannerState → validatePlannerState); an invalid
// build is skipped, an invalid revision is dropped. An imported build whose id
// is already used gets a new id and a "(restored)" name, unless it is an exact
// copy of the stored build (same id and state), which is skipped. The open and
// last-used builds stay as they are.
export function restoreBuildsFromBackup(backup: unknown): RestoreSummary {
  const source: { builds: StoredBuildRecord[] } | null = libraryFromBackup(backup);
  if (!source) throw new TypeError("This file is not a Torchlight of Building backup");
  const library = loadBuildLibrary();
  const ids = new Set(library.builds.map((build) => build.id));
  const names = new Set(library.builds.map((build) => build.name));
  const summary: RestoreSummary = { added: 0, renamed: 0, unchanged: 0, skipped: 0, skippedNames: [], saved: false };
  source.builds.forEach((raw, index) => {
    const name = typeof raw?.name === "string" && raw.name.trim() ? raw.name.trim() : `Build ${index + 1}`;
    let state;
    try {
      if (!raw?.state || typeof raw.state !== "object") throw new TypeError("missing state");
      state = normalizePlannerState(raw.state);
    } catch {
      summary.skipped++;
      summary.skippedNames.push(name);
      return;
    }
    const revisions = (Array.isArray(raw.revisions) ? raw.revisions : [])
      .flatMap((revision) => {
        try {
          return [normalizeRevision(revision)];
        } catch {
          return [];
        }
      })
      .slice(-MAX_REVISIONS);
    let id = typeof raw.id === "string" && raw.id ? raw.id : makeId();
    let restoredName = name;
    if (ids.has(id)) {
      const existing = library.builds.find((build) => build.id === id);
      if (existing && same(existing.state, state)) {
        summary.unchanged++;
        return;
      }
      id = makeId();
      let candidate = `${name} (restored)`,
        number = 2;
      while (names.has(candidate)) candidate = `${name} (restored ${number++})`;
      restoredName = candidate;
      summary.renamed++;
    }
    ids.add(id);
    names.add(restoredName);
    library.builds.push({
      id,
      name: restoredName,
      notes: String(raw.notes || ""),
      createdAt: raw.createdAt || now(),
      updatedAt: raw.updatedAt || now(),
      state,
      revisions,
      shareHistory: normalizeShareHistory(raw.shareHistory),
    });
    summary.added++;
  });
  if (summary.added) saveBuildLibrary(library);
  summary.saved = plannerStorageStatus() === "saved";
  return summary;
}

export function restoreLatestRevision(): PlannerState {
  const library = loadBuildLibrary();
  const build = library.builds.find((entry) => entry.id === library.activeBuildId);
  if (!build) return clone(defaultPlannerState);
  const revision = build.revisions.pop();
  if (revision) {
    const current = clone(build.state);
    build.state = ownedState(revision.state);
    build.updatedAt = now();
    build.revisions.push({ timestamp: now(), label: "Before restore", state: current });
  }
  setBase(build.id, JSON.stringify(build.state));
  cleanStateStable = null;
  cleanMarkPending = false;
  saveBuildLibrary(library);
  return clone(build.state);
}

export function recordShareCode(code: string): void {
  const library = loadBuildLibrary();
  const build = library.builds.find((entry) => entry.id === library.activeBuildId);
  if (!build) return;
  build.shareHistory = [...build.shareHistory, { timestamp: now(), code }].slice(-MAX_SHARE_CODES);
  saveBuildLibrary(library);
}

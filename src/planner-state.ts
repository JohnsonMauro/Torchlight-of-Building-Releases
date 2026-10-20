// The planner state and the saved-build library: normalization of stored builds, the library in localStorage (shared
// by every tab), conflicts between tabs, unreadable data kept aside, build codes and backups.
import { normalizeTalentTreeSelection } from "./talent-selection-rules.js";
import { validatePlannerState } from "./state-validation.ts";
import type { StoredCraftedMemory, StoredPlannerState } from "./state-validation.ts";
import { migrateTreeTraits } from "./hero-trait-tree.js";
import { clampMemoryEnhancement, traitLevelBonusForEnhancement } from "./hero-memory-rules.js";
import { defaultPactspiritSlots } from "./pactspirit-selection.js";
import { AIM_UPTIME_AUTO_SENTINEL } from "./aim-model.js";
import { libraryFromBackup } from "./recovery-core.js";
import { migrateLegendaryEquipment } from "./legendary-text-migrations.js";
import { migrateChangedEquipment } from "./changed-item-migrations.js";
import { migrateCustomSupports } from "./support-text-migrations.js";
import { defaultFollowerState, normalizeFollowerState } from "./follower-model.js";

// ---- Types ----------------------------------------------------------------------------------------------------------

type Defaults = typeof defaultPlannerState;
type Section<K extends keyof StoredPlannerState> = NonNullable<StoredPlannerState[K]>;
/** A stored section after normalization: every field the defaults (D) give is present; the others stay optional. */
type Filled<T, D> = Omit<T, keyof D> & { [K in keyof D & keyof T]-?: Exclude<T[K], undefined> };

type StoredHero = Section<"hero">;
/** A crafted memory after normalization: named after its type, enhancement clamped to its rarity, trait bonus derived. */
export type PlannerMemory = Omit<StoredCraftedMemory, "name" | "enhancementLevel" | "traitLevelBonus"> & {
  name: string | undefined;
  enhancementLevel: number;
  traitLevelBonus: number;
};
/** Selena's selenaDanceTraits is migrated into treeTraits and dropped, from the hero and from each saved loadout. */
export type PlannerHero = Omit<
  Filled<StoredHero, Defaults["hero"]>,
  "selenaDanceTraits" | "memories" | "memoryInventory" | "heroLoadouts" | "sageScent"
> & {
  /** Undefined in a slot whose equipped memory has neither a type nor a name. */
  memories: Record<string, string | undefined>;
  memoryInventory: PlannerMemory[];
  heroLoadouts: Record<string, Omit<NonNullable<StoredHero["heroLoadouts"]>[string], "selenaDanceTraits">>;
  sageScent: Required<NonNullable<StoredHero["sageScent"]>>;
};
export type PlannerSkills = Omit<Filled<Section<"skills">, Defaults["skills"]>, "boardSlots"> & {
  boardSlots: Required<NonNullable<Section<"skills">["boardSlots"]>>;
};

/**
 * A build as normalizePlannerState returns it: the stored shape (src/state-validation.ts) with every field that has a
 * default present. Fields without a default (hero.characterLevel, combat.bestCaseOverrides, slates.affixOverrides)
 * stay optional.
 */
export type PlannerState = Omit<
  Filled<StoredPlannerState, Defaults>,
  "hero" | "skills" | "slates" | "talents" | "pacts" | "combat" | "followers"
> & {
  hero: PlannerHero;
  skills: PlannerSkills;
  slates: Filled<Section<"slates">, Defaults["slates"]>;
  talents: Filled<Section<"talents">, Defaults["talents"]>;
  pacts: Filled<Section<"pacts">, Defaults["pacts"]>;
  combat: Filled<Section<"combat">, Defaults["combat"]>;
  followers: Filled<Section<"followers">, Defaults["followers"]>;
};

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
  revisions?: { timestamp?: string; label?: string; state?: unknown }[];
  shareHistory?: { timestamp?: string; code?: string }[];
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
export type PlannerStateDiff = Record<
  "hero" | "equipment" | "skills" | "talents" | "slates" | "pacts" | "followers" | "combat",
  number
>;

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

// Fields that src/hero-trait-tree.js migrateTreeTraits has moved into hero.treeTraits. Heroes and loadouts reach here
// validated, so always as objects.
function withoutLegacyTreeFields<T extends { selenaDanceTraits?: unknown }>(hero: T): Omit<T, "selenaDanceTraits"> {
  const rest = { ...hero };
  delete rest.selenaDanceTraits;
  return rest;
}

export const defaultPlannerState = {
  schemaVersion: 1,
  disabledEquipmentSlots: [],
  disabledSupportNames: [],
  removedInventoryItemIds: [],
  equipmentOverrides: {},
  equipmentInventory: [],
  hero: {
    selectedHeroId: "selena-sing-with-the-tide",
    selectedTraits: { level45: "Wave Aria", level60: "Idyll of the Tide", level75: "Murmurs of the Distant Tide" },
    memories: { level45: "Ceaseless Tide", level60: "", level75: "" },
    memoryTraitLevels: { level45: 0, level60: 0, level75: 0 },
    memoryInventory: [],
    equippedMemoryIds: {},
    baseTraitMemoryId: "",
    baseTraitMemoryRoll: null,
    sageScent: { elixir: "", damage: "", defense: "", functional: "" },
    carinoSpecialAmmoSupports: ["", "", ""],
    heroTraitSupports: {},
    heroTraitSupportLevels: {},
    heroTraitSupportConfigs: {},
    // Trait-tree picks per tree hero (src/hero-trait-tree.js; replaces Selena's selenaDanceTraits, 2026-10-15).
    treeTraits: {},
    heroLoadouts: {},
  },
  skills: {
    setupOrder: null,
    boardSlots: { skills: [], auras: [] },
    supportOrder: {},
    setupEnabled: {},
    skillLevels: {},
    supportEnabled: {},
    supportLevels: {},
    specialSupportConfigs: {},
    customSupports: {},
    customSetups: [],
  },
  equippedSlateIds: null,
  slates: { geometryVersion: 4, placements: null, parked: {}, inventory: [] },
  // The build's one follower (2026-10-15; src/follower-model.js): its id, rarity and one Tartarus Skill per unlocked slot (its
  // name, or { name, tier, affixes } once support affixes are chosen, 2026-10-19; null when empty). Not part of the hero
  // loadouts: the follower stays when the hero changes.
  followers: defaultFollowerState(),
  talentRanks: {},
  talents: {
    useCapturedRanks: true,
    selectedTrees: ["Goddess of Deception", "Psychic", "Warlord", "Lich"],
    coreSelections: {
      "Goddess of Deception:12": "Affliction",
      "Goddess of Deception:24": "Subtle Impact",
      "Warlord:24": "Starfire",
      "Lich:24": "Off The Beaten Track",
    },
    prismInventory: [],
    installedPrisms: {},
    installedPrismNodes: {},
  },
  pacts: {
    activeSpirits: {},
    selectedSpirits: [...defaultPactspiritSlots],
    spiritLevels: {},
    nativeNodeQuantities: {},
    kismetSlots: {},
    fateUnlocks: {},
    kismetSlotMode: false,
    volcanoEnabled: [true, true, true, true],
    reapingDurationQuantity: 5,
    spellBlockEnabled: [true],
    attackBlockEnabled: [true, true],
  },
  combat: {
    conditionMode: "auto",
    conditions: {
      prebuiltSelfBuffs: true,
      blurRecentlyEnded: false,
      nearbyElite: true,
      targetLife: true,
      blockedRecently: true,
      blur: true,
      tideContact: true,
      onTheTide: true,
      waveAria: true,
      idyll: true,
      fireInfiltration: true,
      entangledPain: true,
      scorch: true,
      affliction: true,
      aim: true,
    },
    afflictionAverage: 50,
    afflictionPeak: 100,
    targetFireResistancePercent: 30,
    // Auto: Aim uptime is derived from the build (aim-model.js). Any other saved value is a manual override.
    aimUptimePercent: AIM_UPTIME_AUTO_SENTINEL,
    auraAffectedAllies: 1,
    idyllStacks: 15,
    extraMaxChanneledStacks: 0,
    extraInitialChanneledStacks: 0,
  },
} satisfies StoredPlannerState;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
// A build's stored state must never share objects with the caller's in-memory state. normalizePlannerState copies only
// the top levels (equipmentInventory, equipmentOverrides, slates, talentRanks and others pass through by reference), so
// a library state built straight from the live planner state would change with it: the next in-place edit (an inventory
// item edited twice) would already be in the cached library, savePlannerState would see no difference and skip the write.
const ownedState = (state: unknown): PlannerState => normalizePlannerState(clone(state));
const now = (): string => new Date().toISOString();
const makeId = (): string =>
  globalThis.crypto?.randomUUID?.() || `build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Validates a stored build (throws a TypeError naming the first invalid field) and fills in and migrates the rest. */
export function normalizePlannerState(input: unknown = {}): PlannerState {
  const value = validatePlannerState(input);
  const defaults = clone(defaultPlannerState);
  // Older New Build saves lack this flag; removed captured gear identifies
  // the blank template, whose talent ranks must start at zero.
  const emptyTemplate =
    Array.isArray(value.skills?.setupOrder) &&
    Array.isArray(value.removedInventoryItemIds) &&
    value.removedInventoryItemIds.length >= 10;
  const memoryInventory = Array.isArray(value.hero?.memoryInventory)
    ? value.hero.memoryInventory.map((memory) => {
        const enhancementLevel = clampMemoryEnhancement(memory.enhancementLevel, memory.rarity);
        return {
          ...memory,
          name: memory.type || memory.name,
          enhancementLevel,
          traitLevelBonus: traitLevelBonusForEnhancement(enhancementLevel),
        };
      })
    : [];
  const defaultHeroSelected = !value.hero?.selectedHeroId || value.hero.selectedHeroId === defaults.hero.selectedHeroId;
  const memoryTraitLevels: Record<string, number> =
    value.hero?.memoryTraitLevels && !Object.keys(value.hero.memoryTraitLevels).length
      ? {}
      : { ...(defaultHeroSelected ? defaults.hero.memoryTraitLevels : {}), ...(value.hero?.memoryTraitLevels || {}) };
  const memoryNames: Record<string, string | undefined> =
    value.hero?.memories && !Object.keys(value.hero.memories).length
      ? {}
      : { ...(defaultHeroSelected ? defaults.hero.memories : {}), ...(value.hero?.memories || {}) };
  for (const [tier, id] of Object.entries(value.hero?.equippedMemoryIds || {})) {
    const memory = memoryInventory.find((item) => item.id === id);
    if (memory) {
      memoryTraitLevels[tier] = memory.traitLevelBonus;
      memoryNames[tier] = memory.name;
    }
  }
  // Game objects changed in place (TOWER Sequence ids with a new affix, Truth → I Am Truth): src/changed-item-migrations.js.
  const changedEquipment = migrateChangedEquipment(
    value.equipmentOverrides && typeof value.equipmentOverrides === "object" ? value.equipmentOverrides : {},
    Array.isArray(value.equipmentInventory) ? value.equipmentInventory : [],
  );
  const legendaryEquipment = migrateLegendaryEquipment(changedEquipment.overrides, changedEquipment.inventory);
  const selectedSpirits = value.pacts?.selectedSpirits;
  return {
    ...defaults,
    ...value,
    disabledEquipmentSlots: Array.isArray(value.disabledEquipmentSlots) ? value.disabledEquipmentSlots : [],
    disabledSupportNames: Array.isArray(value.disabledSupportNames) ? value.disabledSupportNames : [],
    removedInventoryItemIds: Array.isArray(value.removedInventoryItemIds) ? value.removedInventoryItemIds : [],
    equippedSlateIds: Array.isArray(value.equippedSlateIds) ? value.equippedSlateIds : null,
    slates: {
      ...defaults.slates,
      ...(value.slates || {}),
      geometryVersion: Number(value.slates?.geometryVersion || 0),
      placements:
        value.slates?.placements && typeof value.slates.placements === "object" ? value.slates.placements : null,
      parked: value.slates?.parked && typeof value.slates.parked === "object" ? value.slates.parked : {},
      inventory: Array.isArray(value.slates?.inventory) ? value.slates.inventory : [],
    },
    talentRanks: value.talentRanks && typeof value.talentRanks === "object" ? value.talentRanks : {},
    talents: {
      ...defaults.talents,
      ...(value.talents || {}),
      useCapturedRanks: value.talents?.useCapturedRanks ?? !emptyTemplate,
      selectedTrees: normalizeTalentTreeSelection(value.talents?.selectedTrees, defaults.talents.selectedTrees),
      coreSelections: { ...(value.talents?.coreSelections ?? defaults.talents.coreSelections) },
      prismInventory: Array.isArray(value.talents?.prismInventory)
        ? value.talents.prismInventory.map((item) => ({ ...item }))
        : [],
      installedPrisms: { ...(value.talents?.installedPrisms || {}) },
      installedPrismNodes: { ...(value.talents?.installedPrismNodes || {}) },
    },
    // Saved legendary lines with an unsigned positive roll get their "+" on read (src/legendary-text-migrations.js).
    equipmentOverrides: legendaryEquipment.overrides,
    equipmentInventory: legendaryEquipment.inventory,
    // Trait trees (2026-10-15): hero.treeTraits holds every tree hero's picks; Selena's earlier selenaDanceTraits (top level
    // and in her loadout) and a revamped tree hero's one-per-level picks migrate into it (src/hero-trait-tree.js
    // migrateTreeTraits) and the old field is dropped.
    hero: {
      ...defaults.hero,
      ...withoutLegacyTreeFields(value.hero || {}),
      selectedHeroId:
        typeof value.hero?.selectedHeroId === "string" ? value.hero.selectedHeroId : defaults.hero.selectedHeroId,
      selectedTraits: {
        ...(value.hero?.selectedTraits ??
          (value.hero?.selectedHeroId && value.hero.selectedHeroId !== defaults.hero.selectedHeroId
            ? {}
            : defaults.hero.selectedTraits)),
      },
      memories: memoryNames,
      memoryInventory,
      memoryTraitLevels,
      sageScent: { ...defaults.hero.sageScent, ...(value.hero?.sageScent || {}) },
      carinoSpecialAmmoSupports: Array.from({ length: 3 }, (_, index) =>
        typeof value.hero?.carinoSpecialAmmoSupports?.[index] === "string"
          ? value.hero.carinoSpecialAmmoSupports[index]
          : "",
      ),
      heroTraitSupports: Object.fromEntries(
        Object.entries(value.hero?.heroTraitSupports || {}).filter(([, support]) => typeof support === "string"),
      ),
      heroTraitSupportLevels: Object.fromEntries(
        Object.entries(value.hero?.heroTraitSupportLevels || {}).map(([id, level]) => [
          id,
          Math.max(1, Math.min(40, Number(level) || 20)),
        ]),
      ),
      heroTraitSupportConfigs: Object.fromEntries(
        Object.entries(value.hero?.heroTraitSupportConfigs || {}).map(([id, config]) => [id, { ...config }]),
      ),
      treeTraits: migrateTreeTraits(value.hero || {}),
      heroLoadouts: Object.fromEntries(
        Object.entries(value.hero?.heroLoadouts || {}).map(([id, loadout]) => [
          id,
          withoutLegacyTreeFields(structuredClone(loadout)),
        ]),
      ),
    },
    skills: {
      ...defaults.skills,
      ...(value.skills || {}),
      boardSlots: {
        skills: Array.isArray(value.skills?.boardSlots?.skills) ? value.skills.boardSlots.skills : [],
        auras: Array.isArray(value.skills?.boardSlots?.auras) ? value.skills.boardSlots.auras : [],
      },
      supportOrder: { ...(value.skills?.supportOrder || {}) },
      setupEnabled: { ...(value.skills?.setupEnabled || {}) },
      skillLevels: { ...(value.skills?.skillLevels || {}) },
      supportEnabled: { ...(value.skills?.supportEnabled || {}) },
      supportLevels: { ...(value.skills?.supportLevels || {}) },
      specialSupportConfigs: Object.fromEntries(
        Object.entries(value.skills?.specialSupportConfigs || {}).map(([key, config]) => [
          key,
          config.stars == null
            ? { ...config }
            : {
                ...config,
                stars: Math.max(1, Math.min(5, (Number(config.stars) || 0) + (config.starScaleVersion === 2 ? 0 : 1))),
                starScaleVersion: 2,
              },
        ]),
      ),
      customSupports: migrateCustomSupports(value.skills?.customSupports || {}),
      customSetups: Array.isArray(value.skills?.customSetups) ? value.skills.customSetups : [],
    },
    combat: {
      ...defaults.combat,
      ...(value.combat || {}),
      conditions: { ...defaults.combat.conditions, ...(value.combat?.conditions || {}) },
    },
    // An unknown follower clears the slot; the rarity is one the follower comes in; skills fit its slots, each eligible once.
    followers: normalizeFollowerState(value.followers),
    pacts: {
      ...defaults.pacts,
      ...(value.pacts || {}),
      activeSpirits: { ...(value.pacts?.activeSpirits || {}) },
      selectedSpirits: Array.isArray(selectedSpirits)
        ? Array.from({ length: 3 }, (_, index) =>
            typeof selectedSpirits[index] === "string" ? selectedSpirits[index] : "",
          )
        : defaultPactspiritSlots.filter((name) => value.pacts?.activeSpirits?.[name] !== false),
      spiritLevels: { ...(value.pacts?.spiritLevels || {}) },
      nativeNodeQuantities: { ...(value.pacts?.nativeNodeQuantities || {}) },
      kismetSlots: { ...(value.pacts?.kismetSlots || {}) },
      fateUnlocks: { ...(value.pacts?.fateUnlocks || {}) },
    },
  };
}

function normalizeBuildRecord(build: StoredBuildRecord, index: number, fallbackState: unknown): LibraryBuild {
  return {
    id: String(build.id || makeId()),
    name: String(build.name || `Build ${index + 1}`),
    notes: String(build.notes || ""),
    createdAt: build.createdAt || now(),
    updatedAt: build.updatedAt || now(),
    state: normalizePlannerState(build.state || fallbackState),
    revisions: (Array.isArray(build.revisions) ? build.revisions : []).slice(-10).map((revision) => ({
      timestamp: revision.timestamp || now(),
      label: String(revision.label || "Autosave"),
      state: normalizePlannerState(revision.state),
    })),
    shareHistory: (Array.isArray(build.shareHistory) ? build.shareHistory : [])
      .slice(-5)
      .map((entry) => ({ timestamp: entry.timestamp || now(), code: String(entry.code || "") }))
      .filter((entry) => entry.code),
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
    const serialized = JSON.stringify(quarantinedBuilds.length ? { ...stored, quarantinedBuilds } : stored);
    try {
      storage.setItem(libraryStorageKey, serialized);
    } catch (error) {
      // Older versions kept a second full copy of the active build. Reclaim it
      // only when a library is already saved, then retry the authoritative write.
      if (!storage.getItem(libraryStorageKey)) throw error;
      storage.removeItem(storageKey);
      storage.setItem(libraryStorageKey, serialized);
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

export function saveBuildLibrary(library: StoredLibrary, options?: WriteOptions): BuildLibrary {
  return writeBuildLibrary(normalizeBuildLibrary(library), options);
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
    ].slice(-10);
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
    const revisions = (Array.isArray(raw.revisions) ? raw.revisions : []).flatMap((revision) => {
      try {
        return [
          {
            timestamp: revision.timestamp || now(),
            label: String(revision.label || "Autosave"),
            state: normalizePlannerState(revision.state),
          },
        ];
      } catch {
        return [];
      }
    });
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
      // Kept as read (not checked); normalizeBuildRecord cleans it on the next load.
      shareHistory: (Array.isArray(raw.shareHistory) ? raw.shareHistory : []) as ShareRecord[],
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
  build.shareHistory = [...build.shareHistory, { timestamp: now(), code }].slice(-5);
  saveBuildLibrary(library);
}

export function diffPlannerStates(left: unknown, right: unknown): PlannerStateDiff {
  const a = normalizePlannerState(left),
    b = normalizePlannerState(right);
  const objectDifferences = (x: Record<string, unknown>, y: Record<string, unknown>) =>
    new Set(
      [...Object.keys(x || {}), ...Object.keys(y || {})].filter(
        (key) => JSON.stringify(x?.[key]) !== JSON.stringify(y?.[key]),
      ),
    ).size;
  return {
    hero: objectDifferences(a.hero, b.hero),
    equipment: new Set([
      ...a.disabledEquipmentSlots,
      ...b.disabledEquipmentSlots,
      ...Object.keys(a.equipmentOverrides),
      ...Object.keys(b.equipmentOverrides),
    ]).size
      ? objectDifferences(
          { disabled: a.disabledEquipmentSlots, ...a.equipmentOverrides },
          { disabled: b.disabledEquipmentSlots, ...b.equipmentOverrides },
        )
      : 0,
    skills:
      objectDifferences(a.skills, b.skills) +
      (JSON.stringify(a.disabledSupportNames) === JSON.stringify(b.disabledSupportNames) ? 0 : 1),
    talents: objectDifferences(a.talentRanks, b.talentRanks) + objectDifferences(a.talents, b.talents),
    slates: JSON.stringify([a.equippedSlateIds, a.slates]) === JSON.stringify([b.equippedSlateIds, b.slates]) ? 0 : 1,
    pacts: objectDifferences(a.pacts, b.pacts),
    followers: objectDifferences(a.followers, b.followers),
    combat: objectDifferences(a.combat, b.combat),
  };
}

/** A build code: base64url (no padding) of the normalized state's JSON. */
export function encodePlannerState(state: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(normalizePlannerState(state)));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodePlannerState(code: unknown): PlannerState {
  if (typeof code !== "string" || code.length > 250000 || !/^[A-Za-z0-9_+/=-]+$/.test(code.trim()))
    throw new TypeError("Invalid or oversized build code");
  const padded = code
    .trim()
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(code.trim().length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return normalizePlannerState(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
}

// Characterization of packages/engine/src/state/planner-state.ts and src/app/storage/build-library.ts (one module until 2026-10-20): what
// normalizePlannerState and normalizeBuildLibrary return, and how the
// library is loaded, saved, shared between tabs, quarantined, restored and shared as a code. Written against the
// JavaScript module before it moved to TypeScript; the behaviour recorded here is what its types describe.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MemoryStorage } from "./memory-storage.js";
import {
  decodePlannerState,
  defaultPlannerState,
  diffPlannerStates,
  encodePlannerState,
  normalizePlannerState,
} from "../../packages/engine/src/state/planner-state.ts";
import {
  createBuild,
  deleteAllBuilds,
  deleteBuild,
  dismissOpenBuildChange,
  duplicateActiveBuild,
  importBuildCode,
  libraryLoadIssues,
  libraryQuarantinePrefix,
  loadBuildLibrary,
  loadPlannerState,
  markPlannerStateClean,
  normalizeBuildLibrary,
  openBuildChangedElsewhere,
  plannerLibraryStorageKey,
  plannerStorageStatus,
  reconcileExternalLibraryChange,
  recordShareCode,
  restoreBuildsFromBackup,
  restoreLatestRevision,
  revisionsTrimmedToFit,
  savePlannerState,
  setActiveBuild,
  setCompareBuild,
  startNewLibrary,
  storeLibraryIfMissing,
  updateActiveBuildMetadata,
} from "../../src/app/storage/build-library.ts";
import { createBackup } from "../../src/app/storage/recovery-core.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const STARTER_NAME = "Selena — Scorching Beam";

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
  globalThis.sessionStorage = new MemoryStorage();
});

const stored = () => JSON.parse(localStorage.getItem(plannerLibraryStorageKey));
const activeBuild = () => {
  const library = loadBuildLibrary();
  return library.builds.find((build) => build.id === library.activeBuildId);
};
// Another tab writes the shared library: edit the stored JSON directly.
function otherTabWrites(change) {
  const library = stored();
  change(library);
  localStorage.setItem(plannerLibraryStorageKey, JSON.stringify(library));
}
const otherTabEditsBuild = (id, change) =>
  otherTabWrites((library) => change(library.builds.find((build) => build.id === id).state));

// ---- normalizePlannerState ------------------------------------------------------------------------------------------

test("an empty build normalizes to the defaults, with slate geometry 0 and every tree hero's trait row", () => {
  const expected = structuredClone(defaultPlannerState);
  expected.slates.geometryVersion = 0;
  expected.hero.treeTraits = {
    "thea-wisdom-of-the-gods": [],
    "selena-dance-of-the-deep": [],
    "youga-the-ultimate-one": [],
  };
  assert.deepEqual(normalizePlannerState({}), expected);
  assert.deepEqual(normalizePlannerState(), expected);
});

test("normalizing is idempotent, and a real stored build is already normal", () => {
  assert.deepEqual(normalizePlannerState(structuredClone(youga)), youga);
  const once = normalizePlannerState(structuredClone(defaultPlannerState));
  assert.deepEqual(normalizePlannerState(structuredClone(once)), once);
});

test("an invalid build throws the validation error", () => {
  assert.throws(() => normalizePlannerState({ hero: { characterLevel: 0 } }), {
    name: "TypeError",
    message: "Invalid build field: build.hero.characterLevel",
  });
});

test("hero: traits, equipped memories, Carino ammo, trait support levels and the dropped Selena field", () => {
  const otherHero = normalizePlannerState({ hero: { selectedHeroId: "youga-the-ultimate-one" } }).hero;
  assert.deepEqual(otherHero.selectedTraits, {});
  assert.deepEqual(otherHero.memories, {});
  assert.deepEqual(otherHero.memoryTraitLevels, {});

  const hero = normalizePlannerState({
    hero: {
      memoryInventory: [{ id: "m1", type: "Memory of Progress", rarity: "Legendary", enhancementLevel: 50 }],
      equippedMemoryIds: { level60: "m1" },
      carinoSpecialAmmoSupports: ["Ammo"],
      heroTraitSupportLevels: { a: 1, b: 40 },
      selenaDanceTraits: ["x"],
      heroLoadouts: { "selena-dance-of-the-deep": { selenaDanceTraits: ["y"], baseTraitMemoryId: "" } },
    },
  }).hero;
  const memory = hero.memoryInventory[0];
  assert.equal(memory.name, "Memory of Progress");
  assert.equal(hero.memories.level60, "Memory of Progress");
  assert.equal(hero.memoryTraitLevels.level60, memory.traitLevelBonus);
  // The default hero keeps its default memory in the other slots.
  assert.equal(hero.memories.level45, "Ceaseless Tide");
  assert.deepEqual(hero.carinoSpecialAmmoSupports, ["Ammo", "", ""]);
  assert.deepEqual(hero.heroTraitSupportLevels, { a: 1, b: 40 });
  assert.equal("selenaDanceTraits" in hero, false);
  // The picks move to hero.treeTraits (packages/engine/src/heroes/hero-trait-tree.js migrateTreeTraits, tested with its own rules).
  assert.deepEqual(hero.heroLoadouts, { "selena-dance-of-the-deep": { baseTraitMemoryId: "" } });
});

test("skills: special support stars move to the 1–5 scale once", () => {
  const configs = normalizePlannerState({
    skills: { specialSupportConfigs: { old: { stars: 2 }, current: { stars: 2, starScaleVersion: 2 }, none: {} } },
  }).skills.specialSupportConfigs;
  assert.deepEqual(configs, {
    old: { stars: 3, starScaleVersion: 2 },
    current: { stars: 2, starScaleVersion: 2 },
    none: {},
  });
});

test("pacts: three spirit slots, empty without a selection", () => {
  assert.deepEqual(normalizePlannerState({ pacts: { selectedSpirits: ["A"] } }).pacts.selectedSpirits, ["A", "", ""]);
  assert.deepEqual(normalizePlannerState({ pacts: {} }).pacts.selectedSpirits, ["", "", ""]);
});

test("an older build's fields of the captured Selena build are accepted and dropped", () => {
  const state = normalizePlannerState({
    removedInventoryItemIds: ["captured-helmet"],
    talents: { useCapturedRanks: true },
    slates: { affixOverrides: { judgment: ["+1% damage"] } },
    pacts: {
      activeSpirits: { "Iron Lion": false },
      kismetSlotMode: false,
      volcanoEnabled: [true, true, true, true],
      reapingDurationQuantity: 5,
      spellBlockEnabled: [true],
      attackBlockEnabled: [true, true],
    },
  });
  assert.equal("removedInventoryItemIds" in state, false);
  assert.equal("useCapturedRanks" in state.talents, false);
  assert.equal("affixOverrides" in state.slates, false);
  for (const field of [
    "activeSpirits",
    "kismetSlotMode",
    "volcanoEnabled",
    "reapingDurationQuantity",
    "spellBlockEnabled",
    "attackBlockEnabled",
  ])
    assert.equal(field in state.pacts, false, field);
});

test("followers: an unknown follower empties the slot", () => {
  assert.deepEqual(
    normalizePlannerState({ followers: { followerId: "nobody", skills: ["A"] } }).followers,
    defaultPlannerState.followers,
  );
});

// ---- normalizeBuildLibrary ------------------------------------------------------------------------------------------

test("a library without a builds list starts with the starter build; an empty list stays empty", () => {
  const started = normalizeBuildLibrary({});
  assert.equal(started.builds.length, 1);
  assert.equal(started.builds[0].name, STARTER_NAME);
  assert.deepEqual(started.builds[0].state, normalizePlannerState(defaultPlannerState));
  assert.equal(started.activeBuildId, started.builds[0].id);
  assert.deepEqual(normalizeBuildLibrary({ builds: [] }), {
    schemaVersion: 1,
    activeBuildId: null,
    compareBuildId: null,
    builds: [],
  });
});

test("library ids: an unknown open build falls back to the first; the compared build is never the open one", () => {
  const builds = [
    { id: "a", state: {} },
    { id: "b", state: {} },
  ];
  assert.equal(normalizeBuildLibrary({ builds, activeBuildId: "zzz" }).activeBuildId, "a");
  assert.equal(normalizeBuildLibrary({ builds, activeBuildId: "b", compareBuildId: "b" }).compareBuildId, null);
  assert.equal(normalizeBuildLibrary({ builds, activeBuildId: "b", compareBuildId: "a" }).compareBuildId, "a");
});

test("build records: default name and notes, the last 10 revisions and the last 5 non-empty share codes", () => {
  const revisions = Array.from({ length: 12 }, (_, index) => ({ timestamp: `t${index}`, state: {} }));
  const shareHistory = [
    ...Array.from({ length: 5 }, (_, index) => ({ timestamp: "t", code: `c${index}` })),
    { code: "" },
  ];
  const [build] = normalizeBuildLibrary({ builds: [{ id: 7, state: {}, revisions, shareHistory }] }).builds;
  assert.equal(build.id, "7");
  assert.equal(build.name, "Build 1");
  assert.equal(build.notes, "");
  assert.deepEqual(
    build.revisions.map((revision) => [revision.timestamp, revision.label]),
    revisions.slice(-10).map((revision) => [revision.timestamp, "Autosave"]),
  );
  assert.deepEqual(
    build.shareHistory.map((entry) => entry.code),
    ["c1", "c2", "c3", "c4"],
  );
});

// ---- Loading and saving ---------------------------------------------------------------------------------------------

test("an empty storage loads the starter build without writing it", () => {
  const library = loadBuildLibrary();
  assert.deepEqual(
    library.builds.map((build) => build.name),
    [STARTER_NAME],
  );
  assert.equal(library.activeBuildId, library.builds[0].id);
  assert.equal(localStorage.writes, 0);
  assert.equal(plannerStorageStatus(), "saved");
});

test("createBuild stores and opens the build and returns a copy of it", () => {
  const created = createBuild({ name: "Mine", notes: "n" });
  assert.deepEqual(
    stored().builds.map((build) => build.name),
    [STARTER_NAME, "Mine"],
  );
  assert.equal(stored().activeBuildId, created.id);
  assert.deepEqual(created.state, normalizePlannerState(defaultPlannerState));
  created.state.combat.idyllStacks = 1;
  assert.equal(activeBuild().state.combat.idyllStacks, 15);

  const background = createBuild({ name: "Later", activate: false });
  assert.equal(loadBuildLibrary().activeBuildId, created.id);
  assert.ok(stored().builds.some((build) => build.id === background.id));
});

test("a saved edit keeps the previous state as a revision (10 at most); an unchanged state writes nothing", () => {
  createBuild({ name: "A" });
  const state = loadPlannerState();
  state.combat.idyllStacks = 3;
  savePlannerState(state);
  assert.equal(activeBuild().state.combat.idyllStacks, 3);
  assert.deepEqual(
    activeBuild().revisions.map((revision) => [revision.label, revision.state.combat.idyllStacks]),
    [["Autosave", 15]],
  );
  const writes = localStorage.writes;
  savePlannerState(state);
  assert.equal(localStorage.writes, writes);
  for (let stacks = 4; stacks < 16; stacks++)
    savePlannerState({ ...state, combat: { ...state.combat, idyllStacks: stacks } });
  assert.equal(activeBuild().revisions.length, 10);
});

test("the state marked clean after a load is not written until the user edits it", () => {
  createBuild({ name: "A" });
  const state = loadPlannerState();
  state.combat.idyllStacks = 7; // a load-time repair made by the app, not an edit
  markPlannerStateClean(state);
  const writes = localStorage.writes;
  savePlannerState(state);
  assert.equal(localStorage.writes, writes);
  assert.equal(activeBuild().state.combat.idyllStacks, 15);
  state.combat.idyllStacks = 8;
  savePlannerState(state);
  assert.equal(activeBuild().state.combat.idyllStacks, 8);
});

test("metadata: names are trimmed and never blank", () => {
  createBuild({ name: "A" });
  updateActiveBuildMetadata({ name: "  B  ", notes: "x" });
  assert.deepEqual([activeBuild().name, activeBuild().notes], ["B", "x"]);
  updateActiveBuildMetadata({ name: "   " });
  assert.equal(activeBuild().name, "B");
});

test("open, compare, delete: the compared build is never the open one", () => {
  const a = createBuild({ name: "A" });
  const b = createBuild({ name: "B" });
  setCompareBuild(a.id);
  assert.equal(loadBuildLibrary().compareBuildId, a.id);
  setCompareBuild(b.id);
  assert.equal(loadBuildLibrary().compareBuildId, null);
  setCompareBuild(a.id);
  setActiveBuild(a.id);
  assert.deepEqual([loadBuildLibrary().activeBuildId, loadBuildLibrary().compareBuildId], [a.id, null]);
  deleteBuild(a.id);
  assert.equal(activeBuild().name, STARTER_NAME);
  deleteAllBuilds();
  assert.deepEqual(loadBuildLibrary().builds, []);
  assert.equal(loadBuildLibrary().activeBuildId, null);
});

test("revisions: restoring the latest one keeps the replaced state as 'Before restore'", () => {
  createBuild({ name: "A" });
  const state = loadPlannerState();
  state.combat.idyllStacks = 3;
  savePlannerState(state);
  const restored = restoreLatestRevision();
  assert.equal(restored.combat.idyllStacks, 15);
  assert.equal(activeBuild().state.combat.idyllStacks, 15);
  assert.deepEqual(
    activeBuild().revisions.map((revision) => [revision.label, revision.state.combat.idyllStacks]),
    [["Before restore", 3]],
  );
});

test("share history keeps the last five codes", () => {
  createBuild({ name: "A" });
  for (let index = 0; index < 7; index++) recordShareCode(`code${index}`);
  assert.deepEqual(
    activeBuild().shareHistory.map((entry) => entry.code),
    ["code2", "code3", "code4", "code5", "code6"],
  );
});

// ---- Other tabs -----------------------------------------------------------------------------------------------------

test("another tab's save is reported, can be dismissed, and this tab's next edit wins keeping the other version", () => {
  const { id } = createBuild({ name: "Shared" });
  const mine = loadPlannerState();
  assert.equal(openBuildChangedElsewhere(), false);
  otherTabEditsBuild(id, (state) => (state.combat.idyllStacks = 1));
  assert.equal(openBuildChangedElsewhere(), true);
  assert.deepEqual(reconcileExternalLibraryChange(mine), { kind: "changed" });
  dismissOpenBuildChange();
  assert.deepEqual(reconcileExternalLibraryChange(mine), { kind: "dismissed" });

  mine.combat.idyllStacks = 2;
  savePlannerState(mine);
  assert.equal(activeBuild().state.combat.idyllStacks, 2);
  const kept = activeBuild().revisions.at(-1);
  assert.deepEqual([kept.label, kept.state.combat.idyllStacks], ["Other tab version", 1]);
  assert.equal(openBuildChangedElsewhere(), false);
});

test("a tab without edits of its own never overwrites another tab's save", () => {
  const { id } = createBuild({ name: "Shared" });
  const mine = loadPlannerState();
  otherTabEditsBuild(id, (state) => (state.combat.idyllStacks = 1));
  savePlannerState(mine);
  assert.equal(activeBuild().state.combat.idyllStacks, 1);
});

test("another tab saving exactly what this tab shows is not a change", () => {
  const { id } = createBuild({ name: "Shared" });
  const mine = loadPlannerState();
  mine.combat.idyllStacks = 1;
  otherTabEditsBuild(id, (state) => (state.combat.idyllStacks = 1));
  assert.deepEqual(reconcileExternalLibraryChange(mine), { kind: "none" });
  assert.equal(openBuildChangedElsewhere(), false);
});

test("a build deleted in another tab: this tab opens the last-used build", () => {
  const a = createBuild({ name: "A" });
  const b = createBuild({ name: "B" });
  const mine = loadPlannerState();
  otherTabWrites((library) => {
    library.builds = library.builds.filter((build) => build.id !== b.id);
    library.activeBuildId = a.id;
  });
  const change = reconcileExternalLibraryChange(mine);
  assert.equal(change.kind, "deleted");
  assert.deepEqual(change.state, a.state);
  assert.equal(loadBuildLibrary().activeBuildId, a.id);
});

// ---- Unreadable data ------------------------------------------------------------------------------------------------

test("an unreadable library is copied aside and never overwritten until the user starts a new one", () => {
  localStorage.setItem(plannerLibraryStorageKey, "{not json");
  assert.deepEqual(
    loadBuildLibrary().builds.map((build) => build.name),
    [STARTER_NAME],
  );
  assert.equal(plannerStorageStatus(), "unsaved");
  const { unreadable, quarantinedBuilds } = libraryLoadIssues();
  assert.ok(unreadable.quarantineKey.startsWith(libraryQuarantinePrefix));
  assert.match(unreadable.error, /JSON/);
  assert.deepEqual(quarantinedBuilds, []);
  assert.equal(localStorage.getItem(unreadable.quarantineKey), "{not json");

  createBuild({ name: "Kept in memory" });
  assert.equal(localStorage.getItem(plannerLibraryStorageKey), "{not json");
  assert.ok(loadBuildLibrary().builds.some((build) => build.name === "Kept in memory"));

  startNewLibrary();
  assert.deepEqual(
    stored().builds.map((build) => build.name),
    [STARTER_NAME, "Kept in memory"],
  );
  assert.equal(plannerStorageStatus(), "saved");
  assert.equal(libraryLoadIssues().unreadable, null);
  assert.equal(localStorage.getItem(unreadable.quarantineKey), "{not json");
});

test("a library of the wrong shape is unreadable too", () => {
  localStorage.setItem(plannerLibraryStorageKey, '{"builds": 3}');
  loadBuildLibrary();
  assert.equal(libraryLoadIssues().unreadable.error, "The stored build library has an unexpected shape");
});

test("builds that fail validation are set aside and written back unchanged on every save", () => {
  const bad = { id: "bad", name: " Bad ", state: { hero: { characterLevel: 500 } } };
  localStorage.setItem(
    plannerLibraryStorageKey,
    JSON.stringify({ schemaVersion: 1, builds: [{ id: "good", name: "Good", state: {} }, bad] }),
  );
  assert.deepEqual(
    loadBuildLibrary().builds.map((build) => build.id),
    ["good"],
  );
  assert.deepEqual(libraryLoadIssues().quarantinedBuilds, [{ id: "bad", name: "Bad" }]);
  updateActiveBuildMetadata({ notes: "edited" });
  assert.deepEqual(stored().quarantinedBuilds, [bad]);
  assert.equal(stored().builds[0].notes, "edited");
});

// ---- Build codes and backups ----------------------------------------------------------------------------------------

test("build codes are base64url JSON of the normalized state; bad codes are rejected", () => {
  const code = encodePlannerState(youga);
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodePlannerState(code), youga);
  for (const bad of ["not a code!", "a".repeat(250001), 7])
    assert.throws(() => decodePlannerState(bad), { name: "TypeError", message: "Invalid or oversized build code" });
  assert.throws(() => decodePlannerState(btoa('{"schemaVersion":2}')), {
    message: "Invalid build field: build.schemaVersion",
  });
});

test("a backup of a library never edited holds its starter build", () => {
  // The starter library lives in memory until the first edit; a backup reads storage.
  assert.equal(loadBuildLibrary().builds.length, 1);
  assert.equal(createBackup(localStorage).library, null);
  storeLibraryIfMissing();
  const backup = createBackup(localStorage);
  assert.deepEqual(
    backup.library.builds.map((build) => build.name),
    [STARTER_NAME],
  );
  // A stored library is left as it is.
  const before = localStorage.getItem(plannerLibraryStorageKey);
  storeLibraryIfMissing();
  assert.equal(localStorage.getItem(plannerLibraryStorageKey), before);
});

test("a library that cannot be read is never written over for a backup", () => {
  localStorage.setItem(plannerLibraryStorageKey, "{not json");
  loadBuildLibrary();
  storeLibraryIfMissing();
  assert.equal(localStorage.getItem(plannerLibraryStorageKey), "{not json");
});

test("imported and duplicated builds get free names and open", () => {
  const code = encodePlannerState(youga);
  importBuildCode(code);
  const second = importBuildCode(code);
  assert.equal(second.name, "Imported build 2");
  assert.equal(loadBuildLibrary().activeBuildId, second.id);
  const copy = duplicateActiveBuild();
  assert.equal(copy.name, "Imported build 2 copy");
  assert.deepEqual(copy.state, youga);
  assert.equal(duplicateActiveBuild("Named").name, "Named");
});

test("restoring a backup merges: new builds added, id clashes renamed, exact copies and invalid builds skipped", () => {
  const a = createBuild({ name: "A" });
  const changed = { ...a.state, combat: { ...a.state.combat, idyllStacks: 1 } };
  const summary = restoreBuildsFromBackup({
    library: {
      builds: [
        { id: a.id, name: "A", state: a.state },
        { id: a.id, name: "A", state: changed },
        { id: "new", name: "New", state: {} },
        { name: "Broken", state: { hero: { characterLevel: 0 } } },
        { name: "No state" },
      ],
    },
  });
  assert.deepEqual(summary, {
    added: 2,
    renamed: 1,
    unchanged: 1,
    skipped: 2,
    skippedNames: ["Broken", "No state"],
    saved: true,
  });
  assert.deepEqual(
    stored().builds.map((build) => build.name),
    [STARTER_NAME, "A", "A (restored)", "New"],
  );
  assert.equal(loadBuildLibrary().activeBuildId, a.id);
  assert.throws(() => restoreBuildsFromBackup({ hello: 1 }), {
    message: "This file is not a Torchlight of Building backup",
  });
});

test("diffPlannerStates counts the differing entries per area", () => {
  const left = structuredClone(defaultPlannerState);
  assert.deepEqual(diffPlannerStates(left, left), {
    hero: 0,
    equipment: 0,
    skills: 0,
    talents: 0,
    slates: 0,
    pacts: 0,
    followers: 0,
    combat: 0,
  });
  const right = {
    ...left,
    combat: { ...left.combat, idyllStacks: 3, afflictionPeak: 50 },
    talentRanks: { "Lich:1,1": 1 },
    disabledSupportNames: ["S"],
  };
  assert.deepEqual(diffPlannerStates(left, right), {
    hero: 0,
    equipment: 0,
    skills: 1,
    talents: 1,
    slates: 0,
    pacts: 0,
    followers: 0,
    combat: 2,
  });
});

test("a restored build keeps the last 10 valid revisions and 5 share codes, like a loaded one", () => {
  const revisions = [
    ...Array.from({ length: 11 }, (_, index) => ({ timestamp: `t${index}`, state: {} })),
    { timestamp: "bad", state: { hero: { characterLevel: 0 } } },
  ];
  const shareHistory = [
    null,
    "junk",
    { code: "" },
    ...Array.from({ length: 5 }, (_, index) => ({ timestamp: "t", code: `c${index}` })),
  ];
  restoreBuildsFromBackup({ builds: [{ id: "r", name: "R", state: {}, revisions, shareHistory }] });
  const restored = stored().builds.find((build) => build.id === "r");
  assert.deepEqual(
    restored.revisions.map((revision) => revision.timestamp),
    revisions.slice(1, 11).map((revision) => revision.timestamp),
  );
  assert.deepEqual(
    restored.shareHistory.map((entry) => entry.code),
    ["c0", "c1", "c2", "c3", "c4"],
  );
});

test("share history entries that are not records are dropped on load, not the whole build", () => {
  localStorage.setItem(
    plannerLibraryStorageKey,
    JSON.stringify({
      builds: [{ id: "a", name: "A", state: {}, shareHistory: [null, 3, { timestamp: "t", code: "c" }] }],
    }),
  );
  assert.deepEqual(activeBuild().shareHistory, [{ timestamp: "t", code: "c" }]);
  assert.deepEqual(libraryLoadIssues().quarantinedBuilds, []);
});

// ---- Full storage ---------------------------------------------------------------------------------------------------

const stateSize = JSON.stringify(normalizePlannerState(structuredClone(youga))).length;

test("when storage is full, older revisions make room before the save gives up", () => {
  globalThis.localStorage = new MemoryStorage({ quota: stateSize * 4 });
  createBuild({ name: "A", state: youga });
  const edit = loadPlannerState();
  for (let stacks = 1; stacks <= 8; stacks++) {
    edit.combat.idyllStacks = stacks;
    savePlannerState(edit);
  }
  assert.equal(plannerStorageStatus(), "saved");
  assert.equal(revisionsTrimmedToFit(), true);
  const saved = stored().builds.find((build) => build.name === "A");
  assert.equal(saved.state.combat.idyllStacks, 8);
  assert.ok(saved.revisions.length < 8, `${saved.revisions.length} revisions kept`);
  // The newest revisions are the ones kept, and the open library matches what was stored.
  assert.equal(saved.revisions.at(-1).state.combat.idyllStacks, 7);
  assert.deepEqual(
    loadBuildLibrary().builds.map((build) => build.revisions.length),
    stored().builds.map((build) => build.revisions.length),
  );
});

test("a build too large even without revisions is kept in memory, revisions included", () => {
  globalThis.localStorage = new MemoryStorage({ quota: Math.floor(stateSize / 2) });
  createBuild({ name: "A", state: youga });
  const edit = loadPlannerState();
  edit.combat.idyllStacks = 1;
  savePlannerState(edit);
  assert.equal(plannerStorageStatus(), "unsaved");
  assert.equal(revisionsTrimmedToFit(), false);
  assert.equal(localStorage.getItem(plannerLibraryStorageKey), null);
  assert.equal(activeBuild().revisions.length, 1);
});

test("a save that fits again clears the trimmed notice", () => {
  globalThis.localStorage = new MemoryStorage({ quota: stateSize * 4 });
  createBuild({ name: "A", state: youga });
  const edit = loadPlannerState();
  for (let stacks = 1; stacks <= 8; stacks++) {
    edit.combat.idyllStacks = stacks;
    savePlannerState(edit);
  }
  assert.equal(revisionsTrimmedToFit(), true);
  localStorage.quota = Infinity;
  edit.combat.idyllStacks = 9;
  savePlannerState(edit);
  assert.equal(revisionsTrimmedToFit(), false);
});

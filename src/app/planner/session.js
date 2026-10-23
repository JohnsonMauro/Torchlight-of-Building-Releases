// The open build: its state and the collections derived from it, saving, the calculation and the render pass.
import {
  calculatePlanner,
  canPlaceSlate,
  defaultPlannerState,
  equipmentSlots,
  selenaCompleteSkillLoadoutSs14,
  selenaScorchingBeamGearSs14,
  selenaScorchingBeamPactsSs14,
  selenaScorchingBeamSlatesSs14,
  selenaScorchingBeamTalentSetupSs14,
  setCoverageContext,
  tliArt,
  tlidbSkillCatalogSs14,
  tlidbSupportCatalogSs14,
} from "../../engine/index.ts";
import { upgradeExistingCorrodedItems } from "../gear/stored-items.js";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { createPlannerCache } from "./planner-cache.js";
import { craftedSlateForBoard } from "../slates/slate-shapes.js";
import {
  loadBuildLibrary,
  loadPlannerState,
  markPlannerStateClean,
  openBuildChangedElsewhere,
  restoreLatestRevision,
  savePlannerState,
} from "../storage/build-library.ts";
import { isSafeMode, setSafeMode } from "../storage/recovery-core.js";
import { hideOtherTabNotice, otherTabNoticeShown, showToast, updateStorageStatus } from "./page.js";
import { ui } from "./ui-state.js";

for (const entry of tlidbSkillCatalogSs14) tliArt.skills[entry.name] ||= entry.icon;
for (const entry of tlidbSupportCatalogSs14) tliArt.supports[entry.name] ||= entry.icon;

// Safe mode (Recovery screen): the planner opens on the Builds page and never runs build calculations until resumed.
export const calculationsPaused = (() => {
  try {
    return isSafeMode(sessionStorage);
  } catch {
    return false;
  }
})();
export let plannerState = loadPlannerState();
upgradeExistingCorrodedItems(plannerState);
// The open tree: the build's first one (applyPlannerState does the same for every build opened later).
ui.activeTalentPanel = plannerState.talents?.selectedTrees?.[0] || "Goddess of Deception";
export const equippedSlateIds = new Set(
  plannerState.equippedSlateIds || selenaScorchingBeamSlatesSs14.slates.map((slate) => slate.id),
);
export const slatesForBoard = () => [
  ...selenaScorchingBeamSlatesSs14.slates,
  ...(plannerState.slates?.inventory || []).map(craftedSlateForBoard),
];
const validSlatePlacements = (placements) =>
  placements &&
  slatesForBoard()
    .filter((slate) => equippedSlateIds.has(slate.id))
    .every((slate) => placements[slate.id] && canPlaceSlate(slate, placements[slate.id], placements, slatesForBoard()));
export let slatePlacements =
  plannerState.slates?.geometryVersion === 4 && validSlatePlacements(plannerState.slates?.placements)
    ? plannerState.slates.placements
    : structuredClone(selenaScorchingBeamSlatesSs14.capturedPlacements);
// Slates set beside the grid, by id: their stage position (percent) and transform.
export let parkedSlates = plannerState.slates?.parked || {};
// The sections that move slates replace these objects through the setters (an imported binding cannot be assigned).
export function setSlatePlacements(next) {
  slatePlacements = next;
}
export function setParkedSlates(next) {
  parkedSlates = next;
}
export const disabledEquipmentSlots = new Set(plannerState.disabledEquipmentSlots);
export const disabledSupportNames = new Set(plannerState.disabledSupportNames);
export const talentRanks = new Map();
for (const panel of selenaScorchingBeamTalentSetupSs14.panels.filter(
  (panel) => plannerState.talents.useCapturedRanks !== false && plannerState.talents.selectedTrees.includes(panel.name),
)) {
  for (const node of panel.allocatedNodes) {
    const key = `${panel.name}:${node.coordinate}`;
    talentRanks.set(key, plannerState.talentRanks[key] ?? node.rank);
  }
}
for (const [key, rank] of Object.entries(plannerState.talentRanks || {}))
  if (!talentRanks.has(key)) talentRanks.set(key, rank);
for (const [panel, coordinate] of Object.entries(plannerState.talents.installedPrismNodes || {}))
  if (plannerState.talents.installedPrisms?.[panel]) talentRanks.set(`${panel}:${coordinate}`, 0);

export function capturePlannerState() {
  return {
    schemaVersion: 1,
    disabledEquipmentSlots: [...disabledEquipmentSlots],
    disabledSupportNames: [...disabledSupportNames],
    removedInventoryItemIds: plannerState.removedInventoryItemIds || [],
    equipmentOverrides: plannerState.equipmentOverrides,
    equipmentInventory: plannerState.equipmentInventory,
    hero: plannerState.hero,
    skills: plannerState.skills,
    equippedSlateIds: [...equippedSlateIds],
    slates: {
      geometryVersion: 4,
      placements: slatePlacements,
      parked: parkedSlates,
      affixOverrides: plannerState.slates?.affixOverrides || {},
      inventory: plannerState.slates?.inventory || [],
    },
    talentRanks: Object.fromEntries(talentRanks),
    talents: plannerState.talents,
    combat: plannerState.combat,
    followers: plannerState.followers,
    pacts: plannerState.pacts,
  };
}

let pendingCandidateRender = false;
let renderPassPlanner = null;

export function persistPlannerState() {
  plannerState = capturePlannerState();
  upgradeExistingCorrodedItems(plannerState);
  savePlannerState(plannerState);
  // This tab's save replaced another tab's version (last save wins): the notice is out of date.
  if (otherTabNoticeShown() && !openBuildChangedElsewhere()) hideOtherTabNotice();
  updateStorageStatus();
  renderPassPlanner = null;
  if (!pendingCandidateRender) {
    pendingCandidateRender = true;
    queueMicrotask(() => {
      if (!pendingCandidateRender) return;
      pendingCandidateRender = false;
      renderCandidateViews();
    });
  }
}

const cachedPlanner = createPlannerCache((state) => {
  if (calculationsPaused) throw new Error("Safe mode: calculations paused");
  return calculatePlanner(state);
});
export function currentPlanner() {
  const planner = renderPassPlanner || cachedPlanner(capturePlannerState());
  setCoverageContext(planner);
  return planner;
}
// Manual Config mode: the same build in automatic mode tells which conditions have a source (src/configuration-panel.js).
const sourceProbeCache = createPlannerCache((state) => {
  if (calculationsPaused) throw new Error("Safe mode: calculations paused");
  return calculatePlanner(state);
});
export function conditionSourceProbe() {
  const state = capturePlannerState();
  return sourceProbeCache({
    ...state,
    combat: { ...state.combat, conditionMode: "auto", conditions: {}, bestCaseOverrides: {} },
  });
}
export function currentEquipmentImpact() {
  return currentPlanner().equipment;
}
export const supportStateKey = (setupName, supportName) => `${setupName}:${supportName}`;
export const setupStateKey = (setup) =>
  typeof setup === "string" ? setup : setup?.setupKey || setup?.instanceId || setup?.name;
export function currentEditedSetups() {
  return currentPlanner().activation.setups;
}
export function refreshPactCandidate() {
  persistPlannerState();
  renderCandidateViews();
}

export function emptyPlannerState() {
  const empty = structuredClone(defaultPlannerState);
  empty.disabledEquipmentSlots = equipmentSlots.map(([slot]) => slot);
  empty.removedInventoryItemIds = selenaScorchingBeamGearSs14.items.map((item) => `captured-${item.slot}`);
  empty.equipmentOverrides = {};
  empty.equipmentInventory = [];
  empty.hero = {
    selectedHeroId: "",
    selectedTraits: {},
    memories: {},
    memoryTraitLevels: {},
    memoryInventory: [],
    equippedMemoryIds: {},
    baseTraitMemoryId: "",
    baseTraitMemoryRoll: null,
    sageScent: { elixir: "", damage: "", defense: "", functional: "" },
    carinoSpecialAmmoSupports: ["", "", ""],
    heroTraitSupports: {},
    heroTraitSupportLevels: {},
    heroTraitSupportConfigs: {},
    treeTraits: {},
    heroLoadouts: {},
  };
  empty.skills = {
    setupOrder: [],
    boardSlots: { skills: [], auras: [] },
    supportOrder: {},
    setupEnabled: Object.fromEntries(selenaCompleteSkillLoadoutSs14.setups.map((setup) => [setup.name, false])),
    skillLevels: {},
    supportEnabled: {},
    supportLevels: {},
    specialSupportConfigs: {},
    customSupports: {},
    customSetups: [],
  };
  empty.equippedSlateIds = [];
  empty.slates = { geometryVersion: 4, placements: {}, affixOverrides: {} };
  empty.talentRanks = {};
  empty.talents = {
    useCapturedRanks: false,
    selectedTrees: ["", "", "", ""],
    coreSelections: {},
    prismInventory: [],
    installedPrisms: {},
    installedPrismNodes: {},
  };
  empty.pacts = {
    activeSpirits: Object.fromEntries(selenaScorchingBeamPactsSs14.pactspirits.map((spirit) => [spirit.name, false])),
    selectedSpirits: ["", "", ""],
    spiritLevels: {},
    nativeNodeQuantities: {},
    kismetSlots: {},
    fateUnlocks: {},
    kismetSlotMode: true,
    volcanoEnabled: [false, false, false, false],
    reapingDurationQuantity: 0,
    spellBlockEnabled: [false],
    attackBlockEnabled: [false, false],
  };
  empty.combat = {
    ...empty.combat,
    conditions: {
      ...Object.fromEntries(Object.keys(empty.combat.conditions).map((key) => [key, false])),
      targetLife: true,
      prebuiltSelfBuffs: true,
    },
  };
  return empty;
}

export function applyPlannerState(next) {
  upgradeExistingCorrodedItems(next);
  plannerState = next;
  ui.activeTalentSlot = 0;
  ui.activeTalentPanel = next.talents?.selectedTrees?.[0] || "Goddess of Deception";
  disabledEquipmentSlots.clear();
  next.disabledEquipmentSlots.forEach((value) => disabledEquipmentSlots.add(value));
  disabledSupportNames.clear();
  next.disabledSupportNames.forEach((value) => disabledSupportNames.add(value));
  for (const setup of selenaCompleteSkillLoadoutSs14.setups)
    for (const support of setup.supports)
      if (next.skills.supportEnabled[supportStateKey(setup.name, support.name)] === false)
        disabledSupportNames.add(support.name);
  equippedSlateIds.clear();
  (next.equippedSlateIds || selenaScorchingBeamSlatesSs14.slates.map((slate) => slate.id)).forEach((value) =>
    equippedSlateIds.add(value),
  );
  setSlatePlacements(
    next.slates?.geometryVersion === 4 && validSlatePlacements(next.slates?.placements)
      ? next.slates.placements
      : structuredClone(selenaScorchingBeamSlatesSs14.capturedPlacements),
  );
  setParkedSlates(next.slates?.parked || {});
  talentRanks.clear();
  for (const panel of selenaScorchingBeamTalentSetupSs14.panels.filter(
    (panel) => next.talents.useCapturedRanks !== false && next.talents.selectedTrees.includes(panel.name),
  ))
    for (const node of panel.allocatedNodes) talentRanks.set(panel.name + ":" + node.coordinate, node.rank);
  for (const [key, value] of Object.entries(next.talentRanks || {})) talentRanks.set(key, value);
  for (const [panel, coordinate] of Object.entries(next.talents.installedPrismNodes || {}))
    if (next.talents.installedPrisms?.[panel]) talentRanks.set(`${panel}:${coordinate}`, 0);
  markLoadedStateClean();
  persistPlannerState();
}
// A freshly loaded build (loadPlannerState) differs from its stored copy only by
// load-time repairs (upgradeExistingCorrodedItems, derived talent ranks...).
// That is not an edit: build-library.ts skips saves equal to this state, so a
// tab without user edits never writes (and never triggers other tabs' notice).
export function markLoadedStateClean() {
  try {
    const state = capturePlannerState();
    upgradeExistingCorrodedItems(state);
    markPlannerStateClean(state);
  } catch {
    // A build that cannot be captured is saved by the next edit; the load goes on.
  }
}

// A build that cannot be calculated must not stop the planner from loading: the page shows the error and offers the
// previous saved version or safe mode (recovery-core.js). The message, or null; React renders the notice
// (apps/web/src/shell/PageNotices.tsx, from the "pageNotices" source).
let calculationFailure = null;
export const calculationFailureMessage = () => calculationFailure;
function showCalculationFailure(error) {
  console.error(error);
  calculationFailure = String(error?.message || error);
  viewSourceChanged("pageNotices");
}
function clearCalculationFailure() {
  if (calculationFailure === null) return;
  calculationFailure = null;
  viewSourceChanged("pageNotices");
}
// The notice's Undo last change: the build's latest saved revision replaces it.
export function undoLastChange() {
  let restored;
  try {
    const library = loadBuildLibrary(),
      active = library.builds.find((build) => build.id === library.activeBuildId);
    if (!active?.revisions?.length) {
      showToast("No earlier version of this build is saved");
      return;
    }
    restored = restoreLatestRevision();
  } catch (failure) {
    showToast(failure?.message || "The earlier version could not be restored");
    return;
  }
  applyPlannerState(restored);
  pendingCandidateRender = false;
  renderCandidateViews();
  if (calculationFailure === null) showToast("Last change undone");
}
// The notice's Open safe mode: the page reloads without calculations.
export function openSafeMode() {
  setSafeMode(sessionStorage, true);
  location.reload();
}
// Only a full successful renderCandidateViews() clears the notice.
export function runGuardedRender(renderStep) {
  try {
    renderStep();
    return true;
  } catch (error) {
    showCalculationFailure(error);
    return false;
  }
}

// What a render pass redraws (the open workspace view's sections), set at startup by src/app/planner/workspace.js: the
// sections depend on this module, not the other way round.
let renderOpenViews = () => {};
export function setOpenViewsRenderer(render) {
  renderOpenViews = render;
}
export function renderCandidateViews() {
  if (calculationsPaused) {
    pendingCandidateRender = false;
    updateStorageStatus();
    return;
  }
  pendingCandidateRender = false;
  try {
    renderPassPlanner = cachedPlanner(capturePlannerState());
    renderOpenViews();
    clearCalculationFailure();
  } catch (error) {
    showCalculationFailure(error);
  } finally {
    renderPassPlanner = null;
  }
}
// Drops the render a save queued (a hidden tab redraws when it is shown again).
export function cancelQueuedRender() {
  pendingCandidateRender = false;
}
// Runs `read` with the current calculation as the render pass's, so the planner is calculated once for all it reads.
export function withRenderPass(read) {
  const previousRenderPass = renderPassPlanner;
  renderPassPlanner = currentPlanner();
  try {
    return read();
  } finally {
    renderPassPlanner = previousRenderPass;
  }
}
// Each tab autosaves synchronously on every edit; this also writes anything
// still unsaved when the tab is hidden, closed or reloaded.
export function flushPlannerState() {
  try {
    const state = capturePlannerState();
    upgradeExistingCorrodedItems(state);
    savePlannerState(state);
  } catch {
    // Leaving the page: nothing else can be done with a state that cannot be saved.
  }
}

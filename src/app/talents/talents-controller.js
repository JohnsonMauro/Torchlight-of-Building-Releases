// Talent tree commands: tree picker, core talents, points on nodes.
import { tliArt } from "../../data/assets/tli-art.js";
import { allProfessionTalentCatalogueSs13 } from "../../data/talents/all-profession-trees-ss13.generated.js";
import { inverseImageReflectedCoordinates } from "../../engine/talents/prism-crafting.js";
import {
  allocateTalentToMaxWithPrerequisites,
  allocateTalentWithPrerequisites,
  removeTalentWithDependents,
  talentPointTotals,
} from "../../engine/talents/talent-rules.js";
import { talentFamiliesSs13, talentOptionsForSlot } from "../../engine/talents/talent-selection-rules.js";
import { closeDialog, openDialog } from "../bridge/dialogs.ts";
import { talentFamilyClass, talentsView } from "../bridge/talents-view-model.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { renderConfiguration } from "../configuration/configuration-controller.js";
import { showToast } from "../planner/page.js";
import { persistPlannerState, plannerState, renderCandidateViews, talentRanks } from "../planner/session.js";
import { saveWorkspaceLocation, ui } from "../planner/ui-state.js";
import { renderSkills } from "../skills/skill-board.js";
import { renderSlates } from "../slates/slates-controller.js";
import { clearPendingPrism, openPrismInventory, pendingPrismPlacement, placeCraftedPrism } from "./prism-controller.js";
import {
  activeTalentLayouts,
  clearInverseReflectedRanks,
  clearTalentTreeState,
  currentTalentPanel,
  professionTreeLayoutsAllSs13,
  reconcileTalentRanksAfterPrismChange,
  renderTalents,
  setTalentSlateMode,
  talentDisplayNodes,
} from "./talent-trees.js";

let activeCoreThreshold = 12;
export const talentCommands = {
  // Talent trees (apps/web/src/features/talents).
  openTalentTree,
  removeTalentTree,
  openTalentSlates,
  openCorePicker,
  selectCoreTalent,
  removeCoreTalent,
  clickTalentNode,
  rightClickTalentNode,
  resetTalentTree,
  reselectTalentTree,
  selectTalentTree,
};
export const talentViewSources = {
  // The talent trees' data (src/app/bridge/talents-view-model.ts).
  talents: talentsSource,
  // The talent tree, core talent and Fate slot pickers.
  talentPicker: talentPickerSource,
  corePicker: corePickerSource,
};
// The talent trees' data (src/app/bridge/talents-view-model.ts).
function talentsSource() {
  return talentsView({
    panel: currentTalentPanel(),
    baseLayouts: professionTreeLayoutsAllSs13,
    layouts: activeTalentLayouts(),
    ranks: Object.fromEntries(talentRanks),
    talents: plannerState.talents,
    activeSlot: ui.activeTalentSlot,
    slateMode: ui.talentSlateMode,
    pendingPrism: pendingPrismPlacement,
  });
}
// The talent tree picker's data (apps/web/src/features/talents/TalentPanelPickerDialog.tsx): the trees the open slot takes.
function talentPickerSource() {
  const selectedTrees = plannerState.talents.selectedTrees;
  const pointTotals = talentPointTotals(activeTalentLayouts(), Object.fromEntries(talentRanks));
  return {
    title:
      ui.activeTalentSlot === 0
        ? "Select a God tree"
        : ui.activeTalentSlot === 1
          ? `Select a ${selectedTrees[0] || "God"} class tree`
          : `Select talent tree ${ui.activeTalentSlot + 1}`,
    god: ui.activeTalentSlot === 0,
    cards: talentOptionsForSlot(ui.activeTalentSlot, selectedTrees).map((name) => ({
      name,
      familyClass: talentFamilyClass(name),
      art: tliArt.talentPanels[name] || allProfessionTalentCatalogueSs13[name].emblem,
      selected: selectedTrees[ui.activeTalentSlot] === name,
      points: pointTotals.panels[name],
    })),
  };
}
// The tree picker's pick: the open slot takes that tree (a new God tree empties a class tree it does not lead to).
function selectTalentTree(name) {
  const previous = plannerState.talents.selectedTrees[ui.activeTalentSlot];
  if (previous !== name) {
    clearTalentTreeState(previous);
    delete plannerState.talents.installedPrisms[previous];
    delete plannerState.talents.installedPrismNodes[previous];
  }
  plannerState.talents.selectedTrees[ui.activeTalentSlot] = name;
  if (ui.activeTalentSlot === 0 && !talentFamiliesSs13[name].includes(plannerState.talents.selectedTrees[1])) {
    const removed = plannerState.talents.selectedTrees[1];
    clearTalentTreeState(removed);
    delete plannerState.talents.installedPrisms[removed];
    delete plannerState.talents.installedPrismNodes[removed];
    plannerState.talents.selectedTrees[1] = "";
  }
  ui.activeWorkspaceView = "talents";
  ui.activeTalentPanel = name;
  persistPlannerState();
  closeDialog("talent-panel-picker");
  renderTalents();
  saveWorkspaceLocation();
}

// The core talent picker's data (apps/web/src/features/talents/CoreTalentPickerDialog.tsx): the open tree's choices for a slot.
function corePickerSource() {
  const threshold = activeCoreThreshold,
    panel = currentTalentPanel();
  const points = talentPointTotals(activeTalentLayouts(), Object.fromEntries(talentRanks)).panels[panel.name];
  const locked = points < threshold;
  return {
    title: `Select ${threshold}-point core talent`,
    status: locked
      ? `${points}/${threshold} points in ${panel.name}. These choices unlock at ${threshold} points.`
      : `Choose one core talent for ${panel.name}.`,
    locked,
    options: panel.coreTalents
      .filter((core) => core.unlockPoints === threshold)
      .map((core) => ({
        name: core.name,
        description: core.description,
        art: tliArt.coreTalents[core.name] || core.icon,
        selected: plannerState.talents.coreSelections[`${panel.name}:${threshold}`] === core.name,
      })),
  };
}

function changeTalentRank(coordinate, delta, max = false) {
  const panel = currentTalentPanel();
  const displayNodes = talentDisplayNodes(panel);
  const node = displayNodes.find((item) => item.coordinate.join(",") === coordinate);
  if (!node) return;
  const prismCoordinate = plannerState.talents.installedPrisms?.[panel.name]
    ? plannerState.talents.installedPrismNodes?.[panel.name]
    : null;
  const prism = (plannerState.talents.prismInventory || []).find(
    (item) => item.id === plannerState.talents.installedPrisms?.[panel.name],
  );
  const prerequisiteFreeCoordinates = inverseImageReflectedCoordinates(prism, prismCoordinate);
  const layouts = activeTalentLayouts();
  const args = {
    panel: panel.name,
    node,
    graph: layouts[panel.name],
    layouts,
    ranks: Object.fromEntries(talentRanks),
    prismCoordinate,
    prerequisiteFreeCoordinates,
  };
  if (delta > 0) {
    const allocation = max ? allocateTalentToMaxWithPrerequisites(args) : allocateTalentWithPrerequisites(args);
    if (!allocation.allowed) {
      showToast(allocation.reason);
      return;
    }
    talentRanks.clear();
    for (const [rankKey, rankValue] of Object.entries(allocation.ranks)) talentRanks.set(rankKey, rankValue);
    persistPlannerState();
    renderTalents();
    renderSkills();
    renderConfiguration();
    return;
  }
  const rule = removeTalentWithDependents(args);
  if (!rule.allowed) {
    showToast(rule.reason);
    return;
  }
  talentRanks.clear();
  for (const [rankKey, rankValue] of Object.entries(rule.ranks)) talentRanks.set(rankKey, rankValue);
  persistPlannerState();
  renderTalents();
  renderSkills();
  renderConfiguration();
}

// Talent tree commands (apps/web/src/features/talents). The tree, core and prism dialogs stay here.
function openTalentTree(slot) {
  clearPendingPrism();
  setTalentSlateMode(false);
  ui.activeTalentSlot = slot;
  const selected = plannerState.talents.selectedTrees[slot];
  if (selected) {
    ui.activeWorkspaceView = "talents";
    ui.activeTalentPanel = selected;
    renderTalents();
    saveWorkspaceLocation();
    return;
  }
  renderTalents();
  openDialog("talent-panel-picker");
}
// Right-click on a tree tab: the tree and every one after it are emptied.
function removeTalentTree(slot) {
  if (!plannerState.talents.selectedTrees[slot]) return false;
  for (let index = slot; index < plannerState.talents.selectedTrees.length; index += 1) {
    const name = plannerState.talents.selectedTrees[index];
    clearTalentTreeState(name);
    delete plannerState.talents.installedPrisms[name];
    delete plannerState.talents.installedPrismNodes[name];
    plannerState.talents.selectedTrees[index] = "";
  }
  persistPlannerState();
  renderCandidateViews();
  showToast("Talent tree removed");
  return true;
}
function openTalentSlates() {
  ui.activeWorkspaceView = "talents";
  setTalentSlateMode(true);
  renderTalents();
  renderSlates();
  saveWorkspaceLocation();
}
function openCorePicker(threshold) {
  activeCoreThreshold = threshold;
  viewSourceChanged("corePicker");
  openDialog("core-talent-picker");
}
// The core talent picker's pick (choices are disabled below the slot's points).
function selectCoreTalent(name) {
  plannerState.talents.coreSelections[`${ui.activeTalentPanel}:${activeCoreThreshold}`] = name;
  persistPlannerState();
  closeDialog("core-talent-picker");
  renderTalents();
  showToast(`${name} selected`);
}
function removeCoreTalent(threshold) {
  const key = `${currentTalentPanel().name}:${threshold}`;
  if (!plannerState.talents.coreSelections[key]) return false;
  delete plannerState.talents.coreSelections[key];
  persistPlannerState();
  renderCandidateViews();
  showToast("Core talent removed");
  return true;
}
// A click on a node: places a prism waiting for one, opens the prism inventory on the installed prism, or adds a point
// (with the points on the way to it).
function clickTalentNode(coordinate) {
  if (pendingPrismPlacement) {
    placeCraftedPrism(coordinate);
    return;
  }
  if (
    plannerState.talents.installedPrismNodes?.[ui.activeTalentPanel] === coordinate &&
    plannerState.talents.installedPrisms?.[ui.activeTalentPanel]
  ) {
    openPrismInventory();
    return;
  }
  changeTalentRank(coordinate, 1);
}
// A right-click on a node: takes the installed prism off, takes a point off, or fills an empty node.
function rightClickTalentNode(coordinate) {
  if (pendingPrismPlacement) return;
  const panelName = currentTalentPanel().name;
  if (
    plannerState.talents.installedPrismNodes?.[panelName] === coordinate &&
    plannerState.talents.installedPrisms?.[panelName]
  ) {
    const item = plannerState.talents.prismInventory.find(
      (entry) => entry.id === plannerState.talents.installedPrisms[panelName],
    );
    clearInverseReflectedRanks(panelName, item, coordinate);
    delete plannerState.talents.installedPrisms[panelName];
    delete plannerState.talents.installedPrismNodes[panelName];
    if (item?.type === "inverse") reconcileTalentRanksAfterPrismChange(panelName);
    persistPlannerState();
    renderCandidateViews();
    showToast("Prism removed from talent node");
    return;
  }
  const empty = !(talentRanks.get(`${panelName}:${coordinate}`) || 0);
  changeTalentRank(coordinate, empty ? 1 : -1, empty);
}
function resetTalentTree() {
  clearTalentTreeState(ui.activeTalentPanel);
  persistPlannerState();
  renderCandidateViews();
  showToast(`${ui.activeTalentPanel} points reset`);
}
function reselectTalentTree() {
  const slot = plannerState.talents.selectedTrees.indexOf(ui.activeTalentPanel);
  ui.activeTalentSlot = slot >= 0 ? slot : 0;
  renderTalents();
  openDialog("talent-panel-picker");
}

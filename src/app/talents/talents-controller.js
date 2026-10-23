// Talent tree commands: tree picker, core talents, points on nodes.
import {
  allocateTalentToMaxWithPrerequisites,
  allocateTalentWithPrerequisites,
  dazeStatus,
  inverseImageReflectedCoordinates,
  modeledCoreTalents,
  prismBaseEffect,
  prismReplacesCore,
  refineCoverage,
  removeTalentWithDependents,
  talentFamiliesSs14,
  talentPointTotals,
  tliArt,
} from "../../engine/index.ts";
import { closeDialog, openDialog } from "../bridge/dialogs.ts";
import { coverageView } from "../bridge/gear-item-view.ts";
import { talentPickerView } from "../bridge/talent-picker-view.ts";
import { coreTalentTooltipView, talentNodeTooltipView } from "../bridge/talent-tooltip-view.ts";
import { talentsView } from "../bridge/talents-view-model.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { renderConfiguration } from "../configuration/configuration-controller.js";
import { showToast } from "../planner/page.js";
import {
  prismAffixCoverage,
  prismAffixCoverageReason,
  talentEffectCoverage,
  talentLineCoverage,
} from "../planner/calculation-coverage.js";
import {
  currentPlanner,
  persistPlannerState,
  plannerState,
  renderCandidateViews,
  talentRanks,
  withRenderPass,
} from "../planner/session.js";
import { saveWorkspaceLocation, ui } from "../planner/ui-state.js";
import { renderSkills } from "../skills/skill-board.js";
import { renderSlates } from "../slates/slates-controller.js";
import {
  clearPendingPrism,
  openPrismInventory,
  pendingPrismPlacement,
  placeCraftedPrism,
  prismTooltip,
} from "./prism-controller.js";
import { prismIcon, prismName } from "./prism-icons.js";
import {
  activeTalentLayouts,
  clearInverseReflectedRanks,
  clearTalentTreeState,
  currentTalentPanel,
  professionTreeLayoutsAllSs14,
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
export const talentQueries = {
  // A node's tooltip, or the installed prism's on its node (apps/web/src/features/talents/TalentTooltip.tsx).
  talentNodeTooltip: (target) => withRenderPass(() => talentNodeTooltip(target)),
  // A core talent slot's tooltip, or the prism's shown among the cores.
  coreTalentTooltip: (target) => withRenderPass(() => coreTalentTooltip(target)),
};
export const talentViewSources = {
  // The talent trees' data (src/app/bridge/talents-view-model.ts).
  talents: talentsSource,
  // The talent tree, core talent and Fate slot pickers.
  talentPicker: talentPickerSource,
  corePicker: corePickerSource,
};
// The talent trees' tooltips (src/app/bridge/talent-tooltip-view.ts). A node is the one the trees show (talentsView):
// its art, whether it is locked and whether it sits in the prism's area come with it.
const installedPrismIn = (tree) =>
  (plannerState.talents.prismInventory || []).find((item) => item.id === plannerState.talents.installedPrisms?.[tree]);
function talentNodeTooltip({ coordinate, art, locked, prismAffected }) {
  const panel = currentTalentPanel(),
    prism = installedPrismIn(panel.name) || null,
    prismCoordinate = plannerState.talents.installedPrismNodes?.[panel.name] || null;
  if (prism && prismCoordinate === coordinate) return { kind: "prism", view: prismTooltip(prism) };
  const nodes = talentDisplayNodes(panel),
    node = nodes.find((item) => item.coordinate.join(",") === coordinate);
  if (!node) return null;
  return {
    kind: "node",
    view: talentNodeTooltipView({
      tree: panel.name,
      node,
      nodes,
      rankAt: (at) => talentRanks.get(`${panel.name}:${at}`) || 0,
      icon: art,
      locked,
      prismAffected,
      prism,
      prismCoordinate,
      prismName: prism ? prismName(prism) : "",
      effectCoverage: talentEffectCoverage,
      lineCoverage: talentLineCoverage,
      prismAffixCoverage: (kind) => prismAffixCoverage(prism, kind),
    }),
  };
}
// A core slot ({ threshold, locked }) or the prism shown among the cores ({ prism: true }).
function coreTalentTooltip(target) {
  const panel = currentTalentPanel(),
    planner = currentPlanner();
  const prism = target.prism ? installedPrismIn(panel.name) : null;
  if (target.prism && !prism) return null;
  const selected = target.prism ? null : plannerState.talents.coreSelections[`${panel.name}:${target.threshold}`];
  const core = selected
    ? panel.coreTalents.find((item) => item.unlockPoints === target.threshold && item.name === selected)
    : null;
  return coreTalentTooltipView({
    tree: panel.name,
    threshold: target.threshold ?? 0,
    core: core ? { ...core, icon: tliArt.coreTalents[core.name] || core.icon || null } : null,
    prism: prism
      ? {
          base: prism.base,
          icon: prismIcon(prism) || "",
          effect: prismBaseEffect(prism.type, prism.base, prism.legendaryAffix),
          replacesCore: prismReplacesCore(prism),
        }
      : null,
    locked: Boolean(target.locked),
    coverage: (lines) =>
      prism
        ? coverageView(prismAffixCoverage(prism, "base"), prismAffixCoverageReason(prism, "base"))
        : coverageView(
            core?.name === "Subtle Impact" && !planner.conditions.blur
              ? planner.blurSources.some((source) => source.available)
                ? "Inactive"
                : "Missing Blur source"
              : !core
                ? "Not selected"
                : core.name === "Daze"
                  ? dazeStatus(planner)
                  : modeledCoreTalents.includes(core.name)
                    ? "In calc"
                    : refineCoverage("Not independently modeled", lines.join("\n")),
          ),
  });
}

// The talent trees' data (src/app/bridge/talents-view-model.ts).
function talentsSource() {
  return talentsView({
    panel: currentTalentPanel(),
    baseLayouts: professionTreeLayoutsAllSs14,
    layouts: activeTalentLayouts(),
    ranks: Object.fromEntries(talentRanks),
    talents: plannerState.talents,
    slateMode: ui.talentSlateMode,
    pendingPrism: pendingPrismPlacement,
  });
}
// The talent tree picker's data (src/app/bridge/talent-picker-view.ts): every god's trees, the open slot's choices on.
function talentPickerSource() {
  const pointTotals = talentPointTotals(activeTalentLayouts(), Object.fromEntries(talentRanks));
  return talentPickerView({
    slot: ui.activeTalentSlot,
    selectedTrees: plannerState.talents.selectedTrees,
    points: pointTotals.panels,
  });
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
  if (ui.activeTalentSlot === 0 && !talentFamiliesSs14[name].includes(plannerState.talents.selectedTrees[1])) {
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
  return {
    locked: points < threshold,
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

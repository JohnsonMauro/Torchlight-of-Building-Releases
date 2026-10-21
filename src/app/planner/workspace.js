// The workspace views: which one is open, and what a switch redraws.
import { renderConfiguration } from "../configuration/configuration-controller.js";
import { renderEquipment } from "../gear/gear-controller.js";
import { renderPacts } from "../pacts/pacts-controller.js";
import { renderSkills } from "../skills/skill-board.js";
import { renderSlates } from "../slates/slates-controller.js";
import { renderCharacter } from "../stats/stats-controller.js";
import { loadBuildLibrary } from "../storage/build-library.ts";
import { renderTalents } from "../talents/talent-trees.js";
import { updateStorageStatus } from "./page.js";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { calculationsPaused } from "./session.js";
import { FOCUSED_VIEWS, saveWorkspaceLocation, ui } from "./ui-state.js";

// Every view shows its one section (#<view>-view): the build's tabs (hero, follower, skills, equipment, pacts, talents)
// and the focused views (builds, character, configuration). React renders which one is open, and which tab is lit,
// from the "workspace" source.
export const workspaceViewSources = {
  workspace: () => ({ view: ui.activeWorkspaceView, focused: FOCUSED_VIEWS.has(ui.activeWorkspaceView) }),
};
export function activateWorkspaceView(viewName, { scroll = true, remember = true } = {}) {
  if (calculationsPaused) viewName = "builds";
  if (!loadBuildLibrary().builds.length) viewName = "builds";
  ui.activeWorkspaceView = viewName;
  viewSourceChanged("workspace");
  const focused = FOCUSED_VIEWS.has(viewName);
  if (focused) {
    if (viewName === "builds") updateStorageStatus();
    if (viewName === "character") renderCharacter();
    if (viewName === "configuration") renderConfiguration();
  } else {
    renderTalents();
    renderSkills();
    renderEquipment();
    renderPacts();
    renderSlates();
    window.scrollTo({ top: 0, behavior: scroll ? "smooth" : "auto" });
  }
  if (remember) saveWorkspaceLocation();
}
// A render pass's redraw: the open focused view, or the planner sections.
export function renderWorkspaceViews() {
  if (FOCUSED_VIEWS.has(ui.activeWorkspaceView)) {
    if (ui.activeWorkspaceView === "character") renderCharacter();
    if (ui.activeWorkspaceView === "configuration") renderConfiguration();
    if (ui.activeWorkspaceView === "builds") updateStorageStatus();
  } else {
    renderEquipment();
    renderSkills();
    renderSlates();
    renderTalents();
    renderPacts();
  }
}

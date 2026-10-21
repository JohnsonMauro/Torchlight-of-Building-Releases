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
import { calculationsPaused } from "./session.js";
import { saveWorkspaceLocation, ui } from "./ui-state.js";

const plannerSectionViews = new Set(["talents", "skills", "equipment", "pacts"]);
const focusedViews = new Set(["builds", "character", "configuration"]);
export function activateWorkspaceView(viewName, { scroll = true, remember = true } = {}) {
  if (calculationsPaused) viewName = "builds";
  if (!loadBuildLibrary().builds.length) viewName = "builds";
  ui.activeWorkspaceView = viewName;
  const focused = focusedViews.has(viewName);
  document.body.classList.toggle("unified-planner", !focused);
  document.body.classList.toggle("builds-workspace", viewName === "builds");
  document.body.classList.toggle("stats-workspace", viewName === "character");
  document.body.classList.toggle("config-workspace", viewName === "configuration");
  document.querySelectorAll(".app-view").forEach((view) => {
    const name = view.id.replace("-view", "");
    view.hidden = focused ? name !== viewName : !plannerSectionViews.has(name);
  });
  document
    .querySelectorAll(".view-tab")
    .forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
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
    if (scroll)
      requestAnimationFrame(() =>
        document.querySelector("#" + viewName + "-view")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    else window.scrollTo({ top: 0, behavior: "auto" });
  }
  if (remember) saveWorkspaceLocation();
}
// A render pass's redraw: the open focused view, or the planner sections.
export function renderWorkspaceViews() {
  if (focusedViews.has(ui.activeWorkspaceView)) {
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

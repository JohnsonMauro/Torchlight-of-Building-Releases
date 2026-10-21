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

// Every view shows its one section (#<view>-view). The build's sections are tabs in the build strip (data-build-tab:
// hero, follower, skills, equipment, pacts, talents); the rail's Build opens the first and stays lit on any of them.
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
    view.hidden = view.id !== `${viewName}-view`;
  });
  const railView = focused ? viewName : "hero";
  document.querySelectorAll(".view-tab").forEach((button) => {
    const tabView = button.hasAttribute("data-build-tab") ? viewName : railView;
    button.classList.toggle("active", button.dataset.view === tabView);
  });
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

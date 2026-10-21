import { providePlannerCommands } from "./bridge/planner-commands.js";
import { provideViewSource } from "./bridge/view-sources.ts";
import {
  backupLibraryBuilds,
  buildLibraryCommands,
  installBackupRestore,
  installBuildRenameEvents,
  installOtherTabSync,
  renderLibraryNotice,
} from "./builds/build-library-controller.js";
import { gameLogImportCommands, gameLogImportViewSources } from "./builds/game-log-import-controller.js";
import { configurationCommands, configurationViewSources } from "./configuration/configuration-controller.js";
import { feedbackViewSources, installFeedbackEvents } from "./feedback/feedback-controller.js";
import { writeHeroPanelTab } from "./follower-panel.js";
import { gearCommands, gearViewSources } from "./gear/gear-controller.js";
import { followerCommands, followerViewSources } from "./hero/follower-controller.js";
import { heroCommands, heroViewSources, renderHeroPanel } from "./hero/hero-controller.js";
import { heroMemoryCommands, heroMemoryViewSources } from "./hero/hero-memory-controller.js";
import { escapeHtml } from "./html.js";
import { pactCommands, pactViewSources } from "./pacts/pacts-controller.js";
import { $, activeBuildViewId, showToast, updateStorageStatus } from "./planner/page.js";
import { installRangeFills, scheduleRangeFillRefresh } from "./planner/range-fill.js";
import { installSearchableSelectEvents } from "./planner/searchable-select.js";
import {
  applyPlannerState,
  calculationsPaused,
  currentPlanner,
  flushPlannerState,
  markLoadedStateClean,
  plannerState,
  renderCandidateViews,
  runGuardedRender,
  setOpenViewsRenderer,
} from "./planner/session.js";
import { DAMAGE_PATH_KEY, readWorkspaceLocation, saveWorkspaceLocation, ui } from "./planner/ui-state.js";
import { activateWorkspaceView, renderWorkspaceViews } from "./planner/workspace.js";
import { skillBoardCommands, skillBoardViewSources } from "./skills/skill-board.js";
import { skillSelectorViewSources } from "./skills/skill-selector-source.js";
import { installSkillSelectorEvents, skillSelectorCommands } from "./skills/skill-selector.js";
import { slateCommands, slateViewSources } from "./slates/slates-controller.js";
import { statsCommands, statsViewSources } from "./stats/stats-controller.js";
import { loadPlannerState, startNewLibrary } from "./storage/build-library.ts";
import { setSafeMode } from "./storage/recovery-core.js";
import { prismCommands, prismViewSources } from "./talents/prism-controller.js";
import { renderTalents, setTalentSlateMode } from "./talents/talent-trees.js";
import { talentCommands, talentViewSources } from "./talents/talents-controller.js";
import { installPlannerTooltipEvents } from "./tooltips/planner-tooltips.js";
import { hidePlannerTooltip } from "./tooltips/tooltip-host.js";

const pageCommands = {
  showToast: (text) => showToast(escapeHtml(text)),
  hideTooltip: hidePlannerTooltip,
};
providePlannerCommands({
  ...buildLibraryCommands,
  ...configurationCommands,
  ...pactCommands,
  ...pageCommands,
  ...followerCommands,
  ...skillBoardCommands,
  ...skillSelectorCommands,
  ...slateCommands,
  ...gearCommands,
  ...talentCommands,
  ...prismCommands,
  ...gameLogImportCommands,
  ...heroCommands,
  ...heroMemoryCommands,
  ...statsCommands,
});
for (const sources of [
  followerViewSources,
  pactViewSources,
  slateViewSources,
  skillBoardViewSources,
  skillSelectorViewSources,
  gearViewSources,
  talentViewSources,
  prismViewSources,
  heroViewSources,
  heroMemoryViewSources,
  gameLogImportViewSources,
  feedbackViewSources,
  statsViewSources,
  configurationViewSources,
])
  for (const [name, read] of Object.entries(sources)) provideViewSource(name, read);
installSkillSelectorEvents();
setOpenViewsRenderer(renderWorkspaceViews);

// The first calculation runs here, where a build that cannot be calculated shows the recovery banner instead of stopping
// the planner from loading.
if (!calculationsPaused) runGuardedRender(currentPlanner);
installFeedbackEvents();
installPlannerTooltipEvents();
installSearchableSelectEvents();
installBuildRenameEvents();

document.addEventListener("click", (event) => {
  const heroPanelTab = event.target.closest("[data-hero-panel-tab]");
  if (heroPanelTab) {
    writeHeroPanelTab(activeBuildViewId(), heroPanelTab.dataset.heroPanelTab);
    hidePlannerTooltip();
    renderHeroPanel();
    return;
  }
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    if (viewButton.dataset.view === "slates") {
      activateWorkspaceView("talents");
      setTalentSlateMode(true);
      renderTalents();
      saveWorkspaceLocation();
    } else {
      if (viewButton.dataset.view === "talents") setTalentSlateMode(false);
      activateWorkspaceView(viewButton.dataset.view);
    }
  }
  // "Download backup" in the unreadable-library notice (renderLibraryNotice).
  if (event.target.closest("[data-backup-builds]")) backupLibraryBuilds();
  if (event.target.closest("[data-resume-calculations]")) {
    setSafeMode(sessionStorage, false);
    location.reload();
  }
  if (event.target.closest("[data-start-new-library]")) {
    try {
      startNewLibrary();
      applyPlannerState(loadPlannerState());
      renderCandidateViews();
      renderLibraryNotice();
      updateStorageStatus();
      showToast("New library started · Your unreadable data stays backed up");
    } catch (error) {
      showToast(error?.message || "A new library could not be started");
    }
  }
});
document.addEventListener("dragstart", (event) => {
  if (event.target.closest(".pact-tree-node.has-kismet")) event.preventDefault();
});

document.addEventListener("change", (event) => {
  if (event.target.checkValidity && !event.target.checkValidity()) {
    event.target.reportValidity();
    return;
  }
});

const restoredWorkspaceLocation = readWorkspaceLocation();
if (restoredWorkspaceLocation) {
  ui.activeStatsPanel = ["sheet", "damage-path"].includes(restoredWorkspaceLocation.statsPanel)
    ? restoredWorkspaceLocation.statsPanel
    : "sheet";
  ui.selectedDamagePath = DAMAGE_PATH_KEY.test(restoredWorkspaceLocation.damagePath || "")
    ? restoredWorkspaceLocation.damagePath
    : "hit";
  if (typeof restoredWorkspaceLocation.statSheetSkill === "string")
    ui.selectedStatSheetSkill = restoredWorkspaceLocation.statSheetSkill;
  const slot = plannerState.talents.selectedTrees.indexOf(restoredWorkspaceLocation.panel);
  if (slot >= 0) {
    ui.activeTalentSlot = slot;
    ui.activeTalentPanel = restoredWorkspaceLocation.panel;
  }
  ui.talentSlateMode = restoredWorkspaceLocation.view === "slates";
}
installRangeFills();
installBackupRestore();
renderLibraryNotice();
if (calculationsPaused)
  $("#builds-view").insertAdjacentHTML(
    "afterbegin",
    '<div class="notice safe-mode-banner" role="status"><strong>Safe mode: calculations paused</strong><button class="button" type="button" data-resume-calculations>Resume calculations</button></div>',
  );
renderCandidateViews();
scheduleRangeFillRefresh();
updateStorageStatus();
const restoredView = [
  "talents",
  "slates",
  "skills",
  "equipment",
  "pacts",
  "builds",
  "character",
  "configuration",
].includes(restoredWorkspaceLocation?.view)
  ? restoredWorkspaceLocation.view
  : "talents";
runGuardedRender(() =>
  activateWorkspaceView(restoredView === "slates" ? "talents" : restoredView, { scroll: false, remember: false }),
);
if (restoredView === "slates") ui.activeWorkspaceView = "talents";
if (restoredWorkspaceLocation && Number.isFinite(restoredWorkspaceLocation.scrollY))
  requestAnimationFrame(() => window.scrollTo(0, Math.max(0, restoredWorkspaceLocation.scrollY)));
window.addEventListener("pagehide", saveWorkspaceLocation);
window.addEventListener("pagehide", flushPlannerState);
window.addEventListener("beforeunload", flushPlannerState);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushPlannerState();
});
installOtherTabSync();
markLoadedStateClean();

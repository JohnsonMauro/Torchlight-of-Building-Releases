import { providePlannerCommands } from "./bridge/planner-commands.js";
import { providePlannerQueries } from "./bridge/planner-queries.js";
import { provideViewSource } from "./bridge/view-sources.ts";
import {
  buildLibraryCommands,
  buildLibraryViewSources,
  installOtherTabSync,
  renderLibraryNotice,
} from "./builds/build-library-controller.js";
import { gameLogImportCommands, gameLogImportViewSources } from "./builds/game-log-import-controller.js";
import { configurationCommands, configurationViewSources } from "./configuration/configuration-controller.js";
import { feedbackViewSources, installFeedbackEvents } from "./feedback/feedback-controller.js";
import { gearCommands, gearQueries, gearViewSources } from "./gear/gear-controller.js";
import { followerCommands, followerQueries, followerViewSources } from "./hero/follower-controller.js";
import { heroCommands, heroViewSources } from "./hero/hero-controller.js";
import { heroMemoryCommands, heroMemoryViewSources } from "./hero/hero-memory-controller.js";
import { heroTooltipQueries } from "./hero/hero-tooltip-queries.js";
import { pactCommands, pactQueries, pactViewSources } from "./pacts/pacts-controller.js";
import { pageViewSources, showToast, updateStorageStatus } from "./planner/page.js";
import { installRangeFills, scheduleRangeFillRefresh } from "./planner/range-fill.js";
import { installSearchableSelectEvents } from "./planner/searchable-select.js";
import {
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
import { activateWorkspaceView, workspaceViewSources, renderWorkspaceViews } from "./planner/workspace.js";
import { skillBoardCommands, skillBoardViewSources } from "./skills/skill-board.js";
import { skillSelectorViewSources } from "./skills/skill-selector-source.js";
import { skillTooltipQueries } from "./skills/skill-tooltip-queries.js";
import { installSkillSelectorEvents, skillSelectorCommands } from "./skills/skill-selector.js";
import { slateCommands, slateQueries, slateViewSources } from "./slates/slates-controller.js";
import { damageSourceQueries } from "./stats/damage-source-tooltip.js";
import { statsCommands, statsViewSources } from "./stats/stats-controller.js";
import { prismCommands, prismViewSources } from "./talents/prism-controller.js";
import { renderTalents, setTalentSlateMode } from "./talents/talent-trees.js";
import { talentCommands, talentQueries, talentViewSources } from "./talents/talents-controller.js";

const pageCommands = {
  showToast,
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
providePlannerQueries({
  ...gearQueries,
  ...talentQueries,
  ...pactQueries,
  ...slateQueries,
  ...heroTooltipQueries,
  ...followerQueries,
  ...skillTooltipQueries,
  ...damageSourceQueries,
});
for (const sources of [
  pageViewSources,
  buildLibraryViewSources,
  workspaceViewSources,
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
installSearchableSelectEvents();

document.addEventListener("click", (event) => {
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
renderLibraryNotice();
renderCandidateViews();
scheduleRangeFillRefresh();
updateStorageStatus();
const restoredView = [
  "hero",
  "follower",
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
  : "hero";
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

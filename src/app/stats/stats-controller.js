// The Stats view: its prepared stat sheet and damage path, open questions and the calculation report.
import { calculatePlanner } from "../../engine/planner.js";
import { APP_VERSION } from "../app-version.js";
import { EMPTY_DAMAGE_SUMMARY, damageSummaryView } from "../bridge/damage-summary-view-model.ts";
import { prepareDamagePath } from "../bridge/damage-path-view-model.ts";
import { prepareStatSheet, statsView } from "../bridge/stats-view-model.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { currentBuildCode, openFeedback } from "../feedback/feedback-controller.js";
import { platformName } from "../feedback/feedback-links.js";
import { calculationReportContext } from "../feedback/feedback-report-context.js";
import { format, showToast } from "../planner/page.js";
import {
  calculationsPaused,
  capturePlannerState,
  currentPlanner,
  persistPlannerState,
  plannerState,
} from "../planner/session.js";
import { DAMAGE_PATH_KEY, saveWorkspaceLocation, ui } from "../planner/ui-state.js";
import { recountExcludedSources, setRecountSourceExcluded } from "./dummy-recount-panel.js";
import { OPEN_QUESTIONS, openQuestionsFor, openQuestionsText } from "./open-questions.js";

export const statsCommands = {
  // Stats view (apps/web/src/features/stats).
  setStatsPanel: (panel) => {
    ui.activeStatsPanel = panel;
    saveWorkspaceLocation();
    viewSourceChanged("stats");
  },
  selectStatSheetSkill: (key) => {
    ui.selectedStatSheetSkill = key;
    saveWorkspaceLocation();
    renderCharacter();
  },
  reportCalculation,
  toggleRecountSource: (key) => {
    setRecountSourceExcluded(key);
    viewSourceChanged("stats");
    renderDamageSummary();
  },
  showAllRecountSources: () => {
    setRecountSourceExcluded(null);
    viewSourceChanged("stats");
    renderDamageSummary();
  },
  selectDamagePath: (key) => {
    ui.selectedDamagePath = DAMAGE_PATH_KEY.test(key) ? key : "hit";
    saveWorkspaceLocation();
    viewSourceChanged("stats");
  },
  copyOpenQuestions,
  submitOpenQuestion,
};
export const statsViewSources = {
  // The Stats view's data (src/app/bridge/stats-view-model.ts).
  stats: statsSource,
  // The character column's damage summary (src/app/bridge/damage-summary-view-model.ts).
  damageSummary: () =>
    calculationsPaused ? EMPTY_DAMAGE_SUMMARY : damageSummaryView(currentPlanner(), recountExcludedSources()),
};

// The damage summary sits beside every build tab: every render pass re-reads it (the build is already calculated).
export function renderDamageSummary() {
  viewSourceChanged("damageSummary");
}

// The Stats view is React (apps/web/src/features/stats): it re-reads its source.
export function renderCharacter() {
  viewSourceChanged("stats");
}
// The Stats view's data (src/app/bridge/stats-view-model.ts). The stat sheet is prepared once per calculated build and
// picked skill, the damage path once per calculated build (from a second calculation at 30% target Fire Resistance):
// switching panels or paths, or leaving a recount source out of the view, prepares neither again.
let preparedStatSheet = null,
  preparedDamagePath = null;
function statsSource() {
  const planner = currentPlanner();
  if (preparedStatSheet?.planner !== planner || preparedStatSheet.skill !== ui.selectedStatSheetSkill)
    preparedStatSheet = {
      planner,
      skill: ui.selectedStatSheetSkill,
      sheet: prepareStatSheet(planner, ui.selectedStatSheetSkill, format),
    };
  if (preparedDamagePath?.planner !== planner) {
    const theoretical = calculatePlanner({
      ...capturePlannerState(),
      combat: { ...plannerState.combat, targetFireResistancePercent: 30 },
    }).theoretical;
    preparedDamagePath = { planner, path: prepareDamagePath(theoretical, planner, format) };
  }
  return statsView(
    { sheet: preparedStatSheet.sheet, damagePath: preparedDamagePath.path },
    { panel: ui.activeStatsPanel, path: ui.selectedDamagePath, excluded: recountExcludedSources() },
  );
}
// Open questions "Copy questions": plain text of the build's applicable questions; false when the clipboard refused it.
async function copyOpenQuestions() {
  const planner = currentPlanner();
  const text = openQuestionsText(openQuestionsFor(planner, planner?.state));
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    showToast("Clipboard access was unavailable");
    return false;
  }
}
// "Submit an answer" on an open question: the answer dialog for it, pre-filled.
function submitOpenQuestion(id) {
  const entry = OPEN_QUESTIONS.find((item) => item.id === id);
  if (!entry) return;
  persistPlannerState();
  openFeedback("answer", {
    entry,
    version: APP_VERSION,
    platform: platformName(window),
    buildCode: currentBuildCode(),
  });
}
function reportCalculation() {
  persistPlannerState();
  const context = calculationReportContext(currentPlanner(), ui.selectedStatSheetSkill);
  openFeedback("calculation", {
    ...context,
    version: APP_VERSION,
    platform: platformName(window),
    buildCode: currentBuildCode(),
  });
}

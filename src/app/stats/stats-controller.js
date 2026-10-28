// The Stats view: its prepared stat sheet and damage path, and its open questions.
import { EMPTY_DAMAGE_SUMMARY, damageSummaryView } from "../bridge/damage-summary-view-model.ts";
import { compositionView } from "../bridge/composition-view-model.ts";
import { prepareDamagePath } from "../bridge/damage-path-view-model.ts";
import { prepareStatSheet, statsView } from "../bridge/stats-view-model.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { format, showToast } from "../planner/page.js";
import { calculationsPaused, currentPlanner } from "../planner/session.js";
import { DAMAGE_PATH_KEY, saveWorkspaceLocation, ui } from "../planner/ui-state.js";
import { recountExcludedSources, setRecountSourceExcluded } from "./dummy-recount-panel.js";
import { openQuestionsFor, openQuestionsText } from "./open-questions.js";

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
};
export const statsViewSources = {
  // The Stats view's data (src/app/bridge/stats-view-model.ts).
  stats: statsSource,
  // The character column's damage summary (src/app/bridge/damage-summary-view-model.ts).
  damageSummary: () =>
    calculationsPaused ? EMPTY_DAMAGE_SUMMARY : damageSummaryView(currentPlanner(), recountExcludedSources()),
  // Its Composition dialog (src/app/bridge/composition-view-model.ts).
  composition: () => {
    if (calculationsPaused) return compositionView({ blessings: [] });
    const planner = currentPlanner();
    return compositionView({
      blessings: planner.blessings?.entries ?? [],
      maxSpellBurst: planner.maxSpellBurst,
      barrierBurst: planner.barrierBurst,
    });
  },
};

// The damage summary sits beside every build tab: every render pass re-reads it (the build is already calculated).
export function renderDamageSummary() {
  viewSourceChanged("damageSummary");
  viewSourceChanged("composition");
}

// The Stats view is React (apps/web/src/features/stats): it re-reads its source.
export function renderCharacter() {
  viewSourceChanged("stats");
}
// The Stats view's data (src/app/bridge/stats-view-model.ts). The stat sheet is prepared once per calculated build and
// picked skill, the damage path once per calculated build: switching panels or paths, or leaving a recount source out of
// the view, prepares neither again.
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
  if (preparedDamagePath?.planner !== planner)
    preparedDamagePath = { planner, path: prepareDamagePath(planner, format) };
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

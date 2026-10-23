// The build library around the open build: open, rename, reset, export / import, backups and other tabs' changes.
import { encodePlannerState, expandBuildCode } from "../../engine/index.ts";
import { resolveBuildRename } from "./build-tab-rename.js";
import { closeDialog } from "../bridge/dialogs.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { hideOtherTabNotice, showOtherTabNotice, showToast, updateStorageStatus } from "../planner/page.js";
import {
  applyPlannerState,
  calculationFailureMessage,
  calculationsPaused,
  cancelQueuedRender,
  capturePlannerState,
  emptyPlannerState,
  openSafeMode,
  persistPlannerState,
  plannerState,
  renderCandidateViews,
  undoLastChange,
} from "../planner/session.js";
import { ui } from "../planner/ui-state.js";
import { activateWorkspaceView } from "../planner/workspace.js";
import {
  createBuild,
  deleteAllBuilds,
  deleteBuild,
  dismissOpenBuildChange,
  duplicateActiveBuild,
  importBuildCode,
  libraryLoadIssues,
  loadBuildLibrary,
  loadPlannerState,
  plannerLibraryStorageKey,
  reconcileExternalLibraryChange,
  restoreBuildsFromBackup,
  setActiveBuild,
  startNewLibrary,
  storeLibraryIfMissing,
  updateActiveBuildMetadata,
} from "../storage/build-library.ts";
import { downloadBackup, setSafeMode } from "../storage/recovery-core.js";

// The build strip's rename (apps/web/src/features/builds/ActiveBuildTab.tsx): a blank or unchanged name keeps the old one.
function renameBuild(text) {
  const library = loadBuildLibrary(),
    active = library.builds.find((build) => build.id === library.activeBuildId);
  const name = active ? resolveBuildRename(text, active.name) : null;
  if (name) {
    updateActiveBuildMetadata({ name });
    showToast("Build renamed");
  }
  updateStorageStatus();
}

// Build library commands (src/app/bridge/planner-commands.js). The Builds view (apps/web/src/features/builds) renders the library
// itself; these keep the planner's own state in step: save the open build, change the library, reload, re-render.
function openLibraryBuild(id, view) {
  persistPlannerState();
  setActiveBuild(id);
  applyPlannerState(loadPlannerState());
  renderCandidateViews();
  activateWorkspaceView(view, { scroll: false });
}
export function backupLibraryBuilds() {
  persistPlannerState();
  try {
    storeLibraryIfMissing();
    showToast(`Backup downloaded · ${downloadBackup()}`);
  } catch {
    showToast("The backup could not be created");
  }
}
export const buildLibraryCommands = {
  // The build's page showing is the answer: no toast.
  editBuild: (id) => openLibraryBuild(id, ui.lastBuildView),
  newBuild: () => {
    createBuild({ name: "New build", state: emptyPlannerState() });
    applyPlannerState(loadPlannerState());
    renderCandidateViews();
    activateWorkspaceView("hero", { scroll: false });
    showToast("New build ready · Rename it in Build Library");
  },
  duplicateActiveBuild: () => {
    persistPlannerState();
    duplicateActiveBuild();
    applyPlannerState(loadPlannerState());
    renderCandidateViews();
    showToast("Build duplicated — safe to experiment");
  },
  saveBuildDetails: ({ name, notes }) => {
    updateActiveBuildMetadata({ name, notes });
    updateStorageStatus();
    showToast("Build details saved");
  },
  deleteBuild: (id) => {
    deleteBuild(id);
    applyPlannerState(loadPlannerState());
    renderCandidateViews();
    activateWorkspaceView("builds", { scroll: false });
    showToast("Build deleted");
  },
  deleteAllBuilds: () => {
    deleteAllBuilds();
    applyPlannerState(loadPlannerState());
    renderCandidateViews();
    activateWorkspaceView("builds", { scroll: false });
    showToast("All builds deleted");
  },
  backupBuilds: backupLibraryBuilds,
  restoreBackup,
  // Header build actions (apps/web/src/shell/SiteHeader.tsx and its dialogs).
  resetBuild,
  exportBuild,
  importBuild,
  renameBuild,
  // The page's notices (apps/web/src/shell/PageNotices.tsx, OtherTabNotice.tsx).
  reloadOtherTabBuild,
  dismissOtherTabChange,
  startNewLibrary: startNewBuildLibrary,
  undoLastChange,
  openSafeMode,
  resumeCalculations,
};

// The header's Reset Build (confirmed in apps/web/src/features/builds/ResetBuildConfirmDialog.tsx): the open build empties.
function resetBuild() {
  const empty = emptyPlannerState();
  applyPlannerState(empty);
  persistPlannerState();
  renderCandidateViews();
  showToast("Build reset to empty");
}
// The header's Export: the open build's code to the clipboard.
async function exportBuild() {
  persistPlannerState();
  try {
    await navigator.clipboard.writeText(encodePlannerState(plannerState));
    showToast("Build code copied to clipboard");
  } catch {
    showToast("Clipboard access was unavailable");
  }
}
// Import accepts the Export code and the compact "TLB3:" and "TLB2:" codes (src/engine/state/build-code-compact.js), which expand to the former.
async function importBuildText(text) {
  const code = await expandBuildCode(text);
  persistPlannerState();
  const imported = importBuildCode(code);
  applyPlannerState(loadPlannerState());
  renderCandidateViews();
  closeDialog("import-build-dialog");
  activateWorkspaceView("builds", { scroll: false });
  showToast(`${imported.name} imported and active`);
}
// The Import dialog's Import Code (apps/web/src/features/builds/ImportBuildDialog.tsx).
function importBuild(text) {
  importBuildText(text).catch(() => showToast("That build code could not be read"));
}
function restoreSummaryText({ added, renamed, unchanged, skipped, saved }) {
  const parts = [`Restored ${added} build${added === 1 ? "" : "s"}`];
  if (renamed) parts.push(`${renamed} renamed (same id already in library)`);
  if (unchanged) parts.push(`${unchanged} already in library`);
  if (skipped) parts.push(`${skipped} skipped (invalid)`);
  if (added && !saved) parts.push("not saved: browser storage is full");
  return parts.join(" · ");
}
// Restore from backup: the text of the file picked in the Builds view (apps/web/src/features/builds/backup-file.ts).
function restoreBackup(text) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    showToast("That file is not a valid backup (not JSON)");
    return;
  }
  try {
    persistPlannerState();
    const summary = restoreBuildsFromBackup(backup);
    updateStorageStatus();
    showToast(restoreSummaryText(summary));
  } catch (error) {
    showToast(error?.message || "That backup could not be restored");
  }
}
// The notices over the page: stored data that could not be loaded (kept unchanged, build-library.ts; a backup is
// offered), a build that could not be calculated (src/app/planner/session.js), and safe mode.
export const buildLibraryViewSources = {
  pageNotices: () => ({
    library: libraryNotice(),
    calculationFailure: calculationFailureMessage(),
    calculationsPaused,
  }),
};
function libraryNotice() {
  let issues;
  try {
    issues = libraryLoadIssues();
  } catch {
    return null;
  }
  if (issues.unreadable) return { unreadable: true, names: [] };
  if (issues.quarantinedBuilds.length)
    return { unreadable: false, names: issues.quarantinedBuilds.map((entry) => entry.name) };
  return null;
}
export function renderLibraryNotice() {
  viewSourceChanged("pageNotices");
}
function startNewBuildLibrary() {
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
function resumeCalculations() {
  setSafeMode(sessionStorage, false);
  location.reload();
}
// Another tab changed the shared build library. Policy (build-library.ts,
// reconcileExternalLibraryChange): this tab keeps its own build and its own
// in-memory state; only the Build Library list and names refresh. When another
// tab saved a different version of the build open here, a notice offers to
// reload it (never automatic); otherwise this tab's next edit wins. A build
// deleted elsewhere is not recreated: this tab moves to another build.
// A hidden tab keeps its state in sync (cheap) but recalculates and redraws only
// when it becomes visible again, so a save in one tab does not run the
// calculator in every background tab.
let deferredExternalChange = null;
function showExternalChange(change) {
  if (change.recalculate) renderCandidateViews();
  if (change.deleted && !loadBuildLibrary().builds.length) activateWorkspaceView("builds", { scroll: false });
  else if (!change.recalculate && ui.activeWorkspaceView === "builds") updateStorageStatus();
  if (change.message) showToast(change.message);
}
// The other-tab notice's actions: take the other tab's version, or keep this one (until that build changes again).
function reloadOtherTabBuild() {
  hideOtherTabNotice();
  applyPlannerState(loadPlannerState());
  cancelQueuedRender();
  renderCandidateViews();
  updateStorageStatus();
  showToast("Build reloaded");
}
function dismissOtherTabChange() {
  dismissOpenBuildChange();
  hideOtherTabNotice();
}
// Other tabs' library changes (see showExternalChange above).
export function installOtherTabSync() {
  window.addEventListener("storage", (event) => {
    if (event.key !== null && event.key !== plannerLibraryStorageKey) return;
    const result = reconcileExternalLibraryChange(capturePlannerState());
    const hidden = document.visibilityState === "hidden";
    if (result.kind === "deleted") {
      hideOtherTabNotice();
      applyPlannerState(result.state);
      renderLibraryNotice();
      const change = { recalculate: true, deleted: true, message: "The open build was deleted in another tab" };
      // applyPlannerState queued a render; a hidden tab skips it until it is shown.
      if (hidden) {
        cancelQueuedRender();
        deferredExternalChange = change;
        return;
      }
      deferredExternalChange = null;
      showExternalChange(change);
      return;
    }
    // "dismissed": the user already closed the notice for this version.
    if (result.kind === "changed") showOtherTabNotice();
    else if (result.kind === "none") hideOtherTabNotice();
    updateStorageStatus();
    renderLibraryNotice();
    if (hidden) {
      if (!deferredExternalChange) deferredExternalChange = { recalculate: false, deleted: false, message: "" };
      return;
    }
    if (ui.activeWorkspaceView === "builds") updateStorageStatus();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !deferredExternalChange) return;
    const change = deferredExternalChange;
    deferredExternalChange = null;
    showExternalChange(change);
  });
}

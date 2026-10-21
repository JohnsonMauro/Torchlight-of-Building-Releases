// The build library around the open build: open, rename, reset, export / import, backups and other tabs' changes.
import { expandBuildCode } from "../../engine/state/build-code-compact.js";
import { encodePlannerState } from "../../engine/state/planner-state.ts";
import { isRenameKey, resolveBuildRename } from "../build-tab-rename.js";
import { escapeHtml } from "../html.js";
import { $, hideOtherTabNotice, showToast, updateStorageStatus } from "../planner/page.js";
import {
  applyPlannerState,
  cancelQueuedRender,
  capturePlannerState,
  emptyPlannerState,
  persistPlannerState,
  plannerState,
  renderCandidateViews,
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
  updateActiveBuildMetadata,
} from "../storage/build-library.ts";
import { downloadBackup } from "../storage/recovery-core.js";

function startActiveBuildRename(tab) {
  if (!tab || tab.classList.contains("renaming")) return;
  const library = loadBuildLibrary(),
    active = library.builds.find((build) => build.id === library.activeBuildId);
  if (!active) return;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "loadout-tab-rename";
  input.value = active.name;
  input.setAttribute("aria-label", "Build name");
  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    const name = save ? resolveBuildRename(input.value, active.name) : null;
    tab.classList.remove("renaming");
    input.remove();
    if (name) {
      updateActiveBuildMetadata({ name });
      updateStorageStatus();
      showToast("Build renamed");
    } else updateStorageStatus();
    tab.focus({ preventScroll: true });
  };
  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  });
  input.addEventListener("blur", () => finish(true));
  input.addEventListener("contextmenu", (event) => event.stopPropagation());
  tab.classList.add("renaming");
  tab.querySelector("strong").after(input);
  input.focus();
  input.select();
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
    showToast(`Backup downloaded · ${downloadBackup()}`);
  } catch {
    showToast("The backup could not be created");
  }
}
export const buildLibraryCommands = {
  openBuild: (id) => {
    openLibraryBuild(id, "builds");
    showToast("Build selected");
  },
  editBuild: (id) => {
    openLibraryBuild(id, "talents");
    showToast("Build opened for editing");
  },
  newBuild: () => {
    createBuild({ name: "New build", state: emptyPlannerState() });
    applyPlannerState(loadPlannerState());
    renderCandidateViews();
    activateWorkspaceView("talents", { scroll: false });
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
  restoreBuilds: () => $("#restore-builds-file").click(),
  // Header build actions (apps/web/src/shell/SiteHeader.tsx and its dialogs).
  resetBuild,
  exportBuild,
  importBuild,
};

// The header's Reset Build (confirmed in apps/web/src/shell/dialogs/ResetBuildConfirmDialog.tsx): the open build empties.
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
  $("#import-build-dialog").close();
  activateWorkspaceView("builds", { scroll: false });
  showToast(`${escapeHtml(imported.name)} imported and active`);
}
// The Import dialog's Import Code (apps/web/src/shell/dialogs/ImportBuildDialog.tsx).
function importBuild(text) {
  importBuildText(text).catch(() => showToast("That build code could not be read"));
}
// The header's build tab: a right-click or the rename key renames the open build.
export function installBuildRenameEvents() {
  document.querySelector(".loadout-tab")?.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".loadout-tab-rename")) return;
    event.preventDefault();
    startActiveBuildRename(event.currentTarget);
  });
  document.querySelector(".loadout-tab")?.addEventListener("keydown", (event) => {
    if (event.target !== event.currentTarget || !isRenameKey(event)) return;
    event.preventDefault();
    startActiveBuildRename(event.currentTarget);
  });
}
function restoreSummaryText({ added, renamed, unchanged, skipped, saved }) {
  const parts = [`Restored ${added} build${added === 1 ? "" : "s"}`];
  if (renamed) parts.push(`${renamed} renamed (same id already in library)`);
  if (unchanged) parts.push(`${unchanged} already in library`);
  if (skipped) parts.push(`${skipped} skipped (invalid)`);
  if (added && !saved) parts.push("not saved: browser storage is full");
  return parts.join(" · ");
}
// Restore builds: the backup file picked through the hidden file input.
export function installBackupRestore() {
  $("#restore-builds-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    let backup;
    try {
      backup = JSON.parse(await file.text());
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
  });
}
// Stored data that could not be loaded is kept unchanged (build-library.ts); say so and offer a backup.
export function renderLibraryNotice() {
  document.querySelector(".library-notice")?.remove();
  let issues;
  try {
    issues = libraryLoadIssues();
  } catch {
    return;
  }
  const backupButton =
    '<button class="button button-secondary" type="button" data-backup-builds>Download backup</button>';
  let html = "";
  if (issues.unreadable)
    html = `<span>Your saved builds couldn't be read. They are kept unchanged in this browser, and nothing is saved until you choose.</span><span class="library-notice-actions">${backupButton}<button class="button" type="button" data-start-new-library>Start a new library (your unreadable data stays backed up)</button></span>`;
  else if (issues.quarantinedBuilds.length) {
    const count = issues.quarantinedBuilds.length;
    html = `<span>${count} build${count === 1 ? "" : "s"} couldn't be loaded and ${count === 1 ? "is" : "are"} kept unchanged: ${issues.quarantinedBuilds.map((entry) => escapeHtml(entry.name)).join(", ")}.</span><span class="library-notice-actions">${backupButton}</span>`;
  }
  if (html)
    document
      .querySelector("main")
      ?.insertAdjacentHTML("afterbegin", `<div class="notice library-notice" role="status">${html}</div>`);
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
// Same look as the toast, but it stays (with a Reload action) until used or dismissed.
function showOtherTabNotice() {
  if (document.getElementById("other-tab-notice")) return;
  document.body.insertAdjacentHTML(
    "beforeend",
    '<div id="other-tab-notice" class="toast toast-action visible" role="status" aria-live="polite"><span>This build was changed in another tab · </span><button type="button" data-reload-other-tab>Reload it</button><button type="button" class="toast-dismiss" data-dismiss-other-tab aria-label="Dismiss">×</button></div>',
  );
  const notice = document.getElementById("other-tab-notice");
  notice.querySelector("[data-reload-other-tab]").addEventListener("click", () => {
    hideOtherTabNotice();
    applyPlannerState(loadPlannerState());
    cancelQueuedRender();
    renderCandidateViews();
    updateStorageStatus();
    showToast("Build reloaded");
  });
  notice.querySelector("[data-dismiss-other-tab]").addEventListener("click", () => {
    dismissOpenBuildChange();
    hideOtherTabNotice();
  });
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

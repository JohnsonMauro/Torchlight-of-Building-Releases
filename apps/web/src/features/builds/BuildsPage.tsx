import { useState } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { openDialog } from "../../ui/dialog-registry";
import { activeBuild, useBuildLibrary, type LibraryBuild } from "./build-library";
import { BuildDetails } from "./BuildDetails";
import { BuildList } from "./BuildList";
import { newBuildWithHero } from "./build-actions";
import { pickBackupFile } from "./backup-file";

/** The small accent caps over a heading. */
const EYEBROW = "mb-1.5 text-xs font-bold tracking-widest text-accent uppercase";

/** The two cards (library, details). */
const PANEL = "panel overflow-hidden p-5 max-[520px]:p-4";

const PANEL_HEADING =
  "mb-4 flex min-h-16 items-center justify-between border-b border-line px-4 py-3 max-[600px]:items-start max-[600px]:gap-2.5";

const PANEL_TITLE = "mt-0.5 font-display text-lg/[normal] font-bold text-text";

/** The library's toolbar buttons, after `btn` or `btn-danger`. */
const LIBRARY_BUTTON = "min-h-9 px-3 text-xs font-bold tracking-wide uppercase";

/**
 * The Workspace (the Builds view, the planner's home page): the saved-build library (a card opens its build), the open
 * build's details, new and imported builds, and the delete confirmations.
 */
export function BuildsPage() {
  const library = useBuildLibrary();
  const active = activeBuild(library);
  const [pendingDelete, setPendingDelete] = useState<LibraryBuild | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  return (
    <>
      <div className="flex items-end justify-between gap-5 px-0.5 pt-1 pb-4 max-[600px]:flex-col max-[600px]:items-stretch">
        <div>
          <p className={EYEBROW}>Your workspace</p>
          <h1 className="mt-0.5 mb-1 font-display text-3xl/tight font-bold tracking-tight text-text">Builds</h1>
          <p className="text-sm text-muted">Open a build, start a new one or import one.</p>
        </div>
        <div className="flex items-center gap-4 max-[600px]:justify-between">
          <span className="grid min-w-18 justify-items-center border-r border-line pr-4">
            <strong id="build-count" className="text-2xl leading-none font-bold text-accent">
              {library.builds.length}
            </strong>
            <small className="mt-1 text-[10px] tracking-wider text-muted uppercase">builds</small>
          </span>
          <div className="workspace-actions flex flex-wrap gap-2">
            <button
              id="import-game-log"
              className="btn h-10 px-4 text-xs font-bold"
              type="button"
              title="Import a build from the game log"
              onClick={() => plannerCommands().openGameLogImport()}
            >
              Import from game
            </button>
            <button
              id="import-build"
              className="btn h-10 px-4 text-xs font-bold"
              type="button"
              title="Import a build code"
              onClick={() => openDialog("import-build-dialog")}
            >
              Import
            </button>
            <button className="btn-primary h-10 px-5 text-xs font-bold" type="button" onClick={newBuildWithHero}>
              New Build
            </button>
          </div>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] items-start gap-3 max-[900px]:grid-cols-1">
        <section className={`build-collection ${PANEL}`}>
          <div className={PANEL_HEADING}>
            <div>
              <p className={EYEBROW}>Library</p>
              <h2 className={PANEL_TITLE}>Your builds</h2>
            </div>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <button
                className={`btn ${LIBRARY_BUTTON}`}
                type="button"
                data-duplicate-build=""
                disabled={!active}
                onClick={() => plannerCommands().duplicateActiveBuild()}
              >
                Duplicate current
              </button>
              <button
                className={`btn ${LIBRARY_BUTTON}`}
                type="button"
                onClick={() => plannerCommands().backupBuilds()}
              >
                Back up all builds
              </button>
              <button className={`btn ${LIBRARY_BUTTON}`} type="button" onClick={pickBackupFile}>
                Restore from backup
              </button>
              <button
                className={`btn-danger ${LIBRARY_BUTTON}`}
                type="button"
                data-delete-all-builds=""
                disabled={!library.builds.length}
                onClick={() => setConfirmDeleteAll(true)}
              >
                Delete all builds
              </button>
            </div>
          </div>
          <BuildList library={library} onDelete={setPendingDelete} />
        </section>
        <aside className={`build-details-panel ${PANEL}`}>
          <div className={PANEL_HEADING}>
            <div>
              <p className={EYEBROW}>Current build</p>
              <h2 className={PANEL_TITLE}>Details</h2>
            </div>
          </div>
          <BuildDetails build={active} />
        </aside>
      </div>
      <ConfirmDialog
        id="delete-build-confirm"
        titleId="delete-build-title"
        messageId="delete-build-message"
        open={pendingDelete !== null}
        title="Delete this build?"
        message={
          pendingDelete
            ? `This will permanently delete “${pendingDelete.name}” and its autosaves from this browser. This cannot be undone.`
            : ""
        }
        cancelLabel="Keep Build"
        confirmLabel="Delete Build"
        confirmProps={{ "data-confirm-delete-build": "" }}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const build = pendingDelete;
          setPendingDelete(null);
          if (build) plannerCommands().deleteBuild(build.id);
        }}
      />
      <ConfirmDialog
        id="delete-all-builds-confirm"
        titleId="delete-all-builds-title"
        messageId="delete-all-builds-message"
        open={confirmDeleteAll}
        title="Delete all builds?"
        message="This will permanently delete every saved build and its autosaves from this browser. This cannot be undone."
        cancelLabel="Keep Builds"
        confirmLabel="Delete All Builds"
        confirmProps={{ "data-confirm-delete-all-builds": "" }}
        onCancel={() => setConfirmDeleteAll(false)}
        onConfirm={() => {
          setConfirmDeleteAll(false);
          plannerCommands().deleteAllBuilds();
        }}
      />
    </>
  );
}

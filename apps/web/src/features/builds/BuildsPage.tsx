import { useState } from "react";
import { plannerCommands } from "@legacy/planner-commands.js";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { activeBuild, useBuildLibrary, type LibraryBuild } from "./build-library";
import { BuildDetails } from "./BuildDetails";
import { BuildList } from "./BuildList";

/** The Builds view ("Notes" tab): the saved-build library, the open build's details, and the delete confirmations. */
export function BuildsPage() {
  const library = useBuildLibrary();
  const active = activeBuild(library);
  const [pendingDelete, setPendingDelete] = useState<LibraryBuild | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  return (
    <>
      <div className="builds-page-header">
        <div>
          <p className="eyebrow">Your workspace</p>
          <h1>Builds</h1>
          <p>Open a build or edit its details.</p>
        </div>
        <div className="builds-page-header-actions">
          <span className="builds-count">
            <strong id="build-count">{library.builds.length}</strong>
            <small>builds</small>
          </span>
          <button className="button" type="button" onClick={() => plannerCommands().newBuild()}>
            New Build
          </button>
        </div>
      </div>
      <div className="build-library-layout">
        <section className="panel build-collection">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Library</p>
              <h2>Your builds</h2>
            </div>
            <div className="build-actions">
              <button
                className="button button-secondary"
                type="button"
                data-duplicate-build=""
                disabled={!active}
                onClick={() => plannerCommands().duplicateActiveBuild()}
              >
                Duplicate current
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => plannerCommands().backupBuilds()}
              >
                Back up all builds
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => plannerCommands().restoreBuilds()}
              >
                Restore from backup
              </button>
              <button
                className="button build-delete-all"
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
        <aside className="panel build-details-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Current build</p>
              <h2>Details</h2>
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

import { useState } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { activeBuild, useBuildLibrary, type LibraryBuild } from "./build-library";
import { BuildDetails } from "./BuildDetails";
import { BuildList } from "./BuildList";

/** The small gold caps over a heading. */
const EYEBROW = "mb-1.75 text-[0.72rem] font-extrabold tracking-[0.17em] text-gold uppercase";

/** The two cards (library, details): chamfered slate panel with a short silver hairline on the top-left edge. */
const PANEL =
  "relative overflow-hidden rounded-[5px] border border-[#3d4854] bg-[linear-gradient(145deg,#19212b,#111820)] p-5.5 clip-chamfer-9 before:absolute before:top-0 before:left-0 before:h-px before:w-13.5 before:bg-[#bdcee0] before:opacity-65 max-[520px]:p-4";

const PANEL_HEADING =
  "mb-4.5 flex min-h-16 items-center justify-between border-b border-[#78603d] px-4 py-3 max-[600px]:items-start max-[600px]:gap-2.5";

const PANEL_TITLE = "mt-0.5 font-display text-lg/[normal] font-bold tracking-[0.015em] text-[#f0e5ce]";

/** The library's toolbar buttons; each adds its border, background and text colors. */
const LIBRARY_BUTTON =
  "min-h-9 cursor-pointer rounded-[3px] border px-3.25 py-2 text-[11px] font-extrabold tracking-[0.04em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold off:cursor-not-allowed off:opacity-45";

/** The Builds view ("Notes" tab): the saved-build library, the open build's details, and the delete confirmations. */
export function BuildsPage() {
  const library = useBuildLibrary();
  const active = activeBuild(library);
  const [pendingDelete, setPendingDelete] = useState<LibraryBuild | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  return (
    <>
      <div className="flex items-end justify-between gap-5.5 px-0.5 pt-1.25 pb-4.5 max-[600px]:flex-col max-[600px]:items-stretch">
        <div>
          <p className={EYEBROW}>Your workspace</p>
          <h1 className="mt-0.5 mb-1.25 font-display text-[clamp(27px,2.4vw,38px)]/[1.1] font-bold tracking-[-0.02em] text-[#f3e8cb]">
            Builds
          </h1>
          <p className="text-[13px] text-[#aeb9c6]">Open a build or edit its details.</p>
        </div>
        <div className="flex items-center gap-4.5 max-[600px]:justify-between">
          <span className="grid min-w-18 justify-items-center border-r border-[#665036] pr-4.5">
            <strong id="build-count" className="text-[25px] leading-none font-bold text-gold">
              {library.builds.length}
            </strong>
            <small className="mt-1.25 text-[10px] tracking-[0.09em] text-[#9eabb9] uppercase">builds</small>
          </span>
          <button
            className="btn-gold min-h-10.5 px-5 text-[0.68rem]"
            type="button"
            onClick={() => plannerCommands().newBuild()}
          >
            New Build
          </button>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] items-start gap-3 max-[900px]:grid-cols-1">
        <section className={`build-collection ${PANEL}`}>
          <div className={PANEL_HEADING}>
            <div>
              <p className={EYEBROW}>Library</p>
              <h2 className={PANEL_TITLE}>Your builds</h2>
            </div>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-[0.55rem]">
              <button
                className={`${LIBRARY_BUTTON} border-bronze bg-[linear-gradient(#3c3224,#202025)] text-gold hover:border-[#e7b35d] hover:bg-[linear-gradient(#604525,#3c2f20_52%,#222329)] hover:text-[#fff1bd]`}
                type="button"
                data-duplicate-build=""
                disabled={!active}
                onClick={() => plannerCommands().duplicateActiveBuild()}
              >
                Duplicate current
              </button>
              <button
                className={`${LIBRARY_BUTTON} border-[#3a4352] bg-[#151a23] text-[#d8dde3]`}
                type="button"
                onClick={() => plannerCommands().backupBuilds()}
              >
                Back up all builds
              </button>
              <button
                className={`${LIBRARY_BUTTON} border-[#3a4352] bg-[#151a23] text-[#d8dde3]`}
                type="button"
                onClick={() => plannerCommands().restoreBuilds()}
              >
                Restore from backup
              </button>
              <button
                className={`${LIBRARY_BUTTON} border-[#a65c4c] bg-[linear-gradient(#55302c,#2c2022)] text-[#ffc0ad] hover:border-[#db8570] hover:bg-[linear-gradient(#754037,#382426)] hover:text-[#ffe1d5]`}
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

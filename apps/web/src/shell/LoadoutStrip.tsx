// The open build under the header: its name (right-click or the rename key renames it, src/app/builds/
// build-library-controller.js) and whether it is saved. src/app/planner/page.js updateStorageStatus fills the tab's
// <span> and <strong> and the status's first <span>, and marks the status "storage-warning" or "no-build".
export function LoadoutStrip() {
  return (
    <div
      className="loadout-strip flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line/70 bg-surface/80 px-4 py-1.5 md:px-6"
      aria-label="Active loadout"
    >
      <div
        className="loadout-tab group/tab flex min-w-0 cursor-context-menu flex-col rounded-md px-2 py-1 hover:bg-raised focus-visible:outline-2 focus-visible:outline-frost [&_.loadout-tab-rename]:h-7 [&_.loadout-tab-rename]:w-64 [&_.loadout-tab-rename]:rounded [&_.loadout-tab-rename]:border [&_.loadout-tab-rename]:border-frost [&_.loadout-tab-rename]:bg-ink [&_.loadout-tab-rename]:px-2 [&_.loadout-tab-rename]:text-text"
        tabIndex={0}
        title="Right-click to rename"
      >
        <span className="text-[0.65rem] font-semibold tracking-[0.18em] text-muted uppercase">Active build</span>
        <strong className="max-w-72 truncate font-display text-base text-text group-[.renaming]/tab:hidden">
          Loading build…
        </strong>
      </div>
      <button type="button" className="qol-help" data-qol-help="builds" aria-label="Builds controls">
        ?
      </button>
      <div className="loadout-status group/status ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <i className="size-2 rounded-full bg-ok group-[.no-build]/status:bg-muted group-[.storage-warning]/status:bg-danger" />
        <span className="group-[.storage-warning]/status:text-danger">Autosaved locally</span>
        <button
          type="button"
          className="cursor-pointer rounded border-0 bg-transparent px-1 text-sm text-frost underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-frost"
          data-view="builds"
        >
          Manage Loadouts
        </button>
        <button
          type="button"
          className="cursor-pointer rounded border-0 bg-transparent px-1 text-sm text-muted underline-offset-4 hover:text-text hover:underline focus-visible:outline-2 focus-visible:outline-frost"
          data-report-bug=""
          title="Open a GitHub form to report a planner bug"
        >
          Report bug
        </button>
      </div>
    </div>
  );
}

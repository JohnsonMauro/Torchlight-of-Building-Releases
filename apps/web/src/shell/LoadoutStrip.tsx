export function LoadoutStrip() {
  return (
    <div className="loadout-strip" aria-label="Active loadout">
      <button className="rail-collapse" type="button" aria-label="Expand navigation">
        ›
      </button>
      <div className="loadout-tab active" tabIndex={0} title="Right-click to rename">
        <span>Active build</span>
        <strong>Loading build…</strong>
      </div>
      <button type="button" className="qol-help" data-qol-help="builds" aria-label="Builds controls">
        ?
      </button>
      <div className="loadout-status">
        <i />
        <span>Autosaved locally</span>
        <button type="button" data-view="builds">
          Manage Loadouts
        </button>
        <button
          type="button"
          className="report-bug-button"
          data-report-bug=""
          title="Open a GitHub form to report a planner bug"
        >
          Report bug
        </button>
      </div>
    </div>
  );
}

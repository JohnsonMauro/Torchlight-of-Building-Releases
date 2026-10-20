export function BuildsView() {
  return (
    <section id="builds-view" className="app-view builds-page" hidden>
      <div className="builds-page-header">
        <div>
          <p className="eyebrow">Your workspace</p>
          <h1>Builds</h1>
          <p>Open a build or edit its details.</p>
        </div>
        <div className="builds-page-header-actions">
          <span className="builds-count">
            <strong id="build-count">—</strong>
            <small>builds</small>
          </span>
          <button className="button" type="button" data-new-build="">
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
              <button className="button button-secondary" type="button" data-duplicate-build="">
                Duplicate current
              </button>
              <button className="button button-secondary" type="button" data-backup-builds="">
                Back up all builds
              </button>
              <button className="button button-secondary" type="button" data-restore-builds="">
                Restore from backup
              </button>
              <button className="button build-delete-all" type="button" data-delete-all-builds="">
                Delete all builds
              </button>
            </div>
          </div>
          <div id="build-list" className="build-list" />
        </section>
        <aside className="panel build-details-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Current build</p>
              <h2>Details</h2>
            </div>
          </div>
          <div id="build-editor" />
        </aside>
      </div>
    </section>
  );
}

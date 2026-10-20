export function SlatesView() {
  return (
    <section id="slates-view" className="app-view" hidden>
      <div className="talent-page-heading">
        <div>
          <p className="eyebrow">Captured build</p>
          <h1>Divinity Slates</h1>
          <p className="muted">
            Inspect the equipped Statue of the New God layout. Copy effects remain flagged until their exact adjacent
            last-talents are confirmed.
          </p>
        </div>
        <div className="talent-total">
          <span>Equipped slates</span>
          <strong id="slate-count">—</strong>
        </div>
      </div>
      <div className="slate-layout">
        <section className="panel slate-board-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Statue layout</p>
              <h2>Statue of The New God</h2>
            </div>
            <span className="count">SS13 capture</span>
          </div>
          <div id="slate-board" className="slate-board" role="grid" aria-label="Equipped Divinity Slates" />
        </section>
        <aside className="panel slate-inspector" aria-live="polite">
          <p className="eyebrow">Slate inspector</p>
          <div id="slate-inspector" />
        </aside>
      </div>
      <section className="panel slate-audit">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Calculation safety</p>
            <h2>Slate effect audit</h2>
          </div>
          <span id="slate-audit-status" className="live-badge" />
        </div>
        <div id="slate-audit" />
      </section>
    </section>
  );
}

export function OverviewView() {
  return (
    <div id="overview-view" className="app-view" hidden>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Build workspace</p>
          <h1 id="build-name">Loading build…</h1>
          <p className="muted" id="build-meta" />
        </div>
        <div className="hero-skill">
          <span className="skill-icon">
            <img src="./src/assets/tli/ui-skillicon-skill-fireray-icon-128.webp" alt="Scorching Beam" />
          </span>
          <div>
            <small>Main skill</small>
            <strong id="skill-name">—</strong>
          </div>
        </div>
      </section>
      <div className="notice calibrated-notice" role="note">
        {
          " Town baseline calibration. Observed values are exact; unresolved game-order factors are labeled in the audit trail. "
        }
      </div>
      <section className="stat-grid" aria-label="Build summary">
        <article className="stat-card featured">
          <span>Ignite DPS</span>
          <strong id="full-dps">—</strong>
          <small id="dps-detail">town baseline</small>
        </article>
        <article className="stat-card">
          <span>Spell DPS</span>
          <strong id="average-hit">—</strong>
          <small>town baseline</small>
        </article>
        <article className="stat-card">
          <span>Cast rate</span>
          <strong id="life">—</strong>
          <small>casts per second</small>
        </article>
        <article className="stat-card">
          <span>Base Ignite</span>
          <strong id="armor">—</strong>
          <small>captured character stat</small>
        </article>
      </section>
      <div className="workspace-grid">
        <section className="panel controls-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Calibration state</p>
              <h2>Town baseline</h2>
            </div>
          </div>
          <div id="conditions" className="condition-list" />
          <input id="enemy-level" type="hidden" />
        </section>
        <section className="panel breakdown-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Audit trail</p>
              <h2>Damage calculation</h2>
            </div>
            <span className="live-badge">Audited</span>
          </div>
          <ol id="damage-trace" className="trace" />
        </section>
      </div>
      <section className="panel modifier-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Collected inputs</p>
            <h2>Active modifiers</h2>
          </div>
          <span id="modifier-count" className="count" />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Stat</th>
                <th>Type</th>
                <th>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="modifier-table" />
          </table>
        </div>
      </section>
    </div>
  );
}

export function CharacterView() {
  return (
    <section id="character-view" className="app-view" hidden>
      <div className="talent-page-heading">
        <div>
          <p className="eyebrow">Candidate build</p>
          <h1>Stats</h1>
          <p className="muted">
            See modeled damage first. Open the sections below for sources, defense, and calculations.
          </p>
        </div>
        <div className="talent-total">
          <span>Build status</span>
          <strong id="character-status">—</strong>
          <small id="character-status-detail" />
        </div>
      </div>
      <div id="stats-panel-options" className="stats-panel-options" role="tablist" aria-label="Stats layout">
        <button type="button" role="tab" data-stats-panel="sheet" aria-selected="true" className="active">
          Stat sheet
        </button>
        <button type="button" role="tab" data-stats-panel="damage-path" aria-selected="false">
          Damage path
        </button>
      </div>
      <div id="stat-sheet" hidden />
      <div id="damage-path" hidden />
    </section>
  );
}

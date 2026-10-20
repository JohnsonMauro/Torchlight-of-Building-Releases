export function PactsView() {
  return (
    <section id="pacts-view" className="app-view" hidden>
      <div className="talent-page-heading">
        <div>
          <p className="eyebrow">Build setup</p>
          <h1>
            Pactspirits
            <button type="button" className="qol-help" data-qol-help="pacts" aria-label="Pactspirits controls">
              ?
            </button>
          </h1>
          <p className="muted">Choose the spirits in each pact slot.</p>
        </div>
        <div className="talent-total">
          <span>Pactspirits</span>
          <strong id="pactspirit-count">3/3</strong>
        </div>
      </div>
      <div id="pactspirits" className="pactspirit-grid" />
      <div id="pact-kismet-summary" className="pact-kismet-summary" aria-live="polite" />
    </section>
  );
}

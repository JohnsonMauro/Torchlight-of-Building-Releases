export function PactspiritSelectorDialog() {
  return (
    <dialog id="pactspirit-selector" className="pactspirit-selector-dialog" aria-labelledby="pactspirit-selector-title">
      <header>
        <h2 id="pactspirit-selector-title">Select Pactspirit</h2>
        <button type="button" data-close-pactspirit-selector="" aria-label="Close">
          ×
        </button>
      </header>
      <div className="pactspirit-selector-filters">
        <input
          type="search"
          data-pactspirit-search=""
          placeholder="Search pactspirits…"
          aria-label="Search pactspirits"
        />
        <select data-pactspirit-category="" aria-label="Pactspirit category" />
      </div>
      <div id="pactspirit-selector-results" />
    </dialog>
  );
}

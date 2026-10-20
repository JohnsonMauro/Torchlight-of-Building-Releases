export function HeroSelectorDialog() {
  return (
    <dialog id="hero-selector" className="hero-selector-dialog" aria-labelledby="hero-selector-title">
      <header>
        <h2 id="hero-selector-title">Select Hero</h2>
        <button type="button" data-close-hero-selector="" aria-label="Close hero selector">
          ×
        </button>
      </header>
      <label className="hero-search">
        <span aria-hidden="true">⌕</span>
        <input
          id="hero-selector-search"
          type="search"
          placeholder="Search heroes..."
          autoComplete="off"
          aria-label="Search heroes"
        />
      </label>
      <div id="hero-selector-grid" className="hero-selector-grid" />
    </dialog>
  );
}

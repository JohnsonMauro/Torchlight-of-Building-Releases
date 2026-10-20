export function SageScentSelectorDialog() {
  return (
    <dialog id="sage-scent-selector" className="sage-scent-dialog" aria-labelledby="sage-scent-title">
      <header>
        <h2 id="sage-scent-title">Select Elixir Skill</h2>
        <button type="button" data-close-sage-scent="" aria-label="Close selector">
          ×
        </button>
      </header>
      <label className="hero-search">
        <span aria-hidden="true">⌕</span>
        <input
          id="sage-scent-search"
          type="search"
          placeholder="Search skills..."
          autoComplete="off"
          aria-label="Search scent choices"
        />
      </label>
      <div id="sage-scent-options" className="sage-scent-options" />
      <footer>
        <button type="button" className="button button-secondary" data-clear-sage-scent="">
          Clear Slot
        </button>
        <button type="button" className="button button-secondary" data-close-sage-scent="">
          Cancel
        </button>
      </footer>
    </dialog>
  );
}

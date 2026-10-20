export function FollowerSelectorDialog() {
  return (
    <dialog
      id="follower-selector"
      className="hero-selector-dialog follower-selector-dialog"
      aria-labelledby="follower-selector-title"
    >
      <header>
        <h2 id="follower-selector-title">Select Follower</h2>
        <button type="button" data-close-follower-selector="" aria-label="Close follower selector">
          ×
        </button>
      </header>
      <label className="hero-search">
        <span aria-hidden="true">⌕</span>
        <input
          id="follower-selector-search"
          type="search"
          placeholder="Search followers..."
          autoComplete="off"
          aria-label="Search followers"
        />
      </label>
      <div id="follower-selector-grid" className="hero-selector-grid follower-selector-grid" />
    </dialog>
  );
}

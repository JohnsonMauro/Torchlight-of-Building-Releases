export function CarinoAmmoSelectorDialog() {
  return (
    <dialog
      id="carino-ammo-selector"
      className="sage-scent-dialog carino-ammo-dialog"
      aria-labelledby="carino-ammo-title"
    >
      <header>
        <div>
          <p className="eyebrow">Ranger of Glory</p>
          <h2 id="carino-ammo-title">Select Special Ammo Support</h2>
        </div>
        <button type="button" data-close-carino-ammo="" aria-label="Close selector">
          ×
        </button>
      </header>
      <label className="hero-search">
        <span aria-hidden="true">⌕</span>
        <input
          id="carino-ammo-search"
          type="search"
          placeholder="Search projectile supports..."
          autoComplete="off"
          aria-label="Search projectile supports"
        />
      </label>
      <p className="carino-ammo-help">
        Choose a support that can support a Projectile skill and is not installed on the skill panel.
      </p>
      <div id="carino-ammo-options" className="sage-scent-options carino-ammo-options" />
      <footer>
        <button type="button" className="button button-secondary" data-clear-carino-ammo="">
          Clear Slot
        </button>
        <button type="button" className="button button-secondary" data-close-carino-ammo="">
          Cancel
        </button>
      </footer>
    </dialog>
  );
}

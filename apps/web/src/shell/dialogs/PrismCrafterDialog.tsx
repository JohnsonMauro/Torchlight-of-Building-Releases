export function PrismCrafterDialog() {
  return (
    <dialog id="prism-crafter-dialog" className="prism-crafter-dialog" aria-labelledby="prism-crafter-title">
      <header>
        <h2 id="prism-crafter-title">Craft Prism</h2>
        <button type="button" data-close-prism-crafter="" aria-label="Close Prism crafter">
          ×
        </button>
      </header>
      <div className="prism-crafter-layout">
        <div id="prism-crafter-form" />
        <aside>
          <span>Preview</span>
          <div id="prism-crafter-preview" />
        </aside>
      </div>
      <footer>
        <button type="button" data-cancel-prism-crafter="">
          Cancel
        </button>
        <button type="button" data-confirm-prism-craft="">
          Craft
        </button>
      </footer>
    </dialog>
  );
}

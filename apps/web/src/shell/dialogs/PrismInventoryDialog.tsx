export function PrismInventoryDialog() {
  return (
    <dialog id="prism-inventory-dialog" className="prism-inventory-dialog" aria-labelledby="prism-inventory-title">
      <header>
        <h2 id="prism-inventory-title">Install Prism</h2>
        <button type="button" data-close-prism-inventory="" aria-label="Close Prism inventory">
          ×
        </button>
      </header>
      <div id="prism-inventory-list" />
      <footer>
        <button type="button" data-open-prism-crafter="">
          Craft Prism
        </button>
      </footer>
    </dialog>
  );
}

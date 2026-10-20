export function InventoryItemDialog() {
  return (
    <dialog
      id="inventory-item-dialog"
      className="equipment-crafter inventory-item-dialog"
      aria-labelledby="inventory-item-title"
    >
      <header>
        <div>
          <p className="eyebrow">Inventory item</p>
          <h2 id="inventory-item-title">Item</h2>
        </div>
        <button type="button" data-close-inventory-item="" aria-label="Close">
          ×
        </button>
      </header>
      <div id="inventory-item-body" />
      <footer>
        <button className="button button-secondary" type="button" data-delete-inventory-item="">
          Delete
        </button>
        <button className="button button-secondary" type="button" data-edit-inventory-item="">
          Edit
        </button>
        <button className="button" type="button" data-equip-selected-item="">
          Equip
        </button>
        <button className="button button-secondary" type="button" data-close-inventory-item="">
          Cancel
        </button>
      </footer>
    </dialog>
  );
}

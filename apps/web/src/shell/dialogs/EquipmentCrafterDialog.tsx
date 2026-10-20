export function EquipmentCrafterDialog() {
  return (
    <dialog id="equipment-crafter" className="equipment-crafter" aria-labelledby="equipment-crafter-title">
      <header>
        <div>
          <p className="eyebrow">Inventory workshop</p>
          <h2 id="equipment-crafter-title">Craft Rare Item</h2>
        </div>
        <button type="button" data-close-equipment-craft="" aria-label="Close">
          ×
        </button>
      </header>
      <div id="equipment-crafter-body" />
      <footer>
        <button className="button button-secondary" type="button" data-close-equipment-craft="">
          Cancel
        </button>
        <button className="button" type="button" data-add-crafted-equipment="">
          Add to Inventory
        </button>
      </footer>
    </dialog>
  );
}

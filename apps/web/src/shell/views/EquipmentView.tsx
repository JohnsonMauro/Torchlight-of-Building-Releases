export function EquipmentView() {
  return (
    <section id="equipment-view" className="app-view" hidden>
      <div className="talent-page-heading">
        <div>
          <p className="eyebrow">Build gear</p>
          <h1>
            Gear
            <button type="button" className="qol-help" data-qol-help="gear" aria-label="Gear controls">
              ?
            </button>
          </h1>
          <p className="muted">Craft rare, legendary, and Vorax items, then equip them from Inventory.</p>
        </div>
        <div className="talent-total">
          <span>Equipped slots</span>
          <strong id="equipment-count">—</strong>
        </div>
      </div>
      <div className="gear-workbench panel">
        <aside>
          <div id="equipment-grid" className="equipment-grid" aria-label="Equipped items" />
          <button className="button button-secondary gear-reset" type="button" data-reset-equipment="">
            Reset Gear
          </button>
        </aside>
        <section className="gear-inventory">
          <header>
            <div>
              <p className="eyebrow">Inventory</p>
              <h2>
                {"Items "}
                <span id="inventory-count" />
              </h2>
            </div>
            <div>
              <button className="button" type="button" data-open-equipment-craft="rare">
                Craft Rare Item
              </button>
              <button className="button" type="button" data-open-equipment-craft="legendary">
                Craft Legendary
              </button>
              <button className="button" type="button" data-open-equipment-craft="vorax">
                Craft Vorax Item
              </button>
            </div>
          </header>
          <div id="equipment-inventory" />
        </section>
      </div>
    </section>
  );
}

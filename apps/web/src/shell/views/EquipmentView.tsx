import { EquippedCount, GearWorkbench } from "../../features/gear/GearWorkbench";

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
          <strong id="equipment-count">
            <EquippedCount />
          </strong>
        </div>
      </div>
      <GearWorkbench />
    </section>
  );
}

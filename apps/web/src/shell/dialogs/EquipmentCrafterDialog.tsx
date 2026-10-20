// The equipment crafter (the Gear section's Craft Rare Item, Craft Vorax Item and Craft Legendary, or Edit on a crafted
// rare or Vorax item): the Vorax limb picker, the legendary list and configuration, or the rare and Vorax form
// (apps/web/src/features/gear), and Cancel / Add to Inventory (Save Changes when editing). The planner opens it and
// announces the "equipmentCrafter" source; each view is drawn anew at every opening and on a change of view, as before.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { EquipmentCrafterBody } from "@legacy/app/bridge/equipment-crafter-view.ts";
import { LegendaryConfig, LegendaryList } from "../../features/gear/LegendaryCraft";
import { RareCraftForm } from "../../features/gear/RareCraftForm";
import { useViewSource } from "../../ui/use-view-source";

function CrafterBody({ body }: { body: EquipmentCrafterBody }) {
  switch (body.kind) {
    case "vorax":
      return (
        <div className="vorax-select-layout">
          <section>
            <small>Select Limb</small>
            <div className="vorax-base-grid">
              {body.limbs.map((limb) => (
                <button
                  key={limb.name}
                  type="button"
                  data-select-vorax-base={limb.name}
                  onClick={() => plannerCommands().changeEquipmentCraft({ kind: "voraxBase", value: limb.name })}
                >
                  <img src={limb.icon} alt="" />
                  <span>{limb.label}</span>
                </button>
              ))}
            </div>
          </section>
          <aside>
            <small>Preview</small>
            <div className="vorax-empty-preview">Select options to preview item</div>
          </aside>
        </div>
      );
    case "legendaryList":
      return <LegendaryList list={body} />;
    case "legendary":
      return <LegendaryConfig config={body} />;
    default:
      return <RareCraftForm form={body} />;
  }
}

export function EquipmentCrafterDialog() {
  const view = useViewSource("equipmentCrafter");
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();
  const body = view?.body;
  const bodyKey = body ? `${view.session}:${body.kind}:${body.kind === "legendary" ? body.name : ""}` : "";
  return (
    <dialog
      id="equipment-crafter"
      ref={dialog}
      className="equipment-crafter"
      aria-labelledby="equipment-crafter-title"
      onClose={() => plannerCommands().closeEquipmentCrafter()}
    >
      <header>
        <div>
          <p className="eyebrow">Inventory workshop</p>
          <h2 id="equipment-crafter-title">{view?.title ?? "Craft Rare Item"}</h2>
        </div>
        <button type="button" aria-label="Close" onClick={close}>
          ×
        </button>
      </header>
      <div id="equipment-crafter-body">{body ? <CrafterBody key={bodyKey} body={body} /> : null}</div>
      <footer>
        <button className="button button-secondary" type="button" onClick={close}>
          Cancel
        </button>
        <button className="button" type="button" onClick={() => plannerCommands().addCraftedEquipment()}>
          {view?.saveLabel ?? "Add to Inventory"}
        </button>
      </footer>
    </dialog>
  );
}

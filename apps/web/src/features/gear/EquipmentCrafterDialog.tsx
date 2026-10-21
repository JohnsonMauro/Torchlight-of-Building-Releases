// The equipment crafter (the Gear section's Craft Rare Item, Craft Vorax Item and Craft Legendary, or Edit on a crafted
// rare or Vorax item): the rare item picker, the Vorax limb picker, the legendary list and configuration, or the rare and Vorax form
// (apps/web/src/features/gear), and Cancel / Add to Inventory (Save Changes when editing). The planner opens it and
// announces the "equipmentCrafter" source; each view is drawn anew at every opening and on a change of view, as before.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { EquipmentCrafterBody } from "@legacy/app/bridge/equipment-crafter-view.ts";
import { CraftPicker } from "./CraftPicker";
import { LegendaryConfig, LegendaryList } from "./LegendaryCraft";
import {
  CRAFT_ASIDE,
  CRAFT_ASIDE_LABEL,
  CRAFT_FORM,
  CRAFT_LAYOUT,
  CRAFTER_BODY,
  CRAFTER_DIALOG,
  CRAFTER_EYEBROW,
  CRAFTER_FOOTER,
  CRAFTER_HEAD,
  FOOTER_BUTTON,
  PICK_CARD,
  PICK_CARDS,
} from "./crafter-classes";
import { RareCraftForm } from "./RareCraftForm";
import { useViewSource } from "../../ui/use-view-source";
import { useRegisteredDialog } from "../../ui/dialog-registry";

function CrafterBody({ body }: { body: EquipmentCrafterBody }) {
  switch (body.kind) {
    case "vorax":
      return (
        <div className={CRAFT_LAYOUT}>
          <section className={CRAFT_FORM}>
            <small className={CRAFT_ASIDE_LABEL}>Select Limb</small>
            <div className={PICK_CARDS}>
              {body.limbs.map((limb) => (
                <button
                  key={limb.name}
                  type="button"
                  className={PICK_CARD}
                  data-select-vorax-base={limb.name}
                  onClick={() => plannerCommands().changeEquipmentCraft({ kind: "voraxBase", value: limb.name })}
                >
                  <img src={limb.icon} alt="" className="size-10.5 object-contain" />
                  <span>{limb.label}</span>
                </button>
              ))}
            </div>
          </section>
          <aside className={CRAFT_ASIDE}>
            <small className={CRAFT_ASIDE_LABEL}>Preview</small>
            <div className="grid min-h-50 place-items-center rounded-md border border-dashed border-line-strong text-center text-dim">
              Select options to preview item
            </div>
          </aside>
        </div>
      );
    case "legendaryList":
      return <LegendaryList list={body} />;
    case "legendary":
      return <LegendaryConfig config={body} />;
    case "craftPick":
      return <CraftPicker pick={body} />;
    default:
      return <RareCraftForm form={body} />;
  }
}

export function EquipmentCrafterDialog() {
  const view = useViewSource("equipmentCrafter");
  const dialog = useRef<HTMLDialogElement>(null);
  useRegisteredDialog(dialog);
  const close = () => dialog.current?.close();
  const body = view?.body;
  const bodyKey = body ? `${view.session}:${body.kind}:${body.kind === "legendary" ? body.name : ""}` : "";
  return (
    <dialog
      id="equipment-crafter"
      ref={dialog}
      className={`${CRAFTER_DIALOG} w-280`}
      aria-labelledby="equipment-crafter-title"
      onClose={() => plannerCommands().closeEquipmentCrafter()}
    >
      <header className={CRAFTER_HEAD}>
        <div>
          <p className={CRAFTER_EYEBROW}>Inventory workshop</p>
          <h2 id="equipment-crafter-title" className="dialog-title">
            {view?.title ?? "Craft Rare Item"}
          </h2>
        </div>
        <button type="button" className="dialog-close" aria-label="Close" onClick={close}>
          ×
        </button>
      </header>
      <div id="equipment-crafter-body" className={CRAFTER_BODY}>
        {body ? <CrafterBody key={bodyKey} body={body} /> : null}
      </div>
      <footer className={CRAFTER_FOOTER}>
        <button className={`btn ${FOOTER_BUTTON}`} type="button" onClick={close}>
          Cancel
        </button>
        <button
          className={`btn-primary ${FOOTER_BUTTON}`}
          type="button"
          onClick={() => plannerCommands().addCraftedEquipment()}
        >
          {view?.saveLabel ?? "Add to Inventory"}
        </button>
      </footer>
    </dialog>
  );
}

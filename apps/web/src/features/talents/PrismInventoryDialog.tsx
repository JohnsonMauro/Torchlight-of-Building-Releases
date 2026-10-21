// The prism inventory (Install Prism, or a click on the installed prism): the crafted prisms with their type, area and
// the tree each is installed in, and for each Edit, Install (Equipped on this tree, disabled when in another) and Delete;
// Unequip current Prism; Craft Prism. The planner opens it for a tree slot and announces the "prismInventory" source;
// every button is a planner command.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useViewSource } from "../../ui/use-view-source";
import { FOOTER } from "../../ui/talent-slate-styles";
import { PRISM_ICON } from "./talent-classes";

const ACTION = "prism-action min-h-7.5 px-2 py-1 text-xs font-bold";
const EDIT = `${ACTION} prism-action-edit btn`;
const INSTALL = `${ACTION} prism-action-install btn-primary`;
const DELETE = `${ACTION} prism-action-delete btn-danger p-0 text-base`;
const CRAFT = "btn-primary text-sm font-bold";

export function PrismInventoryDialog() {
  const view = useViewSource("prismInventory");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <dialog
      id="prism-inventory-dialog"
      ref={dialog}
      className="prism-inventory-dialog dialog-panel h-177.5 w-97.5 leading-[normal] open:flex open:flex-col"
      aria-labelledby="prism-inventory-title"
    >
      <header className="dialog-head min-h-12.5 py-0">
        <h2 id="prism-inventory-title" className="dialog-title">
          {view ? `Install Prism - Tree Slot ${view.slot}` : "Install Prism"}
        </h2>
        <button
          type="button"
          className="dialog-close"
          aria-label="Close Prism inventory"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </header>
      <div id="prism-inventory-list" className="min-h-0 flex-1 overflow-auto p-4">
        {!view ? null : view.items.length ? (
          <>
            <div className="prism-inventory-items grid gap-2">
              {view.items.map((item) => (
                <article
                  key={item.id}
                  className="prism-inventory-item grid grid-cols-[minmax(0,1fr)_auto_auto_26px] items-center gap-1.5 rounded-md border border-line bg-raised p-2"
                >
                  <div className="prism-inventory-summary grid min-w-0 grid-cols-[44px_minmax(0,1fr)] items-center gap-2">
                    <span className={`prism-item-icon ${PRISM_ICON}`}>
                      {item.icon ? <img src={item.icon} alt="" /> : "✦"}
                    </span>
                    <span className="prism-inventory-details min-w-0">
                      <strong className="block text-xs">{item.name}</strong>
                      <small className="mt-1 block text-xs leading-snug text-muted">{item.detail}</small>
                    </span>
                  </div>
                  <button
                    type="button"
                    className={EDIT}
                    aria-label={`Edit ${item.name}`}
                    onClick={() => plannerCommands().editCraftedPrism(item.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={INSTALL}
                    disabled={item.installedElsewhere}
                    onClick={() => plannerCommands().installCraftedPrism(item.id)}
                  >
                    {item.equipped ? "Equipped" : "Install"}
                  </button>
                  <button
                    type="button"
                    className={DELETE}
                    aria-label={`Delete ${item.name}`}
                    onClick={() => plannerCommands().deleteCraftedPrism(item.id)}
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
            {view.installedHere ? (
              <button
                type="button"
                className="prism-unequip btn mt-3.5 w-full p-2 font-bold"
                onClick={() => plannerCommands().unequipPrism()}
              >
                Unequip current Prism
              </button>
            ) : null}
          </>
        ) : (
          <div className="prism-inventory-empty flex h-full flex-col items-center gap-4.5 pt-13 text-muted">
            <span>No prisms crafted yet</span>
            <button
              type="button"
              className={`${CRAFT} px-4 py-2.5`}
              data-open-prism-crafter=""
              onClick={() => plannerCommands().openPrismCrafter()}
            >
              Craft First Prism
            </button>
          </div>
        )}
      </div>
      <footer className={`${FOOTER} px-4 py-3`}>
        <button
          type="button"
          className={`${CRAFT} min-h-10 w-full`}
          data-open-prism-crafter=""
          onClick={() => plannerCommands().openPrismCrafter()}
        >
          Craft Prism
        </button>
      </footer>
    </dialog>
  );
}

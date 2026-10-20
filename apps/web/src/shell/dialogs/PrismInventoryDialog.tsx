// The prism inventory (Install Prism, or a click on the installed prism): the crafted prisms with their type, area and
// the tree each is installed in, and for each Edit, Install (Equipped on this tree, disabled when in another) and Delete;
// Unequip current Prism; Craft Prism. The planner opens it for a tree slot and announces the "prismInventory" source;
// every button is a planner command. The CSS styles the craft buttons by data-open-prism-crafter, so it stays.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useViewSource } from "../../ui/use-view-source";

export function PrismInventoryDialog() {
  const view = useViewSource("prismInventory");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <dialog
      id="prism-inventory-dialog"
      ref={dialog}
      className="prism-inventory-dialog"
      aria-labelledby="prism-inventory-title"
    >
      <header>
        <h2 id="prism-inventory-title">{view ? `Install Prism - Tree Slot ${view.slot}` : "Install Prism"}</h2>
        <button type="button" aria-label="Close Prism inventory" onClick={() => dialog.current?.close()}>
          ×
        </button>
      </header>
      <div id="prism-inventory-list">
        {!view ? null : view.items.length ? (
          <>
            <div className="prism-inventory-items">
              {view.items.map((item) => (
                <article key={item.id} className="prism-inventory-item">
                  <div className="prism-inventory-summary">
                    <span className="prism-item-icon">{item.icon ? <img src={item.icon} alt="" /> : "✦"}</span>
                    <span className="prism-inventory-details">
                      <strong>{item.name}</strong>
                      <small>{item.detail}</small>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="prism-action prism-action-edit"
                    aria-label={`Edit ${item.name}`}
                    onClick={() => plannerCommands().editCraftedPrism(item.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="prism-action prism-action-install"
                    disabled={item.installedElsewhere}
                    onClick={() => plannerCommands().installCraftedPrism(item.id)}
                  >
                    {item.equipped ? "Equipped" : "Install"}
                  </button>
                  <button
                    type="button"
                    className="prism-action prism-action-delete"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => plannerCommands().deleteCraftedPrism(item.id)}
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
            {view.installedHere ? (
              <button type="button" className="prism-unequip" onClick={() => plannerCommands().unequipPrism()}>
                Unequip current Prism
              </button>
            ) : null}
          </>
        ) : (
          <div className="prism-inventory-empty">
            <span>No prisms crafted yet</span>
            <button type="button" data-open-prism-crafter="" onClick={() => plannerCommands().openPrismCrafter()}>
              Craft First Prism
            </button>
          </div>
        )}
      </div>
      <footer>
        <button type="button" data-open-prism-crafter="" onClick={() => plannerCommands().openPrismCrafter()}>
          Craft Prism
        </button>
      </footer>
    </dialog>
  );
}

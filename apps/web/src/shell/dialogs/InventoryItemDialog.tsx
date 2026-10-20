// The Inventory item dialog (an Inventory card or an equipped slot opens it): the item with its rarity, Equip or
// Unequip, Edit, Copy and Delete; a click outside closes it. Edit on a legendary shows the item editor here: React gives
// the planner an empty body (data-legacy-editor, a new element per mode) and the planner writes the editor into it,
// as before; the footer's Save Changes is a command that reads it. The planner announces the "inventoryItem" source.
import { useLayoutEffect, useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useViewSource } from "../../ui/use-view-source";

export function InventoryItemDialog() {
  const view = useViewSource("inventoryItem");
  const dialog = useRef<HTMLDialogElement>(null);
  const editing = Boolean(view?.editing);
  const id = view?.id ?? "";
  useLayoutEffect(() => {
    if (editing) plannerCommands().renderInventoryItemEditor();
  }, [editing, id]);
  const close = () => dialog.current?.close();
  return (
    <dialog
      id="inventory-item-dialog"
      ref={dialog}
      className={`equipment-crafter inventory-item-dialog ${editing ? "gear-editor-dialog" : ""}`}
      aria-labelledby="inventory-item-title"
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          close();
      }}
    >
      <header>
        <div>
          <p className="eyebrow">Inventory item</p>
          <h2 id="inventory-item-title">{view?.title ?? "Item"}</h2>
        </div>
        <button type="button" aria-label="Close" onClick={close}>
          ×
        </button>
      </header>
      {editing ? (
        <div key={`edit:${id}`} id="inventory-item-body" data-legacy-editor="" />
      ) : (
        <div key="item" id="inventory-item-body">
          {view?.item ? (
            <div className={`inventory-quick-actions ${view.item.classes}`}>
              <img src={view.item.icon} alt="" />
              <strong>{view.item.name}</strong>
              <button type="button" onClick={() => plannerCommands().toggleSelectedItemEquip()}>
                {view.item.equipped ? "Unequip" : "Equip"}
              </button>
              <button type="button" onClick={() => plannerCommands().editInventoryItem(id)}>
                Edit
              </button>
              <button type="button" onClick={() => plannerCommands().copySelectedItem()}>
                Copy
              </button>
              <button type="button" className="danger" onClick={() => plannerCommands().deleteSelectedItem()}>
                Delete
              </button>
            </div>
          ) : null}
        </div>
      )}
      <footer hidden={!editing}>
        {editing ? (
          <>
            <button className="button button-secondary" type="button" onClick={close}>
              Cancel
            </button>
            <button className="button" type="button" onClick={() => plannerCommands().saveInventoryItemEdit()}>
              Save Changes
            </button>
          </>
        ) : null}
      </footer>
    </dialog>
  );
}

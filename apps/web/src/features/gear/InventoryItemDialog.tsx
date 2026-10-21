// The Inventory item dialog (an Inventory card or an equipped slot opens it): the item with its rarity, Equip or
// Unequip, Edit, Copy and Delete; a click outside closes it. Edit on a legendary or captured item shows the item editor
// here (apps/web/src/features/gear/InventoryItemEditor.tsx); the footer's Save Changes saves it. The planner announces
// the "inventoryItem" source.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import {
  CRAFTER_BODY,
  CRAFTER_DIALOG,
  CRAFTER_EYEBROW,
  CRAFTER_FOOTER,
  CRAFTER_HEAD,
  FOOTER_BUTTON,
  itemCardLook,
} from "./crafter-classes";
import { InventoryItemEditor } from "./InventoryItemEditor";
import { useViewSource } from "../../ui/use-view-source";
import { useRegisteredDialog } from "../../ui/dialog-registry";

// The item alone: a small card in its rarity's art, the close button over its top right corner and the title hidden
// (it still names the dialog).
const ITEM_DIALOG = "dialog-panel w-78.75 leading-[normal]";
const ITEM_HEAD = "absolute top-1.25 right-1.25 z-2 [&>div]:hidden";
const QUICK_ACTIONS = "relative grid gap-2.25 px-5 pt-7 pb-5";
const QUICK_TYPE = "p-2.5 text-xs font-bold tracking-wide uppercase";

export function InventoryItemDialog() {
  const view = useViewSource("inventoryItem");
  const dialog = useRef<HTMLDialogElement>(null);
  useRegisteredDialog(dialog);
  const editing = Boolean(view?.editing);
  const id = view?.id ?? "";
  const close = () => dialog.current?.close();
  return (
    <dialog
      id="inventory-item-dialog"
      ref={dialog}
      className={editing ? `gear-editor-dialog ${CRAFTER_DIALOG} w-225` : ITEM_DIALOG}
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
      <header className={editing ? CRAFTER_HEAD : ITEM_HEAD}>
        <div>
          <p className={CRAFTER_EYEBROW}>Inventory item</p>
          <h2 id="inventory-item-title" className="dialog-title">
            {view?.title ?? "Item"}
          </h2>
        </div>
        <button type="button" className="dialog-close" aria-label="Close" onClick={close}>
          ×
        </button>
      </header>
      {editing ? (
        <div key={`edit:${id}`} id="inventory-item-body" className={CRAFTER_BODY}>
          {view?.editor ? <InventoryItemEditor editor={view.editor} /> : null}
        </div>
      ) : (
        <div key="item" id="inventory-item-body">
          {view?.item ? (
            <div
              className={`inventory-quick-actions ${QUICK_ACTIONS} ${itemCardLook(view.item.classes)} ${view.item.classes}`}
            >
              <img
                src={view.item.icon}
                alt=""
                className="mx-auto size-14.5 rounded border-2 border-(--item-frame) bg-(--item-frame)/15 object-contain p-1.25"
              />
              <strong className="text-center font-display text-base font-bold text-(--item-name)">
                {view.item.name}
              </strong>
              <button
                type="button"
                className={`btn ${QUICK_TYPE}`}
                onClick={() => plannerCommands().toggleSelectedItemEquip()}
              >
                {view.item.equipped ? "Unequip" : "Equip"}
              </button>
              <button
                type="button"
                className={`btn ${QUICK_TYPE}`}
                onClick={() => plannerCommands().editInventoryItem(id)}
              >
                Edit
              </button>
              <button
                type="button"
                className={`btn ${QUICK_TYPE}`}
                onClick={() => plannerCommands().copySelectedItem()}
              >
                Copy
              </button>
              <button
                type="button"
                className={`btn-danger ${QUICK_TYPE}`}
                onClick={() => plannerCommands().deleteSelectedItem()}
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      )}
      <footer className={CRAFTER_FOOTER} hidden={!editing}>
        {editing ? (
          <>
            <button className={`btn ${FOOTER_BUTTON}`} type="button" onClick={close}>
              Cancel
            </button>
            <button
              className={`btn-primary ${FOOTER_BUTTON}`}
              type="button"
              onClick={() => plannerCommands().saveInventoryItemEdit()}
            >
              Save Changes
            </button>
          </>
        ) : null}
      </footer>
    </dialog>
  );
}

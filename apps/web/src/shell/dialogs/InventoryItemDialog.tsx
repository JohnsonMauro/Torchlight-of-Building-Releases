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
} from "../../features/gear/crafter-classes";
import { InventoryItemEditor } from "../../features/gear/InventoryItemEditor";

// The item alone: a small card in its rarity's art, the close button over its top right corner and the title hidden
// (it still names the dialog).
const ITEM_DIALOG = "dialog-panel w-78.75 leading-[normal]";
const ITEM_HEAD = "absolute top-1.25 right-1.25 z-2 [&>div]:hidden";
const ITEM_CLOSE =
  "grid size-7 cursor-pointer place-items-center rounded-[4px] bg-[#1a2430] text-xl text-[#aab8c7] hover:bg-[#344253] hover:text-white focus-visible:bg-[#344253] focus-visible:text-white focus-visible:outline-none";
const QUICK_ACTIONS = "grid gap-2.25 px-5 pt-7 pb-5";
const QUICK_BUTTON = "btn-bronze p-2.5 text-xs font-extrabold tracking-[0.03em] uppercase";
const DELETE_BUTTON =
  "cursor-pointer rounded-[3px] border border-[#a35343] bg-[linear-gradient(180deg,#60332b,#2b1e1d)] p-2.5 text-xs font-extrabold tracking-[0.03em] text-[#ffbdad] uppercase hover:border-[#e78e74] hover:bg-[linear-gradient(180deg,#804237,#39231f)] hover:text-[#ffe0d5] focus-visible:border-[#e78e74] focus-visible:text-[#ffe0d5] focus-visible:outline-none";
import { useViewSource } from "../../ui/use-view-source";

export function InventoryItemDialog() {
  const view = useViewSource("inventoryItem");
  const dialog = useRef<HTMLDialogElement>(null);
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
        <button type="button" className={editing ? "dialog-close" : ITEM_CLOSE} aria-label="Close" onClick={close}>
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
                className="mx-auto size-14.5 rounded-[5px] border-2 border-(--item-frame) bg-[linear-gradient(145deg,var(--item-light),var(--item-dark))] object-contain p-1.25 shadow-[inset_0_1px_rgb(255_230_166/0.16),0_3px_10px_rgb(0_0_0/0.3)]"
              />
              <strong className="text-center font-display text-base font-black text-(--item-name)">
                {view.item.name}
              </strong>
              <button
                type="button"
                className={QUICK_BUTTON}
                onClick={() => plannerCommands().toggleSelectedItemEquip()}
              >
                {view.item.equipped ? "Unequip" : "Equip"}
              </button>
              <button type="button" className={QUICK_BUTTON} onClick={() => plannerCommands().editInventoryItem(id)}>
                Edit
              </button>
              <button type="button" className={QUICK_BUTTON} onClick={() => plannerCommands().copySelectedItem()}>
                Copy
              </button>
              <button type="button" className={DELETE_BUTTON} onClick={() => plannerCommands().deleteSelectedItem()}>
                Delete
              </button>
            </div>
          ) : null}
        </div>
      )}
      <footer className={CRAFTER_FOOTER} hidden={!editing}>
        {editing ? (
          <>
            <button className={`btn-bronze ${FOOTER_BUTTON}`} type="button" onClick={close}>
              Cancel
            </button>
            <button
              className={`btn-gold ${FOOTER_BUTTON}`}
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

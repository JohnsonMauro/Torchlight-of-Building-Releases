// The prism inventory (Install Prism, or a click on the installed prism): the crafted prisms with their type, area and
// the tree each is installed in, and for each Edit, Install (Equipped on this tree, disabled when in another) and Delete;
// Unequip current Prism; Craft Prism. The planner opens it for a tree slot and announces the "prismInventory" source;
// every button is a planner command.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useViewSource } from "../../ui/use-view-source";
import { FOOTER } from "./talent-slate-styles";

const ICON =
  "prism-item-icon grid size-11 place-items-center rounded-md border border-[#9f5c22] bg-[#49321f] text-2xl text-[#ffb05e] [&>img]:max-h-[90%] [&>img]:max-w-[90%] [&>img]:object-contain";
const ACTION =
  "prism-action min-h-7.5 cursor-pointer rounded border px-2 py-1.25 text-[0.72rem] font-bold focus-visible:outline-2 focus-visible:outline-[#e7b35d]";
const EDIT = `${ACTION} prism-action-edit border-[#8d693b] bg-[#3d2b1d] text-[#f9dfad] hover:border-[#e2ad58] hover:bg-[#614025] hover:text-[#fff0ca]`;
const INSTALL = `${ACTION} prism-action-install border-[#ba7935] bg-[linear-gradient(#f7c26d,#d88838)] text-[#17120b] enabled:hover:bg-[linear-gradient(#ffd892,#e89a48)] off:cursor-default off:border-[#6d5a3b] off:bg-none off:bg-[#51402a] off:text-[#eed3a0]`;
const DELETE = `${ACTION} prism-action-delete border-[#634444] bg-[#332426] p-0 text-base text-[#e3a5a0] hover:border-[#a35f55] hover:bg-[#4a2c2a] hover:text-[#ffc9c2]`;
const CRAFT = "btn-bronze text-[0.82rem] font-bold";

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
      <div id="prism-inventory-list" className="min-h-0 flex-1 overflow-auto p-3.75">
        {!view ? null : view.items.length ? (
          <>
            <div className="prism-inventory-items grid gap-2.25">
              {view.items.map((item) => (
                <article
                  key={item.id}
                  className="prism-inventory-item grid grid-cols-[minmax(0,1fr)_auto_auto_26px] items-center gap-1.5 rounded-lg border border-[#56452d] bg-[linear-gradient(110deg,#252b35,#1b222c)] p-2.25"
                >
                  <div className="prism-inventory-summary grid min-w-0 grid-cols-[44px_minmax(0,1fr)] items-center gap-2.25">
                    <span className={ICON}>{item.icon ? <img src={item.icon} alt="" /> : "✦"}</span>
                    <span className="prism-inventory-details min-w-0">
                      <strong className="block text-xs">{item.name}</strong>
                      <small className="mt-1 block text-[11px] leading-[1.35] text-[#aeb5c1]">{item.detail}</small>
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
                className="prism-unequip mt-3.5 cursor-pointer rounded-md border border-[#84633c] bg-[#30271e] p-2.25 font-bold text-[#f6d69f] hover:border-[#e2ad58] hover:bg-[#614025] hover:text-[#fff0ca]"
                onClick={() => plannerCommands().unequipPrism()}
              >
                Unequip current Prism
              </button>
            ) : null}
          </>
        ) : (
          <div className="prism-inventory-empty flex h-full flex-col items-center gap-4.5 pt-13 text-[#d3c3a3]">
            <span>No prisms crafted yet</span>
            <button
              type="button"
              className={`${CRAFT} px-4.25 py-2.5`}
              data-open-prism-crafter=""
              onClick={() => plannerCommands().openPrismCrafter()}
            >
              Craft First Prism
            </button>
          </div>
        )}
      </div>
      <footer className={`${FOOTER} px-3.75 py-3`}>
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

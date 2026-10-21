// The hero memory dialog (a memory socket of the HERO tab opens it): the inventory of crafted memories with Equip /
// Unequip (or the base trait slot's mode), Copy, Edit and Delete, a right-click to equip into an open slot, Unequip
// slot and Craft Memory; or the crafter (HeroMemoryCrafter). The planner opens it for a socket and announces the
// "heroMemory" source; every button is a planner command. A memory keeps data-memory-inventory-id for the planner's
// tooltip.
import { useRef } from "react";
import { MemoryTooltip } from "./MemoryTooltip";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { MemoryInventoryView } from "@legacy/app/bridge/hero-memory-view.ts";
import { useViewSource } from "../../ui/use-view-source";
import { HeroMemoryCrafter } from "./HeroMemoryCrafter";
import { inventoryButton, inventoryItem, memoryAccent, memoryFooterButton } from "./hero-memory-classes";
import { pickerDialog } from "../../ui/selector-classes";
import { useRegisteredDialog } from "../../ui/dialog-registry";

const commands = plannerCommands;

function Inventory({ view }: { view: MemoryInventoryView }) {
  const base = view.baseType !== null;
  return (
    <div className="hero-memory-inventory flex min-h-[min(620px,70vh)] flex-1 flex-col">
      <div className="hero-memory-list min-h-0 flex-1 overflow-auto p-4.5">
        {base ? (
          <p className="hero-memory-slot-hint mb-2.5 rounded-sm border border-line bg-sunken px-2.5 py-2 text-xs text-muted">{`This slot accepts Memory of ${view.baseType}. Right-click any memory to equip it in an open compatible slot.`}</p>
        ) : null}
        {view.items.length ? (
          view.items.map((item) => (
            <MemoryTooltip key={item.id} target={{ inventoryId: item.id }}>
              <article
                className={`hero-memory-item memory-rarity-${item.rarity} ${item.available ? "" : "incompatible opacity-62"} ${inventoryItem} ${memoryAccent(item.rarity)}`}
                data-memory-inventory-id={item.id}
                onContextMenu={(event) => {
                  event.preventDefault();
                  commands().memoryContextMenu(item.id);
                }}
              >
                <img src={item.icon} alt="" className="size-9.5 object-contain" />
                <div className="min-w-0 max-[700px]:basis-[calc(100%-56px)]">
                  <strong className="block font-bold text-(--memory-accent)">{item.name}</strong>
                  <small className="mt-1 block text-xs text-muted">{item.detail}</small>
                </div>
                <button
                  type="button"
                  className={inventoryButton}
                  disabled={item.action.disabled}
                  title={item.action.title ?? undefined}
                  onClick={() =>
                    base ? commands().toggleBaseMemory(item.id) : commands().toggleCraftedMemory(item.id)
                  }
                >
                  {item.action.label}
                </button>
                <button
                  type="button"
                  className={inventoryButton}
                  aria-label={`Copy ${item.name}`}
                  onClick={() => commands().copyCraftedMemory(item.id)}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className={inventoryButton}
                  aria-label={`Edit ${item.name}`}
                  onClick={() => commands().editCraftedMemory(item.id)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className={inventoryButton}
                  aria-label={`Delete ${item.name}`}
                  onClick={() => commands().deleteCraftedMemory(item.id)}
                >
                  ×
                </button>
              </article>
            </MemoryTooltip>
          ))
        ) : (
          <div className="hero-memory-empty px-2.5 py-14 text-center text-muted">
            No memories crafted yet
            <br />
            <button
              type="button"
              className={`${memoryFooterButton} mt-5`}
              onClick={() => commands().startMemoryCraft()}
            >
              Craft your first Memory
            </button>
          </div>
        )}
      </div>
      <div className="hero-memory-inventory-footer flex shrink-0 justify-end gap-2.25 border-t border-line px-4.5 py-3.5">
        {view.unequipSlot ? (
          <button
            type="button"
            className={memoryFooterButton}
            onClick={() => (base ? commands().clearBaseMemory() : commands().clearHeroMemorySlot())}
          >
            Unequip slot
          </button>
        ) : null}
        <button type="button" className={memoryFooterButton} onClick={() => commands().startMemoryCraft()}>
          Craft Memory
        </button>
      </div>
    </div>
  );
}

export function HeroMemorySelectorDialog() {
  const view = useViewSource("heroMemory");
  const dialog = useRef<HTMLDialogElement>(null);
  useRegisteredDialog(dialog);
  return (
    <dialog
      id="hero-memory-selector"
      ref={dialog}
      className={`hero-memory-dialog ${pickerDialog} w-225`}
      aria-labelledby="hero-memory-title"
    >
      <header className="dialog-head">
        <h2 id="hero-memory-title" className="dialog-title">
          {view?.title ?? "Hero Memories"}
        </h2>
        <button
          type="button"
          className="dialog-close"
          aria-label="Close hero memories"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </header>
      <div id="hero-memory-content" className="flex min-h-0 flex-1 flex-col">
        {!view ? null : view.mode === "inventory" ? <Inventory view={view} /> : <HeroMemoryCrafter view={view} />}
      </div>
    </dialog>
  );
}

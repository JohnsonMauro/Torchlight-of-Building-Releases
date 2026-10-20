// The hero memory dialog (a memory socket of the HERO tab opens it): the inventory of crafted memories with Equip /
// Unequip (or the base trait slot's mode), Copy, Edit and Delete, a right-click to equip into an open slot, Unequip
// slot and Craft Memory; or the crafter (HeroMemoryCrafter). The planner opens it for a socket and announces the
// "heroMemory" source; every button is a planner command. A memory keeps data-memory-inventory-id for the planner's
// tooltip, and the craft buttons data-craft-hero-memory for the CSS.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { MemoryInventoryView } from "@legacy/app/bridge/hero-memory-view.ts";
import { useViewSource } from "../../ui/use-view-source";
import { HeroMemoryCrafter } from "./HeroMemoryCrafter";

const commands = plannerCommands;

function Inventory({ view }: { view: MemoryInventoryView }) {
  const base = view.baseType !== null;
  return (
    <div className="hero-memory-inventory">
      <div className="hero-memory-list">
        {base ? (
          <p className="hero-memory-slot-hint">{`This slot accepts Memory of ${view.baseType}. Right-click any memory to equip it in an open compatible slot.`}</p>
        ) : null}
        {view.items.length ? (
          view.items.map((item) => (
            <article
              key={item.id}
              className={`hero-memory-item memory-rarity-${item.rarity} ${item.available ? "" : "incompatible"}`}
              data-memory-inventory-id={item.id}
              onContextMenu={(event) => {
                event.preventDefault();
                commands().memoryContextMenu(item.id);
              }}
            >
              <img src={item.icon} alt="" />
              <div>
                <strong>{item.name}</strong>
                <small>{item.detail}</small>
              </div>
              <button
                type="button"
                disabled={item.action.disabled}
                title={item.action.title ?? undefined}
                onClick={() => (base ? commands().toggleBaseMemory(item.id) : commands().toggleCraftedMemory(item.id))}
              >
                {item.action.label}
              </button>
              <button
                type="button"
                aria-label={`Copy ${item.name}`}
                onClick={() => commands().copyCraftedMemory(item.id)}
              >
                Copy
              </button>
              <button
                type="button"
                aria-label={`Edit ${item.name}`}
                onClick={() => commands().editCraftedMemory(item.id)}
              >
                ✎
              </button>
              <button
                type="button"
                aria-label={`Delete ${item.name}`}
                onClick={() => commands().deleteCraftedMemory(item.id)}
              >
                ×
              </button>
            </article>
          ))
        ) : (
          <div className="hero-memory-empty">
            No memories crafted yet
            <br />
            <button
              type="button"
              className="button"
              data-craft-hero-memory=""
              onClick={() => commands().startMemoryCraft()}
            >
              Craft your first Memory
            </button>
          </div>
        )}
      </div>
      <div className="hero-memory-inventory-footer">
        {view.unequipSlot ? (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => (base ? commands().clearBaseMemory() : commands().clearHeroMemorySlot())}
          >
            Unequip slot
          </button>
        ) : null}
        <button
          type="button"
          className="button"
          data-craft-hero-memory=""
          onClick={() => commands().startMemoryCraft()}
        >
          Craft Memory
        </button>
      </div>
    </div>
  );
}

export function HeroMemorySelectorDialog() {
  const view = useViewSource("heroMemory");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <dialog id="hero-memory-selector" ref={dialog} className="hero-memory-dialog" aria-labelledby="hero-memory-title">
      <header>
        <h2 id="hero-memory-title">{view?.title ?? "Hero Memories"}</h2>
        <button type="button" aria-label="Close hero memories" onClick={() => dialog.current?.close()}>
          ×
        </button>
      </header>
      <div id="hero-memory-content">
        {!view ? null : view.mode === "inventory" ? <Inventory view={view} /> : <HeroMemoryCrafter view={view} />}
      </div>
    </dialog>
  );
}

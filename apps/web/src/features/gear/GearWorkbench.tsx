// The Gear section of the Build page: the ten equipped slots with Reset Gear, and the Inventory with the craft buttons.
// The data is the planner's "equipment" source (src/app/bridge/equipment-view-model.ts); every edit is a planner command,
// and the item dialog and the crafter stay legacy. Drags go both ways: a card onto a slot equips it there, an equipped
// slot onto another slot moves it, onto the Inventory unequips it. The legacy hover tooltip reads data-equipment-slot and
// data-equip-inventory (and places itself by #equipment-inventory .inventory-item), and the CSS styles the craft buttons by
// data-open-equipment-craft, so they stay.
import { useRef, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import {
  gearDropAllowed,
  type EquipmentSlotView,
  type EquipmentView,
  type InventoryCardView,
} from "@legacy/app/bridge/equipment-view-model.ts";
import { usePointerDrag } from "../../ui/use-pointer-drag";
import { useViewSource } from "../../ui/use-view-source";

const CRAFT_MODES = [
  { mode: "rare", label: "Craft Rare Item" },
  { mode: "legendary", label: "Craft Legendary" },
  { mode: "vorax", label: "Craft Vorax Item" },
] as const;
/** The drop target of the Inventory (slots are their own slot key). */
const INVENTORY = "inventory";
// The legacy ghost sat 14 px below and right of the pointer; the drag places it at the pointer.
const GHOST_OFFSET_PX = 14;

interface GearDragSource {
  itemId: string;
  /** The slot the item is made for (which slots take it). */
  itemSlot: string;
  /** The slot it is dragged out of; null from the Inventory. */
  fromSlot: string | null;
  name: string;
  icon: string;
}
const slotKey = (slot: string) => `slot:${slot}`;
const cardKey = (id: string) => `card:${id}`;

export function EquippedCount() {
  const view = useViewSource("equipment");
  return <>{view ? `${view.equippedCount}/${view.slotCount}` : "—"}</>;
}

export function GearWorkbench() {
  const view = useViewSource("equipment");
  // The ghost is made when the drag starts, from the source the pointer went down on.
  const dragged = useRef<GearDragSource | null>(null);
  const drag = usePointerDrag<GearDragSource>({
    targetAt: (element, source) => {
      const slot = element?.closest("#equipment-grid [data-equipment-slot]")?.getAttribute("data-equipment-slot");
      if (slot && gearDropAllowed(source.itemSlot, slot)) return slot;
      return source.fromSlot && element?.closest("#equipment-inventory") ? INVENTORY : null;
    },
    ghost: () => ghost(dragged.current),
    onStart: () => plannerCommands().hideTooltip(),
    onDrop: (source, target) =>
      plannerCommands().dropGear({
        itemId: source.itemId,
        fromSlot: source.fromSlot,
        toSlot: target === INVENTORY ? null : target,
      }),
    onInvalidDrop: () => plannerCommands().showToast("Invalid drop · item returned to its original place"),
  });
  const start = (event: ReactPointerEvent<HTMLElement>, key: string, source: GearDragSource) => {
    dragged.current = source;
    drag.start(event, key, source);
  };
  const draggedSource = view && drag.source ? sourceOf(view, drag.source) : null;

  return (
    <div className="gear-workbench panel">
      <aside>
        <div id="equipment-grid" className="equipment-grid" aria-label="Equipped items">
          {view?.slots.map((slot) => {
            const carried = slot.item?.drag;
            return (
              <SlotButton
                key={slot.slot}
                slot={slot}
                dragSource={drag.source === slotKey(slot.slot)}
                eligible={draggedSource ? gearDropAllowed(draggedSource.itemSlot, slot.slot) : false}
                target={drag.target === slot.slot}
                onClick={() => {
                  if (!drag.swallowClick()) plannerCommands().openEquipmentSlot(slot.slot);
                }}
                onContextMenu={(event) => {
                  if (plannerCommands().unequipEquipmentSlot(slot.slot)) event.preventDefault();
                }}
                onPointerDown={
                  carried ? (event) => start(event, slotKey(slot.slot), { ...carried, fromSlot: slot.slot }) : undefined
                }
              />
            );
          })}
        </div>
        <button
          className="button button-secondary gear-reset"
          type="button"
          onClick={() => plannerCommands().resetEquipment()}
        >
          Reset Gear
        </button>
      </aside>
      <section className="gear-inventory">
        <header>
          <div>
            <p className="eyebrow">Inventory</p>
            <h2>
              {"Items "}
              <span id="inventory-count">{view ? `(${view.inventory.length})` : ""}</span>
            </h2>
          </div>
          <div>
            {CRAFT_MODES.map(({ mode, label }) => (
              <button
                key={mode}
                className="button"
                type="button"
                data-open-equipment-craft={mode}
                onClick={() => plannerCommands().openEquipmentCrafter(mode)}
              >
                {label}
              </button>
            ))}
          </div>
        </header>
        <div
          id="equipment-inventory"
          className={
            draggedSource?.fromSlot
              ? `gear-drop-eligible${drag.target === INVENTORY ? " gear-drop-target" : ""}`
              : undefined
          }
        >
          {view ? (
            view.inventory.length ? (
              <div className="gear-inventory-grid">
                {view.inventory.map((card) => (
                  <InventoryCard
                    key={card.id}
                    card={card}
                    dragSource={drag.source === cardKey(card.id)}
                    onOpen={() => {
                      if (!drag.swallowClick()) plannerCommands().openInventoryItem(card.id);
                    }}
                    onPointerDown={(event) =>
                      start(event, cardKey(card.id), {
                        itemId: card.id,
                        itemSlot: card.itemSlot,
                        fromSlot: null,
                        name: card.name,
                        icon: card.icon,
                      })
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="gear-empty">
                <strong>No items crafted yet</strong>
                <span>Use a crafting button above to add an item.</span>
              </div>
            )
          ) : null}
        </div>
      </section>
    </div>
  );
}

/** The drag source behind a drag key, read from the view. */
function sourceOf(view: EquipmentView, key: string): { itemSlot: string; fromSlot: string | null } | null {
  if (key.startsWith("slot:")) {
    const slot = view.slots.find((entry) => slotKey(entry.slot) === key);
    return slot?.item?.drag ? { itemSlot: slot.item.drag.itemSlot, fromSlot: slot.slot } : null;
  }
  const card = view.inventory.find((entry) => cardKey(entry.id) === key);
  return card ? { itemSlot: card.itemSlot, fromSlot: null } : null;
}

function ghost(source: GearDragSource | null): HTMLElement {
  const element = document.createElement("div");
  element.className = "gear-drag-ghost";
  element.style.margin = `${GHOST_OFFSET_PX}px 0 0 ${GHOST_OFFSET_PX}px`;
  const image = document.createElement("img");
  image.src = source?.icon ?? "";
  image.alt = "";
  const name = document.createElement("span");
  name.textContent = source?.name ?? "";
  element.append(image, name);
  return element;
}

function SlotButton(props: {
  slot: EquipmentSlotView;
  dragSource: boolean;
  eligible: boolean;
  target: boolean;
  onClick: () => void;
  onContextMenu: (event: MouseEvent) => void;
  onPointerDown: ((event: ReactPointerEvent<HTMLElement>) => void) | undefined;
}) {
  const { slot } = props;
  const item = slot.item;
  const classes = [
    "equipment-item",
    slot.selected ? "selected" : "",
    item?.curseOffReason ? "curse-limit-item" : "",
    item ? item.classes : "disabled",
    props.dragSource ? "gear-drag-source" : "",
    props.eligible ? "gear-drop-eligible" : "",
    props.target ? "gear-drop-target" : "",
  ];
  const curseLabel = item?.curseOffReason ? `Curse not applied: ${item.curseOffReason}` : "";
  return (
    <button
      type="button"
      className={classes.filter(Boolean).join(" ")}
      data-equipment-slot={slot.slot}
      title={item ? "Right-click to unequip" : "Select this slot, then choose an Inventory item"}
      onClick={props.onClick}
      onContextMenu={props.onContextMenu}
      onPointerDown={props.onPointerDown}
    >
      {curseLabel ? (
        <em className="curse-off-badge" title={curseLabel} aria-label={curseLabel}>
          CURSE OFF
        </em>
      ) : null}
      <span>{slot.label}</span>
      <b>{item ? <img src={item.icon} alt="" /> : "+"}</b>
      <strong>{item ? item.name : "Empty"}</strong>
      <small>{item ? item.level : "Select slot"}</small>
    </button>
  );
}

function InventoryCard(props: {
  card: InventoryCardView;
  dragSource: boolean;
  onOpen: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  const { card } = props;
  return (
    <article
      className={`inventory-item ${card.rarityClass}`}
      data-equip-inventory={card.id}
      onClick={(event) => {
        if (!(event.target as Element).closest(".inventory-item-tools")) props.onOpen();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        plannerCommands().equipInventoryItem(card.id);
      }}
    >
      <button
        type="button"
        className={`inventory-item-main${props.dragSource ? " gear-drag-source" : ""}`}
        data-equip-inventory={card.id}
        onPointerDown={props.onPointerDown}
      >
        <span className="inventory-item-icon">
          <img src={card.icon} alt="" />
        </span>
        <strong>{card.name}</strong>
        <small>{card.detail}</small>
      </button>
      {card.equipped ? <em className="equipment-status">Equipped</em> : null}
      <span className="inventory-item-tools">
        <button type="button" title="Edit item" onClick={() => plannerCommands().editInventoryItem(card.id)}>
          ✎
        </button>
        <button type="button" title="Duplicate item" onClick={() => plannerCommands().duplicateInventoryItem(card.id)}>
          ◉
        </button>
      </span>
    </article>
  );
}

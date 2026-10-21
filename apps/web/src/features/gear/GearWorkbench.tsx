// The Gear section of the Build page: the ten equipped slots with Reset Gear, and the Inventory with the craft buttons.
// The data is the planner's "equipment" source (src/app/bridge/equipment-view-model.ts); every edit is a planner command,
// and the item dialog and the crafter stay legacy. Drags go both ways: a card onto a slot equips it there, an equipped
// slot onto another slot moves it, onto the Inventory unequips it. An equipped slot and an Inventory card show the
// item's tooltip (GearTooltip). The rarity classes the view model sets stay (tests read them). The rarity art and the
// slot, card and drag states are chosen in gear-classes.ts from the view model's data.
import { useRef, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { GearTooltip } from "./GearTooltip";
import {
  gearDropAllowed,
  type EquipmentSlotView,
  type EquipmentView,
  type InventoryCardView,
} from "@legacy/app/bridge/equipment-view-model.ts";
import { usePointerDrag } from "../../ui/use-pointer-drag";
import { useViewSource } from "../../ui/use-view-source";
import { hideTooltip } from "../../ui/tooltip/tooltip-store";
import {
  CARD_TOOL,
  CURSE_BADGE,
  CURSE_LIMIT_OUTLINE,
  DRAG_GHOST,
  DRAG_GHOST_ICON,
  DROP_ELIGIBLE,
  DROP_TARGET,
  EMPTY_SLOT,
  EQUIPPED_BADGE,
  SECTION_BUTTON,
  SELECTED_BORDER,
  SELECTED_RING,
  gearLook,
  inventoryIconShift,
} from "./gear-classes";

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
    onStart: () => hideTooltip(),
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
    <div className="gear-workbench panel relative m-3 grid grid-cols-[290px_minmax(0,1fr)] gap-4.5 p-4.5 leading-[normal] max-[1250px]:grid-cols-1 min-[901px]:flex-1">
      <aside className="grid content-start gap-3.5 max-[1250px]:w-[min(290px,100%)] min-[901px]:grid-rows-[minmax(0,1fr)_auto] min-[901px]:content-stretch">
        <div
          id="equipment-grid"
          className="grid grid-cols-2 gap-2.75 min-[901px]:h-full min-[901px]:grid-rows-[repeat(5,minmax(116px,1fr))]"
          aria-label="Equipped items"
        >
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
          className={`${SECTION_BUTTON} min-h-10.5 w-32.5 justify-self-end`}
          type="button"
          onClick={() => plannerCommands().resetEquipment()}
        >
          Reset Gear
        </button>
      </aside>
      <section className="min-w-0 border-l border-line pl-4.5 max-[1250px]:border-t max-[1250px]:border-l-0 max-[1250px]:pt-4 max-[1250px]:pl-0">
        <header className="flex items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="mb-1.75 text-xs font-bold tracking-wider text-accent uppercase">Inventory</p>
            <h2 className="my-0.5 font-display text-lg font-semibold">
              {"Items "}
              <span id="inventory-count">{view ? `(${view.inventory.length})` : ""}</span>
            </h2>
          </div>
          <div className="flex flex-wrap justify-end gap-1.75">
            {CRAFT_MODES.map(({ mode, label }) => (
              <button
                key={mode}
                className={SECTION_BUTTON}
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
          className={inventoryClasses(Boolean(draggedSource?.fromSlot), drag.target === INVENTORY)}
        >
          {view ? (
            view.inventory.length ? (
              // 140 px cards, as many per row as fit. When the Inventory is a little short of n cards (the Build view's
              // columns are narrower beside the view rail), the n cards share its width (and their padding shrinks a little)
              // instead of dropping to n - 1 per row.
              <div className="grid max-h-170 grid-cols-[repeat(auto-fill,140px)] justify-start gap-3 overflow-auto pt-4 @min-[232px]:@max-[292px]:grid-cols-2 @min-[408px]:@max-[444px]:grid-cols-3 @min-[548px]:@max-[596px]:grid-cols-4 @min-[688px]:@max-[748px]:grid-cols-5">
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
              <div className="grid min-h-70 place-items-center text-muted">
                <strong>No items crafted yet</strong>
                <span className="-mt-27.5">Use a crafting button above to add an item.</span>
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

/** The Inventory: a query container (the card grid sizes by it), and the drop target of an equipped item's drag. */
function inventoryClasses(eligible: boolean, target: boolean): string {
  if (target) return `@container gear-drop-eligible gear-drop-target ${DROP_TARGET}`;
  return eligible ? `@container gear-drop-eligible ${DROP_ELIGIBLE}` : "@container";
}

function ghost(source: GearDragSource | null): HTMLElement {
  const element = document.createElement("div");
  element.className = DRAG_GHOST;
  element.style.margin = `${GHOST_OFFSET_PX}px 0 0 ${GHOST_OFFSET_PX}px`;
  const image = document.createElement("img");
  image.src = source?.icon ?? "";
  image.alt = "";
  image.className = DRAG_GHOST_ICON;
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
  const look = item ? gearLook(item.classes) : null;
  // One frame colour and one outline, by priority: the curse limit, the drop target, then selection over the art.
  const frame = look
    ? `border-solid ${look.background} ${slot.selected ? `${SELECTED_BORDER} ${SELECTED_RING}` : look.border}`
    : `${EMPTY_SLOT} ${slot.selected ? SELECTED_BORDER : "border-line-strong"}`;
  const outline = item?.curseOffReason
    ? CURSE_LIMIT_OUTLINE
    : props.target
      ? DROP_TARGET
      : props.eligible
        ? DROP_ELIGIBLE
        : "";
  const classes = [
    "equipment-item relative flex min-h-29 cursor-grab touch-none flex-col justify-end overflow-hidden rounded-md border p-3 text-center text-text select-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent",
    frame,
    outline,
    slot.selected ? "selected" : "",
    item?.curseOffReason ? "curse-limit-item" : "",
    item ? item.classes : "disabled",
    props.dragSource ? "gear-drag-source opacity-48" : "",
    props.eligible ? "gear-drop-eligible" : "",
    props.target ? "gear-drop-target" : "",
  ];
  const curseLabel = item?.curseOffReason ? `Curse not applied: ${item.curseOffReason}` : "";
  const button = (
    <button
      type="button"
      className={classes.filter(Boolean).join(" ")}
      data-equipment-slot={slot.slot}
      title={item ? undefined : "Select this slot, then choose an Inventory item"}
      onClick={props.onClick}
      onContextMenu={props.onContextMenu}
      onPointerDown={props.onPointerDown}
    >
      {curseLabel ? (
        <em className={CURSE_BADGE} title={curseLabel} aria-label={curseLabel}>
          CURSE OFF
        </em>
      ) : null}
      <span
        className={`block text-[10px] tracking-wider text-accent uppercase${item ? " absolute inset-x-1 top-2.25 z-1" : ""}`}
      >
        {slot.label}
      </span>
      {item ? (
        <b className="absolute inset-[28px_8px_8px] z-1 flex items-center justify-center overflow-hidden">
          <img
            src={item.icon}
            alt=""
            className="size-[82%] max-h-[86%] max-w-[86%] min-h-0 min-w-0 flex-none scale-130 object-contain"
          />
        </b>
      ) : (
        <b className="mx-auto my-1.75 grid size-10.75 place-items-center overflow-hidden rounded border border-line-strong font-bold text-dim">
          +
        </b>
      )}
      <strong className={item ? "hidden" : "my-1.25 line-clamp-2 text-xs font-bold"}>
        {item ? item.name : "Empty"}
      </strong>
      <small className="hidden">{item ? item.level : "Select slot"}</small>
    </button>
  );
  return item ? <GearTooltip target={{ slot: slot.slot }}>{button}</GearTooltip> : button;
}

function InventoryCard(props: {
  card: InventoryCardView;
  dragSource: boolean;
  onOpen: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  const { card } = props;
  const look = gearLook(card.rarityClass);
  return (
    <GearTooltip target={{ inventoryId: card.id }}>
      <article
        className={`inventory-item ${card.rarityClass} relative block aspect-square w-full cursor-pointer border text-left text-text ${look.border} ${look.background}`}
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
          className={`inventory-item-main relative z-1 grid size-full cursor-grab touch-none grid-rows-[minmax(0,1fr)_auto] justify-items-center gap-1.25 px-7 py-2.25 select-none @min-[232px]:@max-[292px]:px-6.5 @min-[408px]:@max-[444px]:px-6.5 @min-[548px]:@max-[596px]:px-6.5 @min-[688px]:@max-[748px]:px-6.5 ${props.dragSource ? "gear-drag-source opacity-48" : ""}`}
          data-equip-inventory={card.id}
          onPointerDown={props.onPointerDown}
        >
          <span className="inventory-item-icon flex min-h-0 w-full items-center justify-center self-stretch text-accent">
            <img
              src={card.icon}
              alt=""
              className={`max-h-[86%] max-w-[86%] min-h-0 min-w-0 object-contain ${inventoryIconShift(card.icon)}`}
            />
          </span>
          <strong className={`line-clamp-2 max-w-full text-center text-xs leading-tight ${look.name}`}>
            {card.name}
          </strong>
          <small className="hidden">{card.detail}</small>
        </button>
        {card.equipped ? <em className={EQUIPPED_BADGE}>Equipped</em> : null}
        <span className="inventory-item-tools absolute top-1.25 right-1.25 z-3 grid gap-0.75">
          <button
            type="button"
            className={CARD_TOOL}
            title="Edit item"
            onClick={() => plannerCommands().editInventoryItem(card.id)}
          >
            ✎
          </button>
          <button
            type="button"
            className={CARD_TOOL}
            title="Duplicate item"
            onClick={() => plannerCommands().duplicateInventoryItem(card.id)}
          >
            ◉
          </button>
        </span>
      </article>
    </GearTooltip>
  );
}

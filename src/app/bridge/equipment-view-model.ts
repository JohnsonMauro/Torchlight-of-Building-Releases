// What the Gear section of the Build page shows: the ten equipped slots (the item in each, or an empty slot) and the
// Inventory cards of the items not equipped (an equipped item sits in its slot only), with what a drag needs (which item a slot or card carries, which slots take it). Pure; the React view
// (apps/web/src/features/gear) renders it and src/app/gear/gear-controller.js publishes it (src/app/bridge/view-sources.ts "equipment").
// How an item looks (its rarity classes, icon) and whether the curse limit leaves it out depend on the open build, so
// the planner passes them in.
import { canDropGearInSlot } from "../../engine/gear/gear-drag.js";

/** An item as the planner lists it (an equipped item, or an Inventory entry). Other fields are not read here. */
export interface GearItem {
  id?: string;
  /** The slot the item is made for (rings are "leftRing", weapons "mainHand", whatever slot they sit in). */
  slot: string;
  name: string;
  base?: string;
  level?: number;
}
/** How the planner draws an item. */
export interface GearItemLook {
  /** The rarity classes of its card ("rarity-legendary", plus "six-affix", "priceless-item", "item-level-100"). */
  rarityClass: string;
  icon: string;
}
export interface EquipmentInput {
  /** The slots in grid order, each with its label ("Ring 1"). */
  slots: readonly (readonly [string, string])[];
  /** The calculated build's equipped items, one per slot at most. */
  items: readonly GearItem[];
  disabled: ReadonlySet<string>;
  selectedSlot: string;
  inventory: readonly (GearItem & { id: string })[];
  look: (item: GearItem) => GearItemLook;
  /** Why the curse limit leaves the item's curse out; "" when it does not. */
  curseOffReason: (item: GearItem) => string;
  isEquipped: (item: GearItem) => boolean;
  /** The Inventory entry a drag of the item in this slot carries; null when there is none (the slot cannot be dragged). */
  slotDragItem: (slot: string, item: GearItem) => GearItem | null;
}

export interface EquipmentSlotView {
  slot: string;
  label: string;
  selected: boolean;
  /** The item in the slot; null when the slot is empty or unequipped. */
  item: {
    name: string;
    /** "Lv.100" */
    level: string;
    icon: string;
    /** Rarity and base classes of the slot ("rarity-epic wand-icon"). */
    classes: string;
    curseOffReason: string;
    /** The Inventory entry a drag carries, and the slot it is made for; null when the slot cannot be dragged. */
    drag: { itemId: string; itemSlot: string; name: string; icon: string } | null;
  } | null;
}
export interface InventoryCardView {
  id: string;
  name: string;
  /** "Wand · Lv.100" (the slot's name when the item has no base). */
  detail: string;
  icon: string;
  rarityClass: string;
  /** The slot the item is made for. */
  itemSlot: string;
}
export interface EquipmentView {
  slots: EquipmentSlotView[];
  inventory: InventoryCardView[];
}

const titleCase = (value: string) =>
  value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());
const itemLevel = (item: GearItem) => `Lv.${item.level || 100}`;

/** The slots a dragged item can be dropped on. */
export const gearDropAllowed = (itemSlot: string, slot: string): boolean => canDropGearInSlot({ slot: itemSlot }, slot);

export function equipmentView(input: EquipmentInput): EquipmentView {
  const slots = input.slots.map(([slot, label]): EquipmentSlotView => {
    const item = input.items.find((entry) => entry.slot === slot);
    const base = { slot, label, selected: slot === input.selectedSlot };
    if (!item || input.disabled.has(slot)) return { ...base, item: null };
    const look = input.look(item);
    const dragged = input.slotDragItem(slot, item);
    const iconClasses = `${/scepter/i.test(item.base || "") ? " scepter-icon" : ""}${/\bwand\b/i.test(item.base || "") ? " wand-icon" : ""}`;
    return {
      ...base,
      item: {
        name: item.name,
        level: itemLevel(item),
        icon: look.icon,
        classes: `${look.rarityClass}${iconClasses}`,
        curseOffReason: input.curseOffReason(item),
        drag: dragged?.id
          ? { itemId: dragged.id, itemSlot: dragged.slot, name: dragged.name, icon: input.look(dragged).icon }
          : null,
      },
    };
  });
  return {
    slots,
    inventory: input.inventory
      .filter((item) => !input.isEquipped(item))
      .map((item) => {
        const look = input.look(item);
        return {
          id: item.id,
          name: item.name,
          detail: `${item.base || titleCase(item.slot)} · ${itemLevel(item)}`,
          icon: look.icon,
          rarityClass: look.rarityClass,
          itemSlot: item.slot,
        };
      }),
  };
}

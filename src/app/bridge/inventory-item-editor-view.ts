// What the item editor shows (Edit on a legendary or captured item in the Inventory item dialog;
// apps/web/src/features/gear/InventoryItemEditor.tsx): its fields as typed, each catalog line of a legendary with its
// controls, or each line of another item as a text field, and the preview. src/app/gear/gear-controller.js inventoryItemEditorView builds
// it. Types only.
import type { ItemPreviewView, LegendaryLineView, OptionView, SelectChoice } from "./equipment-crafter-view.ts";

/** The fields as typed (numbers stay text), and the text of each line of an item without a catalog legendary. */
export interface InventoryItemFields {
  name: string;
  level: string;
  energy: string;
  base: string;
  beltBlendId: string;
  sequenceId: string;
  /** The corrosion implicit's lines joined by " | ", or "" for none. */
  corrosion: string;
  texts: string[];
}
export interface InventoryItemEditorView {
  icon: string;
  name: string;
  /** The item's base (its slot's name without one). */
  detail: string;
  fields: {
    name: string;
    level: string;
    /** null where the slot takes no Equipment Energy. */
    energy: string | null;
    base: string;
    beltBlend: { value: string; choices: SelectChoice[] } | null;
    sequence: { value: string; choices: SelectChoice[] } | null;
    corrosion: { value: string; options: OptionView[] };
  };
  heading: string;
  /** A legendary's lines; `value` is the line as saved. */
  legendaryLines: (LegendaryLineView & { value: string })[];
  /** Another item's lines, with a slider when its catalog line has a range (the slider does not change the text). */
  textLines: {
    kind: "text";
    index: number;
    value: string;
    range: { min: number; max: number; step: number; value: number } | null;
  }[];
  corrosionLines: string[];
  preview: ItemPreviewView;
}
/** A change in the item editor (src/app/gear/gear-controller.js changeInventoryItemEditor). */
export type InventoryItemEditorChange =
  | { kind: "field"; field: Exclude<keyof InventoryItemFields, "texts">; value: string }
  | { kind: "text"; index: number; value: string }
  | { kind: "corrosion"; index: number }
  | { kind: "tier"; index: number; value: number }
  | { kind: "placeholder"; index: number; value: string }
  | { kind: "ring"; value: "left" | "right" }
  | { kind: "roll"; index: number; rangeIndex: number; value: number; commit?: boolean };

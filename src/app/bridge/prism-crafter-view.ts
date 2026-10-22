// What the Prism crafter shows (src/app/talents/prism-controller.js prismCrafterSource; apps/web/src/features/talents/PrismCrafterDialog.tsx).
// Types only.
import type { OptionView } from "./equipment-crafter-view.ts";

/** A line of a prism's affix section: an effect, or an Inverse Image's mod value. */
export type PrismSectionLine =
  | { kind: string; text: string }
  | { kind: string; label: string; value: number; sign: "negative" | "positive" | "zero" };
export interface PrismSectionView {
  className: string;
  heading: string;
  lines: PrismSectionLine[];
}
export interface PrismCrafterView {
  title: string;
  /** Editing a prism: its type is fixed. */
  editing: boolean;
  type: "ethereal" | "inverse";
  /** "pick": the type's bases as cards (no preview); "form": the picked base's affixes and the preview. */
  step: "pick" | "form";
  /** The pick page's cards: the type's bases (an Inverse Image has one), with what each holds or can roll. */
  picks: { value: string; label: string; icon: string; lines: string[] }[];
  /** The form's path: the type (back to its bases), then the base. */
  path: { label: string; back: boolean }[];
  inverse: {
    icon: string;
    description: string;
    /** Each mod value with its range, sign and the filled part of its bar (percent). */
    rolls: {
      kind: string;
      label: string;
      min: number;
      max: number;
      value: number;
      sign: string;
      start: number;
      end: number;
    }[];
  } | null;
  ethereal: {
    base: string;
    fixed: { label: string; note: string; effect: string } | null;
    count: number;
    max: number;
    /** Each random affix slot's choices ("" holds none). */
    lists: { kind: string; label: string; value: string; choices: OptionView[] }[];
  } | null;
  preview: { inverse: boolean; icon: string; name: string; area: string; sections: PrismSectionView[] } | null;
  canSave: boolean;
  saveLabel: string;
}

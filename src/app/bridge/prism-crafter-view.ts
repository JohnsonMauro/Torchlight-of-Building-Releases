// What the Prism crafter shows (src/app/app.js prismCrafterSource; apps/web/src/shell/dialogs/PrismCrafterDialog.tsx).
// Types only.

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
    bases: string[];
    fixed: { label: string; note: string; effect: string } | null;
    count: number;
    max: number;
    selects: {
      kind: string;
      label: string;
      value: string;
      /** The chosen affix's full text, or "". */
      title: string;
      options: { value: string; label: string }[];
    }[];
  } | null;
  preview: { inverse: boolean; icon: string; name: string; area: string; sections: PrismSectionView[] } | null;
  canSave: boolean;
  saveLabel: string;
}

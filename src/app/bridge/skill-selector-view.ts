// What the skill selector shows (src/app/app.js skillSelectorSource; apps/web/src/shell/dialogs/SkillSelectorDialog.tsx
// and SkillSelectorDetail.tsx). Types only.
import type { TextSegment } from "./display-text.ts";

export interface RollControlView {
  index: number;
  min: number;
  max: number;
  step: number;
  value: number;
  /** The roll's label ("Value 1 · 4–5", or the affix line it rolls). */
  label?: string;
}
export interface StarsView {
  value: number;
  /** The additional damage the stars give, in percent. */
  bonus: number;
}
/** A progression support's tiers: an Activation Medium's affix lines, or one set of rolls (with stars). */
export type ProgressionView =
  | {
      medium: true;
      tier: number;
      tiers: { tier: number; active: boolean }[];
      lines: {
        index: number;
        /** The line's place among the lines shown (a choice group shows one). */
        number: number;
        tierText: string;
        text: string;
        /** The lines of its choice group, to pick the stat it rolls; null when it has none. */
        choice: { value: number; label: string }[] | null;
        buttons: { tier: number | "off"; label: string; small: string; active: boolean }[];
        rolls: RollControlView[];
      }[];
    }
  | {
      medium: false;
      heading: string;
      tier: number;
      tiers: { tier: number; small: string; active: boolean }[];
      text: string[];
      rolls: RollControlView[];
      stars: StarsView | null;
    };
/** A star support's main affix. */
export interface SpecialView {
  tier: number;
  tiers: { tier: number; small: string; active: boolean }[];
  effect: string;
  roll: RollControlView;
  stars: StarsView;
}
export type SkillSelectorDetailView =
  | { kind: "empty"; message: string }
  /** A follower skill's detail: the HTML of src/app/follower-panel.js followerSkillSelectorView. */
  | { kind: "follower"; html: string }
  | {
      kind: "entry";
      level: number;
      progression: ProgressionView | null;
      special: SpecialView | null;
      /** "support", "aura" or "". */
      previewClass: string;
      icon: string;
      name: string;
      tags: string[];
      facts: { label: string; value: string; addedDamage: boolean }[];
      reference: string | null;
      /** One line of runs per effect, the highlighted values with their class. */
      effects: TextSegment[][];
      source: string;
      /** Every support socket is taken. */
      full: boolean;
    };
export interface SkillSelectorView {
  session: number;
  title: string;
  placeholder: string;
  /** The highlighted choice's index; -1 for none. */
  selected: number;
  /** One group without a heading, or the follower picker's Tartarus / Origin groups. */
  groups: {
    heading: string | null;
    results: { index: number; name: string; tags: string[]; icon: string; tintClass: string; search: string }[];
  }[];
  detail: SkillSelectorDetailView;
  confirm: { label: string; disabled: boolean };
}

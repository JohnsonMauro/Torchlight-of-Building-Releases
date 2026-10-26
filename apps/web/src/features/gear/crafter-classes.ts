// Class lists the equipment crafter, the item editor and the Inventory item dialog share (Tailwind utilities). The
// rarity classes (rarity-<id>, six-affix, priceless-item, item-level-100) come from the planner's view models;
// itemCardLook picks an item card's colours and art from them.
import { RARITY_ART, artBackground } from "./gear-classes";

/** The crafter and the item editor: a tall dialog whose body fills it between header and footer; the width is the user's. */
export const CRAFTER_DIALOG =
  "dialog-panel h-[min(780px,calc(100vh-2rem))] flex-col leading-[normal] open:flex max-[800px]:h-[calc(100vh-2rem)]";
export const CRAFTER_HEAD = "dialog-head shrink-0";
export const CRAFTER_EYEBROW = "mb-1 text-xs font-bold tracking-wider text-accent uppercase";
export const CRAFTER_BODY = "flex min-h-0 flex-1 flex-col";
export const CRAFTER_FOOTER = "flex shrink-0 items-center justify-end gap-2.5 border-t border-line bg-raised px-4 py-3";
export const FOOTER_BUTTON = "px-3.5 py-2 text-xs font-bold tracking-wide uppercase";

/** A crafter view: a form column that scrolls on its own beside the preview; one column on a narrow screen. */
export const CRAFT_LAYOUT =
  "grid min-h-0 flex-1 grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] grid-rows-[minmax(0,1fr)] max-[800px]:flex max-[800px]:flex-col max-[800px]:overflow-auto";
export const CRAFT_FORM =
  "grid min-h-0 content-start gap-3 overflow-auto border-r border-line p-4 max-[800px]:shrink-0 max-[800px]:overflow-visible max-[800px]:border-r-0";
/** The same column under a path (ui/CraftColumn): the column's frame, and its scrolling content. */
export const CRAFT_FORM_COLUMN = "border-r border-line max-[800px]:shrink-0 max-[800px]:border-r-0";
export const CRAFT_FORM_BODY = "max-[800px]:overflow-visible";
export const CRAFT_ASIDE = "min-h-0 overflow-auto p-4 max-[800px]:shrink-0 max-[800px]:overflow-visible";
export const CRAFT_HEADING = "mt-2 border-t border-line pt-3 text-sm font-bold";

/** A labelled field and its input or select. */
export const FIELD = "grid min-w-0 gap-1 text-xs text-muted";
export const CONTROL = "field min-w-0 max-w-full px-2.5 py-2 text-sm text-ellipsis";
export const FIELD_PAIR = "grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-3 max-[800px]:grid-cols-1";

export const ROLL_VALUE = "block text-right text-xs text-info not-italic";

/**
 * A row of an affix list (AffixList.tsx) or a legendary line (crafter-parts.tsx LegendaryModControl), one pattern for
 * both: its text on the left, its tier chips on the right (TIER_CHIPS), its rolls under them. The row's colours are one
 * of the AFFIX_ROW_* looks.
 */
export const AFFIX_ROW = "grid gap-2 rounded border px-2.5 py-2 text-sm text-text";
export const AFFIX_ROW_HEAD = "flex items-center gap-2.5";
export const AFFIX_ROW_PLAIN = "border-line bg-raised";
export const AFFIX_ROW_OPEN = "border-line bg-raised hover:border-accent";
export const AFFIX_ROW_BLOCKED = "border-line bg-raised opacity-50";
export const AFFIX_ROW_CHECKED = "border-accent/60 bg-raised";
export const AFFIX_ROW_LEGENDARY = "border-grade-legendary/60 bg-grade-legendary/10";
export const AFFIX_ROW_CORRODED = "border-violet/60 bg-violet/10";
/** A row's tier chips, lowest tier first, the one it holds lit (each a tier badge, tier-badge.ts). */
export const TIER_CHIPS = "flex shrink-0 flex-wrap justify-end gap-1";
export const TIER_CHIP = "cursor-pointer";
export const TIER_CHIP_OTHER = "opacity-40 hover:opacity-100";

/** A modifier line's box (a fixed or corroded line of the item editor), and its Normal / Corroded tag. */
const MOD_BOX_BASE = "grid gap-2 rounded border px-3 py-2.5 text-xs";
export const MOD_BOX = `${MOD_BOX_BASE} border-line bg-raised`;
export const MOD_BOX_CORRODED = `${MOD_BOX_BASE} border-violet/60 bg-violet/10`;
const MOD_TAG_BASE = "shrink-0 rounded-sm border px-1.5 py-1 text-[10px] font-bold";
export const MOD_TAG = `${MOD_TAG_BASE} border-line-strong bg-sunken text-muted`;
export const MOD_TAG_CORRODED = `${MOD_TAG_BASE} border-violet bg-violet/15 text-violet`;
/** A line's labelled choice (the ring effect): label on the left, its chips on the right. */
export const MOD_CHOICE = "grid grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] items-center gap-3 text-xs text-muted";

/** The selected legendary's card above the editor fields, with its name, detail and Change button. */
export const SELECTED_CARD =
  "grid grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-grade-legendary/60 bg-raised p-3";
export const SELECTED_ICON = "size-11.5 rounded-sm bg-grade-legendary/15 object-contain";
export const SELECTED_NAME = "block text-base font-bold text-grade-legendary";
export const SELECTED_DETAIL = "block text-sm text-muted";
export const SELECTED_CHANGE = "btn px-2.5 py-1 text-xs";

// The rarity colour as two custom properties the card's parts read: the name's and the frame's (one grade-* token each;
// priceless, six-affix and item level 100 pink is violet).
const TINT: Readonly<Record<string, string>> = {
  common: "[--item-name:var(--color-grade-normal)] [--item-frame:var(--color-grade-normal)]",
  magic: "[--item-name:var(--color-grade-magic)] [--item-frame:var(--color-grade-magic)]",
  epic: "[--item-name:var(--color-grade-rare)] [--item-frame:var(--color-grade-rare)]",
  legendary: "[--item-name:var(--color-grade-legendary)] [--item-frame:var(--color-grade-legendary)]",
  vorax: "[--item-name:var(--color-grade-vorax)] [--item-frame:var(--color-grade-vorax)]",
};
const PLAIN_TINT = "[--item-name:var(--color-text)] [--item-frame:var(--color-line-strong)]";
/** Priceless, six-affix and item level 100: pink, as the gear tooltip's frame. */
const PRICELESS_TINT = "[--item-name:var(--color-grade-priceless)] [--item-frame:var(--color-grade-priceless)]";
/** The item preview's item level 100 art (taller than the Inventory card's). */
const LEVEL_100_ART = "bg-[url(../../../../src/assets/item-level-100-background.png)]";

/**
 * An item card's look from its rarity classes: the colours its parts read and the art behind it, under the surface veil
 * that keeps its text legible in both themes. Item level 100, priceless and six affixes take over the name and frame
 * colours and replace the art of a common, magic or epic item, as on the Inventory cards. Picked here rather than by
 * variants on the classes because the e2e tests read them (`toHaveClass(/\brarity-legendary\b/)`). The element is
 * `relative` (the veil is positioned in it).
 */
export function itemCardLook(classes: string): string {
  const names = new Set(classes.split(/\s+/));
  const rarity = [...names].find((name) => name.startsWith("rarity-"))?.slice("rarity-".length) ?? "";
  const levelHundred = names.has("item-level-100"),
    priceless = names.has("priceless-item"),
    sixAffix = names.has("six-affix");
  const tint = levelHundred || priceless || sixAffix ? PRICELESS_TINT : TINT[rarity] || PLAIN_TINT;
  const art =
    rarity === "legendary" || rarity === "vorax"
      ? artBackground(RARITY_ART[rarity])
      : levelHundred
        ? artBackground(LEVEL_100_ART)
        : priceless
          ? "bg-grade-priceless/15"
          : sixAffix
            ? "bg-grade-priceless/10"
            : RARITY_ART[rarity]
              ? artBackground(RARITY_ART[rarity])
              : "bg-raised";
  return `text-text ${tint} ${art}`;
}

// The class lists the talent trees, the prism and the slate dialogs share (TalentTree, TalentPanelPickerDialog,
// CoreTalentPickerDialog, PrismInventoryDialog, PrismCrafterDialog, SlateInventoryDialog, SlateCrafter,
// SlateEditorDialog).

/**
 * A god family's colour, by the view model's `talent-family-<family>` class: `--talent-emblem`, which paints the tree's
 * emblem (TalentEmblem) and a god slate's title. A tree without a family is muted.
 */
const FAMILY_TINTS: Record<string, string> = {
  "god-of-might": "[--talent-emblem:var(--color-god-might)]",
  "goddess-of-hunting": "[--talent-emblem:var(--color-god-hunting)]",
  "goddess-of-knowledge": "[--talent-emblem:var(--color-god-knowledge)]",
  "god-of-war": "[--talent-emblem:var(--color-god-war)]",
  "goddess-of-deception": "[--talent-emblem:var(--color-god-deception)]",
  "god-of-machines": "[--talent-emblem:var(--color-god-machines)]",
};
const NO_FAMILY_TINT = "[--talent-emblem:var(--color-muted)]";

/** The family tint of a class list that may hold a `talent-family-*` class. */
export function familyTint(classes: string): string {
  const family = /\btalent-family-([a-z-]+)/.exec(classes)?.[1] ?? "";
  return FAMILY_TINTS[family] ?? NO_FAMILY_TINT;
}

/** A god slate's tile colour (the cells of its shape), by god key; the gods' family colours. */
const GOD_TILES: Record<string, string> = {
  hunting: "[&>i]:bg-god-hunting",
  knowledge: "[&>i]:bg-god-knowledge",
  machines: "[&>i]:bg-god-machines",
  might: "[&>i]:bg-god-might",
  war: "[&>i]:bg-god-war",
};
export const godTile = (godKey: string): string => GOD_TILES[godKey] ?? "[&>i]:bg-god-deception";

// ---- Dialog frames.
/** A picker's heading: eyebrow, title and note on the left, the × on the right; stays on top while scrolling. */
export const PICKER_HEAD = "dialog-head sticky top-0 z-2 items-start px-5 py-4";
/** The small caps line over a title (Talent trees, Core talent, Legendary template). */
export const EYEBROW = "text-xs font-bold tracking-widest text-accent uppercase";
export const PICKER_TITLE = "dialog-title my-0.5 text-lg";
export const PICKER_NOTE = "text-sm text-muted";
export const PICKER_CLOSE = "picker-close dialog-close shrink-0";
/** A dialog footer strip. */
export const FOOTER = "border-t border-line bg-raised";
/** A "Preview" caption over a preview card. */
export const PREVIEW_CAPTION = "mt-1 mb-2.5 block";

// ---- Fields.
/** A text field or select in a form. */
export const FIELD = "field w-full min-h-10 px-3 py-2";
/** A read-only text box (a fixed effect). */
export const READONLY = "block w-full rounded-sm border border-line bg-sunken p-2.5 text-muted";
/** A form section's heading (Random Affixes, Mod Values). */
export const FORM_HEADING = "my-3.5 text-sm font-bold text-muted";

// ---- The slate forms (crafter and editor).
export const SLATE_LAYOUT =
  "grid h-full grid-cols-[minmax(0,1fr)_280px] gap-6.5 px-3 pt-4.5 pb-3 max-[760px]:h-auto max-[760px]:grid-cols-1";
export const SLATE_SECTION =
  "min-h-0 overflow-auto border-r border-line pr-5 pl-3 max-[760px]:min-h-auto max-[760px]:overflow-visible max-[760px]:border-r-0 max-[760px]:pr-0";
export const SLATE_ASIDE = "flex min-h-0 flex-col p-0.5 text-muted max-[760px]:min-h-45";
export const SLATE_FIELDSET = "my-4";
export const SLATE_LEGEND = "mb-2.5 block text-xs text-muted";
export const SLATE_AFFIX_ROW = "slate-affix-row grid grid-cols-[48px_1fr] items-center gap-2 text-xs text-muted";
export const SLATE_AFFIX_FIELD = "field w-full my-1 p-2.5 text-sm";
/** A small chip button (Rotate, Flip, a god, a shape): an accent fill when chosen (`.active`). */
export const SLATE_CHIP =
  "cursor-pointer rounded-sm border border-line bg-raised text-text hover:border-accent focus-visible:border-accent focus-visible:outline-none on:border-accent on:bg-accent on:text-on-accent";
export const SLATE_TRANSFORM = `${SLATE_CHIP} px-2 py-1 text-xs`;
/** The slate dialogs' buttons (Back to Inventory, Add affix, Change) and their call to action (Add, Save, Craft). */
export const SLATE_BUTTON = "btn px-3.5 py-2 text-xs font-bold tracking-wide uppercase";
export const SLATE_PRIMARY = "btn-primary px-3.5 py-2 text-xs font-bold tracking-wide uppercase";
/**
 * A slate's preview card over the slate art, veiled in the surface colour so text reads in both themes; `text-*` and the
 * bottom edge colour are the card kind's.
 */
export const SLATE_CARD =
  "mt-2.5 grid items-center gap-x-2.5 gap-y-1 rounded-md border border-b-2 bg-sunken bg-[image:var(--veil),url(../../../../src/assets/slate-preview-tooltip-background.png)] bg-cover bg-center bg-no-repeat p-4";
/** A legendary slate's card colours (the crafter's legendary form, the editor). */
export const SLATE_CARD_LEGENDARY = "border-line border-b-grade-legendary text-grade-legendary";
export const SLATE_CARD_ART = "row-span-2 w-full object-contain";
export const SLATE_CARD_TITLE = "block text-base font-bold";
export const SLATE_CARD_RARITY = "mt-2 block text-xs text-muted";
/** The affix list under a slate's preview card. */
export const SLATE_AFFIX_PREVIEW =
  "slate-craft-affix-preview col-span-full mt-2.5 border-t border-line pt-2.5 text-text [&>p]:text-xs [&>p]:text-muted [&>section+section]:mt-3";
export const SLATE_AFFIX_HEADING = "mb-2 text-[10px] font-bold tracking-wider text-muted uppercase";
export const SLATE_AFFIX_LIST = "grid gap-2";
export const SLATE_AFFIX_ITEM = "text-xs leading-snug [overflow-wrap:anywhere]";
export const SLATE_AFFIX_LIMITED = "-ml-2 border-l-3 border-warn bg-warn/10 px-2 py-1";
export const SLATE_AFFIX_TREE = "mb-0.5 block text-xs text-muted";
export const MAX_DIVINITY_BADGE =
  "max-divinity-badge my-1 inline-block rounded-sm bg-warn px-1.5 py-0.5 text-[10px] leading-tight font-black tracking-wide whitespace-nowrap text-on-accent";

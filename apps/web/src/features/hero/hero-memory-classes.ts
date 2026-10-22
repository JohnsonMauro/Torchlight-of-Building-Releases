// Class strings of the hero memory dialog (HeroMemorySelectorDialog.tsx) and its crafter (HeroMemoryCrafter.tsx): a
// memory's rarity accent, the inventory rows and their buttons, the crafter's form controls and the preview card (its
// affix tier badges: src/app/gear/tier-badge.ts). States the tests read (active, incompatible, special, wax-applied) are
// passed in or come from the `on:` variant, never spelled in a class.

// A memory's rarity as two custom properties its parts read: the accent and a faint tint (the grade-* tokens).
const accents: Record<string, string> = {
  normal:
    "[--memory-accent:var(--color-grade-normal)] [--memory-tint:color-mix(in_oklab,var(--color-grade-normal)_15%,transparent)]",
  magic:
    "[--memory-accent:var(--color-grade-magic)] [--memory-tint:color-mix(in_oklab,var(--color-grade-magic)_15%,transparent)]",
  epic: "[--memory-accent:var(--color-grade-rare)] [--memory-tint:color-mix(in_oklab,var(--color-grade-rare)_15%,transparent)]",
  legendary:
    "[--memory-accent:var(--color-grade-legendary)] [--memory-tint:color-mix(in_oklab,var(--color-grade-legendary)_15%,transparent)]",
  ultimate:
    "[--memory-accent:var(--color-grade-vorax)] [--memory-tint:color-mix(in_oklab,var(--color-grade-vorax)_15%,transparent)]",
};
/** Sets --memory-accent and --memory-tint to the rarity's colours. */
export const memoryAccent = (rarity: string): string => accents[rarity] ?? accents.normal;

// ---- The inventory -----------------------------------------------------------------------------------------------
export const inventoryItem =
  "mb-2 grid grid-cols-[42px_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-2 rounded-md border border-l-3 border-line border-l-(--memory-accent) bg-raised p-2.5 max-[700px]:flex max-[700px]:flex-wrap";
export const inventoryButton = "btn px-2 py-1.5 text-xs";
/** Unequip slot, Craft Memory: the footer's buttons. */
export const memoryFooterButton = "min-h-8.5 px-3.5 text-xs font-bold tracking-wider uppercase";

// ---- The crafter's form ------------------------------------------------------------------------------------------
/** The form column: labelled rows, section headings, selects. */
export const crafterForm =
  "grid min-h-0 content-start gap-3.75 overflow-auto border-r border-line pr-3.75 max-[700px]:max-h-[48vh] max-[700px]:border-r-0 max-[700px]:border-b max-[700px]:pr-0 max-[700px]:pb-3.75 [&_option]:bg-surface [&_optgroup]:bg-surface [&_select]:w-full [&_select]:rounded-sm [&_select]:border [&_select]:border-line-strong [&_select]:bg-sunken [&_select]:p-2.5 [&_select]:text-text [&_select]:focus:border-accent [&_select]:focus:outline-none [&>h3]:mt-1.25 [&>h3]:text-xs [&>h3]:font-bold [&>h3]:text-muted [&>label:not(.memory-wax)]:grid [&>label:not(.memory-wax)]:gap-1.75 [&>label:not(.memory-wax)]:text-xs [&>label:not(.memory-wax)]:text-muted";
export const choiceRow = "flex flex-wrap gap-1.75";
const choiceButton = "cursor-pointer rounded-sm border px-2.75 py-2";
/** A memory type: icon and name, accent once chosen. */
export const typeButton = `${choiceButton} inline-flex items-center gap-1.75 border-line bg-raised text-text hover:border-line-strong on:border-accent on:bg-accent/15 on:text-accent`;
/** A crafting rarity, in its accent; filled with its tint once chosen. */
export const rarityButton = `${choiceButton} border-[color-mix(in_oklab,var(--memory-accent)_35%,var(--color-line))] bg-raised text-(--memory-accent) on:border-(--memory-accent) on:bg-(--memory-tint)`;
/** A tier choice (T0, T1…) of an affix line or the revived affix. */
export const tierButton =
  "flex-1 cursor-pointer rounded-sm border border-line-strong bg-raised px-1.5 py-0.75 text-muted on:border-accent on:bg-accent/15 on:text-accent";
export const rollControls = "grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-2.5";
/** Wax and Wane / Rising Moon: the label row and its switch. */
export const switchRow =
  "flex cursor-pointer items-center justify-between rounded-md border border-line px-2.5 py-2 text-xs text-muted";
export const switchInput =
  "relative h-6 w-10.5 flex-none cursor-pointer appearance-none rounded-full border border-line-strong bg-sunken before:absolute before:top-0.75 before:left-0.75 before:size-4 before:rounded-full before:bg-muted before:transition-transform before:content-[''] checked:border-accent checked:bg-accent checked:before:translate-x-4.5 checked:before:bg-on-accent focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent";

// ---- The preview -------------------------------------------------------------------------------------------------
/** The preview card: its rarity's border over its tint (text sits on it, so no card art: the art is dark in both themes). */
export const previewCard =
  "mt-2 rounded-md border border-(--memory-accent) bg-(--memory-tint) p-3 leading-snug text-text [&_h4]:mt-2.5 [&_h4]:mb-0.75 [&_h4]:text-[10px] [&_h4]:font-bold [&_h4]:text-muted [&_h4]:uppercase";
export const affixRow = "my-1 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 text-xs leading-snug text-text";

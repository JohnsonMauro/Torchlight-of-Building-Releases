// Class strings of the hero memory dialog (HeroMemorySelectorDialog.tsx) and its crafter (HeroMemoryCrafter.tsx): a
// memory's rarity accent, the inventory rows and their buttons, the crafter's form controls and the preview card (its
// affix tier badges: src/app/gear/tier-badge.ts). States the tests read (active, incompatible, special, wax-applied) are
// passed in or come from the `on:` variant, never spelled in a class.

const accents: Record<string, string> = {
  normal: "[--memory-accent:#d6dce2] [--memory-tint:#343b44]",
  magic: "[--memory-accent:#50d0f4] [--memory-tint:#10384a]",
  epic: "[--memory-accent:#d96bf2] [--memory-tint:#392044]",
  legendary: "[--memory-accent:#ff993f] [--memory-tint:#492714]",
  ultimate: "[--memory-accent:#ff635c] [--memory-tint:#4b1f20]",
};
/** Sets --memory-accent and --memory-tint to the rarity's colours. */
export const memoryAccent = (rarity: string): string => accents[rarity] ?? accents.normal;

// ---- The inventory -----------------------------------------------------------------------------------------------
export const inventoryItem =
  "mb-2 grid grid-cols-[42px_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-2.25 rounded-[7px] border border-l-3 border-[#695437] border-l-(--memory-accent) bg-[linear-gradient(100deg,rgb(210_151_63/0.09),#192131_48%)] p-2.5 max-[700px]:flex max-[700px]:flex-wrap";
export const inventoryButton =
  "cursor-pointer rounded-[4px] border border-[#8d6937] bg-[linear-gradient(#3e3326,#1b2026)] px-2.25 py-1.5 text-[#e6c991] enabled:hover:border-[#e7b35d] enabled:hover:bg-[linear-gradient(#604525,#222329)] enabled:hover:text-[#fff1bd] off:cursor-not-allowed off:opacity-40";
/** Unequip slot, Craft Memory: the footer's bronze buttons. */
export const memoryFooterButton =
  "btn-bronze min-h-8.5 px-3.5 text-[0.7rem] font-extrabold tracking-[0.08em] uppercase";

// ---- The crafter's form ------------------------------------------------------------------------------------------
/** The form column: labelled rows, section headings, selects. */
export const crafterForm =
  "grid min-h-0 content-start gap-3.75 overflow-auto border-r border-[#303945] pr-3.75 max-[700px]:max-h-[48vh] max-[700px]:border-r-0 max-[700px]:border-b max-[700px]:pr-0 max-[700px]:pb-3.75 [&_option]:bg-[#121820] [&_optgroup]:bg-[#121820] [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-[#5a4b38] [&_select]:bg-[#0c131b] [&_select]:p-2.5 [&_select]:text-[#eaf0f6] [&>h3]:mt-1.25 [&>h3]:text-[0.75rem] [&>h3]:font-bold [&>h3]:text-[#b0bac5] [&>label:not(.memory-wax)]:grid [&>label:not(.memory-wax)]:gap-1.75 [&>label:not(.memory-wax)]:text-[0.75rem] [&>label:not(.memory-wax)]:text-[#aeb8c5]";
export const choiceRow = "flex flex-wrap gap-1.75";
const choiceButton = "cursor-pointer rounded-[5px] border px-2.75 py-2";
/** A memory type: icon and name, ember once chosen. */
export const typeButton = `${choiceButton} inline-flex items-center gap-1.75 border-[#2b3544] bg-[#202838] text-[#cbd5df] hover:border-[#806037] on:border-[#f4811c] on:bg-[#34261c] on:text-[#ffb36b]`;
/** A crafting rarity, in its accent; filled with its tint once chosen. */
export const rarityButton = `${choiceButton} border-[color-mix(in_srgb,var(--memory-accent)_35%,#2b3544)] bg-[#202838] text-(--memory-accent) on:border-(--memory-accent) on:bg-(--memory-tint) on:shadow-[inset_0_0_0_1px_var(--memory-accent)]`;
/** A tier choice (T0, T1…) of an affix line or the revived affix. */
export const tierButton =
  "flex-1 cursor-pointer rounded-[4px] border border-[#526071] bg-[#2b3543] px-1.5 py-0.75 text-[#b9c6d3] on:border-[#ffad51] on:bg-[#4b3522] on:text-[#ffd29a]";
export const rollControls = "grid grid-cols-[minmax(0,1fr)_82px] items-center gap-2.5";
/** Wax and Wane / Rising Moon: the label row and its switch. */
export const switchRow =
  "flex cursor-pointer items-center justify-between rounded-md border border-[#5a4b38] px-2.5 py-2 text-[0.75rem] text-[#aeb8c5]";
export const switchInput =
  "relative h-6 w-10.5 flex-none cursor-pointer appearance-none rounded-[14px] border border-[#526071] bg-[#303a47] before:absolute before:top-0.75 before:left-0.75 before:size-4 before:rounded-full before:bg-[#e5ebf1] before:shadow-[0_1px_3px_#0007] before:transition-transform before:content-[''] checked:border-[#f59a3f] checked:bg-[#b95e16] checked:before:translate-x-4.5 checked:before:bg-[#fff3df] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ffb569]";

// ---- The preview -------------------------------------------------------------------------------------------------
/** The preview card's frame; its rarity border and art are added by the caller. */
export const previewCard =
  "mt-2.25 rounded-lg border p-3.25 leading-[1.4] text-[#e9e7e6] [&_h4]:mt-2.5 [&_h4]:mb-0.75 [&_h4]:text-[0.65rem] [&_h4]:font-bold [&_h4]:text-[#bbad9e] [&_h4]:uppercase";
export const affixRow =
  "my-1 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2.25 text-[0.72rem] leading-[1.4] text-[#f1f3f5]";

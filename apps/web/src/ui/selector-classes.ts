// Class strings shared by the hero-side and pact picker dialogs (hero, follower, Sage's scent, Carino's ammo, Pactspirit,
// Kismet, Fate slots, hero memories): the dialog panel laid out as a column once open, its search box, the raised card a
// choice sits on (accent once chosen), and the footer's buttons. A chosen state is passed in, never spelled as a
// variant of its class (the e2e tests read `selected` off the class list).

/**
 * A picker dialog: the dialog panel (dialog-panel), a column once open. Only `open:` may set its display: a closed
 * <dialog> keeps the browser's display:none.
 */
export const pickerDialog = "dialog-panel leading-[normal] open:flex open:flex-col";
/** The framed search label (⌕ and the input). */
export const searchLabel = "field-search m-4 shrink-0";
export const searchGlyph = "text-xl leading-none text-accent";
export const searchInput = "flex-1 placeholder:text-dim";
/** A bare search input or select (Pactspirit and Kismet filters). */
export const fieldInput = "field p-2.5 placeholder:text-dim";
/** "No … match": a line across the list. */
export const emptyNote = "col-span-full p-5 text-center text-muted";

const cardIdle = "border-line bg-raised hover:border-accent focus-visible:border-accent";
const cardChosen = "border-accent bg-accent/10";
/** A choice's card colours: a line edge taking the accent on hover and focus, or an accent tint when it is the current one. */
export const pickCard = (chosen: boolean): string => (chosen ? cardChosen : cardIdle);

/** The footer's button bar and its buttons (Clear Slot, Cancel…). */
export const footerBar = "flex shrink-0 justify-end gap-2.5 border-t border-line px-4 py-3";
export const footerButton = "btn h-8 px-3.5 text-xs font-bold tracking-wider uppercase";

// ---- Hero and follower selectors: a grid of portrait cards ---------------------------------------------------------
export const portraitDialog = `${pickerDialog} h-162.5 w-225`;
export const portraitGrid =
  "grid min-h-0 flex-1 grid-cols-4 content-start gap-4 overflow-auto px-4 pb-4 max-[700px]:grid-cols-2 max-[700px]:gap-2";
/** A portrait card; the chosen one also gives its portrait's border the accent. */
export const portraitCard = (chosen: boolean): string =>
  `grid min-h-34 cursor-pointer content-center justify-items-center gap-1.5 rounded-md border p-3 text-text outline-none max-[700px]:min-h-31 ${pickCard(chosen)} ${chosen ? "[&>:first-child]:border-accent" : ""}`;
/** The portrait's box; its border colour is the caller's. */
export const portraitImage = "size-16 rounded-lg border-2 object-cover";
export const portraitFallback =
  "grid size-16 place-items-center rounded-lg border-2 border-line-strong bg-sunken font-display text-lg font-bold text-accent-strong";
export const portraitName = "block text-center font-display text-sm";
export const portraitCaption = "block text-center text-xs";

// ---- Sage's scent and Carino's ammo: a list of icon rows -----------------------------------------------------------
export const rowDialog = `${pickerDialog} w-162.5`;
export const rowList = "grid max-h-117.5 min-h-0 flex-1 content-start gap-2 overflow-auto px-3 pb-3";
export const rowChoice = `grid min-h-18 cursor-pointer grid-cols-[48px_1fr] items-center gap-3 rounded-md border px-3 py-2.5 text-left text-text outline-none not-has-[img]:grid-cols-1 off:cursor-default off:opacity-45 ${cardIdle}`;
export const rowName = "block text-base font-semibold";
export const rowNote = "mt-1.5 block text-xs text-muted";
export const rowTag = "chip mr-1 px-1.5 py-0.5 text-[10px] text-accent not-italic";
/** A support's round art in Carino's list: the picture over the frame's ◆. */
export const ammoArt =
  "relative grid size-11 place-items-center overflow-hidden rounded-full border border-line-strong bg-sunken text-accent-strong [&>img]:absolute [&>img]:inset-0 [&>img]:size-full [&>img]:object-cover [&>img+span]:invisible";

// ---- Sliders and number fields (Kismet values, the memory crafter's rolls) -------------------------------------------
/** A slider whose accent fill follows --range-fill (src/app/planner/range-fill.js keeps it up to date), with a round knob. */
export const rangeField =
  "h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full border border-line-strong bg-[linear-gradient(to_right,var(--color-accent)_var(--range-fill,0%),var(--color-sunken)_var(--range-fill,0%))] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:bg-surface [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:bg-surface";
export const numberField = "field w-20.5 px-1 py-1.5 text-center tabular-nums";

// ---- Pactspirit selector: a choice takes its rarity's colours ------------------------------------------------------
// The card sets --pact-accent (caption), --pact-border, --pact-glow and --pact-dark for its children
// (PactspiritSelectorDialog's portrait and caption read them). Spelled out in full: Tailwind only sees whole class names.
const pactRarities: Record<string, string> = {
  magic:
    "[--pact-accent:var(--color-grade-magic)] [--pact-border:color-mix(in_oklab,var(--color-grade-magic)_55%,var(--color-line))] [--pact-glow:color-mix(in_oklab,var(--color-grade-magic)_10%,var(--color-raised))] [--pact-dark:var(--color-raised)]",
  rare: "[--pact-accent:var(--color-grade-rare)] [--pact-border:color-mix(in_oklab,var(--color-grade-rare)_55%,var(--color-line))] [--pact-glow:color-mix(in_oklab,var(--color-grade-rare)_10%,var(--color-raised))] [--pact-dark:var(--color-raised)]",
  legendary:
    "[--pact-accent:var(--color-grade-legendary)] [--pact-border:color-mix(in_oklab,var(--color-grade-legendary)_55%,var(--color-line))] [--pact-glow:color-mix(in_oklab,var(--color-grade-legendary)_10%,var(--color-raised))] [--pact-dark:var(--color-raised)]",
};
const pactPlain =
  "[--pact-accent:var(--color-accent)] [--pact-border:var(--color-line)] [--pact-glow:var(--color-raised)] [--pact-dark:var(--color-raised)]";
/** A Pactspirit card: border, tint and caption in its rarity's colours. */
export const pactChoice = (rarity: string): string =>
  `flex min-h-28.75 cursor-pointer items-start gap-2.75 rounded-md border border-(--pact-border) bg-(--pact-glow) p-3 text-left text-text outline-none hover:border-(--pact-accent) focus-visible:border-(--pact-accent) ${pactRarities[rarity.toLowerCase()] ?? pactPlain}`;

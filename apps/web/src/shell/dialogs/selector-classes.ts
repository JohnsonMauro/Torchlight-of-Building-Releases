// Class strings shared by the hero-side and pact picker dialogs (hero, follower, Sage's scent, Carino's ammo, Pactspirit,
// Kismet, Fate slots, hero memories): the bronze panel laid out as a column once open, its search box, the dark card a
// choice sits on (gold once chosen), and the footer's bronze buttons. A chosen state is passed in, never spelled as a
// variant of its class (the e2e tests read `selected` off the class list).

/**
 * A picker dialog: the bronze panel (dialog-panel), a column once open. Only `open:` may set its display: a closed
 * <dialog> keeps the browser's display:none.
 */
export const pickerDialog = "dialog-panel leading-[normal] open:flex open:flex-col";
/** The framed search label (⌕ and the input). */
export const searchLabel = "field-search m-4 shrink-0";
export const searchGlyph = "text-[1.3rem] leading-none text-gold";
export const searchInput = "flex-1 placeholder:text-[#99a5af]";
/** A bare search input or select (Pactspirit and Kismet filters). */
export const fieldInput =
  "rounded-[4px] border border-[#756044] bg-[linear-gradient(#171e27,#0c131b)] p-2.75 text-[#f0e9dd] placeholder:text-[#99a5af] focus:outline-1 focus:outline-offset-1 focus:outline-[#e7b35d]";
/** "No … match": a line across the list. */
export const emptyNote = "col-span-full p-5 text-center text-[#8e9baa]";

const cardIdle =
  "border-[#554a3a] bg-[linear-gradient(145deg,#1d252d,#151b23)] shadow-[inset_0_1px_rgb(255_231_165/0.05)] hover:border-[#e7b35d] hover:bg-[linear-gradient(145deg,#342e25,#1b2229)] focus-visible:border-[#e7b35d] focus-visible:bg-[linear-gradient(145deg,#342e25,#1b2229)]";
const cardChosen =
  "border-gold bg-[linear-gradient(145deg,#483723,#20252b_72%)] shadow-[inset_0_1px_rgb(255_231_165/0.2),0_0_15px_rgb(249_202_101/0.13)]";
/** A choice's card colours: bronze edge brightening on hover and focus, or gold when it is the current one. */
export const pickCard = (chosen: boolean): string => (chosen ? cardChosen : cardIdle);

/** The footer's button bar and its bronze buttons (Clear Slot, Cancel…). */
export const footerBar = "flex shrink-0 justify-end gap-2.5 border-t border-[#806037] px-4 py-3.25";
export const footerButton = "btn-bronze min-h-8.5 px-3.5 text-[0.68rem] font-extrabold tracking-[0.08em] uppercase";

// ---- Hero and follower selectors: a grid of portrait cards ---------------------------------------------------------
export const portraitDialog = `${pickerDialog} h-162.5 w-225`;
export const portraitGrid =
  "grid min-h-0 flex-1 grid-cols-4 content-start gap-3.75 overflow-auto px-4 pb-4.5 max-[700px]:grid-cols-2 max-[700px]:gap-2.25";
/** A portrait card; the chosen one also gilds its portrait's border. */
export const portraitCard = (chosen: boolean): string =>
  `grid min-h-34 cursor-pointer content-center justify-items-center gap-1.5 rounded-[4px] border p-3.25 text-[#e9edf3] outline-none max-[700px]:min-h-31.25 ${pickCard(chosen)} ${chosen ? "[&>:first-child]:border-gold" : ""}`;
/** The portrait's box; its border colour is the caller's. */
export const portraitImage = "size-16 rounded-lg border-2 object-cover";
export const portraitFallback =
  "grid size-16 place-items-center rounded-lg border-2 border-[#806037] bg-[radial-gradient(circle_at_35%_30%,#3a465c,#111823)] font-serif text-[1.1rem] font-bold text-[#ff9943]";
export const portraitName = "block text-center font-display text-[0.86rem]";
export const portraitCaption = "block text-center text-[0.72rem]";

// ---- Sage's scent and Carino's ammo: a list of icon rows -----------------------------------------------------------
export const rowDialog = `${pickerDialog} w-162.5`;
export const rowList = "grid max-h-117.5 min-h-0 flex-1 content-start gap-2 overflow-auto px-3 pb-3";
export const rowChoice = `grid min-h-18 cursor-pointer grid-cols-[48px_1fr] items-center gap-3 rounded-[4px] border px-3 py-2.5 text-left text-[#e6eaf0] outline-none not-has-[img]:grid-cols-1 off:cursor-default off:opacity-45 ${cardIdle}`;
export const rowName = "block text-base font-semibold";
export const rowNote = "mt-1.5 block text-[0.64rem] text-[#9ca8b5]";
export const rowTag =
  "mr-1.25 inline-block rounded-[2px] border border-[#806037] bg-[#211c15] px-1.5 py-0.75 text-[0.64rem] text-gold not-italic";
/** A support's round art in Carino's list: the picture over the frame's ◆. */
export const ammoArt =
  "relative grid size-11 place-items-center overflow-hidden rounded-full border border-[#695039] bg-[#10151c] text-ember [&>img]:absolute [&>img]:inset-0 [&>img]:size-full [&>img]:object-cover [&>img+span]:invisible";

// ---- Sliders and number fields (Kismet values, the memory crafter's rolls) -------------------------------------------
/** A slider whose gold fill follows --range-fill (src/app/planner/range-fill.js keeps it up to date), with a gold knob. */
export const rangeField =
  "h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full border border-[#a67736] bg-[linear-gradient(90deg,#f9ca65_0%,#e8ad4f_var(--range-fill,0%),#39434d_var(--range-fill,0%),#252d37_100%)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold [&::-webkit-slider-thumb]:size-4.25 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gold-pale [&::-webkit-slider-thumb]:bg-[radial-gradient(circle_at_35%_30%,#fff0b0,#e8ad4f_58%,#a66b2c)] [&::-moz-range-thumb]:size-4.25 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-gold-pale [&::-moz-range-thumb]:bg-[radial-gradient(circle_at_35%_30%,#fff0b0,#e8ad4f_58%,#a66b2c)]";
export const numberField =
  "w-20.5 rounded-[4px] border border-[#5a4b38] bg-[#0c131b] px-1.25 py-1.75 text-center text-[#f1e5cc] tabular-nums focus:outline-1 focus:outline-[#e7b35d]";

// ---- Pactspirit selector: a choice takes its rarity's colours ------------------------------------------------------
const pactRarityVars: Record<string, string> = {
  magic: "[--pact-accent:#69d6f5] [--pact-border:#278bae] [--pact-glow:#173c51] [--pact-dark:#101f2b]",
  rare: "[--pact-accent:#e0a1f5] [--pact-border:#a45cc1] [--pact-glow:#40234e] [--pact-dark:#21172d]",
  legendary: "[--pact-accent:#ffd084] [--pact-border:#b87934] [--pact-glow:#49301c] [--pact-dark:#241b16]",
};
const pactPlain = "[--pact-accent:#f9ca65] [--pact-border:#5a4b38] [--pact-glow:#1d252d] [--pact-dark:#151b23]";
/** A Pactspirit card: border, glow and caption in its rarity's colours. */
export const pactChoice = (rarity: string): string =>
  `flex min-h-28.75 cursor-pointer items-start gap-2.75 rounded-[4px] border border-(--pact-border) bg-[linear-gradient(145deg,var(--pact-glow),var(--pact-dark)_68%)] p-3 text-left text-[#edf2f6] outline-none hover:border-(--pact-accent) hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--pact-accent)_28%,transparent)] focus-visible:border-(--pact-accent) focus-visible:shadow-[0_0_0_1px_color-mix(in_srgb,var(--pact-accent)_28%,transparent)] ${pactRarityVars[rarity.toLowerCase()] ?? pactPlain}`;

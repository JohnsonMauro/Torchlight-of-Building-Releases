// Class lists the Stats pieces share: the Stats switch and report button, the card both banners and the Character
// stats panel sit in, the recount card the damage banner and the Effective HP banner both draw, and the tabs of the
// Character stats and the Damage path. Each banner is a size container (`@container`), so `@max-[…]:` below reads the
// banner's own width. "Compact" is a wide but short window: `compact:`.

/** A Stats button: the Stat sheet / Damage path switch and the report button (both Stats panels show it). */
export const STATS_BUTTON = "btn px-3.5 py-2 text-sm font-bold compact:px-3 compact:py-1.5 compact:text-xs";

/** The card both banners and the Character stats panel sit in. */
export const CARD = "panel overflow-hidden";

/** The heading strip of a card (a banner's title, the Character stats head). */
export const HEAD_STRIP = "border-b border-line";

/** A card's title: a banner's skill name or "Effective HP", "Character stats". */
export const CARD_TITLE = "font-display text-base font-semibold tracking-wider text-accent uppercase";

/** A banner: the card, a size container; side by side with the other banner on a wide window. */
export const BANNER = `stat-sheet-banner @container ${CARD} mb-2.5 grid min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] px-3.5 pb-3 min-[1101px]:mb-0 compact:pb-2`;

export const BANNER_TITLE = `${HEAD_STRIP} ${CARD_TITLE} -mx-3.5 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2 compact:mb-2 compact:py-1.5 compact:text-sm`;

/** The chip beside a title ("Level 31") or a tab ("12" rows). */
export const CHIP =
  "rounded-sm border border-accent/50 bg-accent/10 px-2 py-0.5 font-sans text-[10px] font-bold tracking-widest text-accent uppercase";

/** The recount card inside a banner: a tab strip, the figures (body), more below. */
export const PANEL = "flex min-h-0 flex-col overflow-hidden rounded-md border border-line bg-raised";

export const PANEL_HEAD = "flex flex-wrap items-baseline gap-x-5 border-b border-line px-3.5 @max-[500px]:px-3";

/** The panel's one tab, with its accent underline. */
export const PANEL_TAB =
  "-mb-px border-b-2 border-accent py-2.5 text-xs font-bold tracking-wider text-accent uppercase compact:py-1.5";

export const PANEL_NOTE =
  "inline-flex items-baseline gap-1.5 py-2 text-xs font-bold tracking-wide text-muted uppercase compact:py-1.5";

export const PANEL_NOTE_VALUE = "text-accent-strong tabular-nums";

/** A secondary zone of the recount card: the share by source, the ailment checklist. */
export const PANEL_WELL = "bg-sunken";

/** A small uppercase caption ("Share by source over 10 s", "Ailments and crowd control"). */
export const CAPTION = "text-xs font-bold tracking-widest text-muted uppercase";

/** The figures: the hero figure on the left and its companions stacked on the right (the caller sets the columns). */
export const FIGURES = "grid flex-1";

/** The companions' column: a line on its left, or on top once the figures stack. */
export const PAIR = "grid auto-rows-fr border-line";

const LABEL = "text-xs font-bold tracking-widest uppercase";

/** The hero figure: a size container, its figure scales with it. */
export const HERO =
  "@container flex min-w-0 flex-wrap content-center items-baseline gap-x-2 gap-y-1 p-4 @max-[500px]:p-3.5 compact:px-3.5 compact:py-2.5";

export const HERO_LABEL = `${LABEL} basis-full text-muted`;

export const HERO_VALUE =
  "min-w-0 text-[clamp(1.4rem,10cqw,2.2rem)] leading-tight font-bold tracking-tight wrap-anywhere text-accent-strong tabular-nums";

/** A companion figure: label over value, a line under it. */
export const ROW =
  "grid min-w-0 content-center gap-y-1 border-b border-line px-4 last:border-b-0 @max-[500px]:px-3.5 compact:px-3.5 compact:py-1.5";

export const ROW_LABEL = `${LABEL} text-muted`;

export const ROW_VALUE =
  "min-w-0 text-lg leading-tight font-bold wrap-anywhere text-text tabular-nums compact:text-base";

/** Under the card: the secondary figures, the chips and "How this is calculated". */
export const FOOT =
  "dummy-recount-foot mt-3 grid gap-1 border-t border-line px-0.5 pt-2.5 text-xs text-muted compact:mt-2 compact:pt-1.5";

export const DETAILS = "mt-1.5 text-xs text-muted compact:mt-1";

export const DETAILS_SUMMARY =
  "inline-block cursor-pointer rounded-sm py-0.5 text-xs font-bold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export const ASSUMPTIONS = "my-2 list-disc pl-4 leading-normal";

export const FOOTNOTE = "mx-0.5 mt-3 text-xs leading-normal text-dim";

/** A table cell of the recount sources and the Effective HP damage types; the caller aligns it. */
export const CELL = "border-b border-line px-2 py-1.5 tabular-nums";

/** A table's column heading. */
export const HEAD_CELL = `${CELL} align-bottom text-[10px] font-bold tracking-widest text-dim uppercase`;

/**
 * A tab of the Character stats and of the Damage path (the open one carries `active` and aria-selected), and the
 * figure or row count chip inside it. The tab overlaps its strip's bottom line.
 */
export const TAB =
  "tab group -mb-px inline-flex items-baseline gap-1.5 px-2.5 py-2.5 text-xs font-bold tracking-wider uppercase focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent max-[560px]:px-2 max-[560px]:py-2 max-[560px]:text-[10px]";

export const TAB_COUNT =
  "rounded-sm border border-line px-1.5 text-[10px] tracking-normal text-dim tabular-nums group-on:border-accent/50 group-on:bg-accent/10 group-on:text-accent";

/** A collapsible section's chevron (a summary's ::before): right when closed, down when open. */
const SECTION_CHEVRON =
  "before:size-1.5 before:shrink-0 before:-rotate-45 before:border-r-2 before:border-b-2 before:border-accent before:transition-transform before:content-[''] group-open/section:before:-mt-1 group-open/section:before:mr-0.5 group-open/section:before:rotate-45";

/** A collapsible section's summary bar (needs `group/section` on its <details>). */
export const SECTION_SUMMARY = `cursor-pointer list-none bg-raised text-xs font-bold tracking-wider text-text uppercase hover:text-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden ${SECTION_CHEVRON}`;

/** A section's row count at the right of its summary. */
export const SECTION_COUNT = "ml-auto text-xs font-normal tracking-normal text-dim tabular-nums";

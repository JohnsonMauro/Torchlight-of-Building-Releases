// Class lists the stat sheet's pieces share: the Stats switch and report button, the slate card both banners and the
// Character stats panel sit in, and the recount card the damage banner and the Effective HP banner both draw.
// Each banner is a size container (`@container`), so `@max-[…]:` below reads the banner's own width. "Compact" is a
// wide but short window: `compact:`.

/** A Stats button: the Stat sheet / Damage path switch and the report button (both Stats panels show it). */
export const STATS_BUTTON =
  "cursor-pointer rounded-[7px] border border-[#425463] bg-[#18232e] px-[0.9rem] py-[0.55rem] font-bold text-[#b8cad6] hover:text-[#dcebf5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffbd82] compact:px-3 compact:py-[0.4rem] compact:text-[0.82rem]";

/** The slate card with an ember edge on the left: both banners and the Character stats panel. */
export const CARD =
  "overflow-hidden rounded-[5px] border border-[#3b4a59] border-l-3 border-l-[#db9850] bg-[linear-gradient(#27333f,#1f2a36_55%,#1b2531)] shadow-[0_14px_34px_rgb(0_0_0/0.26)]";

/** The heading strip of a card (a banner's title, the Character stats head). */
export const HEAD_STRIP = "border-b border-white/8 bg-[linear-gradient(90deg,#36434f,#2c3845_60%,#303c49)]";

/** A banner: the card, a size container; side by side with the other banner on a wide window. */
export const BANNER = `stat-sheet-banner @container ${CARD} mb-[0.6rem] grid min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] px-3.5 pb-3 min-[1101px]:mb-0 compact:pb-2`;

export const BANNER_TITLE = `${HEAD_STRIP} -mx-3.5 mb-[0.8rem] flex flex-wrap items-center gap-x-[0.7rem] gap-y-[0.4rem] px-3.5 py-[9px] font-serif text-base/[normal] font-semibold tracking-[0.07em] text-[#f6f1e7] uppercase compact:mb-2 compact:py-1.5 compact:text-[0.88rem]`;

/** The bronze chip beside a title ("Level 31") or a tab ("12" rows). */
export const CHIP =
  "rounded-[3px] border border-[#a67736] bg-[#2d241a] px-2 py-[0.14rem] font-sans text-[0.62rem] font-bold tracking-[0.08em] text-[#ffd39b] uppercase";

/** The recount card inside a banner: a tab strip, the figures (body), more below. */
export const PANEL =
  "flex min-h-0 flex-col overflow-hidden rounded-[5px] border border-[#3d4b5a] bg-[linear-gradient(#1a2531,#16212c)] shadow-[inset_0_1px_rgb(255_255_255/0.04),0_8px_22px_rgb(0_0_0/0.22)]";

export const PANEL_HEAD =
  "flex flex-wrap items-baseline gap-x-[1.3rem] border-b border-white/11 bg-[#303c49] px-3.5 @max-[500px]:px-3";

/** The panel's one tab, with its ember underline. */
export const PANEL_TAB =
  "relative py-[0.6rem] text-[0.74rem] font-bold tracking-[0.06em] text-[#fff3e2] uppercase after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-[linear-gradient(90deg,#ffbd82,#db9850)] after:shadow-[0_0_8px_rgb(219_152_80/0.55)] after:content-[''] compact:py-[0.4rem]";

export const PANEL_NOTE =
  "inline-flex items-baseline gap-[0.4rem] py-[0.45rem] text-[0.74rem] font-bold tracking-[0.04em] text-[#a9bac8] uppercase compact:py-[0.4rem]";

export const PANEL_NOTE_VALUE = "text-[#ffbd82] tabular-nums";

/** A small uppercase caption ("Share by source over 10 s", "Ailments and crowd control"). */
export const CAPTION = "text-xs/[1.45] font-bold tracking-[0.08em] text-[#a8c3c0] uppercase";

/** The figures: the hero figure on the left and its companions stacked on the right (the caller sets the columns). */
export const FIGURES = "grid flex-1";

/** The companions' column: a hairline on its left, or on top once the figures stack. */
export const PAIR = "grid auto-rows-fr border-white/8";

const LABEL = "text-[0.68rem]/[1.45] font-bold tracking-[0.09em] uppercase";

/** The hero figure: an ember glow from the left and an ember underline; a size container, its figure scales with it. */
export const HERO =
  "@container flex min-w-0 flex-wrap content-center items-baseline gap-x-2 gap-y-[0.3rem] bg-[radial-gradient(at_0%_45%,rgb(219_152_80/0.16),transparent_62%)] px-[1.1rem] pt-[1.05rem] pb-4 after:mt-2 after:block after:h-0.5 after:basis-full after:bg-[linear-gradient(90deg,#ff8a2c,#ff8a2c_55%,transparent)] after:shadow-[0_0_10px_rgb(255_123_34/0.4)] after:content-[''] @max-[500px]:px-3.5 @max-[500px]:py-3.5 compact:px-[0.9rem] compact:pt-[0.6rem] compact:pb-[0.55rem] compact:after:mt-[0.3rem]";

export const HERO_LABEL = `${LABEL} basis-full text-[#a9bac8]`;

export const HERO_VALUE =
  "min-w-0 text-[clamp(1.4rem,10cqw,2.2rem)]/[1.1] font-bold tracking-[-0.01em] wrap-anywhere text-[#ffbd82] tabular-nums [text-shadow:0_0_18px_rgb(255_160_80/0.22)]";

/** A companion figure: label over value, a hairline under it. */
export const ROW =
  "grid min-w-0 content-center gap-y-[0.3rem] border-b border-white/8 px-4 last:border-b-0 @max-[500px]:px-3.5 compact:px-[0.9rem] compact:py-[0.42rem]";

export const ROW_LABEL = `${LABEL} text-[#bfcbd5]`;

export const ROW_VALUE =
  "min-w-0 text-[1.12rem]/[1.2] font-bold wrap-anywhere text-[#f3e3cf] tabular-nums compact:text-base/[1.2]";

/** Under the card: the secondary figures, the chips and "How this is calculated". */
export const FOOT =
  "dummy-recount-foot mt-3 grid gap-[0.3rem] border-t border-white/7 px-[0.15rem] pt-[0.65rem] text-[0.8rem] text-muted compact:mt-[0.45rem] compact:pt-[0.4rem]";

export const DETAILS = "mt-[0.4rem] text-[0.8rem] text-[#b7c3cd] compact:mt-[0.2rem]";

export const DETAILS_SUMMARY =
  "inline-block cursor-pointer rounded-[3px] py-[0.15rem] text-[0.78rem] font-bold text-[#bcd5e4] hover:text-[#dcebf5] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#74c8ed]";

export const ASSUMPTIONS = "my-2 list-disc pl-[1.1rem] leading-normal";

export const FOOTNOTE = "mx-[0.1rem] mt-3 text-[0.72rem]/normal text-[#91a2ae]";

/** A table cell of the recount sources and the Effective HP damage types; the caller aligns it. */
export const CELL = "border-b border-white/10 px-2 py-[0.35rem] tabular-nums";

/** A table's column heading. */
export const HEAD_CELL = `${CELL} align-bottom text-[0.64rem] font-bold tracking-[0.08em] text-[#91a2ae] uppercase`;

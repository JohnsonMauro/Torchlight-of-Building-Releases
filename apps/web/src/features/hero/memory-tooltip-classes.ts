// The hero panel's item tooltips (MemoryTooltip): a hero memory (the frame's --tip-accent follows its rarity) and a
// Sage's scent.

export const HEAD = "flex items-center gap-2.5 border-b border-(--tip-edge) px-3 py-2.75";
export const HEAD_ICON = "size-9 object-contain";
export const TITLE = "block font-display text-sm font-bold text-(--tip-accent)";
export const KICKER = "mt-0.75 block text-xs text-muted";
export const REVIVED_BADGE =
  "mx-3 mt-2.25 inline-flex w-max items-center gap-1 rounded-sm bg-grade-magic px-2 py-0.5 text-xs font-bold tracking-wide whitespace-nowrap text-on-accent";
export const BODY = "px-3 py-2.5";
export const STAT = "mb-1 flex justify-between gap-3 text-xs text-muted";
export const STAT_VALUE = "text-text";
export const STAT_GOOD = "text-ok";
export const SECTION = "mt-2.25";
export const HEADING = "mb-1 text-[10px] font-bold tracking-wider text-muted uppercase";
export const LINE = "my-0.75 text-xs/snug whitespace-pre-line text-text";
export const LINE_WAX = "my-0.75 text-xs/snug font-bold whitespace-pre-line text-ok";
export const AFFIX = "my-1 grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-1.5 text-xs/snug text-text";
export const AFFIX_TEXT = "col-start-2 row-start-1 min-w-0";
export const AFFIX_COVERAGE = "col-start-3 row-start-1 m-0 px-1.5 py-0.5";
export const INLINE_COVERAGE = "ml-1 inline-block px-1.5 py-0.5 align-middle";
export const FOOTER = "block border-t border-line px-3 py-2 text-xs text-dim";

// A Sage's scent ingredient or elixir.
export const SCENT_HEAD = "grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2.5 border-b border-line px-3 py-2.75";
export const SCENT_ICON = "size-10.5 rounded border border-line-strong bg-sunken object-contain";
export const SCENT_KICKER = "mb-0.75 block text-[10px] font-extrabold tracking-wider text-muted uppercase";
export const SCENT_TITLE = "block font-display text-sm/tight font-extrabold text-accent";
export const SCENT_TAGS = "flex flex-wrap gap-1.25 px-3 pt-2";
export const SCENT_TAG = "rounded-xs border border-line bg-raised px-1.5 py-0.75 text-[10px] text-accent uppercase";
export const SCENT_EFFECTS = "grid gap-1.5 px-3 py-2.75";
export const SCENT_LINE = "text-xs/normal text-text";
export const SCENT_HINT = "block border-t border-line px-3 py-1.75 text-[10px] text-dim uppercase";

/** The memory card's frame kind (apps/web/src/ui/tooltip/tooltip-classes.ts); its rarity is the view's. */
export const MEMORY_FRAME = "memory-tooltip";

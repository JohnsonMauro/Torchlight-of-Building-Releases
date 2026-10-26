// The talent trees' tooltips (TalentTooltip): a node, a core talent slot, an installed prism. The frame
// (apps/web/src/ui/tooltip/tooltip-classes.ts) gives --tip-accent / --tip-edge by the talent's type.

export const HEAD = "grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-line px-3 py-2.75";
export const ICON =
  "grid size-10 place-items-center overflow-hidden rounded-full border border-(--tip-edge) bg-sunken text-xl text-(--tip-accent)";
export const ICON_ART = "size-8.5 object-contain";
export const KICKER = "block text-[10px] font-bold tracking-widest text-(--tip-accent) uppercase";
export const TITLE = "mt-0.75 block text-sm/tight font-bold text-text";
export const BADGE =
  "rounded-sm border border-(--tip-edge) bg-sunken px-1.5 py-1 text-xs font-bold whitespace-nowrap text-(--tip-accent)";
export const BODY = "px-3 py-2.25";
export const BODY_TEXT = "text-xs/normal text-muted";
export const CORE_LINE = "py-1.5 text-xs/normal text-text not-first:border-t not-first:border-line";
/** A coverage badge after a line of text. */
export const INLINE_COVERAGE = "ml-1.5 inline-block px-1.5 py-0.5 align-middle";
export const PRISM = "border-t border-line bg-violet/10 px-3 pt-2.25 pb-3";
export const PRISM_HEADING = "mb-1.75 text-[10px] font-bold tracking-wider text-violet uppercase";
export const PRISM_HEADING_NOTE = "mt-0.75 block text-xs font-normal tracking-normal text-muted normal-case";
export const AFFIX = "mt-1.5 rounded-sm border border-l-3 px-2.25 py-2";
export const AFFIX_ON = "border-violet/40 border-l-violet bg-violet/10";
export const AFFIX_OFF = "border-line border-l-dim bg-raised opacity-65";
export const AFFIX_TIER = "block text-[10px] text-violet uppercase";
export const AFFIX_TEXT = "my-1.25 text-xs/normal text-text";
export const AFFIX_REASON_ON = "block text-xs text-ok";
export const AFFIX_REASON_OFF = "block text-xs text-muted";
export const PRISM_NONE = "text-xs text-muted italic";
export const FOOTER = "block border-t border-line px-3 py-1.75 text-center text-xs text-dim";

// An installed prism; the frame's --tip-accent is violet.
export const PRISM_HEAD = "grid grid-cols-[42px_1fr] items-center gap-x-2.25 gap-y-1 border-b border-line p-3";
export const PRISM_ICON = "row-span-2 size-10 object-contain";
export const PRISM_TITLE = "text-sm/snug font-bold text-accent";
export const PRISM_KICKER = "col-start-2 text-[10px] text-muted uppercase";
export const PRISM_BODY = "p-3";
export const PRISM_AREA = "mb-2 text-xs text-muted";
export const PRISM_AREA_VALUE = "font-bold text-info";
export const PRISM_FOOTER = "block border-t border-line px-3 py-2 text-center text-xs text-dim";

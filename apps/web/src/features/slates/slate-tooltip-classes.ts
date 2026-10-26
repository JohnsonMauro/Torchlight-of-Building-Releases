// A Divinity Slate's tooltip (SlateTooltip).

// A god family's colour, --talent-emblem, by its talent-family-* class: on the head (a god's slate) and on the tree
// names in its affixes. The title and the tree names read it.
const FAMILY_EMBLEMS = [
  "[&.talent-family-god-of-might,&_.talent-family-god-of-might]:[--talent-emblem:var(--color-god-might)]",
  "[&.talent-family-goddess-of-hunting,&_.talent-family-goddess-of-hunting]:[--talent-emblem:var(--color-god-hunting)]",
  "[&.talent-family-goddess-of-knowledge,&_.talent-family-goddess-of-knowledge]:[--talent-emblem:var(--color-god-knowledge)]",
  "[&.talent-family-god-of-war,&_.talent-family-god-of-war]:[--talent-emblem:var(--color-god-war)]",
  "[&.talent-family-goddess-of-deception,&_.talent-family-goddess-of-deception]:[--talent-emblem:var(--color-god-deception)]",
  "[&.talent-family-god-of-machines,&_.talent-family-god-of-machines]:[--talent-emblem:var(--color-god-machines)]",
].join(" ");

export const HEAD = `grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2.5 ${FAMILY_EMBLEMS}`;
export const ICON = "size-10.5 object-contain";
export const TITLE = "block text-sm/tight font-bold text-[var(--talent-emblem,var(--color-info))]";
export const KICKER = "mt-2 block border-t border-line pt-2 text-xs tracking-wider text-muted";
export const JUDGMENT = "my-2 rounded-sm border border-info/50 bg-info/10 px-2.25 py-1.5 text-xs font-bold text-info";
export const PREVIEW = `mt-3 border-t border-line pt-2.5 ${FAMILY_EMBLEMS}`;
export const EMPTY = "text-xs text-muted";
/** A tree name in an affix, in its god's colour. */
export const TREE = "font-extrabold text-[var(--talent-emblem,var(--color-text))]";
export const SECTION = "not-first:mt-3 not-first:border-t not-first:border-line not-first:pt-2.5";
export const HEADING = "mb-1.75 text-[10px] font-bold tracking-widest text-muted uppercase";
export const LIST = "grid gap-2";
export const AFFIX = "text-xs/normal wrap-anywhere";
export const CORE_AFFIX = "-ml-1.75 border-l-3 border-info bg-info/10 p-2";
export const LIMITED_AFFIX = "-ml-1.75 border-l-3 border-warn bg-warn/10 px-2 py-2.5";
export const CORE_BADGE =
  "mb-1.25 inline-block rounded-sm border border-info/60 bg-info/15 px-1.5 py-0.5 text-[10px]/tight font-bold tracking-wider text-info uppercase";
export const CORE_SUMMARY = "block font-bold text-info";
export const CORE_HINT = "mt-1 block text-xs text-muted";
export const CORE_DETAIL = "mt-1.75 block border-l-2 border-info bg-info/10 px-2 py-1.75 leading-snug text-text";
export const BADGES = "mt-2 flex flex-wrap items-center gap-1";
export const LIMIT_BADGE =
  "inline-block w-max max-w-full rounded-sm border border-warn/60 bg-warn/15 px-1.5 py-0.5 text-[10px]/tight font-bold text-warn";
export const COPIED =
  "mt-2.5 rounded-sm border border-l-3 border-grade-rare/40 border-l-grade-rare bg-grade-rare/10 p-2";
export const COPIED_HEADING = "mb-2 text-[10px] font-bold tracking-widest text-grade-rare uppercase";
export const COPIED_LIST = "grid gap-1.25";
export const COPIED_AFFIX = "grid gap-1.25 rounded-sm border border-grade-rare/25 bg-sunken px-1.25 py-1 text-xs";
export const COPIED_META = "flex min-w-0 items-center gap-2";
export const COPIED_SOURCE = "min-w-0 text-xs text-muted";
export const COPIED_BADGE =
  "inline-flex flex-none rounded-xs bg-grade-rare px-1 py-px text-[10px]/tight font-bold tracking-wide text-on-accent uppercase";
export const COPIED_TEXT = "min-w-0 leading-snug text-text";

/** The frame's kind (apps/web/src/ui/tooltip/tooltip-classes.ts). */
export const FRAME = "slate-tooltip";

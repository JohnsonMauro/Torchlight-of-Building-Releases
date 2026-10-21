// The gear tooltip's parts (GearTooltip). The frame (apps/web/src/ui/tooltip/tooltip-classes.ts) gives the rarity's
// colours as --tip-accent / --tip-edge, and --tip-name turns pink for six-affix and Priceless items.

export const HEAD =
  "grid grid-cols-[32px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1.5 border-b border-(--tip-edge) px-3 pt-3 pb-2.5";
export const ICON = "row-start-1 size-8 rounded-sm border border-(--tip-edge) bg-sunken object-contain p-0.5";
export const NAME = "min-w-0 font-display text-sm/tight font-bold text-(--tip-name)";
const CHIP = "rounded-sm border px-1.5 py-1 text-[10px]/none uppercase not-italic";
export const BASE_CHIP = `${CHIP} border-line text-muted`;
export const RARITY_CHIP = `${CHIP} border-(--tip-edge) text-(--tip-accent)`;
export const BODY = "p-4";
export const CURSE_NOTE = "mb-1.5 px-2.5 py-1 text-xs/snug text-danger";
const STAT = "mr-1 mb-2.5 inline-block rounded-sm border border-line px-2 py-1 text-xs/none";
export const LEVEL = `${STAT} text-muted`;
export const ENERGY = `${STAT} text-info`;
export const SECTION = "rounded-md border border-line bg-sunken/60 p-2.5";
export const SECTION_TITLE = "mt-0.5 mb-2 text-[10px] font-bold tracking-widest text-muted uppercase";
/** A modifier line: its mark, its text, its coverage. `legendary-affix` / `corrosion-affix` are hooks. */
export const ROW = "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 text-xs/snug text-text";
const KIND = "mt-px grid size-4 place-items-center rounded-sm border text-[10px] not-italic";
export const KIND_MARK = `${KIND} border-line-strong text-muted`;
export const KIND_MARK_CORRODED = `${KIND} border-grade-rare text-grade-rare`;
export const COVERAGE = "mt-px justify-self-end px-1 py-px";
export const FOOT = "block border-t border-line px-4 py-2.5 text-xs text-dim";

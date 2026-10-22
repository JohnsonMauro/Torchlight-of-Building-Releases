// The Pactspirits section's tooltips (PactTooltip); the frame's --tip-accent / --tip-edge follow the rarity.

export const HEAD = "flex items-center gap-2.75 border-b border-line px-3.5 py-3.25";
/** A Pactspirit's head: the same height as the icon head (a 48px icon and its padding), its portrait strip flush with
 * the frame's left edge, the title beside it. */
export const HEAD_PORTRAIT = "flex min-h-18.5 items-stretch gap-3 border-b border-line";
export const HEAD_PORTRAIT_ART = "w-12";
export const HEAD_PORTRAIT_TEXT = "self-center py-3.25 pr-3.5";
export const HEAD_ICON = "size-12 flex-none object-contain";
export const TITLE = "block font-display text-sm/tight font-bold text-(--tip-accent)";
export const KICKER = "mt-1 block text-xs/tight text-muted";
export const HEADING = "mx-3.5 mt-3 mb-1.5 text-xs font-bold text-(--tip-accent) uppercase";
export const TEXT = "mx-3.5 my-2.5 text-xs/normal text-text";
export const FEATURE = "mx-3.5 my-3 rounded-sm border border-(--tip-edge) bg-raised p-2.5 text-center";
export const FEATURE_ICON = "mx-auto mb-1.25 size-11 object-contain";
export const FEATURE_NAME = "text-sm/snug font-bold text-(--tip-accent)";
export const LIST = "mx-3.5 mt-2 mb-3.25 grid gap-1.5";
export const ITEM = "border-l-2 border-(--tip-edge) pl-2.5 text-xs/snug text-text";
/** An item not in effect yet (a Pactspirit's upgrade above its level). */
export const ITEM_DIMMED = "border-l-2 border-line pl-2.5 text-xs/snug text-dim";
/** A Star Trail boosted value, in the green of raised values. */
export const BOOSTED = "text-ok";
export const INLINE_COVERAGE = "ml-1 inline-block px-1.5 py-0.5 align-middle";
export const FOOTER = "block border-t border-line px-3.5 py-2.25 text-center text-xs text-dim";

/** The frame's kind (apps/web/src/ui/tooltip/tooltip-classes.ts); its rarity is the view's. */
export const FRAME = "pact-tooltip";

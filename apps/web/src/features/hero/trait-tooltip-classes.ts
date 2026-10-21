// The hero trait card (TraitTooltip): a hero trait, a tree hero's extra row, a follower, a Tartarus Skill. A follower's
// and a skill's card take the rarity's --tip-accent (the frame's) on the head's rule and the chip.

export const HEAD = "flex items-center justify-between gap-4";
export const HEAD_FOLLOWER = "border-b border-(--tip-edge) pb-2";
export const TITLE = "min-w-0 font-display text-sm/tight font-bold";
export const TITLE_TRAIT = "text-accent";
export const TITLE_FOLLOWER = "text-text";
export const HEAD_COVERAGE = "my-0 ml-auto flex-none px-1.5 py-0.5";
const CHIP = "flex-none rounded-full border px-2 py-0.75 text-xs not-italic";
export const CHIP_TRAIT = `${CHIP} border-accent/60 bg-accent/10 text-accent`;
export const CHIP_FOLLOWER = `${CHIP} border-(--tip-edge) bg-raised text-(--tip-accent)`;
export const UNLOCK = "mt-2 mb-2.5 block text-[10px] tracking-widest text-muted uppercase";
export const EFFECTS = "grid gap-1";
export const PARAGRAPH = "text-xs/normal text-text";
export const INLINE_COVERAGE = "ml-1 inline-block px-1.5 py-0.5 align-middle";
export const HINT = "mt-2.5 block border-t border-line pt-2 text-[10px] tracking-widest text-muted uppercase";
export const DETAILS = "mt-2 grid gap-1.75 border-l-2 border-info bg-info/10 px-2 py-1.75 leading-snug text-text";
export const DEFINITION_NAME = "font-bold text-info underline underline-offset-2";
export const DEFINITION_KIND = "ml-1.5 text-[10px] tracking-wider text-muted not-italic uppercase";
export const DEFINITION_LINE = "mt-0.5 block text-xs/snug text-text";
export const SOURCE = "mt-2.5 block border-t border-line pt-2 text-[10px] tracking-widest text-dim uppercase";

/** A text run's look. `keyword-roll-name` is a hook (the e2e tests read keywords). */
export const RUN_LOOKS: Record<string, string> = {
  keyword: "keyword-roll-name font-bold text-info underline underline-offset-2",
  bold: "font-bold",
  label: "font-bold text-accent",
  current: "font-black text-ok",
  other: "text-accent",
  separator: "mx-0.5 text-dim",
};

/** The card's frame kind (apps/web/src/ui/tooltip/tooltip-classes.ts): a follower's and a skill's take their rarity. */
export const traitFrame = (follower: boolean) =>
  follower ? "hero-trait-tooltip follower-tooltip" : "hero-trait-tooltip";

// The skill tooltip's parts (SkillTooltip). The frame (apps/web/src/ui/tooltip/tooltip-classes.ts) gives the skill,
// support or aura colour as --tip-name and --tip-edge.

export const HEAD = "grid grid-cols-[34px_minmax(0,1fr)] items-center gap-2 px-3 pt-2.5 pb-1";
export const ICON = "size-8 rounded border border-(--tip-edge) bg-sunken object-contain";
export const NAME = "min-w-0 text-sm/tight font-bold text-(--tip-name)";
export const LEVEL = "flex-none text-xs font-extrabold whitespace-nowrap text-accent";
export const ADDED_LEVELS = "ml-0.5 font-bold";
export const STARS = "text-xs tracking-wide text-accent";
export const STARS_COUNT = "ml-1 tracking-normal text-muted not-italic";
export const TAGS = "flex flex-wrap items-center gap-1 border-b border-(--tip-edge) pt-0.5 pr-2.5 pb-2 pl-13.5";
export const TAG = "rounded-sm border border-line bg-raised px-1.5 py-0.5 text-[10px] text-muted uppercase";
export const COVERAGE = "ml-auto px-1.5 py-0.5";
export const CURSE_NOTE = "mb-1.5 px-2.5 py-1 text-xs/snug text-danger";
export const GRANT_NOTE = "mt-2 border-l-2 border-info bg-info/10 px-2 py-1 text-xs/snug text-text";
export const FACTS = "px-3 py-2";
export const FACT = "flex items-baseline justify-between gap-3 py-1";
export const REFERENCE = "mx-3 mt-0.5 mb-1 text-xs text-muted";
/** The effects; a highlighted value keeps its class (skill-damage-value, support-effect-value, aura-effect-value). */
export const EFFECTS =
  "mx-3 mt-1 mb-2.5 border-t border-line px-px pt-2 [&_:is(.skill-damage-value,.support-effect-value,.aura-effect-value)]:font-extrabold [&_:is(.skill-damage-value,.support-effect-value,.aura-effect-value)]:text-ok";
export const EFFECTS_TITLE = "mb-1 text-xs font-normal text-accent";
export const EFFECT = "mb-2 text-xs/normal whitespace-pre-line text-text";
export const LINE_COVERAGE = "ml-1.5 inline-block px-1.5 py-0.5 align-middle";
export const SOURCE = "block border-t border-line px-3 py-2 text-[10px] tracking-widest text-dim uppercase";
/** What the element does on a click or drag (a board support's), under the content. */
export const HINT = "block border-t border-line bg-raised px-3 py-2 text-xs/snug text-muted";

/** The frame's kind (apps/web/src/ui/tooltip/tooltip-classes.ts) by the card's look. */
export const FRAMES: Record<"skill" | "support" | "aura", string> = {
  skill: "skill-tooltip",
  support: "skill-tooltip support-tooltip",
  aura: "skill-tooltip aura-tooltip",
};

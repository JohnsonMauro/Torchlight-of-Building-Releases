// Class lists of the skill selector (SkillSelectorDialog, SkillSelectorDetail; Tailwind utilities). A follower skill's
// detail is the planner's HTML (src/app/hero/follower-panel.js) with the same preview classes, so the preview card is
// styled from the detail column (DETAIL) and covers both.

/** Game art in a small rounded frame: the image covers the frame's ◆, which stays for art that has none. */
export const SUPPORT_ART =
  "support-art relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-sunken text-muted [&>img]:absolute [&>img]:inset-0 [&>img]:size-full [&>img]:object-cover";

/** A choice in the list, and the highlighted one (it keeps its `selected` class). */
const RESULT_BASE =
  "selector-result flex w-full cursor-pointer items-center gap-3 rounded border p-3 text-left text-text hover:border-accent focus-visible:border-accent focus-visible:outline-none";
export const RESULT = `${RESULT_BASE} border-line bg-raised`;
export const RESULT_SELECTED = `${RESULT_BASE} border-accent bg-accent/10`;
const RESULT_TINTS: Readonly<Record<string, string>> = {
  normal: "shadow-[inset_3px_0_0_var(--color-grade-normal)]",
  magic: "shadow-[inset_3px_0_0_var(--color-grade-magic)]",
  rare: "shadow-[inset_3px_0_0_var(--color-grade-rare)]",
  legendary: "shadow-[inset_3px_0_0_var(--color-grade-legendary)]",
  ult: "shadow-[inset_3px_0_0_var(--color-grade-vorax)]",
};
/**
 * A follower Tartarus skill's rarity, as an accent on the choice's left edge: picked from its " follower-tint-<id>" class
 * (the e2e tests read that class, so no variant may spell it).
 */
export const resultTint = (tintClass: string): string =>
  RESULT_TINTS[tintClass.trim().slice("follower-tint-".length)] ?? "";

/** A tier or star button: a neutral button; `active` (the chosen one) tinted with the accent. */
const CHOICE_BUTTON = "btn on:border-accent on:bg-accent/15 on:text-accent";
export const TIER_BUTTON = `${CHOICE_BUTTON} flex-col p-2 text-sm`;
export const STAR_BUTTON = `${CHOICE_BUTTON} min-h-8 text-xs`;
/** A tier button's second line (its roll range or note). */
export const TIER_NOTE = "block text-xs";
/** A support's tier and stars panel, its blocks (each after the first ruled off) and their heading row. */
export const CONFIG_PANEL = "mb-4 grid gap-3 rounded-md border border-line bg-raised p-3.5";
export const CONFIG_BLOCK = "grid gap-2.5 [&+&]:border-t [&+&]:border-line [&+&]:pt-3";
export const CONFIG_HEADING = "flex items-center justify-between gap-4 [&>span]:text-accent-strong";
/** A rolled value (a roll's number, the star bonus). */
export const ROLL_VALUE = "text-accent-strong";

/**
 * The detail column and the preview card in it. The card shows its game art (a skill's, a support's, an aura's or a
 * follower skill's rarity art) under translucent surface panels, so its text reads in both themes; its accent
 * (--pv-accent: head rule and border) and name colour (--pv-title) follow its kind: an active skill blue, a support
 * green, an aura violet, a follower skill its rarity (data-tint).
 */
export const DETAIL = [
  "skill-selector-detail min-h-0 overflow-auto p-4 max-[700px]:hidden",
  "[&>p]:grid [&>p]:h-full [&>p]:place-items-center [&>p]:text-muted",
  // The card and its kinds.
  "[&_.selector-preview]:mx-auto [&_.selector-preview]:max-w-90 [&_.selector-preview]:overflow-hidden [&_.selector-preview]:rounded-md [&_.selector-preview]:border [&_.selector-preview]:border-(--pv-accent)/60 [&_.selector-preview]:bg-surface [&_.selector-preview]:bg-cover [&_.selector-preview]:bg-top [&_.selector-preview]:bg-no-repeat [&_.selector-preview]:text-text",
  "[&_.selector-preview]:[--pv-accent:var(--color-grade-magic)] [&_.selector-preview]:[--pv-title:var(--color-grade-magic)] [&_.selector-preview]:bg-(image:--art-magic)",
  "[&_.selector-preview.support]:[--pv-accent:var(--color-ok)] [&_.selector-preview.support]:[--pv-title:var(--color-ok)] [&_.selector-preview.support]:bg-[url(../../../../src/assets/support-skill-background.png)]",
  "[&_.selector-preview.aura]:[--pv-accent:var(--color-violet)] [&_.selector-preview.aura]:[--pv-title:var(--color-violet)] [&_.selector-preview.aura]:bg-[url(../../../../src/assets/epic-gear-memory-aura-background.png)]",
  "[&_.selector-preview[data-tint]]:[--pv-title:var(--color-text)]",
  "[&_.selector-preview[data-tint=normal]]:[--pv-accent:var(--color-grade-normal)] [&_.selector-preview[data-tint=normal]]:bg-none",
  "[&_.selector-preview[data-tint=magic]]:[--pv-accent:var(--color-grade-magic)]",
  "[&_.selector-preview[data-tint=rare]]:[--pv-accent:var(--color-grade-rare)] [&_.selector-preview[data-tint=rare]]:bg-[url(../../../../src/assets/epic-gear-memory-aura-background.png)]",
  "[&_.selector-preview[data-tint=legendary]]:[--pv-accent:var(--color-grade-legendary)] [&_.selector-preview[data-tint=legendary]]:bg-[url(../../../../src/assets/legendary-memory-gear-background.png)]",
  "[&_.selector-preview[data-tint=ult]]:[--pv-accent:var(--color-grade-vorax)] [&_.selector-preview[data-tint=ult]]:bg-[url(../../../../src/assets/ultimate-memory-vorax-background.png)]",
  // The head: art, name, level, tags.
  "[&_.selector-preview-head]:grid [&_.selector-preview-head]:grid-cols-[38px_minmax(0,1fr)_auto] [&_.selector-preview-head]:items-start [&_.selector-preview-head]:gap-x-2 [&_.selector-preview-head]:gap-y-1 [&_.selector-preview-head]:border-b-2 [&_.selector-preview-head]:border-(--pv-accent) [&_.selector-preview-head]:bg-veil [&_.selector-preview-head]:px-3 [&_.selector-preview-head]:py-3",
  "[&_.selector-preview-head_.art-frame]:relative [&_.selector-preview-head_.art-frame]:row-span-2 [&_.selector-preview-head_.art-frame]:mt-0.5 [&_.selector-preview-head_.art-frame]:grid [&_.selector-preview-head_.art-frame]:size-8.5 [&_.selector-preview-head_.art-frame]:place-items-center [&_.selector-preview-head_.art-frame]:overflow-hidden [&_.selector-preview-head_.art-frame]:rounded-md [&_.selector-preview-head_.art-frame]:border [&_.selector-preview-head_.art-frame]:border-line",
  "[&_.selector-preview-head_.art-frame>img]:absolute [&_.selector-preview-head_.art-frame>img]:inset-0 [&_.selector-preview-head_.art-frame>img]:size-full [&_.selector-preview-head_.art-frame>img]:object-cover",
  "[&_.selector-preview-head_h3]:text-base/tight [&_.selector-preview-head_h3]:font-bold [&_.selector-preview-head_h3]:text-(--pv-title)",
  "[&_.selector-preview-head>small]:mt-px [&_.selector-preview-head>small]:text-xs [&_.selector-preview-head>small]:font-bold [&_.selector-preview-head>small]:whitespace-nowrap [&_.selector-preview-head>small]:text-accent",
  "[&_.selector-tags]:col-span-2 [&_.selector-tags]:col-start-2 [&_.selector-tags]:flex [&_.selector-tags]:flex-wrap [&_.selector-tags]:gap-1",
  "[&_.selector-tags>span]:chip [&_.selector-tags>span]:px-1.5 [&_.selector-tags>span]:py-0.5 [&_.selector-tags>span]:text-[10px] [&_.selector-tags>span]:uppercase",
  // The facts, the effects and the TLIDB link.
  "[&_.selector-facts]:bg-veil [&_.selector-facts]:px-3 [&_.selector-facts]:pt-2 [&_.selector-facts]:pb-3",
  "[&_.selector-stat-rows>div]:flex [&_.selector-stat-rows>div]:items-center [&_.selector-stat-rows>div]:justify-between [&_.selector-stat-rows>div]:gap-3 [&_.selector-stat-rows>div]:py-1 [&_.selector-stat-rows>div]:text-muted",
  "[&_.selector-stat-rows_strong]:text-right [&_.selector-stat-rows_strong]:text-text [&_.skill-added-damage-stat_strong]:text-accent",
  "[&_.skill-effect-reference]:mt-2 [&_.skill-effect-reference]:text-xs [&_.skill-effect-reference]:text-muted",
  "[&_.selector-effect-list]:mt-2 [&_.selector-effect-list]:mb-2.5 [&_.selector-effect-list]:max-h-70 [&_.selector-effect-list]:overflow-y-auto [&_.selector-effect-list]:border-t [&_.selector-effect-list]:border-line [&_.selector-effect-list]:px-0.5 [&_.selector-effect-list]:pt-2",
  "[&_.selector-effect-list_h4]:mb-1 [&_.selector-effect-list_h4]:text-xs [&_.selector-effect-list_h4]:text-accent",
  "[&_.selector-effect-list_p]:mb-1.5 [&_.selector-effect-list_p]:text-xs/relaxed [&_.selector-effect-list_p]:whitespace-pre-line [&_.selector-effect-list_p]:text-text",
  "[&_.skill-damage-value]:font-bold [&_.skill-damage-value]:text-ok [&_.support-effect-value]:font-bold [&_.support-effect-value]:text-ok [&_.aura-effect-value]:font-bold [&_.aura-effect-value]:text-ok",
  "[&_.selector-facts>a]:mt-2.5 [&_.selector-facts>a]:inline-block [&_.selector-facts>a]:text-info [&_.selector-facts>a]:underline",
  "[&_.comparison-warning]:mt-2.5 [&_.comparison-warning]:border-l-2 [&_.comparison-warning]:border-danger [&_.comparison-warning]:bg-danger/10 [&_.comparison-warning]:px-2.5 [&_.comparison-warning]:py-2 [&_.comparison-warning]:text-xs",
  // A follower skill's Tier select and support affix editor (the planner's HTML), and a support's affix stat select.
  "[&_select]:field [&_select]:min-w-0 [&_select]:px-2 [&_select]:py-1.5 [&_select]:font-bold",
  "[&_.follower-affix-block]:mt-2.5 [&_.follower-affix-block]:grid [&_.follower-affix-block]:gap-1.5",
  "[&_.follower-affix-field]:grid [&_.follower-affix-field]:gap-1 [&_.follower-affix-label]:text-[10px] [&_.follower-affix-label]:font-bold [&_.follower-affix-label]:tracking-wider [&_.follower-affix-label]:text-muted [&_.follower-affix-label]:uppercase",
  "[&_.follower-affix-block_.affix-roll-number]:field [&_.follower-affix-block_.affix-roll-number]:h-7.5 [&_.follower-affix-block_.affix-roll-number]:w-20 [&_.follower-affix-block_.affix-roll-number]:text-center",
  "[&_.follower-affix-text]:text-xs [&_.follower-affix-text]:text-text",
].join(" ");
/** "Skill Source": the item that grants the skill (Necklace of Firebird on Barrier Burst), as the game's skill card says. */
export const SKILL_SOURCE = "skill-source mt-2.5 grid gap-1.5 border-t border-line pt-2 text-xs text-muted";
export const SKILL_SOURCE_ITEM =
  "inline-flex w-fit items-center gap-2 rounded-md font-semibold text-grade-legendary focus-visible:outline-2 focus-visible:outline-info";
export const SKILL_SOURCE_ART = "size-9 shrink-0 object-contain";

// Class lists of the skill selector (SkillSelectorDialog, SkillSelectorDetail; Tailwind utilities). A follower skill's
// detail is the planner's HTML (src/app/hero/follower-panel.js) with the same preview classes, so the preview card is
// styled from the detail column (DETAIL) and covers both.

/** Game art in a small rounded frame: the image covers the frame's ◆, which stays for art that has none. */
export const SUPPORT_ART =
  "support-art relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[7px] border border-[rgb(85_214_221/0.35)] bg-[#151b23] text-muted [&>img]:absolute [&>img]:inset-0 [&>img]:size-full [&>img]:object-cover";

/** A choice in the list, and the highlighted one (it keeps its `selected` class): lit like a hover. */
const RESULT_BASE =
  "selector-result flex w-full cursor-pointer items-center gap-3 rounded-[4px] border p-2.75 text-left text-text hover:border-[#e7b35d] hover:bg-[linear-gradient(145deg,#302a23,#1b2229)] focus-visible:border-[#e7b35d] focus-visible:outline-none";
export const RESULT = `${RESULT_BASE} border-[#554a3a] bg-[linear-gradient(145deg,#1d252d,#151b23)]`;
export const RESULT_SELECTED = `${RESULT_BASE} border-[#e7b35d] bg-[linear-gradient(145deg,#302a23,#1b2229)]`;
/** A follower Tartarus skill's rarity, as an accent on the choice's left edge. */
export const RESULT_TINT = [
  "[&.follower-tint-normal]:shadow-[inset_3px_0_0_#d6dce2]",
  "[&.follower-tint-magic]:shadow-[inset_3px_0_0_#50d0f4]",
  "[&.follower-tint-rare]:shadow-[inset_3px_0_0_#d96bf2]",
  "[&.follower-tint-legendary]:shadow-[inset_3px_0_0_#ff993f]",
  "[&.follower-tint-ult]:shadow-[inset_3px_0_0_#ff635c]",
].join(" ");

/** A tier, star or level button: dark slate; `active` (the chosen one) in ember. */
export const TIER_BUTTON =
  "cursor-pointer rounded-[4px] border border-[#465166] bg-[#202a3a] p-1.75 text-[#9ca8b8] hover:border-[#7a879b] on:border-[#ff7b16] on:bg-[#71330e] on:text-white on:shadow-[inset_0_0_0_1px_#ff9a3d]";
export const STAR_BUTTON =
  "min-h-8 cursor-pointer rounded-[4px] border border-[#4a5669] bg-[#111924] text-[0.72rem] text-[#8d98a7] hover:border-[#7a879b] on:border-[#ffad35] on:bg-[#6a3710] on:text-[#ffd05f] on:shadow-[0_0_12px_#ff741733]";
/** A support's tier and stars panel, its blocks (each after the first ruled off) and their heading row. */
export const CONFIG_PANEL =
  "mb-4 grid gap-3 rounded-lg border border-[#354254] bg-[linear-gradient(145deg,#182131,#101720)] p-3.5";
export const CONFIG_BLOCK = "grid gap-2.5 [&+&]:border-t [&+&]:border-[#343e4c] [&+&]:pt-3";
export const CONFIG_HEADING = "flex items-center justify-between gap-4 [&>span]:text-[#ff8b2b]";

/** The level row's −, + and number field. */
export const LEVEL_CONTROL =
  "h-8.5 w-10.5 rounded-[4px] border border-[#a67736] bg-[linear-gradient(180deg,#483723,#191d22)] text-center font-extrabold text-[#ffe0a0] shadow-[inset_0_1px_rgb(255_230_166/0.18),0_1px_3px_rgb(0_0_0/0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

/** A slider whose orange fill follows --range-fill (src/app/planner/range-fill.js keeps it up to date). */
export const RANGE =
  "h-1.5 w-full min-w-0 cursor-pointer appearance-none rounded-full border border-[#5e4a30] bg-[linear-gradient(to_right,#f9ca65_var(--range-fill,0%),#2a2f36_var(--range-fill,0%))] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#7b5525] [&::-webkit-slider-thumb]:bg-[radial-gradient(circle_at_35%_30%,#fff0b0,#e8ad4f_58%,#a66b2c)] [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[#7b5525] [&::-moz-range-thumb]:bg-[radial-gradient(circle_at_35%_30%,#fff0b0,#e8ad4f_58%,#a66b2c)]";
/**
 * The detail column and the preview card in it: a skill's colours, a support's (green), an aura's (violet) or a follower
 * skill's rarity, set as custom properties on the card and read by its parts.
 */
export const DETAIL = [
  "skill-selector-detail min-h-0 overflow-auto p-4 max-[700px]:hidden",
  "[&>p]:grid [&>p]:h-full [&>p]:place-items-center [&>p]:text-muted",
  // The card and its kinds.
  "[&_.selector-preview]:mx-auto [&_.selector-preview]:max-w-90 [&_.selector-preview]:overflow-hidden [&_.selector-preview]:rounded-[7px] [&_.selector-preview]:border [&_.selector-preview]:border-(--pv-border) [&_.selector-preview]:bg-(--pv-color) [&_.selector-preview]:bg-cover [&_.selector-preview]:bg-top [&_.selector-preview]:bg-no-repeat [&_.selector-preview]:text-[#e9edf3]",
  "[&_.selector-preview]:[--pv-border:#655744] [&_.selector-preview]:[--pv-color:#122b38] [&_.selector-preview]:[--pv-head:rgb(15_53_70/0.46)] [&_.selector-preview]:[--pv-accent:#5c9ee1] [&_.selector-preview]:[--pv-title:#71b8ff] [&_.selector-preview]:[--pv-rule:#526070] [&_.selector-preview]:[--pv-label:#a7b8c9] [&_.selector-preview]:bg-[url(../../../../src/assets/active-skill-rare-background.png)]",
  "[&_.selector-preview.support]:[--pv-border:#4f8266] [&_.selector-preview.support]:[--pv-color:#10352b] [&_.selector-preview.support]:[--pv-head:rgb(11_58_42/0.46)] [&_.selector-preview.support]:[--pv-accent:#45c893] [&_.selector-preview.support]:[--pv-title:#65e5b1] [&_.selector-preview.support]:[--pv-rule:#4c7560] [&_.selector-preview.support]:[--pv-label:#a9cfba] [&_.selector-preview.support]:bg-[url(../../../../src/assets/support-skill-background.png)]",
  "[&_.selector-preview.aura]:[--pv-border:#76559a] [&_.selector-preview.aura]:[--pv-color:#1b1740] [&_.selector-preview.aura]:[--pv-head:rgb(31_23_75/0.48)] [&_.selector-preview.aura]:[--pv-accent:#ab78d9] [&_.selector-preview.aura]:[--pv-title:#d9a8ff] [&_.selector-preview.aura]:[--pv-rule:#715589] [&_.selector-preview.aura]:[--pv-label:#cdb6df] [&_.selector-preview.aura]:bg-[url(../../../../src/assets/epic-gear-memory-aura-background.png)]",
  "[&_.selector-preview[class*=follower-tint-]]:[--pv-title:#fff] [&_.selector-preview[class*=follower-tint-]]:[--pv-label:rgb(255_255_255/0.75)]",
  "[&_.selector-preview.follower-tint-normal]:[--pv-border:#d6dce2] [&_.selector-preview.follower-tint-normal]:[--pv-color:#30363d] [&_.selector-preview.follower-tint-normal]:[--pv-head:rgb(52_59_68/0.46)] [&_.selector-preview.follower-tint-normal]:[--pv-accent:#d6dce2] [&_.selector-preview.follower-tint-normal]:bg-none",
  "[&_.selector-preview.follower-tint-magic]:[--pv-border:#50d0f4] [&_.selector-preview.follower-tint-magic]:[--pv-head:rgb(15_53_70/0.46)] [&_.selector-preview.follower-tint-magic]:[--pv-accent:#50d0f4]",
  "[&_.selector-preview.follower-tint-rare]:[--pv-border:#d96bf2] [&_.selector-preview.follower-tint-rare]:[--pv-color:#1b1740] [&_.selector-preview.follower-tint-rare]:[--pv-head:rgb(31_23_75/0.45)] [&_.selector-preview.follower-tint-rare]:[--pv-accent:#d96bf2] [&_.selector-preview.follower-tint-rare]:bg-[url(../../../../src/assets/epic-gear-memory-aura-background.png)]",
  "[&_.selector-preview.follower-tint-legendary]:[--pv-border:#ff993f] [&_.selector-preview.follower-tint-legendary]:[--pv-color:#2b1c13] [&_.selector-preview.follower-tint-legendary]:[--pv-head:rgb(49_30_17/0.48)] [&_.selector-preview.follower-tint-legendary]:[--pv-accent:#ff993f] [&_.selector-preview.follower-tint-legendary]:bg-[url(../../../../src/assets/legendary-memory-gear-background.png)]",
  "[&_.selector-preview.follower-tint-ult]:[--pv-border:#ff635c] [&_.selector-preview.follower-tint-ult]:[--pv-color:#2d1110] [&_.selector-preview.follower-tint-ult]:[--pv-head:rgb(42_13_12/0.52)] [&_.selector-preview.follower-tint-ult]:[--pv-accent:#ff635c] [&_.selector-preview.follower-tint-ult]:bg-[url(../../../../src/assets/ultimate-memory-vorax-background.png)]",
  // The head: art, name, level, tags.
  "[&_.selector-preview-head]:grid [&_.selector-preview-head]:grid-cols-[38px_minmax(0,1fr)_auto] [&_.selector-preview-head]:items-start [&_.selector-preview-head]:gap-x-2.25 [&_.selector-preview-head]:gap-y-1 [&_.selector-preview-head]:border-b-2 [&_.selector-preview-head]:border-(--pv-accent) [&_.selector-preview-head]:bg-(--pv-head) [&_.selector-preview-head]:px-3 [&_.selector-preview-head]:py-2.75",
  "[&_.selector-preview-head_.art-frame]:relative [&_.selector-preview-head_.art-frame]:row-span-2 [&_.selector-preview-head_.art-frame]:mt-0.5 [&_.selector-preview-head_.art-frame]:grid [&_.selector-preview-head_.art-frame]:size-8.5 [&_.selector-preview-head_.art-frame]:place-items-center [&_.selector-preview-head_.art-frame]:overflow-hidden [&_.selector-preview-head_.art-frame]:rounded-[7px] [&_.selector-preview-head_.art-frame]:border [&_.selector-preview-head_.art-frame]:border-[rgb(85_214_221/0.35)]",
  "[&_.selector-preview-head_.art-frame>img]:absolute [&_.selector-preview-head_.art-frame>img]:inset-0 [&_.selector-preview-head_.art-frame>img]:size-full [&_.selector-preview-head_.art-frame>img]:object-cover",
  "[&_.selector-preview-head_h3]:font-sans [&_.selector-preview-head_h3]:text-[0.95rem]/[1.25] [&_.selector-preview-head_h3]:font-bold [&_.selector-preview-head_h3]:text-(--pv-title)",
  "[&_.selector-preview-head>small]:mt-px [&_.selector-preview-head>small]:text-[0.72rem] [&_.selector-preview-head>small]:font-extrabold [&_.selector-preview-head>small]:whitespace-nowrap [&_.selector-preview-head>small]:text-gold",
  "[&_.selector-tags]:col-span-2 [&_.selector-tags]:col-start-2 [&_.selector-tags]:flex [&_.selector-tags]:flex-wrap [&_.selector-tags]:gap-1",
  "[&_.selector-tags>span]:border [&_.selector-tags>span]:border-[#69583c] [&_.selector-tags>span]:bg-[#1a1e22] [&_.selector-tags>span]:px-1.5 [&_.selector-tags>span]:py-0.5 [&_.selector-tags>span]:text-[0.63rem] [&_.selector-tags>span]:text-[#b7c5d4] [&_.selector-tags>span]:uppercase",
  // The facts, the effects and the TLIDB link.
  "[&_.selector-facts]:px-3 [&_.selector-facts]:pt-2 [&_.selector-facts]:pb-3",
  "[&_.selector-stat-rows>div]:flex [&_.selector-stat-rows>div]:items-center [&_.selector-stat-rows>div]:justify-between [&_.selector-stat-rows>div]:gap-3 [&_.selector-stat-rows>div]:py-1 [&_.selector-stat-rows>div]:text-(--pv-label)",
  "[&_.selector-stat-rows_strong]:text-right [&_.selector-stat-rows_strong]:text-[#f1f4f6] [&_.skill-added-damage-stat_strong]:text-gold",
  "[&_.skill-effect-reference]:mt-2 [&_.skill-effect-reference]:text-[0.72rem] [&_.skill-effect-reference]:text-[#96a9b8]",
  "[&_.selector-effect-list]:mt-2 [&_.selector-effect-list]:mb-2.5 [&_.selector-effect-list]:max-h-70 [&_.selector-effect-list]:overflow-y-auto [&_.selector-effect-list]:border-t [&_.selector-effect-list]:border-(--pv-rule) [&_.selector-effect-list]:px-0.5 [&_.selector-effect-list]:pt-2.25",
  "[&_.selector-effect-list_h4]:mb-1.25 [&_.selector-effect-list_h4]:text-[0.78rem] [&_.selector-effect-list_h4]:text-gold-pale",
  "[&_.selector-effect-list_p]:mb-1.75 [&_.selector-effect-list_p]:text-[0.76rem]/[1.42] [&_.selector-effect-list_p]:whitespace-pre-line [&_.selector-effect-list_p]:text-[#eef1f5]",
  "[&_.skill-damage-value]:font-extrabold [&_.skill-damage-value]:text-[#9fec65] [&_.support-effect-value]:font-extrabold [&_.support-effect-value]:text-[#9fec65] [&_.aura-effect-value]:font-extrabold [&_.aura-effect-value]:text-[#9fec65]",
  "[&_.selector-facts>a]:mt-2.5 [&_.selector-facts>a]:inline-block [&_.selector-facts>a]:text-[#9aa8ff] [&_.selector-facts>a]:underline",
  "[&_.comparison-warning]:mt-2.5 [&_.comparison-warning]:border-l-3 [&_.comparison-warning]:border-[#ff8585] [&_.comparison-warning]:bg-[#251416] [&_.comparison-warning]:px-2.5 [&_.comparison-warning]:py-2 [&_.comparison-warning]:text-[0.78rem]",
  // A follower skill's Tier select and support affix editor (the planner's HTML).
  "[&_select]:min-w-0 [&_select]:rounded-[4px] [&_select]:border [&_select]:border-[#46546a] [&_select]:bg-[#111924] [&_select]:px-2 [&_select]:py-1.5 [&_select]:font-bold [&_select]:text-[#edf3f8]",
  "[&_.follower-affix-block]:mt-2.5 [&_.follower-affix-block]:grid [&_.follower-affix-block]:gap-1.5",
  "[&_.follower-affix-field]:grid [&_.follower-affix-field]:gap-1 [&_.follower-affix-label]:text-[0.6rem] [&_.follower-affix-label]:font-extrabold [&_.follower-affix-label]:tracking-[0.12em] [&_.follower-affix-label]:text-[#c9d1da] [&_.follower-affix-label]:uppercase",
  "[&_.follower-affix-block_.affix-roll-number]:h-7.5 [&_.follower-affix-block_.affix-roll-number]:w-20 [&_.follower-affix-block_.affix-roll-number]:rounded-[4px] [&_.follower-affix-block_.affix-roll-number]:border [&_.follower-affix-block_.affix-roll-number]:border-[#506078] [&_.follower-affix-block_.affix-roll-number]:bg-[#0d141e] [&_.follower-affix-block_.affix-roll-number]:text-center",
  "[&_.follower-affix-text]:text-[0.76rem] [&_.follower-affix-text]:text-[#eef1f5]",
].join(" ");

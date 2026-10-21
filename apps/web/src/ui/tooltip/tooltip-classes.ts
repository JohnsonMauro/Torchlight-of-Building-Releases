/*
 * The page's tooltip frame (TooltipHost). It shows by "visible"; a <Tooltip>'s content names its kind (gear-tooltip,
 * skill-tooltip…, `kind`) and sets data-rarity / data-talent-type; every state below is a variant on the element itself.
 * Each kind's card carries its own utility classes (apps/web/src/features/<feature>/*Tooltip.tsx); this frame sets, per
 * kind, the size and the artwork, and exposes the kind's colour as custom properties the card reads:
 *   --tip-accent  the rarity's (or kind's, or talent type's) colour   --tip-name  a name's colour (the accent, or the
 *   --tip-edge    a softer line in that colour                                     Priceless / six-affix pink)
 *   --tip-art     the rarity's card art (url) or unset
 * The top border takes --tip-name. The art sits under a veil of the surface colour (--tip-veil) so text reads in both
 * themes.
 */

// The frame every kind shares: fixed, hidden until "visible", a surface panel with a coloured top edge.
const FRAME = [
  "planner-tooltip pointer-events-none invisible fixed z-100 w-[min(350px,calc(100vw-24px))] translate-y-1",
  "max-h-[calc(100vh-24px)] overflow-y-auto rounded-md border border-t-2 border-line-strong border-t-(--tip-name)",
  "bg-surface bg-cover bg-top bg-no-repeat px-4 py-3.5 text-left leading-[normal] text-text opacity-0",
  "shadow-lg shadow-shadow transition-[opacity,translate] duration-120",
  "[scrollbar-width:thin] [scrollbar-color:var(--color-line-strong)_transparent]",
  "[&.visible]:visible [&.visible]:translate-y-0 [&.visible]:opacity-100",
  "[--tip-accent:var(--color-accent)] [--tip-name:var(--tip-pink,var(--tip-accent))]",
  "[--tip-edge:color-mix(in_oklab,var(--tip-name)_55%,transparent)]",
  "[--tip-veil:var(--veil)]",
  "[--tip-slate:url(../../../../src/assets/slate-preview-tooltip-background.png)]",
].join(" ");

// Rarity colours and artwork, from data-rarity (gear, hero memories, followers, pacts); any other rarity is normal.
const RARITY = [
  "[&:where([data-rarity])]:[--tip-accent:var(--color-grade-normal)]",
  "data-[rarity=magic]:[--tip-accent:var(--color-grade-magic)] data-[rarity=magic]:[--tip-art:var(--art-magic)]",
  "data-[rarity=rare]:[--tip-accent:var(--color-grade-rare)]",
  "data-[rarity=rare]:[--tip-art:url(../../../../src/assets/epic-gear-memory-aura-background.png)]",
  "data-[rarity=epic]:[--tip-accent:var(--color-grade-rare)]",
  "data-[rarity=epic]:[--tip-art:url(../../../../src/assets/epic-gear-memory-aura-background.png)]",
  "data-[rarity=legendary]:[--tip-accent:var(--color-grade-legendary)]",
  "data-[rarity=legendary]:[--tip-art:url(../../../../src/assets/legendary-memory-gear-background.png)]",
  "data-[rarity=vorax]:[--tip-accent:var(--color-grade-vorax)]",
  "data-[rarity=vorax]:[--tip-art:url(../../../../src/assets/ultimate-memory-vorax-background.png)]",
  "data-[rarity=ultimate]:[--tip-accent:var(--color-grade-vorax)]",
  "data-[rarity=ultimate]:[--tip-art:url(../../../../src/assets/ultimate-memory-vorax-background.png)]",
  "data-[rarity=ult]:[--tip-accent:var(--color-grade-vorax)]",
  "data-[rarity=ult]:[--tip-art:url(../../../../src/assets/ultimate-memory-vorax-background.png)]",
].join(" ");

// Gear: the rarity art (or the level 100 art); six-affix and Priceless names turn pink.
const GEAR = [
  "[&.gear-tooltip]:w-[min(320px,calc(100vw-24px))] [&.gear-tooltip]:p-0",
  "[&.gear-tooltip]:bg-[image:var(--tip-veil),var(--tip-lv100,var(--tip-art,none))]",
  "[&:is(.six-affix,.priceless-item)]:[--tip-pink:var(--color-grade-priceless)]",
  "[&.item-level-100]:[--tip-lv100:url(../../../../src/assets/item-level-100-background.png)]",
].join(" ");

// Skill, support and aura: the art and the kind's colour.
const SKILL = [
  "[&.skill-tooltip]:w-[min(320px,calc(100vw-24px))] [&.skill-tooltip]:p-0",
  "[&.skill-tooltip]:[--tip-accent:var(--color-grade-magic)]",
  "[&.skill-tooltip]:bg-[image:var(--tip-veil),var(--art-magic)]",
  "[&.skill-tooltip.support-tooltip]:[--tip-accent:var(--color-ok)]",
  "[&.skill-tooltip.support-tooltip]:bg-[image:var(--tip-veil),url(../../../../src/assets/support-skill-background.png)]",
  "[&.skill-tooltip.aura-tooltip]:[--tip-accent:var(--color-grade-rare)]",
  "[&.skill-tooltip.aura-tooltip]:bg-[image:var(--tip-veil),url(../../../../src/assets/epic-gear-memory-aura-background.png)]",
].join(" ");

const QOL_HELP = "[&.qol-help-tooltip]:w-[min(340px,calc(100vw-24px))]";

// A damage path row's tooltip takes the pointer (it stays a moment so the pointer can reach it) and scrolls; the
// source summary (a title, a scrolling breakdown, a footer) sits on the slate art.
const DAMAGE_SOURCE = [
  "[&.damage-source-tooltip]:pointer-events-auto [&.damage-source-tooltip]:overscroll-contain",
  "[&.source-summary-tooltip]:flex [&.source-summary-tooltip]:flex-col [&.source-summary-tooltip]:p-0",
  "[&.source-summary-tooltip]:w-[min(390px,calc(100vw-24px))] [&.source-summary-tooltip]:max-h-[min(520px,calc(100vh-24px))]",
  "[&.source-summary-tooltip]:bg-[image:var(--tip-veil),var(--tip-slate)]",
].join(" ");

// The other kinds' frames (their cards: TalentTooltip, MemoryTooltip, TraitTooltip, PactTooltip, SlateTooltip).
const OTHER_KINDS = [
  // Hero memory: the rarity art.
  "[&.memory-tooltip]:w-[min(335px,calc(100vw-24px))] [&.memory-tooltip]:p-0",
  "[&.memory-tooltip]:bg-[image:var(--tip-veil),var(--tip-art,none)]",
  // Hero trait (and the follower card and skills, which share it): slate art; a follower takes its rarity's art.
  "[&.hero-trait-tooltip]:w-[min(385px,calc(100vw-24px))] [&.hero-trait-tooltip]:p-3",
  "[&.hero-trait-tooltip]:bg-[image:var(--tip-veil),var(--tip-slate)]",
  "[&.hero-trait-tooltip.follower-tooltip[data-rarity]]:bg-[image:var(--tip-veil),var(--tip-art,none)]",
  // Sage scent.
  "[&.sage-scent-tooltip]:w-[min(340px,calc(100vw-24px))] [&.sage-scent-tooltip]:p-0",
  // Slate: slate art.
  "[&.slate-tooltip]:w-[min(330px,calc(100vw-24px))] [&.slate-tooltip]:px-3.5 [&.slate-tooltip]:py-3",
  "[&.slate-tooltip]:bg-[image:var(--tip-veil),var(--tip-slate)]",
  // Pact: the rarity's colour (from data-rarity).
  "[&.pact-tooltip]:w-[min(330px,calc(100vw-24px))] [&.pact-tooltip]:p-0",
  // Ethereal Prism: violet.
  "[&.prism-tooltip]:w-[min(330px,calc(100vw-24px))] [&.prism-tooltip]:p-0",
  "[&.prism-tooltip]:[--tip-accent:var(--color-violet)]",
  // Basic talent node: the node type's colour.
  "[&.basic-talent-tooltip]:w-[min(320px,calc(100vw-24px))] [&.basic-talent-tooltip]:p-0",
  "[&.basic-talent-tooltip]:[--tip-accent:var(--color-info)]",
  "[&.basic-talent-tooltip[data-talent-type=medium]]:[--tip-accent:var(--color-grade-magic)]",
  "[&.basic-talent-tooltip[data-talent-type=legendary]]:[--tip-accent:var(--color-grade-legendary)]",
  "[&.basic-talent-tooltip[data-talent-type=core]]:[--tip-accent:var(--color-grade-legendary)]",
  "[&.basic-talent-tooltip[data-talent-type=prism-core]]:[--tip-accent:var(--color-grade-rare)]",
].join(" ");

export const PLANNER_TOOLTIP = [FRAME, RARITY, GEAR, SKILL, QOL_HELP, DAMAGE_SOURCE, OTHER_KINDS].join(" ");

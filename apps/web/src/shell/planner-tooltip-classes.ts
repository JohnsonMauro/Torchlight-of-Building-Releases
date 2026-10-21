/*
 * The planner tooltip's classes (#planner-tooltip, apps/web/src/shell/PlannerTooltip.tsx). src/app/tooltips/
 * planner-tooltips.js shows it by adding "visible", marks its kind with a class (gear-tooltip, skill-tooltip…) and sets
 * data-rarity / data-talent-type; every state below is a variant on the element itself. Each kind's content carries its
 * own utility classes (src/app/tooltips/*-tooltips.js); this frame sets, per kind, the size, border and background, and
 * exposes the rarity as custom properties the content reads:
 *   --tip-accent  the rarity's bright colour (names, accents)    --tip-edge  its border colour
 *   --tip-art     its artwork (url) or unset                      --tip-name  a name's colour (Priceless / six-affix pink)
 *   --tip-line    a head's underline colour
 */

// The default frame (the generic title / text / hint content): fixed, hidden until "visible", a chamfered dark panel.
const FRAME = [
  "planner-tooltip pointer-events-none invisible fixed z-100 w-[min(350px,calc(100vw-24px))] translate-y-1",
  "border border-t-2 border-[#596474] border-t-[#ff8c2e] bg-[rgb(16_20_27/0.98)] px-4 py-3.5 text-left",
  "leading-[normal] text-text opacity-0 shadow-[0_18px_55px_rgb(0_0_0/0.55)] clip-chamfer-7",
  "transition-[opacity,translate] duration-120",
  "[&.visible]:visible [&.visible]:translate-y-0 [&.visible]:opacity-100",
  "[--tip-name:var(--tip-pink,var(--tip-accent))] [--tip-line:var(--tip-pink,var(--tip-edge))]",
].join(" ");

// Rarity colours and artwork, from data-rarity (gear, hero memories, followers, pacts).
const RARITY = [
  "[--tip-accent:#d6dce2] [--tip-edge:#858b92]",
  "data-[rarity=magic]:[--tip-accent:#50d0f4] data-[rarity=magic]:[--tip-edge:#159dcc]",
  "data-[rarity=magic]:[--tip-art:var(--art-magic)]",
  "data-[rarity=rare]:[--tip-accent:#d96bf2] data-[rarity=rare]:[--tip-edge:#a45cc1]",
  "data-[rarity=rare]:[--tip-art:url(../../../../src/assets/epic-gear-memory-aura-background.png)]",
  "data-[rarity=epic]:[--tip-accent:#d96bf2] data-[rarity=epic]:[--tip-edge:#a342cb]",
  "data-[rarity=epic]:[--tip-art:url(../../../../src/assets/epic-gear-memory-aura-background.png)]",
  "data-[rarity=legendary]:[--tip-accent:#ff993f] data-[rarity=legendary]:[--tip-edge:#ef771d]",
  "data-[rarity=legendary]:[--tip-art:url(../../../../src/assets/legendary-memory-gear-background.png)]",
  "data-[rarity=vorax]:[--tip-accent:#ff635c] data-[rarity=vorax]:[--tip-edge:#d65b4b]",
  "data-[rarity=vorax]:[--tip-art:url(../../../../src/assets/ultimate-memory-vorax-background.png)]",
  "data-[rarity=ultimate]:[--tip-accent:#ff635c] data-[rarity=ultimate]:[--tip-edge:#d65b4b]",
  "data-[rarity=ultimate]:[--tip-art:url(../../../../src/assets/ultimate-memory-vorax-background.png)]",
  "data-[rarity=ult]:[--tip-accent:#ff635c] data-[rarity=ult]:[--tip-edge:#d65b4b]",
  "data-[rarity=ult]:[--tip-art:url(../../../../src/assets/ultimate-memory-vorax-background.png)]",
].join(" ");

const GEAR = [
  "[&.gear-tooltip]:w-[min(320px,calc(100vw-24px))] [&.gear-tooltip]:p-0 [&.gear-tooltip]:[clip-path:none]",
  "[&.gear-tooltip]:border [&.gear-tooltip]:border-(--tip-line) [&.gear-tooltip]:bg-[#171c22]",
  "[&.gear-tooltip]:bg-[image:var(--tip-lv100,var(--tip-art,linear-gradient(145deg,#30363d,#12171c_72%)))]",
  "[&.gear-tooltip]:bg-cover [&.gear-tooltip]:bg-top [&.gear-tooltip]:bg-no-repeat",
  "[&.gear-tooltip]:shadow-[inset_0_-3px_0_var(--tip-line),0_14px_38px_#000b]",
  "[&.six-affix]:[--tip-pink:#ff91dc] [&.priceless-item]:[--tip-pink:#ff72d6]",
  "[&.item-level-100]:[--tip-lv100:url(../../../../src/assets/item-level-100-background.png)]",
].join(" ");

// Skill, support and aura: the art and the colours their content reads (--tip-name, --tip-line, --tip-tag…).
const SKILL = [
  "[&.skill-tooltip]:w-[min(320px,calc(100vw-24px))] [&.skill-tooltip]:max-h-[calc(100vh-24px)]",
  "[&.skill-tooltip]:overflow-y-auto [&.skill-tooltip]:rounded-[7px] [&.skill-tooltip]:p-0",
  "[&.skill-tooltip]:[clip-path:none] [&.skill-tooltip]:border [&.skill-tooltip]:border-[#655744]",
  "[&.skill-tooltip]:bg-[#122b38] [&.skill-tooltip]:bg-cover [&.skill-tooltip]:bg-top [&.skill-tooltip]:bg-no-repeat",
  "[&.skill-tooltip]:bg-(image:--art-magic)",
  "[&.skill-tooltip]:text-[#e9edf3] [&.skill-tooltip]:shadow-[0_18px_55px_rgb(0_0_0/0.68)]",
  "[&.skill-tooltip]:[--tip-name:#71b8ff] [&.skill-tooltip]:[--tip-line:#5c9ee1] [&.skill-tooltip]:[--tip-icon:#7092b0]",
  "[&.skill-tooltip]:[--tip-tag:#69583c] [&.skill-tooltip]:[--tip-tag-text:#b7c5d4]",
  "[&.skill-tooltip]:[--tip-soft:#a7b8c9] [&.skill-tooltip]:[--tip-heading:#ffe0a0]",
  "[&.skill-tooltip.support-tooltip]:border-[#4f8266] [&.skill-tooltip.support-tooltip]:bg-[#10352b]",
  "[&.skill-tooltip.support-tooltip]:bg-[url(../../../../src/assets/support-skill-background.png)]",
  "[&.skill-tooltip.support-tooltip]:[--tip-name:#65e5b1] [&.skill-tooltip.support-tooltip]:[--tip-line:#45c893]",
  "[&.skill-tooltip.support-tooltip]:[--tip-icon:#59bd8d] [&.skill-tooltip.support-tooltip]:[--tip-tag:#547960]",
  "[&.skill-tooltip.support-tooltip]:[--tip-tag-text:#bcebd5] [&.skill-tooltip.support-tooltip]:[--tip-soft:#a9cfba]",
  "[&.skill-tooltip.support-tooltip]:[--tip-heading:#b8ebc9]",
  "[&.skill-tooltip.aura-tooltip]:border-[#76559a] [&.skill-tooltip.aura-tooltip]:bg-[#1b1740]",
  "[&.skill-tooltip.aura-tooltip]:bg-[url(../../../../src/assets/epic-gear-memory-aura-background.png)]",
  "[&.skill-tooltip.aura-tooltip]:[--tip-name:#d9a8ff] [&.skill-tooltip.aura-tooltip]:[--tip-line:#ab78d9]",
  "[&.skill-tooltip.aura-tooltip]:[--tip-icon:#a277c2] [&.skill-tooltip.aura-tooltip]:[--tip-tag:#765c8e]",
  "[&.skill-tooltip.aura-tooltip]:[--tip-tag-text:#dfc3f0] [&.skill-tooltip.aura-tooltip]:[--tip-soft:#cdb6df]",
  "[&.skill-tooltip.aura-tooltip]:[--tip-heading:#e2c6f6]",
].join(" ");

const QOL_HELP = "[&.qol-help-tooltip]:w-[min(340px,calc(100vw-24px))]";

// A damage path row's tooltip takes the pointer (it stays a moment so the pointer can reach it) and scrolls; the
// source summary (a title, a scrolling breakdown, a footer) sits on the slate art.
const DAMAGE_SOURCE = [
  "[&.damage-source-tooltip]:pointer-events-auto [&.damage-source-tooltip]:max-h-[calc(100vh-24px)]",
  "[&.damage-source-tooltip]:overflow-y-auto [&.damage-source-tooltip]:overscroll-contain",
  "[&.damage-source-tooltip]:[scrollbar-width:thin] [&.damage-source-tooltip]:[scrollbar-color:#806341_#071316]",
  "[&.source-summary-tooltip]:flex [&.source-summary-tooltip]:flex-col [&.source-summary-tooltip]:p-0",
  "[&.source-summary-tooltip]:w-[min(390px,calc(100vw-24px))] [&.source-summary-tooltip]:max-h-[min(520px,calc(100vh-24px))]",
  "[&.source-summary-tooltip]:rounded-[4px] [&.source-summary-tooltip]:[clip-path:none]",
  "[&.source-summary-tooltip]:border [&.source-summary-tooltip]:border-[#806341] [&.source-summary-tooltip]:border-t-[#cba257]",
  "[&.source-summary-tooltip]:bg-[#071316] [&.source-summary-tooltip]:bg-cover [&.source-summary-tooltip]:bg-center",
  "[&.source-summary-tooltip]:bg-[url(../../../../src/assets/slate-preview-tooltip-background.png)]",
].join(" ");

// The other kinds' frames (their content: talent-, hero-, hero-trait-, pact- and slate-tooltips.js).
const OTHER_KINDS = [
  // Hero memory: rarity border and art.
  "[&.memory-tooltip]:w-[min(335px,calc(100vw-24px))] [&.memory-tooltip]:max-h-[calc(100vh-24px)]",
  "[&.memory-tooltip]:overflow-y-auto [&.memory-tooltip]:rounded-[7px] [&.memory-tooltip]:p-0",
  "[&.memory-tooltip]:[clip-path:none] [&.memory-tooltip]:border [&.memory-tooltip]:border-(--tip-accent)",
  "[&.memory-tooltip]:bg-[#171c22] [&.memory-tooltip]:bg-cover [&.memory-tooltip]:bg-top [&.memory-tooltip]:bg-no-repeat",
  "[&.memory-tooltip]:bg-[image:var(--tip-art,linear-gradient(145deg,#343b44,#171c22_78%))]",
  "[&.memory-tooltip]:shadow-[0_18px_48px_rgb(0_0_0/0.64)]",
  // Hero trait (and the follower card and skills, which share it): slate art; a follower takes its rarity.
  "[&.hero-trait-tooltip]:w-[min(385px,calc(100vw-24px))] [&.hero-trait-tooltip]:max-h-[calc(100vh-24px)]",
  "[&.hero-trait-tooltip]:overflow-y-auto [&.hero-trait-tooltip]:rounded-[7px] [&.hero-trait-tooltip]:p-3",
  "[&.hero-trait-tooltip]:[clip-path:none] [&.hero-trait-tooltip]:border",
  "[&.hero-trait-tooltip]:border-[#806341] [&.hero-trait-tooltip]:border-t-[#cba257]",
  "[&.hero-trait-tooltip]:bg-[#071316] [&.hero-trait-tooltip]:bg-cover [&.hero-trait-tooltip]:bg-center",
  "[&.hero-trait-tooltip]:bg-[url(../../../../src/assets/slate-preview-tooltip-background.png)]",
  "[&.hero-trait-tooltip]:[scrollbar-width:thin] [&.hero-trait-tooltip]:[scrollbar-color:#806341_#071316]",
  "[&.hero-trait-tooltip]:shadow-[0_16px_42px_rgb(0_0_0/0.58)]",
  "[&.hero-trait-tooltip.follower-tooltip[data-rarity]]:border-(--tip-accent)",
  "[&.hero-trait-tooltip.follower-tooltip[data-rarity]]:bg-[#30363d] [&.hero-trait-tooltip.follower-tooltip[data-rarity]]:bg-top",
  "[&.hero-trait-tooltip.follower-tooltip[data-rarity]]:bg-[image:var(--tip-art,none)]",
  // Sage scent: bronze edge over a warm slate gradient.
  "[&.sage-scent-tooltip]:w-[min(340px,calc(100vw-24px))] [&.sage-scent-tooltip]:max-h-[calc(100vh-24px)]",
  "[&.sage-scent-tooltip]:overflow-y-auto [&.sage-scent-tooltip]:rounded-[5px] [&.sage-scent-tooltip]:p-0",
  "[&.sage-scent-tooltip]:[clip-path:none] [&.sage-scent-tooltip]:border [&.sage-scent-tooltip]:border-[#a77a3d]",
  "[&.sage-scent-tooltip]:bg-[linear-gradient(145deg,#272820,#151c24_72%)] [&.sage-scent-tooltip]:text-[#e9edf3]",
  // Slate: bronze edge, a cyan foot, slate art.
  "[&.slate-tooltip]:w-[min(330px,calc(100vw-24px))] [&.slate-tooltip]:max-h-[calc(100vh-24px)]",
  "[&.slate-tooltip]:overflow-auto [&.slate-tooltip]:rounded-[7px] [&.slate-tooltip]:px-3.5 [&.slate-tooltip]:py-[13px]",
  "[&.slate-tooltip]:[clip-path:none] [&.slate-tooltip]:border [&.slate-tooltip]:border-[#786044]",
  "[&.slate-tooltip]:border-b-2 [&.slate-tooltip]:border-b-[#25cdec] [&.slate-tooltip]:text-[#e6eaf0]",
  "[&.slate-tooltip]:bg-[#071316] [&.slate-tooltip]:bg-cover [&.slate-tooltip]:bg-center",
  "[&.slate-tooltip]:bg-[url(../../../../src/assets/slate-preview-tooltip-background.png)]",
  // Pact: rarity edge and glow, an accent foot.
  "[&.pact-tooltip]:w-[min(330px,calc(100vw-24px))] [&.pact-tooltip]:rounded-[7px] [&.pact-tooltip]:p-0",
  "[&.pact-tooltip]:[clip-path:none] [&.pact-tooltip]:border [&.pact-tooltip]:border-[#80553e]",
  "[&.pact-tooltip]:border-b-2 [&.pact-tooltip]:border-b-[#e9802e] [&.pact-tooltip]:bg-[#181714]",
  "[&.pact-tooltip]:text-[#e9e4dd]",
  "[&.pact-tooltip[data-rarity]]:border-(--tip-edge) [&.pact-tooltip[data-rarity]]:border-b-(--tip-accent)",
  "[&.pact-tooltip[data-rarity]]:bg-[radial-gradient(circle_at_35%_0,color-mix(in_srgb,var(--tip-edge)_32%,#181714),#181714_72%)]",
  // Ethereal Prism: violet edge.
  "[&.prism-tooltip]:w-[min(330px,calc(100vw-24px))] [&.prism-tooltip]:max-h-[calc(100vh-24px)]",
  "[&.prism-tooltip]:overflow-y-auto [&.prism-tooltip]:rounded-[7px] [&.prism-tooltip]:p-0",
  "[&.prism-tooltip]:[clip-path:none] [&.prism-tooltip]:border [&.prism-tooltip]:border-[#995ac5]",
  "[&.prism-tooltip]:bg-[#1e171c]",
  // Basic talent node: the node type's accent (--tip-accent) on the top edge.
  "[&.basic-talent-tooltip]:w-[min(320px,calc(100vw-24px))] [&.basic-talent-tooltip]:max-h-[calc(100vh-24px)]",
  "[&.basic-talent-tooltip]:overflow-y-auto [&.basic-talent-tooltip]:rounded-[7px] [&.basic-talent-tooltip]:p-0",
  "[&.basic-talent-tooltip]:[clip-path:none] [&.basic-talent-tooltip]:border [&.basic-talent-tooltip]:border-[#425466]",
  "[&.basic-talent-tooltip]:border-t-2 [&.basic-talent-tooltip]:border-t-(--tip-accent) [&.basic-talent-tooltip]:bg-[#141b24]",
  "[&.basic-talent-tooltip]:shadow-[0_18px_42px_#000b,0_0_18px_color-mix(in_srgb,var(--tip-accent)_12%,transparent)]",
  "[&.basic-talent-tooltip]:[--tip-accent:#72cce5]",
  "[&.basic-talent-tooltip[data-talent-type=medium]]:[--tip-accent:#a6b9ed]",
  "[&.basic-talent-tooltip[data-talent-type=legendary]]:[--tip-accent:#ff983e]",
  "[&.basic-talent-tooltip[data-talent-type=legendary]]:border-x-[#86552d] [&.basic-talent-tooltip[data-talent-type=legendary]]:border-b-[#86552d]",
  "[&.basic-talent-tooltip[data-talent-type=core]]:[--tip-accent:#ff983e]",
  "[&.basic-talent-tooltip[data-talent-type=core]]:border-x-[#86552d] [&.basic-talent-tooltip[data-talent-type=core]]:border-b-[#86552d]",
  "[&.basic-talent-tooltip[data-talent-type=prism-core]]:[--tip-accent:#d695ef]",
  "[&.basic-talent-tooltip[data-talent-type=prism-core]]:border-x-[#835b94] [&.basic-talent-tooltip[data-talent-type=prism-core]]:border-b-[#835b94]",
].join(" ");

/*
 * Markup several kinds share, from helpers outside the tooltip modules: coverage badges (coverageBadge and the
 * keyword-roll lines' badges), keyword rolls whose effect shows while Alt is held
 * (modifierTextMarkup; Alt puts revival-alt-held on <body>), the curse note and the trait grant note. The base looks
 * sit in :where() so a kind's own placement of them wins.
 */
const SHARED_CONTENT = [
  "[&_:where(.calc-coverage,.keyword-roll-line>b)]:inline-block [&_:where(.calc-coverage,.keyword-roll-line>b)]:rounded-[4px]",
  "[&_:where(.calc-coverage,.keyword-roll-line>b)]:border [&_:where(.calc-coverage,.keyword-roll-line>b)]:border-[#8a6f51]",
  "[&_:where(.calc-coverage,.keyword-roll-line>b)]:bg-[#382b20] [&_:where(.calc-coverage,.keyword-roll-line>b)]:px-1.5",
  "[&_:where(.calc-coverage,.keyword-roll-line>b)]:py-0.5 [&_:where(.calc-coverage,.keyword-roll-line>b)]:align-middle",
  "[&_:where(.calc-coverage,.keyword-roll-line>b)]:font-[Arial,sans-serif] [&_:where(.calc-coverage,.keyword-roll-line>b)]:text-[10px]/[1.3]",
  "[&_:where(.calc-coverage,.keyword-roll-line>b)]:font-bold [&_:where(.calc-coverage,.keyword-roll-line>b)]:whitespace-nowrap",
  "[&_:where(.calc-coverage,.keyword-roll-line>b)]:text-[#f2c58d] [&_:where(.calc-coverage)]:ml-1.5",
  "[&_:is(.calc-coverage,.keyword-roll-line>b).calculated]:border-[#427f71]",
  "[&_:is(.calc-coverage,.keyword-roll-line>b).calculated]:bg-[#19392f]",
  "[&_:is(.calc-coverage,.keyword-roll-line>b).calculated]:text-[#9ae0c5]",
  "[&_:is(.calc-coverage,.keyword-roll-line>b).neutral]:border-[#4f5a66]",
  "[&_:is(.calc-coverage,.keyword-roll-line>b).neutral]:bg-[#20262d]",
  "[&_:is(.calc-coverage,.keyword-roll-line>b).neutral]:text-[#aab6c3]",
  "[&_.keyword-roll-name]:text-[#75d8f6] [&_.keyword-roll-effect]:hidden",
  "[.revival-alt-held_&_.keyword-roll-effect]:inline",
  "[.revival-alt-held_&_.keyword-roll-effect.keyword-roll-lines]:mt-1 [.revival-alt-held_&_.keyword-roll-effect.keyword-roll-lines]:grid",
  "[.revival-alt-held_&_.keyword-roll-effect.keyword-roll-lines]:gap-[3px]",
  "[.revival-alt-held_&_.keyword-roll-effect.keyword-roll-lines]:border-l-2",
  "[.revival-alt-held_&_.keyword-roll-effect.keyword-roll-lines]:border-[#75d8f6]",
  "[.revival-alt-held_&_.keyword-roll-effect.keyword-roll-lines]:pl-[7px]",
  "[&_.keyword-roll-line]:flex [&_.keyword-roll-line]:items-start [&_.keyword-roll-line]:justify-between",
  "[&_.keyword-roll-line]:gap-2",
  "[&_:where(.curse-limit-note)]:mb-1.5 [&_:where(.curse-limit-note)]:px-2.5 [&_:where(.curse-limit-note)]:py-[5px]",
  "[&_:where(.curse-limit-note)]:text-[0.74rem]/[1.35] [&_:where(.curse-limit-note)]:text-[#ff7d7d]",
  "[&_:where(.trait-grant-note)]:mt-2 [&_:where(.trait-grant-note)]:border-l-2 [&_:where(.trait-grant-note)]:border-[#75d8f6]",
  "[&_:where(.trait-grant-note)]:bg-[#12232b] [&_:where(.trait-grant-note)]:px-2 [&_:where(.trait-grant-note)]:py-[5px]",
  "[&_:where(.trait-grant-note)]:text-[0.68rem]/[1.4] [&_:where(.trait-grant-note)]:text-[#d8eaf0]",
].join(" ");

export const PLANNER_TOOLTIP = [FRAME, RARITY, GEAR, SKILL, QOL_HELP, DAMAGE_SOURCE, OTHER_KINDS, SHARED_CONTENT].join(
  " ",
);

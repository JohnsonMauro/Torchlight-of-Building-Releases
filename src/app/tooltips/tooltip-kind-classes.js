// Tailwind class lists of the planner tooltip kinds whose content is an HTML string: talent nodes and core talents,
// installed prisms, Pactspirits and pact nodes, slates, hero memories, Sage's scents, hero traits and followers. The
// frame of each kind (size, border, background, padding) and the rarity / talent type colours it exposes
// (--tip-accent, --tip-edge) are #planner-tooltip's (apps/web/src/shell/planner-tooltip-classes.ts), and so are the
// coverage and affix tier badges; these lists draw the content. Literal strings, so Tailwind finds every class.

// Talent nodes and core talents (talent-tooltips.js); --tip-accent follows the node type.
export const talentClasses = {
  head: "grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-[#344252] bg-[linear-gradient(115deg,color-mix(in_srgb,var(--tip-accent)_14%,#1a222d),#161c25)] px-3 py-2.75",
  icon: "grid size-10 place-items-center overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--tip-accent)_65%,#25313e)] bg-[#131a23] text-[20px] text-(--tip-accent) [&>img]:size-8.5 [&>img]:object-contain [&>img]:brightness-110",
  kicker: "block text-[9px] font-bold tracking-[0.08em] text-(--tip-accent) uppercase",
  title: "mt-0.75 block font-serif text-sm/[1.25] font-bold text-[#f2f3f6]",
  badge:
    "rounded border border-[color-mix(in_srgb,var(--tip-accent)_55%,#323a45)] bg-[#111820] px-1.5 py-1 text-[11px] font-bold whitespace-nowrap text-(--tip-accent)",
  body: "px-3 py-2.25 [&>p]:text-xs/[1.45] [&>p]:text-[#c2cbd6]",
  coreBody:
    "px-3 py-2.25 [&>.calc-coverage]:my-0.75 [&>p]:py-1.5 [&>p]:text-xs/[1.5] [&>p]:text-[#d3d7df] [&>p+p]:border-t [&>p+p]:border-[#344252]",
  effect: "flex items-baseline justify-between gap-3 py-1.5 not-first:border-t not-first:border-[#2b3744]",
  effectLabel: "text-[11px]/[1.4] text-[#c2cbd6]",
  effectValue: "text-right font-sans text-xs/[1.4] font-bold whitespace-nowrap text-[#d9f4fb]",
  prism: "border-t border-[#634570] bg-[#221b2b] px-3 pt-2.25 pb-3",
  prismHeading: "mb-1.75 text-[10px] font-bold tracking-[0.07em] text-[#d69cf0] uppercase",
  prismHeadingNote: "mt-0.75 block text-[10px] font-normal tracking-normal text-[#b8a4c6] normal-case",
  affix: "mt-1.5 rounded border border-l-3 px-2.25 py-2",
  affixOn: "border-[#674879] border-l-[#bd78e3] bg-[#382640] [&>small]:text-[#9ee0ae]",
  affixOff: "border-[#5c5364] border-l-[#85778c] bg-[#28252d] opacity-65 [&>small]:text-[#bcb4c2]",
  affixTier: "block text-[10px] text-[#e7b1ff] uppercase",
  affixText: "my-1.25 text-xs/[1.45] text-[#e9e7eb]",
  affixReason: "block text-[10px]",
  prismNone: "text-[11px] text-[#aeb5bf] italic",
  footer: "block border-t border-[#344252] px-3 py-1.75 text-center text-[10px] tracking-[0.03em] text-[#98a6b4]",
};

// An installed prism (talents/prism-controller.js prismTooltipHtml).
export const prismClasses = {
  head: "grid grid-cols-[42px_1fr] items-center gap-x-2.25 gap-y-1 border-b-2 border-[#af68d5] bg-[#302039] p-3",
  icon: "row-span-2 size-10 object-contain",
  title: "font-sans text-sm/[1.3] font-bold text-[#ff9f4a]",
  kicker: "col-start-2 text-[10px] text-[#cbb8d1] uppercase",
  body: "p-2.75",
  area: "mb-2 text-xs text-[#b8b6bc] [&>strong]:font-sans [&>strong]:font-bold [&>strong]:text-[#86d7ff]",
  section:
    "rounded border border-l-3 border-[#53423b] bg-[#32231b66] px-2.75 py-2.5 not-first:mt-2.75 [&>h4]:mb-1.5 [&>h4]:text-[11px]/[1.2] [&>h4]:font-bold [&>h4]:tracking-[0.05em] [&>h4]:text-[#ffab64] [&>h4]:uppercase [&>p]:text-xs/[1.5] [&>p]:wrap-anywhere [&>p]:text-[#e8e7e7]",
  sectionEdge: {
    base: "border-l-[#f0822c]",
    "inverse-fixed": "border-l-[#f0822c]",
    radiusAffix: "border-l-[#628ded]",
    rareAffix: "border-l-[#4dc486]",
    legendaryAffix: "border-l-[#d581ef]",
  },
  footer: "block border-t border-[#564153] px-2.75 py-2 text-center text-[10px] text-[#b6a4b7]",
};

// Pactspirits and their tree nodes (pact-tooltips.js); the frame's --tip-accent / --tip-edge follow the rarity.
export const pactClasses = {
  head: "flex items-center gap-2.75 border-b border-(--tip-edge) bg-[linear-gradient(120deg,color-mix(in_srgb,var(--tip-edge)_32%,#181714),#181714)] px-3.5 py-3.25 [&>img]:size-12 [&>img]:flex-none [&>img]:object-contain",
  title: "block font-sans text-[0.95rem]/[1.25] font-bold text-(--tip-accent)",
  kicker: "mt-1 block font-sans text-[0.67rem]/[1.2] text-[#d2aa82]",
  heading: "mx-3.5 mt-3 mb-1.5 text-[0.74rem] font-bold text-(--tip-accent) uppercase",
  text: "mx-3.5 my-2.5 text-[0.78rem]/[1.45] text-[#e8e2dc]",
  feature:
    "mx-3.5 my-3 rounded-[5px] border border-(--tip-edge) bg-[color-mix(in_srgb,var(--tip-edge)_14%,#181714)] p-2.5 text-center [&>img]:mx-auto [&>img]:mb-1.25 [&>img]:size-11 [&>img]:object-contain [&>strong]:font-sans [&>strong]:text-[0.82rem]/[1.3] [&>strong]:font-bold [&>strong]:text-(--tip-accent)",
  rewards:
    "mx-3.5 mt-2 mb-3.25 grid gap-1.5 [&_.skill-level-bonus]:text-[#6ee29b] [&>li]:border-l-2 [&>li]:border-(--tip-edge) [&>li]:pl-2.5 [&>li]:text-xs/[1.4] [&>li]:text-[#eee5d9]",
  footer: "block border-t border-(--tip-edge) px-3.5 py-2.25 text-center text-[0.65rem] text-[#aaa095]",
};

// A slate on the board or in the Slate Inventory (slate-tooltips.js). A god's slate puts its talent-family-* class on
// the head, and a tree name in an affix (slates/slate-shapes.js coloredSlateAffix) carries its own: the head and the
// preview turn those classes into the family's colour, --talent-emblem (the talent trees' colours,
// apps/web/src/features/talents/talent-classes.ts), which the title and the tree names read.
export const slateClasses = {
  head: "grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2.5 [&>img]:size-10.5 [&>img]:object-contain [&.talent-family-god-of-might]:[--talent-emblem:#f4bd4e] [&.talent-family-goddess-of-hunting]:[--talent-emblem:#62d76e] [&.talent-family-goddess-of-knowledge]:[--talent-emblem:#69b7ff] [&.talent-family-god-of-war]:[--talent-emblem:#f06c69] [&.talent-family-goddess-of-deception]:[--talent-emblem:#c276ed] [&.talent-family-god-of-machines]:[--talent-emblem:#52d6dc]",
  title: "block font-serif text-[0.85rem]/[1.25] font-bold text-[var(--talent-emblem,#41c9ed)]",
  kicker: "mt-2 block border-t border-[#343c47] pt-2 text-[0.62rem] tracking-[0.08em] text-[#aeb5c0]",
  judgment:
    "my-2 rounded-[5px] border border-[#278da6] bg-[#143644] px-2.25 py-1.5 text-[0.72rem] font-bold text-[#82ebf5]",
  preview:
    "mt-3 border-t border-[#35404d] pt-2.5 [&_.slate-affix-tree]:font-extrabold [&_.slate-affix-tree]:text-[var(--talent-emblem,#e6eaf0)] [&_.talent-family-god-of-might]:[--talent-emblem:#f4bd4e] [&_.talent-family-goddess-of-hunting]:[--talent-emblem:#62d76e] [&_.talent-family-goddess-of-knowledge]:[--talent-emblem:#69b7ff] [&_.talent-family-god-of-war]:[--talent-emblem:#f06c69] [&_.talent-family-goddess-of-deception]:[--talent-emblem:#c276ed] [&_.talent-family-god-of-machines]:[--talent-emblem:#52d6dc] [&>p]:text-[0.72rem] [&>p]:text-[#929dac]",
  section: "not-first:mt-3 not-first:border-t not-first:border-[#35404d] not-first:pt-2.5",
  heading: "mb-1.75 text-[0.64rem] font-bold tracking-[0.09em] text-[#aab5c4] uppercase",
  list: "grid gap-2",
  affix: "text-[0.74rem]/[1.55] wrap-anywhere",
  coreAffix:
    "-ml-1.75 border-l-3 border-[#5ac5f5] bg-[linear-gradient(90deg,rgba(38,143,211,0.22),rgba(30,80,115,0.08))] p-2",
  limitedAffix: "-ml-1.75 border-l-3 border-[#ffaf45] bg-[#342617] px-2 py-2.5",
  coreBadge:
    "mb-1.25 inline-block rounded-[3px] border border-[#5cbcf0] bg-[#174666] px-1.5 py-0.5 font-sans text-[0.59rem]/[1.2] font-bold tracking-[0.07em] text-[#c3ecff] uppercase",
  coreSummary: "block font-bold text-[#8edaff]",
  coreHint: "mt-1 block text-[0.61rem] text-[#a7c6d8] in-[.revival-alt-held]:hidden",
  coreDetail:
    "mt-1.75 hidden border-l-2 border-[#75d8f6] bg-[#102b3b] px-2 py-1.75 leading-[1.4] text-[#e1f3fa] in-[.revival-alt-held]:block",
  badges: "mt-2 flex flex-wrap items-center gap-1 [&>.calc-coverage]:m-0",
  limitBadge:
    "inline-block w-max max-w-full rounded-[3px] border border-[#d69842] bg-[#493015] px-1.5 py-0.5 font-sans text-[0.61rem]/[1.25] font-bold tracking-[0.01em] text-[#ffe0a5]",
  copied:
    "mt-2.5 rounded border border-l-3 border-[#9950aa] border-l-[#d45de6] bg-[linear-gradient(110deg,rgba(121,47,140,0.25),rgba(28,23,39,0.5))] p-2 [&>p]:text-[0.72rem]",
  copiedHeading: "mb-2 text-[0.64rem] font-bold tracking-[0.09em] text-[#f0aff8] uppercase",
  copiedList: "grid gap-1.25",
  copiedAffix:
    "grid gap-1.25 rounded-[3px] border border-[rgba(198,112,218,0.26)] bg-[rgba(33,20,42,0.64)] px-1.25 py-1 text-[0.74rem] [&>.calc-coverage]:m-0 [&>.calc-coverage]:justify-self-start [&>span]:min-w-0 [&>span]:leading-[1.4] [&>span]:text-[#f4e5f7]",
  copiedMeta: "flex min-w-0 items-center gap-2 [&>small]:min-w-0 [&>small]:text-[0.59rem] [&>small]:text-[#c4a6ce]",
  copiedBadge:
    "inline-flex flex-none rounded-xs bg-[#e58bed] px-1 py-px font-sans text-[0.5rem]/[1.2] font-bold tracking-[0.03em] text-[#221227] uppercase",
};

// A hero memory (hero-tooltips.js); the frame's --tip-accent follows its rarity.
export const memoryClasses = {
  head: "flex items-center gap-2.5 border-b border-(--tip-accent) px-3 py-2.75 [&>img]:size-9 [&>img]:object-contain",
  title: "block font-sans text-[0.9rem] font-bold text-(--tip-accent)",
  kicker: "mt-0.75 block text-[0.58rem] text-[#bdc6ce]",
  body: "px-3 py-2.5",
  stat: "mb-1 flex justify-between gap-3 text-[0.7rem] text-[#c5cdd6] [&>b]:text-[#f1f4f7]",
  statValue: "mb-1 flex justify-between gap-3 text-[0.7rem] text-[#c5cdd6] [&>b]:text-[#70d88a]",
  section: "mt-2.25 [&>.calc-coverage]:ml-0",
  heading: "mb-1 text-[0.59rem] font-bold tracking-[0.06em] text-[#aab3be] uppercase",
  line: "my-0.75 text-[0.72rem]/[1.4] whitespace-pre-line text-[#f1f3f5]",
  lineWax: "my-0.75 text-[0.72rem]/[1.4] font-bold whitespace-pre-line text-[#81de92]",
  affix:
    "my-1 grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-1.5 text-[0.72rem]/[1.4] text-[#f1f3f5] [&>.affix-tier-badge]:mt-px [&>.calc-coverage]:col-start-3 [&>.calc-coverage]:row-start-1 [&>.calc-coverage]:m-0",
  affixText: "col-start-2 row-start-1 min-w-0",
  footer: "block border-t border-[#3b4650] px-3 py-2 text-[0.62rem] text-[#aab5bf]",
  revivalBadge:
    "mx-3 mt-2.25 inline-flex w-max items-center gap-1 rounded-[3px] border border-[#7dc5ff] bg-[linear-gradient(90deg,#2568c4,#52abff)] px-2 py-0.5 font-sans text-[0.67rem] font-bold tracking-[0.02em] whitespace-nowrap text-white shadow-[0_1px_5px_#1e6bb666] [&>span]:text-[0.85rem] [&>span]:leading-[0.75]",
  revived: "flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[0.72rem]/[1.4] whitespace-pre-line text-[#f1f3f5]",
  revivedSpecial:
    "gap-x-2 [&>.memory-revived-name]:font-bold [&>.memory-revived-name]:underline [&>.memory-revived-name]:underline-offset-2",
  revivedName: "text-[#75d8f6]",
  revivedHint: "text-[0.64rem] whitespace-nowrap text-[#a8bac7]",
  revivedDetail:
    "mt-1.25 hidden basis-full border-l-2 border-[#75d8f6] bg-[#12232b] px-2 py-1.75 leading-[1.45] whitespace-pre-line text-[#d8eaf0] in-[.revival-alt-held]:block",
  revivedList:
    "grid gap-1.25 [&>li]:relative [&>li]:pl-2.5 [&>li]:before:absolute [&>li]:before:top-[0.48em] [&>li]:before:left-0 [&>li]:before:size-1 [&>li]:before:rounded-full [&>li]:before:bg-[#75d8f6] [&>li]:before:content-['']",
  revivedExclusive:
    "mt-2.25 grid gap-0.5 border-t border-[#365463] pt-1.75 text-[#bcd4df] [&>small]:text-[0.6rem] [&>small]:font-bold [&>small]:tracking-[0.04em] [&>small]:text-[#75d8f6] [&>small]:uppercase [&>span]:text-[0.67rem]/[1.35]",
};

// Sage's scent ingredients and elixir (hero-tooltips.js).
export const scentClasses = {
  head: "grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2.5 border-b border-[#a77a3d] bg-[linear-gradient(105deg,rgba(246,193,84,0.15),transparent_85%)] px-3 py-2.75 [&>img]:size-10.5 [&>img]:rounded-[5px] [&>img]:border [&>img]:border-[#a77a3d] [&>img]:bg-[#151c24] [&>img]:object-contain",
  kicker: "mb-0.75 block text-[0.62rem] font-extrabold tracking-[0.07em] text-[#c5aa75] uppercase",
  title: "block font-display text-[0.9rem]/[1.25] font-extrabold text-gold",
  tags: "flex flex-wrap gap-1.25 px-3 pt-2 [&>span]:rounded-xs [&>span]:border [&>span]:border-[#6a5536] [&>span]:bg-[#29251f] [&>span]:px-1.5 [&>span]:py-0.75 [&>span]:text-[0.62rem] [&>span]:text-[#e3c78d] [&>span]:uppercase",
  effects: "grid gap-1.5 px-3 py-2.75 [&>p]:text-[0.74rem]/[1.45] [&>p]:text-[#e6e2d8]",
  hint: "block border-t border-[#665235] px-3 py-1.75 text-[0.6rem] text-[#a99b80] uppercase",
};

// Hero traits, the hero tree's extra row, followers and their Tartarus Skills (hero-trait-tooltips.js,
// hero/follower-panel.js, hero/hero-trait-tree-markup.js): one layout. A follower's (follower-tooltip on the frame)
// takes its rarity's --tip-accent: a white name, the accent on the head's rule and level badge.
export const traitClasses = {
  head: "flex items-center justify-between gap-4 in-[.follower-tooltip]:border-b in-[.follower-tooltip]:border-(--tip-accent) in-[.follower-tooltip]:pb-2 [&>.calc-coverage]:my-0 [&>.calc-coverage]:mr-0 [&>.calc-coverage]:ml-auto [&>.calc-coverage]:flex-none",
  title: "min-w-0 font-serif text-[0.91rem]/[1.25] font-bold text-gold in-[.follower-tooltip]:text-white",
  level:
    "flex-none rounded-xl border border-[#957a08] bg-[#292509] px-2 py-0.75 text-[0.61rem] text-[#ffd21f] not-italic in-[.follower-tooltip]:border-(--tip-accent) in-[.follower-tooltip]:bg-[color-mix(in_srgb,var(--tip-accent)_22%,#111)] in-[.follower-tooltip]:text-(--tip-accent)",
  unlock:
    "mt-2 mb-2.5 block text-[0.62rem] tracking-[0.08em] text-[#9ba9b8] uppercase in-[.follower-tooltip]:text-white/75",
  effects:
    "grid gap-1 [&>.follower-flavor]:italic [&>.follower-keyword_b]:text-gold [&>p]:text-[0.73rem]/[1.5] [&>p]:text-[#f0f3f6] in-[.follower-tooltip]:[&>p]:text-[#f2f0ec]",
  progression: "inline-flex items-baseline whitespace-nowrap",
  current: "font-black text-[#48e390] [text-shadow:0_0_10px_rgba(72,227,144,0.22)]",
  other: "text-[#d5a928]",
  separator: "mx-0.5 text-[#778493]",
  keyword: "font-bold underline underline-offset-2",
  hint: "mt-2.5 block border-t border-[#303945] pt-2 text-[0.61rem] tracking-[0.08em] text-[#a7c6d8] uppercase in-[.revival-alt-held]:hidden",
  details:
    "mt-2 hidden border-l-2 border-[#75d8f6] bg-[#102b3b] px-2 py-1.75 leading-[1.4] text-[#e1f3fa] in-[.revival-alt-held]:grid in-[.revival-alt-held]:gap-1.75",
  definitionName: "font-bold underline underline-offset-2",
  definitionKind: "ml-1.5 text-[0.58rem] tracking-[0.05em] text-[#a7c6d8] not-italic uppercase",
  definitionLine: "mt-0.5 block text-[0.68rem]/[1.4] text-[#e1f3fa]",
  source:
    "mt-2.5 block border-t border-[#303945] pt-2 text-[0.62rem] tracking-[0.08em] text-[#8794a2] uppercase in-[.follower-tooltip]:text-white/75",
};

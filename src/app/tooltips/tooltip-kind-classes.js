// Tailwind class lists of the planner tooltip kinds whose content is still an HTML string: Pactspirits and pact nodes,
// slates, hero memories, Sage's scents, hero traits and followers. The frame of each kind (size, border, background,
// padding) and the colour it exposes (--tip-accent, --tip-edge, --tip-name) are #planner-tooltip's
// (apps/web/src/ui/tooltip/tooltip-classes.ts), and so are the coverage badges; these lists draw the content. Literal
// strings, so Tailwind finds every class.

// Pactspirits and their tree nodes (pact-tooltips.js); the frame's --tip-accent / --tip-edge follow the rarity.
export const pactClasses = {
  head: "flex items-center gap-2.75 border-b border-line px-3.5 py-3.25 [&>img]:size-12 [&>img]:flex-none [&>img]:object-contain",
  title: "block font-display text-sm/tight font-bold text-(--tip-accent)",
  kicker: "mt-1 block text-xs/tight text-muted",
  heading: "mx-3.5 mt-3 mb-1.5 text-xs font-bold text-(--tip-accent) uppercase",
  text: "mx-3.5 my-2.5 text-xs/normal text-text",
  feature:
    "mx-3.5 my-3 rounded-sm border border-(--tip-edge) bg-raised p-2.5 text-center [&>img]:mx-auto [&>img]:mb-1.25 [&>img]:size-11 [&>img]:object-contain [&>strong]:text-sm/snug [&>strong]:font-bold [&>strong]:text-(--tip-accent)",
  rewards:
    "mx-3.5 mt-2 mb-3.25 grid gap-1.5 [&_.skill-level-bonus]:text-ok [&>li]:border-l-2 [&>li]:border-(--tip-edge) [&>li]:pl-2.5 [&>li]:text-xs/snug [&>li]:text-text",
  footer: "block border-t border-line px-3.5 py-2.25 text-center text-xs text-dim",
};

// A god family's colour, --talent-emblem, by its talent-family-* class: on the slate head itself (a god's slate) and
// on the tree names in its affixes (slates/slate-shapes.js coloredSlateAffix). The title and the tree names read it.
const FAMILY_EMBLEMS = [
  "[&.talent-family-god-of-might,&_.talent-family-god-of-might]:[--talent-emblem:var(--color-god-might)]",
  "[&.talent-family-goddess-of-hunting,&_.talent-family-goddess-of-hunting]:[--talent-emblem:var(--color-god-hunting)]",
  "[&.talent-family-goddess-of-knowledge,&_.talent-family-goddess-of-knowledge]:[--talent-emblem:var(--color-god-knowledge)]",
  "[&.talent-family-god-of-war,&_.talent-family-god-of-war]:[--talent-emblem:var(--color-god-war)]",
  "[&.talent-family-goddess-of-deception,&_.talent-family-goddess-of-deception]:[--talent-emblem:var(--color-god-deception)]",
  "[&.talent-family-god-of-machines,&_.talent-family-god-of-machines]:[--talent-emblem:var(--color-god-machines)]",
].join(" ");

// A slate on the board or in the Slate Inventory (slate-tooltips.js).
export const slateClasses = {
  head: `grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2.5 [&>img]:size-10.5 [&>img]:object-contain ${FAMILY_EMBLEMS}`,
  title: "block font-display text-sm/tight font-bold text-[var(--talent-emblem,var(--color-info))]",
  kicker: "mt-2 block border-t border-line pt-2 text-xs tracking-wider text-muted",
  judgment: "my-2 rounded-sm border border-info/50 bg-info/10 px-2.25 py-1.5 text-xs font-bold text-info",
  preview: `mt-3 border-t border-line pt-2.5 [&_.slate-affix-tree]:font-extrabold [&_.slate-affix-tree]:text-[var(--talent-emblem,var(--color-text))] ${FAMILY_EMBLEMS} [&>p]:text-xs [&>p]:text-muted`,
  section: "not-first:mt-3 not-first:border-t not-first:border-line not-first:pt-2.5",
  heading: "mb-1.75 text-[10px] font-bold tracking-widest text-muted uppercase",
  list: "grid gap-2",
  affix: "text-xs/normal wrap-anywhere",
  coreAffix: "-ml-1.75 border-l-3 border-info bg-info/10 p-2",
  limitedAffix: "-ml-1.75 border-l-3 border-warn bg-warn/10 px-2 py-2.5",
  coreBadge:
    "mb-1.25 inline-block rounded-sm border border-info/60 bg-info/15 px-1.5 py-0.5 text-[10px]/tight font-bold tracking-wider text-info uppercase",
  coreSummary: "block font-bold text-info",
  coreHint: "mt-1 block text-xs text-muted in-[.revival-alt-held]:hidden",
  coreDetail:
    "mt-1.75 hidden border-l-2 border-info bg-info/10 px-2 py-1.75 leading-snug text-text in-[.revival-alt-held]:block",
  badges: "mt-2 flex flex-wrap items-center gap-1 [&>.calc-coverage]:m-0",
  limitBadge:
    "inline-block w-max max-w-full rounded-sm border border-warn/60 bg-warn/15 px-1.5 py-0.5 text-[10px]/tight font-bold text-warn",
  copied:
    "mt-2.5 rounded-sm border border-l-3 border-grade-rare/40 border-l-grade-rare bg-grade-rare/10 p-2 [&>p]:text-xs",
  copiedHeading: "mb-2 text-[10px] font-bold tracking-widest text-grade-rare uppercase",
  copiedList: "grid gap-1.25",
  copiedAffix:
    "grid gap-1.25 rounded-sm border border-grade-rare/25 bg-sunken px-1.25 py-1 text-xs [&>.calc-coverage]:m-0 [&>.calc-coverage]:justify-self-start [&>span]:min-w-0 [&>span]:leading-snug [&>span]:text-text",
  copiedMeta: "flex min-w-0 items-center gap-2 [&>small]:min-w-0 [&>small]:text-xs [&>small]:text-muted",
  copiedBadge:
    "inline-flex flex-none rounded-xs bg-grade-rare px-1 py-px text-[10px]/tight font-bold tracking-wide text-on-accent uppercase",
};

// A hero memory (hero-tooltips.js); the frame's --tip-accent follows its rarity.
export const memoryClasses = {
  head: "flex items-center gap-2.5 border-b border-(--tip-edge) px-3 py-2.75 [&>img]:size-9 [&>img]:object-contain",
  title: "block font-display text-sm font-bold text-(--tip-accent)",
  kicker: "mt-0.75 block text-xs text-muted",
  body: "px-3 py-2.5",
  stat: "mb-1 flex justify-between gap-3 text-xs text-muted [&>b]:text-text",
  statValue: "mb-1 flex justify-between gap-3 text-xs text-muted [&>b]:text-ok",
  section: "mt-2.25 [&>.calc-coverage]:ml-0",
  heading: "mb-1 text-[10px] font-bold tracking-wider text-muted uppercase",
  line: "my-0.75 text-xs/snug whitespace-pre-line text-text",
  lineWax: "my-0.75 text-xs/snug font-bold whitespace-pre-line text-ok",
  affix:
    "my-1 grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-1.5 text-xs/snug text-text [&>.affix-tier-badge]:mt-px [&>.calc-coverage]:col-start-3 [&>.calc-coverage]:row-start-1 [&>.calc-coverage]:m-0",
  affixText: "col-start-2 row-start-1 min-w-0",
  footer: "block border-t border-line px-3 py-2 text-xs text-dim",
  revivalBadge:
    "mx-3 mt-2.25 inline-flex w-max items-center gap-1 rounded-sm bg-grade-magic px-2 py-0.5 text-xs font-bold tracking-wide whitespace-nowrap text-on-accent [&>span]:text-sm [&>span]:leading-none",
  revived: "flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs/snug whitespace-pre-line text-text",
  revivedSpecial:
    "gap-x-2 [&>.memory-revived-name]:font-bold [&>.memory-revived-name]:underline [&>.memory-revived-name]:underline-offset-2",
  revivedName: "text-info",
  revivedHint: "text-xs whitespace-nowrap text-muted",
  revivedDetail:
    "mt-1.25 hidden basis-full border-l-2 border-info bg-info/10 px-2 py-1.75 leading-normal whitespace-pre-line text-text in-[.revival-alt-held]:block",
  revivedList:
    "grid gap-1.25 [&>li]:relative [&>li]:pl-2.5 [&>li]:before:absolute [&>li]:before:top-[0.48em] [&>li]:before:left-0 [&>li]:before:size-1 [&>li]:before:rounded-full [&>li]:before:bg-info [&>li]:before:content-['']",
  revivedExclusive:
    "mt-2.25 grid gap-0.5 border-t border-line pt-1.75 text-muted [&>small]:text-[10px] [&>small]:font-bold [&>small]:tracking-wider [&>small]:text-info [&>small]:uppercase [&>span]:text-xs/snug",
};

// Sage's scent ingredients and elixir (hero-tooltips.js).
export const scentClasses = {
  head: "grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2.5 border-b border-line px-3 py-2.75 [&>img]:size-10.5 [&>img]:rounded [&>img]:border [&>img]:border-line-strong [&>img]:bg-sunken [&>img]:object-contain",
  kicker: "mb-0.75 block text-[10px] font-extrabold tracking-wider text-muted uppercase",
  title: "block font-display text-sm/tight font-extrabold text-accent",
  tags: "flex flex-wrap gap-1.25 px-3 pt-2 [&>span]:rounded-xs [&>span]:border [&>span]:border-line [&>span]:bg-raised [&>span]:px-1.5 [&>span]:py-0.75 [&>span]:text-[10px] [&>span]:text-accent [&>span]:uppercase",
  effects: "grid gap-1.5 px-3 py-2.75 [&>p]:text-xs/normal [&>p]:text-text",
  hint: "block border-t border-line px-3 py-1.75 text-[10px] text-dim uppercase",
};

// Hero traits, the hero tree's extra row, followers and their Tartarus Skills (hero-trait-tooltips.js,
// hero/follower-panel.js, hero/hero-trait-tree-markup.js): one layout. A follower's (follower-tooltip on the frame)
// takes its rarity's --tip-accent on the head's rule and level badge.
export const traitClasses = {
  head: "flex items-center justify-between gap-4 in-[.follower-tooltip]:border-b in-[.follower-tooltip]:border-(--tip-edge) in-[.follower-tooltip]:pb-2 [&>.calc-coverage]:my-0 [&>.calc-coverage]:mr-0 [&>.calc-coverage]:ml-auto [&>.calc-coverage]:flex-none",
  title: "min-w-0 font-display text-sm/tight font-bold text-accent in-[.follower-tooltip]:text-text",
  level:
    "flex-none rounded-full border border-accent/60 bg-accent/10 px-2 py-0.75 text-xs text-accent not-italic in-[.follower-tooltip]:border-(--tip-edge) in-[.follower-tooltip]:bg-raised in-[.follower-tooltip]:text-(--tip-accent)",
  unlock: "mt-2 mb-2.5 block text-[10px] tracking-widest text-muted uppercase",
  effects:
    "grid gap-1 [&>.follower-flavor]:italic [&>.follower-keyword_b]:text-accent [&>p]:text-xs/normal [&>p]:text-text",
  progression: "inline-flex items-baseline whitespace-nowrap",
  current: "font-black text-ok",
  other: "text-accent",
  separator: "mx-0.5 text-dim",
  keyword: "font-bold underline underline-offset-2",
  hint: "mt-2.5 block border-t border-line pt-2 text-[10px] tracking-widest text-muted uppercase in-[.revival-alt-held]:hidden",
  details:
    "mt-2 hidden border-l-2 border-info bg-info/10 px-2 py-1.75 leading-snug text-text in-[.revival-alt-held]:grid in-[.revival-alt-held]:gap-1.75",
  definitionName: "font-bold underline underline-offset-2",
  definitionKind: "ml-1.5 text-[10px] tracking-wider text-muted not-italic uppercase",
  definitionLine: "mt-0.5 block text-xs/snug text-text",
  source: "mt-2.5 block border-t border-line pt-2 text-[10px] tracking-widest text-dim uppercase",
};

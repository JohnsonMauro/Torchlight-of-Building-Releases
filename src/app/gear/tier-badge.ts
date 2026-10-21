// An affix tier badge's look (T0+, T0, T1… T7, L), shared by the tooltips, the equipment preview and the hero memory
// crafter. The colours are picked here from the tier, never by a variant on the tier-<n> class: the e2e tests read that
// class (`toHaveClass(/\btier-t1\b/)`), so a utility spelling it would match on every badge.

const tierColours: Readonly<Record<string, string>> = {
  t0plus: "border-[#ef554d] bg-[#8b211c] text-[#fff0ee]",
  t0: "border-[#ef554d] bg-[#8b211c] text-[#fff0ee]",
  t1: "border-[#ff9a3d] bg-[#8a3d08] text-[#fff0dd]",
  t2: "border-[#bf6aff] bg-[#5b247d] text-[#f4ddff]",
  t3: "border-[#bf6aff] bg-[#5b247d] text-[#f4ddff]",
  t4: "border-[#bf6aff] bg-[#5b247d] text-[#f4ddff]",
  t5: "border-[#58a7ff] bg-[#174d83] text-[#e2f2ff]",
  t6: "border-[#58a7ff] bg-[#174d83] text-[#e2f2ff]",
  t7: "border-[#58a7ff] bg-[#174d83] text-[#e2f2ff]",
  l: "border-[#ff9a3d] bg-[#a64a0b] text-[#fff0dd]",
};

/** The badge's key ("T0+" → "t0plus", "L" → "l"): its tier-<key> class and its colours. */
export const tierBadgeKey = (badge: string): string => badge.toLowerCase().replace("+", "plus");

/** The badge's classes: the tier-<key> hook, then a small chip in the tier's colours. */
export const tierBadgeClasses = (key: string): string =>
  `affix-tier-badge tier-${key} mt-px inline-grid h-3.75 min-w-5.5 shrink-0 place-items-center rounded-[3px] border px-1 font-[Arial,sans-serif] text-[0.55rem] leading-none font-bold not-italic ${tierColours[key] ?? "border-[#756858] bg-[#332d29] text-[#ddd1c6]"}`;

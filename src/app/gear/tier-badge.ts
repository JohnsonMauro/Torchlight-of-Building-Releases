// An affix tier badge's look (T0+, T0, T1… T7, L), shared by the tooltips, the equipment preview and the hero memory
// crafter. The colours are picked here from the tier, never by a variant on the tier-<n> class: the e2e tests read that
// class (`toHaveClass(/\btier-t1\b/)`), so a utility spelling it would match on every badge. The tiers take the rarity
// tokens: T0+/T0 vorax red, T1 and L legendary orange, T2–T4 rare purple, T5–T7 magic blue.

const vorax = "border-grade-vorax bg-grade-vorax/15 text-grade-vorax";
const legendary = "border-grade-legendary bg-grade-legendary/15 text-grade-legendary";
const rare = "border-grade-rare bg-grade-rare/15 text-grade-rare";
const magic = "border-grade-magic bg-grade-magic/15 text-grade-magic";

const tierColours: Readonly<Record<string, string>> = {
  t0plus: vorax,
  t0: vorax,
  t1: legendary,
  t2: rare,
  t3: rare,
  t4: rare,
  t5: magic,
  t6: magic,
  t7: magic,
  l: legendary,
};

/** The badge's key ("T0+" → "t0plus", "L" → "l"): its tier-<key> class and its colours. */
export const tierBadgeKey = (badge: string): string => badge.toLowerCase().replace("+", "plus");

/** The badge's classes: the tier-<key> hook, then a small chip in the tier's colours. */
export const tierBadgeClasses = (key: string): string =>
  `affix-tier-badge tier-${key} mt-px inline-grid h-3.75 min-w-5.5 shrink-0 place-items-center rounded-sm border px-1 text-[10px] leading-none font-bold not-italic ${tierColours[key] ?? "border-line-strong bg-raised text-muted"}`;

/** A modifier line's marker in the item preview, as the game draws it: a small diamond in its tier's colour. */
const markerColours: Readonly<Record<string, string>> = {
  t0plus: "bg-grade-vorax",
  t0: "bg-grade-vorax",
  t1: "bg-grade-legendary",
  t2: "bg-grade-rare",
  t3: "bg-grade-rare",
  t4: "bg-grade-rare",
  t5: "bg-grade-magic",
  t6: "bg-grade-magic",
  t7: "bg-grade-magic",
  l: "bg-grade-legendary",
  corrosion: "bg-violet",
};

/** The marker's classes: the affix-tier-badge and tier-<key> hooks (none for a line without a tier), then the diamond. */
export const tierMarkerClasses = (key: string): string =>
  `${key && key !== "corrosion" ? `affix-tier-badge tier-${key} ` : ""}mt-1.5 inline-block size-2 shrink-0 rotate-45 ${markerColours[key] ?? "bg-muted"}`;

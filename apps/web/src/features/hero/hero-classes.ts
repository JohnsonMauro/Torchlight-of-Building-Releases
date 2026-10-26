// Class strings of the hero column shared by the hero tab (HeroTab.tsx, HeroPanel.tsx) and the follower tab
// (features/follower): the tabs, the showcase (portrait frame and identity card), the trait rows and their art, and the
// rarity tints of memories and followers. The rows narrow with the tree (#hero-trait-tree is an @container): compact up
// to 390 px, larger above.
/** A tab of the hero panel (Hero Trait | Trait Path): the shared `tab`, the accent rule when .active. */
export const detailTab = "tab px-3 py-2 text-xs font-bold tracking-wider uppercase";

/** The hero at the head of the character column: the portrait (the Change Hero control) beside the name and trait. */
export const heroHeader = "flex items-center gap-3 p-3";
export const heroPortrait =
  "group/portrait relative size-16 shrink-0 overflow-hidden rounded-md border border-line-strong bg-sunken";
/** The initials (or +) in the portrait without a picture. */
export const heroInitials = "grid size-full place-items-center text-xl font-bold text-accent";
/** The button laid over the portrait: it darkens on hover or keyboard focus. */
export const heroChange =
  "absolute inset-0 cursor-pointer border-0 bg-transparent transition-colors hover:bg-overlay focus-visible:bg-overlay focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";
/** Its swap badge, in the corner: always shown (no hover on touch), larger while hovered. */
export const heroChangeBadge =
  "absolute right-0.5 bottom-0.5 grid size-5 place-items-center rounded-full border border-line-strong bg-surface text-accent transition-transform group-hover/portrait:scale-125";
/** The hero's main trait beside the portrait. */
export const heroTrait = "block truncate text-lg leading-tight font-bold text-accent";

/** The follower's showcase: the portrait frame over the identity card. */
export const showcaseClass = "relative";
/** The portrait frame. */
export const portraitClass =
  "relative mx-3.5 mt-3.5 grid h-[205px] place-items-center overflow-hidden rounded-t-md border border-b-0 border-line bg-sunken";
const portraitBox = "size-[150px] rounded-md";
/** The hero's or follower's picture in the portrait frame: a plain backdrop, or a follower's rarity border and art. */
export const portraitImage = (rarity?: string | null): string =>
  `${portraitBox} relative max-w-none border object-cover ${rarityArt(rarity) || "border-line-strong bg-sunken"}`;
/** The initials (or +) in the frame without a picture. */
export const portraitFallback = `${portraitBox} grid place-items-center border border-line bg-raised text-4xl font-bold text-accent`;
const identityBox =
  "relative mx-3.5 mb-3.5 rounded-b-md border border-line bg-raised px-3 pt-3.5 pb-3.5 before:mb-1.5 before:block before:text-xs before:font-bold before:tracking-wider before:text-accent";
/** The follower's card under the portrait, its caption reading FOLLOWER. */
export const followerIdentityClass = `${identityBox} before:content-['FOLLOWER']`;
/** The hero's name: small caps over the title. */
export const identityName = "block text-xs font-bold tracking-wider text-text uppercase";
/** The title under the portrait (the hero's main trait, the follower's name). */
export const identityTitle = "mt-1 mb-2 block text-lg leading-tight font-bold text-accent";
/** Change Hero / Change Follower, and the follower's special effect chip: a button. */
export const bronzeChip = "relative inline-flex items-center btn";
export const changeButton = `${bronzeChip} gap-1 px-2 py-1.5 text-xs font-bold before:content-['↻']`;

/** No hero (or no follower): the call to choose one. */
export const pendingClass =
  "grid min-h-[150px] content-center gap-2 rounded-md border border-line bg-raised px-4 py-5 text-center [&>span]:text-xs [&>span]:text-muted [&>strong]:text-base [&>strong]:font-bold [&>strong]:text-accent";
/** The "Choose Hero" / "Choose Follower" button of an empty panel. */
export const chooseButton = "btn mt-2 px-3.5 py-2 text-xs font-bold tracking-wide uppercase";

// ---- The trait rows ---------------------------------------------------------------------------------------------------
const rowBox =
  "grid min-h-19 items-center gap-1.75 rounded border border-line bg-raised p-1.75 @min-[391px]:min-h-[90px] @min-[391px]:gap-x-2.5 @min-[391px]:px-3 @min-[391px]:py-2";
/** A row: level, memory (or base trait), divider, choices. */
export const tierRow = `${rowBox} grid-cols-[42px_50px_1px_minmax(0,1fr)] @min-[391px]:grid-cols-[48px_64px_1px_minmax(0,1fr)]`;
/** A row without choices: level and memory. */
export const memoryOnlyRow = `${rowBox} grid-cols-[42px_50px_minmax(0,1fr)] @min-[391px]:grid-cols-[48px_64px_minmax(0,1fr)]`;
/** A tree hero's row while a pick is dragged: where it may land, where it would land now, where it may not. */
export const dropEligible = "outline-1 -outline-offset-3 outline-dashed outline-accent-strong";
export const dropTarget = "outline-2 -outline-offset-3 outline-accent-strong";
export const dropBlocked = "cursor-not-allowed opacity-35 grayscale";

/** The level (or slot number) at the start of a row. */
export const tierLevelClass =
  "grid place-items-center self-stretch rounded-sm bg-sunken text-muted [&>small]:text-[10px] [&>strong]:text-base/[normal] [&>strong]:text-text";
export const tierDivider = "h-13 bg-line";
/** The choices of a row (and each half of a dual row). */
export const choicesClass = "flex min-w-0 items-center gap-1.75 @min-[391px]:gap-3.5";

/** Game art in its frame (ui/Artwork): the image fills the frame; the ◆ shows only without one. */
export const artFrame =
  "relative grid place-items-center overflow-hidden [&>img]:absolute [&>img]:inset-0 [&>img]:z-1 [&>img]:size-full [&>img]:max-w-none [&>img]:object-cover [&>img+span]:invisible";
/** A trait's (or follower skill's) round art; accent ring when picked. A dual row's art is a little smaller. */
export function choiceArt(picked: boolean, dual = false): string {
  const size = dual ? "size-[39px] @min-[391px]:size-[50px]" : "size-[43px] @min-[391px]:size-14";
  return `${artFrame} ${size} rounded-full border-2 bg-sunken ${picked ? "border-accent" : "border-line-strong"}`;
}
/** A trait button: the art alone (dim it until picked; the cursor is the caller's: pointer, or grab for a pick). */
export const choiceButton =
  "grid min-w-0 justify-items-center gap-1 border-0 bg-transparent p-0 text-text focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent";

// ---- Rarity tints -----------------------------------------------------------------------------------------------------
// A memory's or a follower's rarity: the accent (border, text) and the card art behind the picture. Follower rarities
// spell the purple and red tiers "rare" and "ult"; memories "epic" and "ultimate".
const rarityTint: Record<string, { text: string; art: string }> = {
  normal: { text: "text-grade-normal", art: "border-grade-normal bg-raised" },
  magic: {
    text: "text-grade-magic",
    art: "border-grade-magic bg-grade-magic/15 bg-(image:--art-magic)",
  },
  epic: {
    text: "text-grade-rare",
    art: "border-grade-rare bg-grade-rare/15 bg-[url(../../../../src/assets/epic-gear-memory-aura-background.png)]",
  },
  legendary: {
    text: "text-grade-legendary",
    art: "border-grade-legendary bg-grade-legendary/15 bg-[url(../../../../src/assets/legendary-memory-gear-background.png)]",
  },
  ultimate: {
    text: "text-grade-vorax",
    art: "border-grade-vorax bg-grade-vorax/15 bg-[url(../../../../src/assets/ultimate-memory-vorax-background.png)]",
  },
};
const tintOf = (rarity: string | null | undefined) =>
  rarityTint[rarity === "rare" ? "epic" : rarity === "ult" ? "ultimate" : (rarity ?? "")] ?? null;
/** The rarity's text colour ("" for none). */
export const rarityText = (rarity: string | null | undefined): string => tintOf(rarity)?.text ?? "";
/** The rarity's border and card art, for a picture that covers it ("" for none). */
export const rarityArt = (rarity: string | null | undefined): string => {
  const tint = tintOf(rarity);
  return tint ? `${tint.art} bg-cover bg-top bg-no-repeat` : "";
};

// ---- Memory sockets -----------------------------------------------------------------------------------------------------
/** A memory socket: the memory's art, or a dashed + that takes the accent on hover and focus. */
export const memorySocket =
  "group/socket relative grid h-[43px] w-[50px] min-w-0 cursor-pointer place-self-center justify-items-center gap-0.75 border-0 bg-transparent p-0 text-text focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent @min-[391px]:h-14 @min-[391px]:w-16";
export const memoryEmpty =
  "grid size-[42px] place-items-center rounded-md border-2 border-dashed border-line-strong text-base text-dim group-hover/socket:border-accent group-hover/socket:text-accent group-focus-visible/socket:border-accent group-focus-visible/socket:text-accent @min-[391px]:size-[54px]";
/** A socketed memory's art: its rarity's border and card art. */
export const memoryArt = (rarity: string | null | undefined): string =>
  `${artFrame} size-[43px] rounded-md border ${rarityArt(rarity) || "border-grade-magic"} @min-[391px]:size-14`;

// ---- Support slots (Carino's Special Ammo, a trait-support hero's one slot) --------------------------------------------
export const supportSlots = "flex min-w-0 items-center justify-center gap-1.25 @min-[391px]:gap-2.25";
/** A round slot: dashed when empty, info-coloured when filled, greyed when locked (disabled); lifts on hover and focus. */
export const supportSlot = (filled: boolean): string =>
  `grid size-[30px] cursor-pointer place-items-center rounded-full border-2 bg-sunken p-0 text-muted transition-[border-color,translate] duration-150 enabled:hover:-translate-y-px enabled:hover:border-accent focus-visible:-translate-y-px focus-visible:border-accent focus-visible:outline-0 off:cursor-not-allowed off:opacity-30 off:grayscale @min-[391px]:size-9 [&>b]:text-sm [&>b]:font-normal ${filled ? "border-solid border-info" : "border-dashed border-line-strong"}`;
export const supportArt = `${artFrame} size-[26px] rounded-full @min-[391px]:size-[30px]`;

// ---- A tree hero's Trait Path board -------------------------------------------------------------------------------------
export function pathNodeArt(node: { base: boolean; selected: boolean; locked: boolean }): string {
  const size = node.base ? "size-13" : "size-11";
  const border = node.base ? "border-accent" : node.selected ? "border-accent-strong" : "border-line-strong";
  const hover =
    node.base || node.locked
      ? ""
      : "group-hover/node:border-accent-strong group-focus-visible/node:border-accent-strong";
  return `${artFrame} ${size} rounded-full border-2 bg-sunken ${border} ${hover}`;
}

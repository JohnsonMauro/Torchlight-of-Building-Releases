// Class strings of the hero column shared by the hero tab (HeroTab.tsx, HeroPanel.tsx) and the follower tab
// (features/follower): the gold tabs, the showcase (wordmark, portrait frame, gilded caption), the trait rows and their
// art, and the rarity tints of memories and followers. The rows narrow with the tree (#hero-trait-tree is an
// @container): compact up to 390 px, larger above.
/** A gold tab (HERO | FOLLOWER, Hero Trait | Trait Path): gold underline and glow when .active. */
export const goldTab =
  "cursor-pointer border-0 border-b-2 border-transparent bg-[linear-gradient(rgb(249_202_101/0.035),transparent)] px-2 text-[0.73rem] font-extrabold tracking-[0.08em] text-[#c9b58d] uppercase hover:bg-[linear-gradient(rgb(249_202_101/0.1),transparent)] hover:text-[#fff0b0] focus-visible:outline-2 focus-visible:-outline-offset-3 focus-visible:outline-gold on:border-gold on:bg-[linear-gradient(rgb(249_202_101/0.12),rgb(249_202_101/0.02))] on:text-gold on:[border-image:linear-gradient(90deg,#df9230,#f9ca65,#df9230)_1]";

/** The panel's cool glow behind the showcase. */
export const panelGlow =
  "before:pointer-events-none before:absolute before:inset-x-0 before:top-12 before:h-[290px] before:bg-[radial-gradient(circle_at_50%_38%,rgb(42_176_221/0.2),transparent_48%),linear-gradient(145deg,transparent_42%,rgb(255_126_30/0.1))] before:content-['']";
/** The showcase: the Torchlight wordmark dimmed behind the portrait card. */
export const showcaseClass =
  "relative isolate overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:z-1 before:scale-90 before:bg-[url(../../../../src/assets/torchlight-wordmark-preview.png)] before:bg-[size:700.65%_249.65%] before:bg-[position:0_43.75%] before:bg-no-repeat before:opacity-26 before:drop-shadow-[0_0_20px_rgb(245_177_66/0.6)] before:content-['']";
/** The portrait frame, with an ember line under the picture. */
export const portraitClass =
  "relative mx-3.5 mt-3.5 grid h-[205px] place-items-center overflow-hidden rounded-t-[9px] border border-b-0 border-[#303b49] bg-[radial-gradient(circle_at_50%_48%,rgb(235_176_70/0.18),transparent_54%),linear-gradient(145deg,rgb(29_32_36/0.98),rgb(12_17_25/0.98))] shadow-[0_14px_28px_rgb(0_0_0/0.24)] after:absolute after:inset-x-0 after:bottom-6.5 after:z-2 after:mx-auto after:h-0.5 after:w-[118px] after:bg-[linear-gradient(90deg,transparent,#ff8a2c,transparent)] after:shadow-[0_0_12px_#ff7b22] after:content-['']";
const portraitBox = "size-[150px] rounded-lg shadow-[0_14px_28px_#020408,0_0_0_5px_rgb(12_17_24/0.72)]";
/** The hero's or follower's picture in the portrait frame: a black backdrop, or a follower's rarity border and art. */
export const portraitImage = (rarity?: string | null): string =>
  `${portraitBox} relative z-3 max-w-none border object-cover saturate-[1.08] contrast-[1.04] ${rarityArt(rarity) || "border-[rgb(117_151_181/0.6)] bg-black"}`;
/** The initials (or +) in the frame without a picture. */
export const portraitFallback = `${portraitBox} relative z-1 grid place-items-center bg-[radial-gradient(circle_at_35%_30%,#39465d,#18202d_58%,#090d13)] font-serif text-4xl font-bold text-gold`;
const identityBox =
  "relative mx-3.5 mb-3.5 rounded-b-[9px] border border-[#303b49] border-t-[#b89552] bg-[linear-gradient(100deg,rgb(22_29_41/0.98),rgb(12_17_25/0.98))] px-3.25 pt-3.75 pb-3.5 shadow-[0_14px_28px_rgb(0_0_0/0.24)] before:mb-1.75 before:block before:font-display before:text-xs/[normal] before:font-black before:tracking-[0.07em] before:text-gilded";
/** The card under the portrait, its gilded caption reading MAIN HERO TRAIT. */
export const identityClass = `${identityBox} before:content-['MAIN_HERO_TRAIT']`;
/** The follower's card under the portrait, its caption reading FOLLOWER. */
export const followerIdentityClass = `${identityBox} before:content-['FOLLOWER']`;
/** The name under the portrait. */
export const identityTitle =
  "relative z-3 mt-1.25 mb-2.25 block font-serif text-[1.18rem] leading-[1.12] font-bold text-[#f6f8fa] text-shadow-[0_2px_12px_rgb(0_0_0/0.8)]";
/** Change Hero / Change Follower, and the follower's special effect chip: a bronze button. */
export const bronzeChip =
  "relative z-3 inline-flex items-center btn-bronze hover:shadow-[0_0_0_2px_rgb(231_179_93/0.16)] focus-visible:shadow-[0_0_0_2px_rgb(231_179_93/0.16)]";
export const changeButton = `${bronzeChip} gap-1.25 px-2.25 py-1.5 text-[0.68rem] font-bold before:text-[0.78rem] before:content-['↻']`;

/** No hero (or no follower): the call to choose one. */
export const pendingClass =
  "grid min-h-[150px] content-center gap-1.75 rounded border border-[#806341] border-t-[#cba257] bg-[linear-gradient(135deg,#343329,#141c24_75%)] px-4.5 py-5.5 text-center shadow-[inset_0_1px_rgb(255_230_166/0.08)] [&>span]:text-[0.7rem] [&>span]:leading-normal [&>span]:text-[#bcc9d4] [&>strong]:font-serif [&>strong]:text-base [&>strong]:font-bold [&>strong]:text-gold";
/** The "Choose Hero" / "Choose Follower" button of an empty panel. */
export const chooseButton = "btn-bronze mt-2 px-3.5 py-2.25 text-[0.68rem] font-bold tracking-[0.06em] uppercase";

// ---- The trait rows ---------------------------------------------------------------------------------------------------
const rowBox =
  "grid min-h-19 items-center gap-1.75 border border-[#354251] bg-[radial-gradient(circle_at_14%_15%,rgb(112_66_103/0.1),transparent_45%),linear-gradient(145deg,#192230,#0e141d)] p-1.75 @min-[391px]:min-h-[90px] @min-[391px]:gap-x-2.5 @min-[391px]:px-3 @min-[391px]:py-2";
/** A row: level, memory (or base trait), divider, choices. */
export const tierRow = `${rowBox} grid-cols-[42px_50px_1px_minmax(0,1fr)] @min-[391px]:grid-cols-[48px_64px_1px_minmax(0,1fr)]`;
/** A row without choices: level and memory. */
export const memoryOnlyRow = `${rowBox} grid-cols-[42px_50px_minmax(0,1fr)] @min-[391px]:grid-cols-[48px_64px_minmax(0,1fr)]`;
/** A tree hero's row while a pick is dragged: where it may land, where it would land now, where it may not. */
export const dropEligible = "outline-1 -outline-offset-3 outline-dashed outline-[#ffaf61]";
export const dropTarget =
  "outline-2 -outline-offset-3 outline-[#ff8a2a] shadow-[inset_0_0_18px_#ff632b44,0_0_14px_#ff632b55]";
export const dropBlocked = "cursor-not-allowed opacity-35 grayscale";

/** The level (or slot number) at the start of a row. */
export const tierLevelClass =
  "grid place-items-center self-stretch bg-[#222938] text-[#9aa7b4] [&>small]:text-[0.52rem] [&>strong]:text-base/[normal] [&>strong]:text-[#eef3f7]";
export const tierDivider = "h-13 bg-[#45505e]";
/** The choices of a row (and each half of a dual row). */
export const choicesClass = "flex min-w-0 items-center gap-1.75 @min-[391px]:gap-3.5";

/** Game art in its frame (ui/Artwork): the image fills the frame; the ◆ shows only without one. */
const artFrame =
  "relative grid place-items-center overflow-hidden [&>img]:absolute [&>img]:inset-0 [&>img]:z-1 [&>img]:size-full [&>img]:max-w-none [&>img]:object-cover [&>img+span]:invisible";
/** A trait's (or follower skill's) round art; gold ring when picked. A dual row's art is a little smaller. */
export function choiceArt(picked: boolean, dual = false): string {
  const size = dual ? "size-[39px] @min-[391px]:size-[50px]" : "size-[43px] @min-[391px]:size-14";
  const ring = picked
    ? "border-[#ffc53d] shadow-[0_0_0_2px_#966d14,0_0_12px_rgb(255_179_40/0.3)]"
    : "border-[#4e5c6a] shadow-[inset_0_0_0_2px_#10151d]";
  return `${artFrame} ${size} rounded-full border-2 ${ring}`;
}
/** A trait button: the art alone (dim it until picked; the cursor is the caller's: pointer, or grab for a pick). */
export const choiceButton =
  "grid min-w-0 justify-items-center gap-1 border-0 bg-transparent p-0 text-[#dce5ec] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ff9137]";

// ---- Rarity tints -----------------------------------------------------------------------------------------------------
// A memory's or a follower's rarity: the accent (border, text) and the card art behind the picture. Follower rarities
// spell the purple and red tiers "rare" and "ult"; memories "epic" and "ultimate".
const rarityTint: Record<string, { text: string; art: string }> = {
  normal: { text: "text-[#d6dce2]", art: "border-[#d6dce2] bg-[#30363d]" },
  magic: {
    text: "text-[#50d0f4]",
    art: "border-[#50d0f4] bg-[#122b38] bg-[url(../../../../src/assets/active-skill-rare-background.png)]",
  },
  epic: {
    text: "text-[#d96bf2]",
    art: "border-[#d96bf2] bg-[#1b1740] bg-[url(../../../../src/assets/epic-gear-memory-aura-background.png)]",
  },
  legendary: {
    text: "text-[#ff993f]",
    art: "border-[#ff993f] bg-[#2b1c13] bg-[url(../../../../src/assets/legendary-memory-gear-background.png)]",
  },
  ultimate: {
    text: "text-[#ff635c]",
    art: "border-[#ff635c] bg-[#2d1110] bg-[url(../../../../src/assets/ultimate-memory-vorax-background.png)]",
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
/** A memory socket: the memory's art, or a dashed + that turns ember on hover and focus. */
export const memorySocket =
  "group/socket relative grid h-[43px] w-[50px] min-w-0 cursor-pointer place-self-center justify-items-center gap-0.75 border-0 bg-transparent p-0 text-[#dce5ec] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ff9137] @min-[391px]:h-14 @min-[391px]:w-16";
export const memoryEmpty =
  "grid size-[42px] place-items-center rounded-lg border-2 border-dashed border-[#66717f] text-base text-[#8c98a5] group-hover/socket:border-[#ff9137] group-hover/socket:text-[#ff9137] group-focus-visible/socket:border-[#ff9137] group-focus-visible/socket:text-[#ff9137] @min-[391px]:size-[54px]";
/** A socketed memory's art: its rarity's border and card art. */
export const memoryArt = (rarity: string | null | undefined): string =>
  `${artFrame} size-[43px] rounded-lg border ${rarityArt(rarity) || "border-[#69c7e2]"} @min-[391px]:size-14`;

// ---- Support slots (Carino's Special Ammo, a trait-support hero's one slot) --------------------------------------------
export const supportSlots = "flex min-w-0 items-center justify-center gap-1.25 @min-[391px]:gap-2.25";
/** A round slot: dashed when empty, cyan when filled, greyed when locked (disabled); lifts on hover and focus. */
export const supportSlot = (filled: boolean): string =>
  `grid size-[30px] cursor-pointer place-items-center rounded-full border-2 bg-[#0d141d] p-0 text-[#88a0b4] transition-[border-color,box-shadow,translate] duration-150 enabled:hover:-translate-y-px enabled:hover:border-[#ff922f] enabled:hover:shadow-[0_0_10px_#ff7d2438] focus-visible:-translate-y-px focus-visible:border-[#ff922f] focus-visible:shadow-[0_0_10px_#ff7d2438] focus-visible:outline-0 off:cursor-not-allowed off:opacity-30 off:grayscale @min-[391px]:size-9 [&>b]:text-[0.9rem] [&>b]:font-normal ${filled ? "border-solid border-[#69c7e2]" : "border-dashed border-[#607080]"}`;
export const supportArt = `${artFrame} size-[26px] rounded-full @min-[391px]:size-[30px]`;

// ---- A tree hero's Trait Path board -------------------------------------------------------------------------------------
export function pathNodeArt(node: { base: boolean; selected: boolean; locked: boolean }): string {
  const size = node.base ? "size-13" : "size-11";
  const border = node.base ? "border-[#ffc264]" : node.selected ? "border-[#ff8a2a]" : "border-[#566271]";
  const shadow = node.selected ? "shadow-[0_0_0_2px_#743f20,0_0_14px_#ff632b88]" : "shadow-[inset_0_0_0_2px_#0c1118]";
  const hover =
    node.base || node.locked
      ? ""
      : "group-hover/node:border-[#ffaf61] group-hover/node:shadow-[0_0_12px_#ff702466] group-focus-visible/node:border-[#ffaf61] group-focus-visible/node:shadow-[0_0_12px_#ff702466]";
  return `${artFrame} ${size} rounded-full border-2 bg-[#111720] ${border} ${shadow} ${hover}`;
}

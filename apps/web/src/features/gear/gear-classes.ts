// How the Gear section draws an equipped slot or an Inventory card (Tailwind utilities), decided from the rarity
// classes the planner's view model sets ("rarity-legendary", "rarity-epic priceless-item", "rarity-vorax
// graft-legendary", plus "six-affix", "item-level-100"), and the drag-and-drop states. Those classes stay on the element
// (tooltips and tests read them); the look is chosen here, so no rule keys off them. The rarity art wins over the
// Priceless and six-affix looks, item level 100 over every art; a Priceless or six-affix magic/epic item keeps its
// violet frame over the art.
// The colours are the grade-* tokens; Priceless, six-affix and item-level-100 pink is `grade-priceless`, as the gear
// tooltip's frame.

/** What an item looks like, part by part, so a slot state can replace one part (its frame). */
export interface GearLook {
  border: string;
  background: string;
  /** The item name's colour on an Inventory card. */
  name: string;
}

/**
 * A veil of the theme's surface over a rarity art, so the text on it reads in both themes (the art is dark, the light
 * theme's text is dark). The element is `relative`; the veil sits between its background and its content.
 */
const ART_VEIL =
  "isolate before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:bg-veil before:content-['']";

// The rarity art, cover and anchored at the top (url() paths are relative to apps/web/src/styles/app.css), over the
// raised colour while it loads.
const ART_FIT = `bg-raised bg-cover bg-top bg-no-repeat ${ART_VEIL}`;
export const RARITY_ART: Readonly<Record<string, string>> = {
  common: "bg-[url(../../../../src/assets/common-memory-gear-background.webp)]",
  magic: "bg-(image:--art-magic)",
  epic: "bg-[url(../../../../src/assets/epic-gear-memory-aura-background.png)]",
  legendary: "bg-[url(../../../../src/assets/legendary-memory-gear-background.png)]",
  vorax: "bg-[url(../../../../src/assets/ultimate-memory-vorax-background.png)]",
};
/** The art of an item level 100 card or slot (the item preview has its own, taller one). */
const LEVEL_100_ART = "bg-[url(../../../../src/assets/item-level-100-inventory-background.png)]";
/** Rarity art and its fit and veil. */
export const artBackground = (art: string): string => `${art} ${ART_FIT}`;

/** The art (or flat tint) behind an item: item level 100 over the rarity art, the rarity art over Priceless and six-affix. */
function background(has: (word: string) => boolean): string {
  if (has("item-level-100")) return artBackground(LEVEL_100_ART);
  for (const rarity of ["vorax", "legendary", "epic", "magic"])
    if (has(`rarity-${rarity}`)) return artBackground(RARITY_ART[rarity]);
  if (has("priceless-item")) return "bg-grade-priceless/15";
  return has("six-affix") ? "bg-grade-priceless/10" : "bg-raised";
}

/** The frame and name colours: item level 100 pink; Vorax and Legendary over a Priceless or six-affix pink. */
function tint(has: (word: string) => boolean): [border: string, name: string] {
  if (has("item-level-100")) return ["border-grade-priceless", "text-grade-priceless"];
  if (has("rarity-vorax")) return ["border-grade-vorax", "text-grade-vorax"];
  if (has("rarity-legendary")) return ["border-grade-legendary", "text-grade-legendary"];
  if (has("priceless-item") || has("six-affix")) return ["border-grade-priceless", "text-grade-priceless"];
  if (has("rarity-epic")) return ["border-grade-rare", "text-grade-rare"];
  if (has("rarity-magic")) return ["border-grade-magic", "text-grade-magic"];
  if (has("rarity-common")) return ["border-grade-normal", "text-grade-normal"];
  return ["border-line-strong", "text-text"];
}

/** The look of an item from its rarity classes. */
export function gearLook(rarityClasses: string): GearLook {
  const words = rarityClasses.split(/\s+/);
  const has = (word: string) => words.includes(word);
  const [border, name] = tint(has);
  return { border, background: background(has), name };
}

/** The drag-and-drop states of a slot or of the Inventory (the outline they add). */
export const DROP_ELIGIBLE = "outline-1 outline-dashed outline-info -outline-offset-3";
export const DROP_TARGET = "outline-2 outline-ok -outline-offset-3";

/** An empty slot: a dashed frame, greyed out. */
export const EMPTY_SLOT = "border-dashed bg-sunken opacity-65 grayscale";
/** The selected slot's frame (and, over an item's art, a second line inside it). */
export const SELECTED_BORDER = "border-accent";
export const SELECTED_RING = "ring-1 ring-inset ring-accent";
/** A slot whose curse the curse limit leaves out: a red outline over every other state. */
export const CURSE_LIMIT_OUTLINE = "outline-3 outline-danger outline-offset-1";

/** Vorax limbs sit high in their art: lower them in an Inventory card. */
export function inventoryIconShift(icon: string): string {
  if (icon.includes("/gear/vorax/UI_S13_Equipment_01")) return "translate-y-[3px] scale-116";
  if (icon.endsWith("base-Vorax_Limb_Digits.webp") || icon.includes("/gear/vorax/UI_S13_Equipment_")) {
    return "translate-y-[11px] scale-116";
  }
  return "";
}

/** The ghost that follows the pointer during a drag (appended to <body>), and its icon. */
export const DRAG_GHOST =
  "gear-drag-ghost pointer-events-none fixed z-10000 flex max-w-45 items-center gap-2 rounded-md border border-accent bg-raised px-2.5 py-2 text-xs/[normal] font-bold text-text shadow-lg shadow-shadow";
export const DRAG_GHOST_ICON = "size-9.5 object-contain";

/** The section's buttons (Reset Gear, the craft buttons). */
export const SECTION_BUTTON = "btn px-3.5 py-2 text-xs font-bold uppercase";
/** An Inventory card's small square tool buttons (edit, duplicate). */
export const CARD_TOOL = "btn size-5.5 p-0 text-xs";
/** A small caps badge on a slot or card (CURSE OFF, Equipped). */
const BADGE =
  "rounded-sm border bg-surface px-1.5 py-0.5 text-[10px] leading-none font-bold tracking-wide whitespace-nowrap uppercase not-italic";
export const CURSE_BADGE = `curse-off-badge absolute bottom-1.5 left-1/2 z-4 -translate-x-1/2 border-danger text-danger ${BADGE}`;

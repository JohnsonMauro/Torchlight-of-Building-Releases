// How the Gear section draws an equipped slot or an Inventory card (Tailwind utilities), decided from the rarity
// classes the planner's view model sets ("rarity-legendary", "rarity-epic priceless-item", "rarity-vorax
// graft-legendary", plus "six-affix", "item-level-100"), and the drag-and-drop states. Those classes stay on the element
// (tooltips and tests read them); the look is chosen here, so no rule keys off them. The rarity art wins over the
// Priceless and six-affix looks, item level 100 over every art; a Priceless or six-affix magic/epic item keeps its pink
// frame over the art.

/** What an item looks like, part by part, so a slot state can replace one part (its frame, its glow). */
export interface GearLook {
  border: string;
  background: string;
  glow: string;
  /** The item name's color (and shadow) on an Inventory card. */
  name: string;
}

// The rarity art, cover and anchored at the top (url() paths are relative to apps/web/src/styles/app.css).
const LEGENDARY_ART = "bg-[#2b1c13] bg-[url(../../../../src/assets/legendary-memory-gear-background.png)]";
const VORAX_ART = "bg-[#2d1110] bg-[url(../../../../src/assets/ultimate-memory-vorax-background.png)]";
const EPIC_ART = "bg-[#1b1740] bg-[url(../../../../src/assets/epic-gear-memory-aura-background.png)]";
const MAGIC_ART = "bg-[#122b38] bg-(image:--art-magic)";
const LEVEL_100_ART = "bg-[#341229] bg-[url(../../../../src/assets/item-level-100-inventory-background.png)]";
const ART_FIT = "bg-cover bg-top bg-no-repeat";

const COMMON_LIGHT =
  "bg-[radial-gradient(circle_at_50%_38%,rgb(190_198_207/0.34),rgb(89_98_108/0.2)_42%,rgb(17_24_33/0.96)_82%)]";
const SIX_AFFIX_LIGHT =
  "bg-[radial-gradient(circle_at_48%_34%,rgb(255_100_202/0.58),rgb(154_48_118/0.42)_45%,rgb(42_17_39/0.98)_84%)]";
/** Priceless without art: a plum gradient with faint pink rings and specks drawn by ::before. */
const PRICELESS_PLUM =
  "isolate bg-[#3c1d35] bg-[linear-gradient(155deg,#70405f_0,#653554_24%,#522642_59%,#35172e_100%)] before:pointer-events-none before:absolute before:inset-1 before:-z-1 before:opacity-70 before:content-[''] before:[background-image:radial-gradient(circle_2px_at_77%_24%,rgb(255_165_226/0.42)_0_60%,transparent_70%),radial-gradient(circle_2px_at_29%_62%,rgb(255_165_226/0.34)_0_60%,transparent_70%),repeating-radial-gradient(circle_at_58%_48%,transparent_0_17px,rgb(255_164_226/0.17)_18px_19px,transparent_20px_31px)]";

const LEGENDARY_GLOW = "shadow-[0_0_10px_rgb(239_119_29/0.18)]";
const VORAX_GLOW = "shadow-[0_0_10px_rgb(226_62_47/0.24)]";
/** Priceless: a dark and a pink inner frame. */
const PRICELESS_FRAME = "shadow-[inset_0_0_0_3px_rgb(22_20_27/0.72),inset_0_0_0_4px_rgb(255_100_205/0.34)]";
const SIX_AFFIX_GLOW = "shadow-[0_0_10px_rgb(238_63_177/0.18)]";

/** The look of an item from its rarity classes; `card` is an Inventory card (its own frame colors), else a slot. */
export function gearLook(rarityClasses: string, card: boolean): GearLook {
  const has = (word: string) => rarityClasses.split(/\s+/).includes(word);
  const level100 = has("item-level-100");
  const legendary = has("rarity-legendary");
  const vorax = has("rarity-vorax");
  const epic = has("rarity-epic");
  const magic = has("rarity-magic");
  const priceless = has("priceless-item");
  const sixAffix = has("six-affix");
  const plainBorder = card ? "border-[#593313]" : "border-[#3b4552]";
  const pinkBorder = priceless ? "border-[#ff55c7]" : sixAffix ? "border-[#f149ba]" : null;

  let border: string;
  let background: string;
  if (level100) {
    border = "border-[#f45ac3]";
    background = `${LEVEL_100_ART} ${ART_FIT}`;
  } else if (vorax) {
    border = "border-[#e14f40]";
    background = `${VORAX_ART} ${ART_FIT}`;
  } else if (legendary) {
    border = "border-[#ef771d]";
    background = `${LEGENDARY_ART} ${ART_FIT}`;
  } else if (epic || magic) {
    border = pinkBorder ?? (card ? (epic ? "border-[#9b35c8]" : "border-[#138fc0]") : plainBorder);
    background = `${epic ? EPIC_ART : MAGIC_ART} ${ART_FIT}`;
  } else if (priceless) {
    border = "border-[#ff55c7]";
    background = PRICELESS_PLUM;
  } else if (sixAffix) {
    border = "border-[#f149ba]";
    background = SIX_AFFIX_LIGHT;
  } else if (has("rarity-common")) {
    border = card ? "border-[#777f89]" : plainBorder;
    background = COMMON_LIGHT;
  } else {
    border = plainBorder;
    background = card ? "bg-[#111720]" : "bg-[#111821]";
  }

  const glow = legendary
    ? LEGENDARY_GLOW
    : vorax
      ? VORAX_GLOW
      : priceless
        ? PRICELESS_FRAME
        : sixAffix
          ? SIX_AFFIX_GLOW
          : "";
  const nameColor = legendary
    ? "text-[#ff9a3d]"
    : vorax
      ? "text-[#ff796b]"
      : priceless
        ? "text-[#ff9edf]"
        : sixAffix
          ? "text-[#ff83d5]"
          : epic
            ? "text-[#df6cff]"
            : magic
              ? "text-[#55d9ff]"
              : has("rarity-common")
                ? "text-[#e0e3e6]"
                : "text-[#ff8626]";
  return {
    border,
    background,
    glow,
    name: level100 ? `${nameColor} text-shadow-[0_2px_5px_#1a0918]` : nameColor,
  };
}

/** The drag-and-drop states of a slot or of the Inventory (the outline and glow they add). */
export const DROP_ELIGIBLE = "outline-1 outline-dashed outline-[#74c8ed] -outline-offset-3";
export const DROP_TARGET =
  "outline-2 outline-[#68dcaa] -outline-offset-3 shadow-[inset_0_0_18px_#44bd9666,0_0_16px_#44bd9666]";

/** An empty slot: a dashed frame with a faint light in the middle, greyed out. */
export const EMPTY_SLOT =
  "border-dashed bg-[#0c1118] bg-[radial-gradient(circle_at_50%_35%,rgb(97_117_139/0.18),transparent_45%)] opacity-65 grayscale";
/** The selected slot's frame: ember when empty, a lit amber frame over the art when filled. */
export const SELECTED_EMPTY_BORDER = "border-ember";
export const SELECTED_BORDER = "border-[#f4a04f]";
export const SELECTED_GLOW = "shadow-[inset_0_0_0_1px_rgb(255_174_85/0.65),0_0_12px_rgb(255_132_35/0.22)]";
/** A slot whose curse the curse limit leaves out: a red outline over every other state. */
export const CURSE_LIMIT_OUTLINE =
  "outline-3 outline-[#e33349] outline-offset-1 shadow-[0_0_0_1px_rgb(0_0_0/0.6),0_0_12px_2px_rgb(227_51_73/0.75)]";

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
  "gear-drag-ghost pointer-events-none fixed z-10000 flex max-w-45 items-center gap-1.75 rounded-[7px] border border-[#ffab59] bg-[#261a13] px-2.5 py-1.75 font-[Arial,sans-serif] text-[0.72rem]/[normal] font-bold text-[#ffe0bd] shadow-[0_12px_30px_#0009]";
export const DRAG_GHOST_ICON = "size-9.5 object-contain";

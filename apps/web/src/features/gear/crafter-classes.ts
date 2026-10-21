// Class lists the equipment crafter, the item editor and the Inventory item dialog share (Tailwind utilities). The
// rarity classes (rarity-<id>, six-affix, priceless-item, item-level-100) come from the planner's view models; the
// rarity looks below key off them.

/** The crafter and the item editor: a tall dialog whose body fills it between header and footer; the width is the user's. */
export const CRAFTER_DIALOG =
  "dialog-panel h-[min(780px,calc(100vh-2rem))] flex-col leading-[normal] open:flex max-[800px]:h-[calc(100vh-2rem)]";
export const CRAFTER_HEAD = "dialog-head shrink-0";
export const CRAFTER_EYEBROW = "mb-1 text-[0.68rem] font-extrabold tracking-[0.12em] text-gold uppercase";
export const CRAFTER_BODY = "flex min-h-0 flex-1 flex-col";
export const CRAFTER_FOOTER =
  "flex shrink-0 items-center justify-end gap-2.5 border-t border-[#806037] bg-[linear-gradient(180deg,#1d242b,#171d25)] px-4.5 py-3";
export const FOOTER_BUTTON = "px-3.5 py-2 text-[0.72rem] font-extrabold tracking-[0.06em] uppercase";

/** A crafter view: a form column that scrolls on its own beside the preview; one column on a narrow screen. */
export const CRAFT_LAYOUT =
  "grid min-h-0 flex-1 grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] grid-rows-[minmax(0,1fr)] max-[800px]:flex max-[800px]:flex-col max-[800px]:overflow-auto";
export const CRAFT_FORM =
  "grid min-h-0 content-start gap-3 overflow-auto border-r border-[#36404d] p-4 max-[800px]:shrink-0 max-[800px]:overflow-visible max-[800px]:border-r-0";
export const CRAFT_ASIDE = "min-h-0 overflow-auto p-4.5 max-[800px]:shrink-0 max-[800px]:overflow-visible";
export const CRAFT_ASIDE_LABEL = "mb-2 block text-[0.8rem] text-[#aab5c3]";
export const CRAFT_HEADING = "mt-2 border-t border-[#36404d] pt-3 text-[0.8rem] font-bold text-[#d6dde5]";

/** A labelled field and its input or select. */
export const FIELD = "grid min-w-0 gap-1.25 text-[0.7rem] text-[#aebdcc]";
export const CONTROL =
  "min-w-0 max-w-full rounded-[3px] border border-[#39485a] bg-[#0b121a] px-2.5 py-2 text-[0.82rem] text-ellipsis text-[#eaf0f5] focus-visible:border-[#c59a52] focus-visible:outline-none";
export const FIELD_PAIR = "grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-3 max-[800px]:grid-cols-1";

/** A slider whose gold fill follows --range-fill (src/app/planner/range-fill.js keeps it up to date). */
const RANGE_BASE =
  "h-1.5 w-full min-w-0 cursor-pointer appearance-none rounded-full border border-[#5e4a30] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#7b5525] [&::-webkit-slider-thumb]:bg-[radial-gradient(circle_at_35%_30%,#fff0b0,#e8ad4f_58%,#a66b2c)] [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[#7b5525] [&::-moz-range-thumb]:bg-[radial-gradient(circle_at_35%_30%,#fff0b0,#e8ad4f_58%,#a66b2c)]";
export const RANGE = `${RANGE_BASE} bg-[linear-gradient(to_right,#f9ca65_var(--range-fill,0%),#2a2f36_var(--range-fill,0%))]`;
/** A range of negative values: it fills from its --roll-fill. */
export const RANGE_NEGATIVE = `${RANGE_BASE} bg-[linear-gradient(to_right,#f9ca65_0_var(--roll-fill,0%),#77736a_var(--roll-fill,0%)_100%)]`;
export const ROLL_ROW = "grid grid-cols-[minmax(0,1fr)_64px] items-center gap-2.5";
export const ROLL_NUMBER =
  "h-7.5 w-16 rounded-[3px] border border-[#506078] bg-[#0d141e] px-1 text-center text-[0.78rem] text-white focus-visible:border-[#c59a52] focus-visible:outline-none";
export const ROLL_VALUE = "block text-right text-[0.72rem] text-[#6fa8ff] not-italic";

/** A modifier line's box (a legendary line, a fixed or corroded line), and its Normal / Corroded tag. */
const MOD_BOX_BASE = "grid gap-2 rounded-[5px] border px-3 py-2.5 text-[0.78rem]";
export const MOD_BOX = `${MOD_BOX_BASE} border-[#34445a] bg-[#151e2b]`;
export const MOD_BOX_CORRODED = `${MOD_BOX_BASE} border-[#7a4a9c] bg-[#21172b]`;
/** A Vorax affix slot that inherits a Legendary affix. */
export const MOD_BOX_LEGENDARY = `${MOD_BOX_BASE} border-[#80581c] bg-[#1b1a1c]`;
const MOD_TAG_BASE = "shrink-0 rounded-[3px] border px-1.75 py-1 text-[0.62rem] font-bold";
export const MOD_TAG = `${MOD_TAG_BASE} border-[#5c6b7d] bg-[#1d2735] text-[#cfd7e0]`;
export const MOD_TAG_CORRODED = `${MOD_TAG_BASE} border-[#a46cd0] bg-[#3a2050] text-[#e7c8ff]`;
/** A line's text beside its tag. */
export const MOD_HEAD = "flex items-start gap-2.5";
/** A line's labelled select (ring effect, random roll, tier): label on the left, select on the right. */
export const MOD_CHOICE =
  "grid grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] items-center gap-3 text-[0.72rem] text-[#aebdcc]";

/** The selected item's card above the editor fields, with its Change button. */
export const SELECTED_CARD =
  "grid grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3 rounded-[5px] border border-[#c26a24] bg-[#141b25] p-3";
export const SELECTED_ICON = "size-11.5 rounded-[3px] bg-[linear-gradient(145deg,#bd6f28,#653a19)] object-contain";
export const SELECTED_CHANGE = "btn-bronze px-2.5 py-1 text-[0.8rem]";

/** Rarity colours as custom properties: the name, the frame and the icon's light and dark. */
export const RARITY_VARS = [
  "[--item-name:#ffe0a0] [--item-frame:#a67736] [--item-light:#604525] [--item-dark:#27211d]",
  "[&.rarity-common:not(.item-level-100)]:[--item-name:#0f1215] [&.rarity-common:not(.item-level-100)]:[--item-frame:#5b636b] [&.rarity-common]:[--item-light:#67717b] [&.rarity-common]:[--item-dark:#343d46]",
  "[&.rarity-magic]:[--item-name:#4ed8ff] [&.rarity-magic]:[--item-frame:#5de0ff] [&.rarity-magic]:[--item-light:#178fba] [&.rarity-magic]:[--item-dark:#08465f]",
  "[&.rarity-epic]:[--item-name:#e58bff] [&.rarity-epic]:[--item-frame:#e19aff] [&.rarity-epic]:[--item-light:#a457c4] [&.rarity-epic]:[--item-dark:#54286d]",
  "[&.rarity-legendary]:[--item-name:#ff9a3f] [&.rarity-legendary]:[--item-frame:#ff9a3f] [&.rarity-legendary]:[--item-light:#bd6f28] [&.rarity-legendary]:[--item-dark:#653a19]",
  "[&.rarity-vorax]:[--item-name:#ff7769] [&.rarity-vorax]:[--item-frame:#ff8d80] [&.rarity-vorax]:[--item-light:#b84b43] [&.rarity-vorax]:[--item-dark:#602724]",
  "[&.six-affix.six-affix]:[--item-name:#ff79d1] [&.six-affix.six-affix]:[--item-frame:#f149ba]",
  "[&.priceless-item.priceless-item]:[--item-name:#ff9edf] [&.priceless-item.priceless-item]:[--item-frame:#ff55c7]",
  "[&.item-level-100.item-level-100]:[--item-name:#ff9edf] [&.item-level-100.item-level-100]:[--item-frame:#ff55c7]",
].join(" ");

/**
 * The rarity's art behind an item card (light grey for a common item, which takes dark lettering). Item level 100, six
 * affixes and priceless replace the art of a common, magic or epic item, as on the Inventory cards.
 */
export const RARITY_ART = [
  "bg-[#1b2129] bg-cover bg-top bg-no-repeat",
  "[&.rarity-common:not(.item-level-100):not(.six-affix):not(.priceless-item)]:bg-[#c9ced3] [&.rarity-common:not(.item-level-100):not(.six-affix):not(.priceless-item)]:bg-[url(../../../../src/assets/common-memory-gear-background.webp)] [&.rarity-common:not(.item-level-100):not(.six-affix):not(.priceless-item)]:text-[#15191d]",
  "[&.rarity-magic:not(.item-level-100):not(.six-affix):not(.priceless-item)]:bg-[#122b38] [&.rarity-magic:not(.item-level-100):not(.six-affix):not(.priceless-item)]:bg-[url(../../../../src/assets/active-skill-rare-background.png)]",
  "[&.rarity-epic:not(.item-level-100):not(.six-affix):not(.priceless-item)]:bg-[#1b1740] [&.rarity-epic:not(.item-level-100):not(.six-affix):not(.priceless-item)]:bg-[url(../../../../src/assets/epic-gear-memory-aura-background.png)]",
  "[&.rarity-legendary]:bg-[#2b1c13] [&.rarity-legendary]:bg-[url(../../../../src/assets/legendary-memory-gear-background.png)]",
  "[&.rarity-vorax]:bg-[#2d1110] [&.rarity-vorax]:bg-[url(../../../../src/assets/ultimate-memory-vorax-background.png)]",
  "[&.six-affix:not(.rarity-legendary):not(.rarity-vorax)]:bg-[radial-gradient(circle_at_50%_14%,rgb(255_100_202/0.36),rgb(154_48_118/0.24)_38%,rgb(35_15_32/0.99)_78%)]",
  "[&.priceless-item:not(.rarity-legendary):not(.rarity-vorax)]:bg-[linear-gradient(155deg,#70405f_0,#653554_24%,#522642_59%,#35172e_100%)]",
  "[&.item-level-100:not(.rarity-legendary):not(.rarity-vorax):not(.six-affix):not(.priceless-item)]:bg-[#251027] [&.item-level-100:not(.rarity-legendary):not(.rarity-vorax):not(.six-affix):not(.priceless-item)]:bg-[url(../../../../src/assets/item-level-100-background.png)]",
].join(" ");

/** An affix tier badge (T0…T7, L); its tier-<n> class picks the colour. */
export const TIER_BADGE = [
  "inline-grid h-3.75 min-w-5.5 shrink-0 place-items-center rounded-[3px] border border-[#756858] bg-[#332d29] px-1 font-sans text-[0.55rem]/none font-bold text-[#ddd1c6] not-italic mt-0.5",
  "[&.tier-t0]:border-[#ef554d] [&.tier-t0]:bg-[#8b211c] [&.tier-t0]:text-[#fff0ee] [&.tier-t0plus]:border-[#ef554d] [&.tier-t0plus]:bg-[#8b211c] [&.tier-t0plus]:text-[#fff0ee]",
  "[&.tier-t1]:border-[#ff9a3d] [&.tier-t1]:bg-[#8a3d08] [&.tier-t1]:text-[#fff0dd] [&.tier-l]:border-[#ff9a3d] [&.tier-l]:bg-[#a64a0b] [&.tier-l]:text-[#fff0dd]",
  "[&.tier-t2]:border-[#bf6aff] [&.tier-t2]:bg-[#5b247d] [&.tier-t2]:text-[#f4ddff] [&.tier-t3]:border-[#bf6aff] [&.tier-t3]:bg-[#5b247d] [&.tier-t3]:text-[#f4ddff] [&.tier-t4]:border-[#bf6aff] [&.tier-t4]:bg-[#5b247d] [&.tier-t4]:text-[#f4ddff]",
  "[&.tier-t5]:border-[#58a7ff] [&.tier-t5]:bg-[#174d83] [&.tier-t5]:text-[#e2f2ff] [&.tier-t6]:border-[#58a7ff] [&.tier-t6]:bg-[#174d83] [&.tier-t6]:text-[#e2f2ff] [&.tier-t7]:border-[#58a7ff] [&.tier-t7]:bg-[#174d83] [&.tier-t7]:text-[#e2f2ff]",
].join(" ");

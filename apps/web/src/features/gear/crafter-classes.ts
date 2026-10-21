// Class lists the equipment crafter, the item editor and the Inventory item dialog share (Tailwind utilities). The
// rarity classes (rarity-<id>, six-affix, priceless-item, item-level-100) come from the planner's view models;
// itemCardLook picks an item card's colours and art from them.

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

// The rarity colours as custom properties (the name, the frame and the icon's light and dark) and the rarity's art.
const NAME_FRAME: Readonly<Record<string, string>> = {
  common: "[--item-name:#0f1215] [--item-frame:#5b636b]",
  magic: "[--item-name:#4ed8ff] [--item-frame:#5de0ff]",
  epic: "[--item-name:#e58bff] [--item-frame:#e19aff]",
  legendary: "[--item-name:#ff9a3f] [--item-frame:#ff9a3f]",
  vorax: "[--item-name:#ff7769] [--item-frame:#ff8d80]",
};
const PLAIN_NAME_FRAME = "[--item-name:#ffe0a0] [--item-frame:#a67736]";
const PINK_NAME_FRAME = "[--item-name:#ff9edf] [--item-frame:#ff55c7]";
const SIX_AFFIX_NAME_FRAME = "[--item-name:#ff79d1] [--item-frame:#f149ba]";
const LIGHT_DARK: Readonly<Record<string, string>> = {
  common: "[--item-light:#67717b] [--item-dark:#343d46]",
  magic: "[--item-light:#178fba] [--item-dark:#08465f]",
  epic: "[--item-light:#a457c4] [--item-dark:#54286d]",
  legendary: "[--item-light:#bd6f28] [--item-dark:#653a19]",
  vorax: "[--item-light:#b84b43] [--item-dark:#602724]",
};
const PLAIN_LIGHT_DARK = "[--item-light:#604525] [--item-dark:#27211d]";
const ART: Readonly<Record<string, string>> = {
  common: "bg-[#c9ced3] bg-[url(../../../../src/assets/common-memory-gear-background.webp)] text-[#15191d]",
  magic: "bg-[#122b38] bg-(image:--art-magic) text-text",
  epic: "bg-[#1b1740] bg-[url(../../../../src/assets/epic-gear-memory-aura-background.png)] text-text",
  legendary: "bg-[#2b1c13] bg-[url(../../../../src/assets/legendary-memory-gear-background.png)] text-text",
  vorax: "bg-[#2d1110] bg-[url(../../../../src/assets/ultimate-memory-vorax-background.png)] text-text",
};
const PLAIN_ART = "bg-[#1b2129] text-text";
const SIX_AFFIX_ART =
  "bg-[#1b2129] bg-[radial-gradient(circle_at_50%_14%,rgb(255_100_202/0.36),rgb(154_48_118/0.24)_38%,rgb(35_15_32/0.99)_78%)] text-text";
const PRICELESS_ART =
  "bg-[#1b2129] bg-[linear-gradient(155deg,#70405f_0,#653554_24%,#522642_59%,#35172e_100%)] text-text";
const LEVEL_100_ART = "bg-[#251027] bg-[url(../../../../src/assets/item-level-100-background.png)] text-text";

/**
 * An item card's look from its rarity classes: the colours its parts read and the art behind it (light grey for a common
 * item, which takes dark lettering). Item level 100, priceless and six affixes take over the name and frame colours and
 * replace the art of a common, magic or epic item, as on the Inventory cards. Picked here rather than by variants on the
 * classes because the e2e tests read them (`toHaveClass(/\brarity-legendary\b/)`).
 */
export function itemCardLook(classes: string): string {
  const names = new Set(classes.split(/\s+/));
  const rarity = [...names].find((name) => name.startsWith("rarity-"))?.slice("rarity-".length) ?? "";
  const levelHundred = names.has("item-level-100"),
    priceless = names.has("priceless-item"),
    sixAffix = names.has("six-affix");
  const nameFrame =
    levelHundred || priceless
      ? PINK_NAME_FRAME
      : sixAffix
        ? SIX_AFFIX_NAME_FRAME
        : NAME_FRAME[rarity] || PLAIN_NAME_FRAME;
  const art =
    rarity === "legendary" || rarity === "vorax"
      ? ART[rarity]
      : priceless
        ? PRICELESS_ART
        : sixAffix
          ? SIX_AFFIX_ART
          : levelHundred
            ? LEVEL_100_ART
            : ART[rarity] || PLAIN_ART;
  return `bg-cover bg-top bg-no-repeat ${nameFrame} ${LIGHT_DARK[rarity] || PLAIN_LIGHT_DARK} ${art}`;
}

// The class lists and tints the talent, prism and slate dialogs share (TalentPanelPickerDialog, CoreTalentPickerDialog,
// PrismInventoryDialog, PrismCrafterDialog, SlateInventoryDialog, SlateCrafter, SlateEditorDialog).
import type { CSSProperties } from "react";

/** A talent family's emblem colour and the filter that paints a black silhouette in it. */
const FAMILY_TINTS: Record<string, [emblem: string, filter: string]> = {
  "": ["#b9d7ff", "invert(86%) sepia(14%) saturate(775%) hue-rotate(184deg) brightness(105%) contrast(101%)"],
  "god-of-might": [
    "#f4bd4e",
    "invert(77%) sepia(77%) saturate(743%) hue-rotate(344deg) brightness(101%) contrast(92%)",
  ],
  "goddess-of-hunting": [
    "#62d76e",
    "invert(72%) sepia(55%) saturate(576%) hue-rotate(72deg) brightness(93%) contrast(91%)",
  ],
  "goddess-of-knowledge": [
    "#69b7ff",
    "invert(66%) sepia(77%) saturate(836%) hue-rotate(184deg) brightness(103%) contrast(101%)",
  ],
  "god-of-war": ["#f06c69", "invert(58%) sepia(52%) saturate(1208%) hue-rotate(313deg) brightness(101%) contrast(89%)"],
  "goddess-of-deception": [
    "#c276ed",
    "invert(62%) sepia(55%) saturate(1045%) hue-rotate(231deg) brightness(98%) contrast(90%)",
  ],
  "god-of-machines": [
    "#52d6dc",
    "invert(77%) sepia(45%) saturate(756%) hue-rotate(132deg) brightness(91%) contrast(91%)",
  ],
};

/** The family of a class list holding a `talent-family-<family>` class ("" for none). */
function familyOf(classes: string): string {
  return /\btalent-family-([a-z-]+)/.exec(classes)?.[1] ?? "";
}

/**
 * The custom properties of a talent family's tint, from a class list that may hold its `talent-family-*` class:
 * `--talent-emblem` (the colour) and `--emblem-tint` (the filter painting an emblem's silhouette in it; EMBLEM_ART
 * adds the glow).
 */
export function familyTint(classes: string): CSSProperties {
  const [emblem, filter] = FAMILY_TINTS[familyOf(classes)] ?? FAMILY_TINTS[""];
  const ring = Array.from({ length: 5 }, () => `drop-shadow(0 0 0 ${emblem})`).join(" ");
  return {
    "--talent-emblem": emblem,
    "--emblem-tint": `brightness(0) saturate(100%) ${filter} ${ring} drop-shadow(0 2px 1px #05080c)`,
  } as CSSProperties;
}

/** A god slate's tile colour, by god key. */
const GOD_TILES: Record<string, string> = {
  hunting: "#55a337",
  knowledge: "#3c86cb",
  machines: "#b49b33",
  might: "#c95c32",
  war: "#b52e38",
};
export const godTile = (godKey: string) => ({ "--tile": GOD_TILES[godKey] ?? "#b93dac" }) as CSSProperties;

// ---- Dialog frames.
/** A picker's heading: eyebrow, title and note on the left, the boxed × on the right; stays on top while scrolling. */
export const PICKER_HEAD = "dialog-head sticky top-0 z-2 items-start px-5.5 py-5";
export const PICKER_EYEBROW = "text-[0.7rem] font-extrabold tracking-[0.12em] text-gold uppercase";
export const PICKER_TITLE = "dialog-title my-0.5 text-lg";
export const PICKER_NOTE = "text-[0.95rem] text-[#c5b8a1]";
export const PICKER_CLOSE =
  "picker-close dialog-close grid size-10 shrink-0 place-items-center border border-[#806037] bg-[#171b20] hover:border-[#e7b35d] focus-visible:border-[#e7b35d]";
/** A dialog footer strip. */
export const FOOTER = "border-t border-[#806037] bg-[linear-gradient(180deg,#1d242b,#171d25)]";
/** A "Preview" caption over a preview card. */
export const PREVIEW_CAPTION = "mt-0.75 mb-2.5 block";

// ---- Fields.
const FIELD_BOX = "w-full rounded-[5px] border border-[#30394a] bg-[#192133] text-[#e9edf4] focus:border-[#a67736]";
/** A text field or select in a form. */
export const FIELD = `${FIELD_BOX} min-h-9.75 px-3 py-2 outline-none`;
/** A read-only text box (a fixed effect). */
export const READONLY = "block w-full rounded-[7px] border border-[#27303a] bg-[#151b23] p-2.75 text-[#b8c0cb]";
/** A form section's heading (Random Affixes, Mod Values). */
export const FORM_HEADING = "my-3.5 text-[13px] font-bold text-[#aeb5c1]";

// ---- The slate forms (crafter and editor).
export const SLATE_LAYOUT =
  "grid h-full grid-cols-[minmax(0,1fr)_280px] gap-6.5 px-3 pt-4.5 pb-3 max-[760px]:h-auto max-[760px]:grid-cols-1";
export const SLATE_SECTION =
  "min-h-0 overflow-auto border-r border-[#222b36] pr-5 pl-3 max-[760px]:min-h-auto max-[760px]:overflow-visible max-[760px]:border-r-0 max-[760px]:pr-0";
export const SLATE_ASIDE = "flex min-h-0 flex-col p-0.5 text-[#9fa9b6] max-[760px]:min-h-45";
export const SLATE_FIELDSET = "my-4.25";
export const SLATE_LEGEND = "mb-2.5 block text-[0.78rem] text-[#aeb7c5]";
export const SLATE_AFFIX_ROW =
  "slate-affix-row grid grid-cols-[48px_1fr] items-center gap-2 text-[0.72rem] text-[#929dac]";
export const SLATE_AFFIX_FIELD = `${FIELD_BOX} my-1 p-2.75 text-[0.9rem] outline-none`;
/** A small chip button (Rotate, Flip, a god, a shape): blue with an ember edge when chosen (`.active`). */
export const SLATE_CHIP =
  "cursor-pointer rounded-[7px] border border-transparent bg-[#1b2231] text-[#c5ccd7] hover:border-[#8d6937] focus-visible:border-[#e7b35d] focus-visible:outline-none on:border-[#ff7818] on:bg-[#317cf0] on:text-white";
export const SLATE_TRANSFORM = `${SLATE_CHIP} px-2 py-1 text-[0.7rem]`;
/** The bronze uppercase button of the slate dialogs (Back to Inventory, Add affix, Change). */
export const SLATE_BUTTON = "btn-bronze px-3.5 py-2 text-[0.7rem] font-extrabold tracking-[0.06em] uppercase";
/** A slate's preview card over the tooltip art; `text-*` and the bottom edge colour are the card kind's. */
export const SLATE_CARD =
  "mt-2.5 grid items-center gap-x-2.5 gap-y-0.75 rounded-[7px] border border-b-2 bg-[#071316] bg-[url(../../../../src/assets/slate-preview-tooltip-background.png)] bg-cover bg-center bg-no-repeat p-3.75";
export const SLATE_CARD_ART = "row-span-2 w-full object-contain";
export const SLATE_CARD_TITLE = "block text-[1.05rem] font-bold";
export const SLATE_CARD_RARITY = "mt-2 block text-[0.8rem] text-[#aeb5c0]";
/** The affix list under a slate's preview card. */
export const SLATE_AFFIX_PREVIEW =
  "slate-craft-affix-preview col-span-full mt-2.5 border-t border-[#35404d] pt-2.5 [&>p]:text-[0.72rem] [&>p]:text-[#929dac] [&>section+section]:mt-3";
export const SLATE_AFFIX_HEADING = "mb-1.75 text-[0.64rem] font-bold tracking-[0.09em] text-[#aab5c4] uppercase";
export const SLATE_AFFIX_LIST = "grid gap-2";
export const SLATE_AFFIX_ITEM = "text-[0.74rem] leading-[1.35] [overflow-wrap:anywhere]";
export const SLATE_AFFIX_LIMITED = "-ml-1.75 border-l-3 border-[#ffaf45] bg-[#342617] px-1.75 py-1.25";
export const SLATE_AFFIX_TREE = "mb-0.5 block text-[0.62rem] text-[#9caaba]";
export const MAX_DIVINITY_BADGE =
  "max-divinity-badge my-1.25 inline-block rounded-[3px] border border-[#ffb34f] bg-[#ffc36d] px-1.5 py-0.5 text-[0.62rem] leading-[1.2] font-black tracking-[0.04em] whitespace-nowrap text-[#211508]";

// The slate crafter's draft (the Slate Inventory's Craft Slate, or Edit on a slate) and what it shows: the tab (Craft
// Slate, Craft Legendary Slate, Nether King), the god, Nether King type or legendary template, and the form those draw
// (name, shape and orientation, affix slots, copy rule). Pure: the planner (src/app/slates/slates-controller.js) keeps the draft and turns a
// change into a new one; apps/web/src/shell/dialogs/SlateCrafter.tsx renders slateCrafterView.
//
// The rules are the legacy crafter's: choosing a tab, god, Nether King type or template draws the form anew (name,
// shape, orientation and affixes start over), a new shape starts upright, and an affix select holds its placeholder, the
// value an edited slate brought (an option of its own) and the last pick from its searchable list.
import { divinitySlateAffixesSs13 } from "../../data/divinity-slate-affixes-ss13.js";
import { pedigreeCoreAffixesSs13 } from "../../data/pedigree-core-affixes-ss13.js";
import { PEDIGREE_OF_GODS, normalizePedigreeAffixes } from "../../engine/talents/pedigree-slots.js";
import { slateTransformRules } from "../../engine/talents/slate-board.js";
import { normalizePercentageText } from "../../engine/text/percentage-text.js";
import {
  LEGENDARY_SLATE_TEMPLATES,
  SLATE_GODS,
  allDivinitySlateAffixes,
  godSlateShapeArt,
  legendaryTalentSlotTypes,
  netherKingBrandPool,
  netherKingFixedPool,
  prairieAblazeCopyRule,
  residenceOfStarsCopyRule,
  slateAffixChoice,
  slateAsset,
  slateCraftedAffixGroups,
  slateGameCaptureByName,
  slateGodFamilyClass,
  slateGodKey,
  slateShapeCodes,
  spaceRiftCopyRules,
  sparksOfMothFireCopyRules,
  sparksOfMothFireDirections,
} from "./slate-catalog.js";

export type SlateTab = "craft" | "legendary" | "judgment";
/** An affix as its select's choice (an option's value, text and data-* attributes). */
export interface SlateChoice {
  value: string;
  textContent: string;
  dataset: { affixTree: string; affixDetails: string; affixFamily: string; maxDivinityEffect: string };
}
export interface SlateSlot {
  /** The value an edited slate brought (its own option, without details). */
  filled: string;
  /** The last choice from the searchable list. */
  picked: SlateChoice | null;
  value: string;
}
export interface SlateOrientation {
  rotation: number;
  flipX: number;
  flipY: number;
  /** The art is drawn turned (after a rotation or flip, or from an edited slate); a new shape is drawn as it is. */
  styled: boolean;
}
export interface SlateCraft {
  tab: SlateTab;
  god: string;
  netherType: string;
  /** Craft Legendary Slate: the chosen template ("" shows the template grid). */
  template: string;
  editingId: string | null;
  name: string;
  /** The active shape button's code. */
  shape: string;
  /** null until a shape or orientation button is used (the slate is upright). */
  orientation: SlateOrientation | null;
  slots: SlateSlot[];
  copyRule: string;
  /** Pedigree of Gods: the edited slate's slots that held no valid node. */
  notice: string;
  /** Counts the form's drawings (the legacy markup was new at each). */
  drawing: number;
}

const NETHER_TYPES = ["Judgment", "Contamination", "Offspring"];
const DETAIL_TEMPLATES = [
  "Sparks of Moth Fire",
  "Residence of Stars",
  "When Sparks Set the Prairie Ablaze",
  "Space Rift",
  "Fallen Starlight",
  "A Corner of Divinity",
  "Pedigree of Gods",
];
const text = (value: string) => normalizePercentageText(value);
const captures = slateGameCaptureByName as Record<string, string>;
const netherName = (craft: SlateCraft) => `Nether King's Divinity: ${craft.netherType}`;
const talentSlotTypes = (template: string): string[][] =>
  (legendaryTalentSlotTypes as Record<string, string[][]>)[template] || [];
const templateCopyRules = (template: string): string[] =>
  template === "Space Rift"
    ? spaceRiftCopyRules
    : template === "When Sparks Set the Prairie Ablaze"
      ? [prairieAblazeCopyRule]
      : [];
/** The shape buttons the form offers: [code, art, alt]. */
function shapeButtons(craft: SlateCraft): [string, string, string][] {
  if (craft.tab === "judgment") return [["authority", captures[netherName(craft)], ""]];
  if (craft.tab === "legendary") {
    const icon = captures[craft.template] || "",
      code =
        craft.template === "Sparks of Moth Fire"
          ? "single"
          : craft.template === "Residence of Stars"
            ? "residence"
            : "legendary";
    return [[code, icon, `${craft.template} shape`]];
  }
  const key = slateGodKey(craft.god);
  return slateShapeCodes.map((_: string, index: number) => [
    `${key}-${index}`,
    godSlateShapeArt(key, index),
    `${craft.god} slate`,
  ]);
}
/** The choices each affix slot lists. */
export function slateSlotChoices(craft: SlateCraft, index: number): SlateChoice[] {
  if (craft.tab === "legendary") {
    const types = talentSlotTypes(craft.template)[index] || [],
      pool =
        craft.template === PEDIGREE_OF_GODS
          ? [...allDivinitySlateAffixes, ...pedigreeCoreAffixesSs13]
          : allDivinitySlateAffixes;
    return pool
      .filter((affix: { name: string }) => types.includes(affix.name))
      .map((affix: object) => slateAffixChoice(affix, craft.god, true));
  }
  const pool =
    craft.tab === "judgment"
      ? index < 2
        ? netherKingFixedPool
        : netherKingBrandPool
      : (divinitySlateAffixesSs13 as Record<string, object[]>)[craft.god] || [];
  return pool.map((affix: object) => slateAffixChoice(affix, craft.god));
}
const slotCount = (craft: SlateCraft) =>
  craft.tab === "legendary"
    ? DETAIL_TEMPLATES.includes(craft.template)
      ? talentSlotTypes(craft.template).length
      : 0
    : 5;
const emptySlot = (): SlateSlot => ({ filled: "", picked: null, value: "" });

/** The form drawn anew for a tab, god, Nether King type or template (the edited slate, if any, stays the target). */
export function drawnSlateCraft(
  selection: Pick<SlateCraft, "tab" | "god" | "netherType" | "template" | "editingId"> & { drawing?: number },
): SlateCraft {
  const craft: SlateCraft = {
    tab: selection.tab,
    god: selection.god,
    netherType: selection.netherType,
    template: selection.template,
    editingId: selection.editingId,
    drawing: selection.drawing ?? 0,
    name: "",
    shape: "",
    orientation: null,
    slots: [],
    copyRule: "",
    notice: "",
  };
  return {
    ...craft,
    shape: shapeButtons(craft)[0]?.[0] ?? "",
    slots: Array.from({ length: slotCount(craft) }, emptySlot),
    copyRule:
      craft.template === "Sparks of Moth Fire"
        ? sparksOfMothFireCopyRules[0]
        : craft.template === "Space Rift"
          ? spaceRiftCopyRules[0]
          : "",
  };
}

export interface CraftedSlate {
  id: string;
  name: string;
  god: string;
  template?: string;
  shape?: string;
  rotation?: number;
  flipX?: number;
  flipY?: number;
  rarity?: string;
  affixes?: string[];
  affixGroups?: { fixed?: string[]; random?: string[]; brand?: string[] };
  copyRule?: string;
}
/** Edit on a slate: its tab and selection, then the form filled from it. */
export function slateCraftFromSlate(slate: CraftedSlate): SlateCraft {
  const tab: SlateTab = slate.god === "Nether King" ? "judgment" : slate.rarity === "legendary" ? "legendary" : "craft";
  const craft = drawnSlateCraft({
    tab,
    god: slate.god === "Nether King" ? "Goddess of Deception" : slate.god,
    netherType: slate.name.split("Nether King's Divinity: ")[1] || "Judgment",
    template: tab === "legendary" ? slate.template || slate.name : "",
    editingId: slate.id,
  });
  const filled = (values: string[]) =>
    craft.slots.map((_, index) => {
      const value = values[index] || "";
      return { filled: value, picked: null, value };
    });
  if (tab === "legendary") {
    const pedigree = craft.template === PEDIGREE_OF_GODS ? normalizePedigreeAffixes(slate.affixes || []) : null;
    const savedRule = slate.copyRule || slate.affixes?.[0] || "";
    return {
      ...craft,
      copyRule:
        craft.template === "Sparks of Moth Fire" && sparksOfMothFireCopyRules.includes(savedRule)
          ? savedRule
          : craft.template === "Space Rift" && spaceRiftCopyRules.includes(slate.copyRule || "")
            ? slate.copyRule || ""
            : craft.copyRule,
      notice: pedigree?.cleared.length
        ? `Pedigree of Gods slots hold rolled talent nodes only. The saved value in slot ${pedigree.cleared.map((item: { slot: number }) => item.slot).join(", ")} is not a valid node and was cleared; choose the node shown on your slate.`
        : "",
      slots: filled(pedigree ? pedigree.affixes : slate.affixes || []),
      orientation: DETAIL_TEMPLATES.includes(craft.template)
        ? { rotation: slate.rotation || 0, flipX: slate.flipX || 1, flipY: slate.flipY || 1, styled: true }
        : null,
    };
  }
  const groups = slateCraftedAffixGroups(slate),
    known = shapeButtons(craft).some(([code]) => code === slate.shape);
  return {
    ...craft,
    name: slate.name,
    ...(known
      ? {
          shape: slate.shape || "",
          orientation: {
            rotation: Number(slate.rotation),
            flipX: Number(slate.flipX),
            flipY: Number(slate.flipY),
            styled: true,
          },
        }
      : {}),
    slots: filled([
      ...groups.fixed,
      ...Array(Math.max(0, 2 - groups.fixed.length)).fill(""),
      ...(groups.random || groups.brand || []),
    ]),
  };
}

export type SlateCraftChange =
  | { kind: "tab"; tab: SlateTab }
  | { kind: "god" | "netherType" | "template" | "name" | "copyRule" | "shape"; value: string }
  | { kind: "changeTemplate" }
  | { kind: "transform"; operation: "rotate" | "flip-h" | "flip-v" }
  /** A pick from the searchable list (`choice`), or a value among the select's options. */
  | { kind: "slot"; index: number; choice?: SlateChoice; value?: string };

export function changeSlateCraft(craft: SlateCraft, change: SlateCraftChange): SlateCraft {
  const selection = {
    tab: craft.tab,
    god: craft.god,
    netherType: craft.netherType,
    template: craft.template,
    editingId: craft.editingId,
    drawing: craft.drawing + 1,
  };
  switch (change.kind) {
    case "tab":
      return drawnSlateCraft({
        ...selection,
        tab: change.tab,
        template: change.tab === "legendary" && !craft.editingId ? "" : craft.template,
      });
    case "god":
      return drawnSlateCraft({ ...selection, god: change.value });
    case "netherType":
      return drawnSlateCraft({ ...selection, netherType: change.value });
    case "template":
      return drawnSlateCraft({ ...selection, template: change.value });
    case "changeTemplate":
      return drawnSlateCraft({ ...selection, template: "" });
    case "name":
      return { ...craft, name: change.value };
    case "copyRule":
      return { ...craft, copyRule: change.value };
    case "shape":
      return { ...craft, shape: change.value, orientation: { rotation: 0, flipX: 1, flipY: 1, styled: false } };
    case "transform": {
      const rules = slateTransformRules(craft.tab === "legendary" ? craft.template : "");
      if ((change.operation === "rotate" && !rules.rotate) || (change.operation !== "rotate" && !rules.flip))
        return craft;
      const { rotation, flipX, flipY } = craft.orientation || { rotation: 0, flipX: 1, flipY: 1 };
      return {
        ...craft,
        orientation: {
          rotation: change.operation === "rotate" ? (rotation + 90) % 360 : rotation,
          flipX: change.operation === "flip-h" ? -flipX : flipX,
          flipY: change.operation === "flip-v" ? -flipY : flipY,
          styled: true,
        },
      };
    }
    case "slot":
      return {
        ...craft,
        slots: craft.slots.map((slot, index) =>
          index !== change.index
            ? slot
            : change.choice
              ? { ...slot, picked: change.choice, value: change.choice.value }
              : { ...slot, value: change.value ?? "" },
        ),
      };
    default:
      return craft;
  }
}

const shapeArt = (craft: SlateCraft) =>
  shapeButtons(craft).find(([code]) => code === craft.shape) || shapeButtons(craft)[0];
const orientationTransform = (orientation: SlateOrientation | null) =>
  orientation?.styled ? `rotate(${orientation.rotation}deg) scale(${orientation.flipX}, ${orientation.flipY})` : null;
/** The fixed rule a legendary template copies (Sparks of Moth Fire and Space Rift: the chosen direction's). */
function legendaryCopyRule(craft: SlateCraft): string {
  if (craft.template === "Sparks of Moth Fire") return craft.copyRule || sparksOfMothFireCopyRules[0];
  if (craft.template === "Residence of Stars") return residenceOfStarsCopyRule;
  if (craft.template === "When Sparks Set the Prairie Ablaze") return prairieAblazeCopyRule;
  if (craft.template === "Space Rift") return craft.copyRule || spaceRiftCopyRules[0];
  return "";
}
/** The slate Add to Inventory or Save Changes stores (its id is the planner's to give). */
export function craftedSlate(
  craft: SlateCraft,
  original: CraftedSlate | undefined,
): Omit<CraftedSlate, "id"> & {
  icon: string;
} {
  const fallbackName =
    craft.tab === "judgment"
      ? netherName(craft)
      : craft.tab === "legendary" && craft.template
        ? craft.template
        : craft.god;
  const copyRule = craft.tab === "legendary" ? legendaryCopyRule(craft) : "";
  const values = craft.slots.map((slot) => slot.value);
  const affixes = copyRule ? [copyRule] : craft.tab === "legendary" ? values : values.filter(Boolean);
  const legendaryDetail = craft.tab === "legendary" && DETAIL_TEMPLATES.includes(craft.template);
  const { rotation, flipX, flipY } = craft.orientation || { rotation: 0, flipX: 1, flipY: 1 };
  return {
    name:
      (craft.tab === "legendary" ? "" : craft.name.trim()) ||
      (craft.tab === "legendary" && original?.template === fallbackName ? original.name : fallbackName),
    ...(craft.tab === "legendary" ? { template: fallbackName } : {}),
    god: craft.tab === "judgment" ? "Nether King" : craft.god,
    shape: (craft.tab !== "legendary" || legendaryDetail ? craft.shape : "") || "single",
    rotation,
    flipX,
    flipY,
    affixes,
    ...(craft.tab === "legendary"
      ? {}
      : {
          affixGroups: {
            fixed: values.slice(0, 2),
            [craft.tab === "judgment" ? "brand" : "random"]: values.slice(2),
          },
        }),
    ...(copyRule ? { copyRule } : {}),
    rarity: craft.tab === "craft" ? "magic" : "legendary",
    icon: craft.tab === "legendary" && !legendaryDetail ? "" : shapeArt(craft)?.[1] || "",
  };
}

// ---- The view.

export interface SlateOptionView {
  value: string;
  label: string;
  /** The data-* attributes of a choice's option (the planner's searchable select reads them); null for a plain one. */
  data: Record<string, string> | null;
}
export interface SlateSlotView {
  index: number;
  label: string;
  /** A legendary slot's aria-label ("<template> affix N"); null on Craft Slate and Nether King. */
  ariaLabel: string | null;
  options: SlateOptionView[];
  value: string;
}
export interface SlateAffixItemView {
  tree: string;
  effect: string;
  limited: boolean;
  core: boolean;
}
export interface SlateArtView {
  src: string;
  alt: string;
  transform: string | null;
}
export interface SlateCraftFormView {
  kind: "craft";
  nether: boolean;
  name: string;
  choices: { value: string; active: boolean }[];
  shapes: { code: string; src: string; alt: string; active: boolean }[];
  preview: SlateArtView & { orientation: SlateOrientation | null };
  authority: string | null;
  groups: { title: string; legend: string; slots: SlateSlotView[] }[];
  card: { className: string; art: SlateArtView; title: string; rarity: string };
  sections: { title: string; items: SlateAffixItemView[] }[];
}
export interface SlateLegendaryFormView {
  kind: "legendary";
  name: string;
  icon: string;
  shape: { code: string; alt: string };
  preview: SlateArtView & { orientation: SlateOrientation | null };
  transforms: { rotate: boolean; flip: boolean } | null;
  /** The copy rule: a direction select (Sparks of Moth Fire, Space Rift) or a fixed text; null for talent slots. */
  copy:
    | { kind: "select"; value: string; ariaLabel: string; options: { value: string; label: string }[] }
    | { kind: "fixed"; text: string }
    | null;
  /** The copy rule in the preview, with its direction (arrow and label) when it has one. */
  copyPreview: { rule: string; direction: { arrow: string; label: string; sparks: boolean } | null } | null;
  legend: string;
  notice: string;
  slots: SlateSlotView[];
  /** Talent slots: the chosen affixes (null while none is). */
  talents: SlateAffixItemView[] | null;
}
export interface SlateCrafterView {
  tab: SlateTab;
  editing: boolean;
  drawing: number;
  body:
    { kind: "templates"; templates: { name: string; icon: string }[] } | SlateLegendaryFormView | SlateCraftFormView;
}

function slotOptions(slot: SlateSlot, placeholder: string): SlateOptionView[] {
  return [
    { value: "", label: placeholder, data: null },
    ...(slot.filled ? [{ value: slot.filled, label: slot.filled, data: null }] : []),
    ...(slot.picked
      ? [
          {
            value: slot.picked.value,
            label: slot.picked.textContent,
            data: { selectedAffix: "", ...slot.picked.dataset },
          },
        ]
      : []),
  ];
}
/** A chosen affix as the preview lists it: its tree and type, and its effect. */
function affixItem(slot: SlateSlot, fallback: "text" | "value"): SlateAffixItemView {
  const picked = slot.picked?.value === slot.value ? slot.picked : null,
    details = picked?.dataset.affixDetails || (fallback === "text" ? slot.value : slot.value),
    colon = details.indexOf(": "),
    type = colon < 0 ? "" : details.slice(0, colon),
    effect = colon < 0 ? details : details.slice(colon + 2);
  return {
    tree: text([picked?.dataset.affixTree || "", type].filter(Boolean).join(" · ")),
    effect: text(effect),
    limited: picked?.dataset.maxDivinityEffect === "1",
    core: /\bLv\.[12] Core Talent\b/.test(type),
  };
}
function craftFormView(craft: SlateCraft): SlateCraftFormView {
  const nether = craft.tab === "judgment",
    art = shapeArt(craft),
    transform = orientationTransform(craft.orientation),
    titles = ["Fixed Affixes", nether ? "Brand Talent Nodes" : "Random Affixes"],
    groupSlots = [craft.slots.slice(0, 2), craft.slots.slice(2)];
  const slots = (group: SlateSlot[], offset: number) =>
    group.map((slot, position) => ({
      index: offset + position,
      label: `Slot ${offset + position + 1}`,
      ariaLabel: null,
      options: slotOptions(slot, "Select affix…"),
      value: slot.value,
    }));
  return {
    kind: "craft",
    nether,
    name: craft.name,
    choices: (nether ? NETHER_TYPES : SLATE_GODS).map((value) => ({
      value,
      active: value === (nether ? craft.netherType : craft.god),
    })),
    shapes: shapeButtons(craft).map(([code, src, alt]) => ({ code, src, alt, active: code === craft.shape })),
    preview: { src: art?.[1] || "", alt: art?.[2] || "", transform, orientation: craft.orientation },
    authority: nether ? netherName(craft) : null,
    groups: titles.map((title, index) => ({
      title,
      legend: `${title} (${groupSlots[index].filter((slot) => slot.value).length}/${groupSlots[index].length})`,
      slots: slots(groupSlots[index], index * 2),
    })),
    card: {
      className: `slate-craft-card ${nether ? "nether" : slateGodFamilyClass(craft.god)}`,
      art: { src: art?.[1] || "", alt: nether ? "" : `${craft.god} slate`, transform },
      title: craft.name.trim() || (nether ? netherName(craft) : craft.god),
      rarity: nether ? "NETHER KING'S DIVINITY · LEGENDARY" : "DIVINITY SLATE · MAGIC",
    },
    sections: titles
      .map((title, index) => ({
        title,
        items: groupSlots[index].filter((slot) => slot.value).map((slot) => affixItem(slot, "text")),
      }))
      .filter((section) => section.items.length),
  };
}
function legendaryFormView(craft: SlateCraft): SlateLegendaryFormView {
  const name = craft.template,
    icon = captures[name] || "",
    [code] = shapeButtons(craft)[0],
    rules = slateTransformRules(name),
    slotTypes = talentSlotTypes(name),
    copyRules = templateCopyRules(name),
    transform = orientationTransform(craft.orientation);
  const sparks = name === "Sparks of Moth Fire",
    residence = name === "Residence of Stars";
  const sparksIndex = Math.max(0, sparksOfMothFireCopyRules.indexOf(craft.copyRule));
  const copy: SlateLegendaryFormView["copy"] = sparks
    ? {
        kind: "select",
        value: craft.copyRule,
        ariaLabel: "Sparks of Moth Fire copy direction",
        options: sparksOfMothFireCopyRules.map((rule: string, index: number) => ({
          value: text(rule),
          label: `${sparksOfMothFireDirections[index]} · ${text(rule)}`,
        })),
      }
    : residence
      ? { kind: "fixed", text: text(residenceOfStarsCopyRule) }
      : copyRules.length > 1
        ? {
            kind: "select",
            value: craft.copyRule,
            ariaLabel: "Space Rift copy direction",
            options: copyRules.map((rule, index) => ({
              value: text(rule),
              label: `${index ? "→ Right" : "← Left"} · ${text(rule)}`,
            })),
          }
        : copyRules.length
          ? { kind: "fixed", text: text(copyRules[0]) }
          : null;
  const fromRight = craft.copyRule === spaceRiftCopyRules[1];
  const copyPreview: SlateLegendaryFormView["copyPreview"] = sparks
    ? {
        rule: craft.copyRule,
        direction: {
          arrow: sparksOfMothFireDirections[sparksIndex][0],
          label: `From ${sparksOfMothFireDirections[sparksIndex].slice(2).toLowerCase()}`,
          sparks: true,
        },
      }
    : residence
      ? { rule: text(residenceOfStarsCopyRule), direction: null }
      : copyRules.length > 1
        ? {
            rule: craft.copyRule,
            direction: { arrow: fromRight ? "→" : "←", label: fromRight ? "From right" : "From left", sparks: false },
          }
        : copyRules.length
          ? { rule: text(copyRules[0]), direction: null }
          : null;
  const chosen = craft.slots.filter((slot) => slot.value);
  return {
    kind: "legendary",
    name: text(name),
    icon,
    shape: { code, alt: `${text(name)} shape` },
    preview: { src: icon, alt: "", transform, orientation: craft.orientation },
    transforms: residence ? null : sparks ? { rotate: true, flip: true } : rules,
    copy,
    copyPreview,
    legend: copy ? "Fixed Affix" : `Talent Affixes (${chosen.length}/${slotTypes.length})`,
    notice: craft.notice,
    slots: copy
      ? []
      : craft.slots.map((slot, index) => ({
          index,
          label: `Slot ${index + 1}`,
          ariaLabel: `${text(name)} affix ${index + 1}`,
          options: slotOptions(slot, `Select ${text((slotTypes[index] || []).join(" or "))}…`),
          value: slot.value,
        })),
    talents: copy ? null : chosen.length ? chosen.map((slot) => affixItem(slot, "value")) : null,
  };
}
export function slateCrafterView(craft: SlateCraft): SlateCrafterView {
  const base = { tab: craft.tab, editing: Boolean(craft.editingId), drawing: craft.drawing };
  if (craft.tab !== "legendary") return { ...base, body: craftFormView(craft) };
  if (!DETAIL_TEMPLATES.includes(craft.template))
    return {
      ...base,
      body: {
        kind: "templates",
        templates: (LEGENDARY_SLATE_TEMPLATES as [string, string][]).map(([icon, name]) => ({
          name: text(name),
          icon: slateAsset(icon),
        })),
      },
    };
  return { ...base, body: legendaryFormView(craft) };
}

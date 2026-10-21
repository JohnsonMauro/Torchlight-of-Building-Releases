// What the equipment crafter shows (apps/web/src/features/gear/EquipmentCrafterDialog.tsx), read from its draft
// (src/app/gear/equipment-craft.ts): the Vorax limb picker, the legendary list, a legendary's configuration, or the rare
// and Vorax form, each with its preview. Pure; the planner (src/app/gear/gear-controller.js) publishes it as the "equipmentCrafter"
// source and passes in how an item's preview looks, which depends on the open build. Texts are as the legacy markup
// printed them (src/app/bridge/display-text.ts).
import { gearGroupOfType, gearGroupsSs13 } from "../../data/gear/gear-groups-ss13.js";
import { placeholderPool } from "../../engine/gear/legendary-placeholder-pools.js";
import { legendaryLineTiers } from "../../engine/gear/legendary-affix-tiers.js";
import { normalizePercentageText } from "../../engine/text/percentage-text.js";
import { baseTypesForSlot } from "../../data/gear/corrosion-implicits-ss13.js";
import { beltBlendChoices } from "../gear/belt-blend-options.js";
import { towerSequenceChoices } from "../gear/tower-sequence-options.js";
import { modifierRollRanges, modifierRollStep, negativeRollFill } from "../gear/affix-rolls.js";
import {
  baseAffixChoices,
  baseChoices,
  corrosionPool,
  craftAffixPool,
  craftFamily,
  affixSideOffset,
  craftPickStep,
  craftTypes,
  craftedRareItem,
  eligibleCraftTiers,
  equipmentEnergyAllowed,
  MAX_TYPED_LEVEL,
  PRICELESS_LEVEL,
  legendaries,
  legendaryById,
  legendaryCorrodedLine,
  legendaryCorrosionText,
  legendaryLineTemplate,
  legendaryLineText,
  legendaryPreviewItem,
  rareBasesForType,
  selectedCraftTier,
  towerSequencesForType,
  typeSlot,
  voraxBases,
  type AffixSide,
  type CraftPick,
  type CraftPickStep,
  type CraftedItem,
  type EquipmentCraft,
  type RareDraft,
} from "../gear/equipment-craft.ts";
import { displayTexts } from "./display-text.ts";
import { modifierTextView, type ModifierTextView } from "./gear-item-view.ts";

/** An option; `data` are its data-* attributes (camelCase keys), which the planner's searchable select reads. */
export interface OptionView {
  value: string;
  label: string;
  data?: Record<string, string>;
}
export interface OptionGroupView {
  group: string;
  options: OptionView[];
}
export type SelectChoice = OptionView | OptionGroupView;
/** A roll's slider and number field. */
export interface RollView {
  rangeIndex: number;
  min: number;
  max: number;
  step: number;
  value: number;
  /** A range of negative values only: its slider fills from the right (--roll-fill). */
  negative: boolean;
  rollFill: number;
  /** The slider's filled part (--range-fill, as the planner's range refresh sets it). */
  rangeFill: number;
}
/** A modifier line of the item preview. */
export interface ItemPreviewLineView {
  /** Where it comes from: "Implicit", "Base Affix", "Prefix", "Suffix", "Belt Blend", "TOWER Sequence", "Legendary Mod". */
  kind: string;
  /** The card's block it sits in (a rule between blocks): the implicit (muted, no marker), the base lines, the affixes. */
  block: "implicit" | "base" | "affix";
  /** Its source, detail and tier ("Prefix · T1"), shown on hover. */
  title: string;
  /** Hooks: legendary-affix, corrosion-affix. */
  className: string;
  /** The diamond in its tier's colour; `text` is the tier ("T1", "L"; "" for none), read by screen readers. */
  marker: { className: string; text: string };
  text: ModifierTextView;
}
/** The item preview, laid out as the game's item card: the head (name, icon, level, type, requirement, energy), then the lines. */
export interface ItemPreviewView {
  className: string;
  icon: string;
  /** A Priceless item (level 100 rare, or so named): "- Priceless" after its name, its level in the accent colour. */
  priceless: boolean;
  name: string;
  /** "Lv.86"; "" when the item has no item level. */
  itemLevel: string;
  /** "STR Helmet(Helmet)": the base and its gear group. */
  typeLine: string;
  /** "Require lv 82". */
  require: string;
  /** The Equipment Energy and how full it is against the level's cap (percent); null where the slot takes none. */
  energy: { text: string; fill: number } | null;
  lines: ItemPreviewLineView[];
  source: string;
}
/** A family in a rare's affix list. */
export interface AffixOptionView {
  value: string;
  /** Its label without its category ("+# Max Life"). */
  label: string;
  /** The highest tier the item level offers ("T0+"); "" when it offers none. */
  highestTier: string;
  checked: boolean;
  /** Why it cannot be checked ("Requires Priceless", "Requires Lv.82", "Three prefixes chosen"); "" when it can. */
  blocked: string;
}
/** A rare's prefix or suffix list: the families by category (Basic, Advanced, Ultimate), up to three checked. */
export interface AffixListView {
  side: AffixSide;
  heading: string;
  /** "1/3". */
  count: string;
  tabs: { id: string; label: string; options: AffixOptionView[] }[];
}
export interface CraftAffixView {
  index: number;
  label: string;
  /** The chosen family's label (without its category); "" for an empty slot. */
  familyLabel: string;
  /** A Vorax slot's Legendary affix toggle; null on a rare. */
  legendaryToggle: { active: boolean } | null;
  family: string;
  families: OptionView[];
  /** The tier select (null for a Legendary affix) and rolls; "warning" when the Item Level allows no tier. */
  config:
    | { kind: "none" }
    | { kind: "warning" }
    | { kind: "tiers"; tier: { value: string; options: OptionView[] } | null; rolls: RollView[] };
}
/** A step of the rare item picker's path: `step` opens it again; null for where the picker or the form stands. */
export interface CraftCrumbView {
  label: string;
  step: CraftPickStep | null;
}
/** The rare item picker: the item groups, a group's types, then a type's bases, as cards. */
export interface CraftPickView {
  kind: "craftPick";
  step: CraftPickStep;
  heading: string;
  path: CraftCrumbView[];
  cards: { value: string; label: string; detail: string; icon: string }[];
}
export interface RareFormView {
  kind: "form";
  /** A rare's group, type and base, each a way back to the picker (its Item Type and Base Item replace them); null on a Vorax form. */
  path: CraftCrumbView[] | null;
  name: string;
  level: string;
  /** The highest level the field takes: 89 on a rare, whose level 100 is the Priceless check; 100 on a Vorax item. */
  levelMax: number;
  /** A rare's Priceless check (level 100); null on a Vorax form. */
  priceless: boolean | null;
  type: string;
  types: OptionView[];
  base: string;
  bases: OptionView[];
  beltBlendShown: boolean;
  beltBlend: string;
  beltBlends: SelectChoice[];
  baseAffixes: { index: number; value: string; options: OptionView[]; rolls: RollView[] }[];
  energyShown: boolean;
  energy: string;
  sequenceShown: boolean;
  sequence: string;
  sequences: SelectChoice[];
  prefixHeading: string;
  /** A rare's affix lists (its slots show only their tier and rolls); null on a Vorax form, which keeps a select per slot. */
  affixLists: AffixListView[] | null;
  affixes: CraftAffixView[];
  preview: ItemPreviewView;
}
export interface LegendaryLineView {
  index: number;
  corroded: boolean;
  /** The line has a corroded form. */
  canCorrode: boolean;
  text: ModifierTextView;
  /** Folklore of Locking Fingers' ring effect line. */
  ring: "left" | "right" | null;
  placeholder: { value: string; options: OptionView[] } | null;
  tier: { value: string; options: OptionView[] } | null;
  rolls: RollView[];
}
export interface LegendaryConfigView {
  kind: "legendary";
  icon: string;
  name: string;
  slot: string;
  base: string;
  bases: string[];
  beltBlend: { value: string; choices: SelectChoice[] } | null;
  energy: string | null;
  sequence: { value: string; choices: SelectChoice[] } | null;
  corrosion: string;
  corrosions: OptionView[];
  /** The chosen corrosion implicit's text, and its roll (percent) when it has a range. */
  corroded: { text: string; roll: number | null } | null;
  lines: LegendaryLineView[];
  preview: ItemPreviewView;
}
export type EquipmentCrafterBody =
  | { kind: "vorax"; limbs: { name: string; label: string; icon: string }[] }
  | {
      kind: "legendaryList";
      search: string;
      results: { id: string; name: string; icon: string; detail: string }[];
      count: string;
    }
  | LegendaryConfigView
  | CraftPickView
  | RareFormView;
export interface EquipmentCrafterView {
  session: number;
  title: string;
  saveLabel: string;
  body: EquipmentCrafterBody;
}

const titleCase = (value: string) =>
  value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());
const text = (value: string) => normalizePercentageText(value);

export function rollViews(template: string, values: readonly number[]): RollView[] {
  return modifierRollRanges(template).map((range, rangeIndex) => {
    const value = values[rangeIndex] ?? range.max,
      negative = range.max <= 0;
    return {
      rangeIndex,
      min: range.min,
      max: range.max,
      step: modifierRollStep(range),
      value,
      negative,
      rollFill: negativeRollFill(range, value),
      rangeFill:
        range.max > range.min ? Math.max(0, Math.min(100, ((value - range.min) / (range.max - range.min)) * 100)) : 0,
    };
  });
}

function rareFormView(
  craft: EquipmentCraft,
  draft: RareDraft,
  item: CraftedItem,
  preview: (item: CraftedItem) => ItemPreviewView,
): RareFormView {
  const slot = typeSlot(craft, draft.type),
    // One line per family and per base affix: what a sibling slot holds is not offered again.
    takenFamilies = (index: number) =>
      new Set(
        draft.affixes
          .filter((affix, position) => position !== index && position < 3 === index < 3 && affix.familyId)
          .map((affix) => affix.familyId),
      ),
    affixes = draft.affixes.map((affix, index): CraftAffixView => {
      const family = craftFamily(craft, draft, index),
        tiers = eligibleCraftTiers(draft, family),
        tier = selectedCraftTier(craft, draft, index);
      return {
        index,
        label: index < 3 ? `Prefix ${index + 1}` : `Suffix ${index - 2}`,
        legendaryToggle: craft.mode === "vorax" ? { active: affix.legendary } : null,
        familyLabel: family ? text(withoutCategory(family.label)) : "",
        family: affix.familyId,
        families: craftAffixPool(craft.mode, draft.type, index, affix.legendary)
          .filter((entry) => !takenFamilies(index).has(entry.id))
          .map((entry) => ({ value: entry.id, label: text(entry.label) })),
        config: !family
          ? { kind: "none" }
          : !tiers.length
            ? { kind: "warning" }
            : {
                kind: "tiers",
                tier: affix.legendary
                  ? null
                  : {
                      value: affix.tier,
                      options: tiers.map((entry) => ({
                        value: entry.tier,
                        label: `T${text(entry.tier)} · Requires Lv.${entry.level}`,
                      })),
                    },
                rolls: tier ? rollViews(tier.template, affix.rolls) : [],
              },
      };
    });
  return {
    kind: "form",
    path: craft.mode === "rare" ? formPath(draft) : null,
    name: draft.name,
    level: draft.level,
    levelMax: craft.mode === "rare" ? MAX_TYPED_LEVEL : 100,
    priceless: craft.mode === "rare" ? draft.level === PRICELESS_LEVEL : null,
    type: draft.type,
    types: craftTypes(craft).map(([name, typeSlotName]) => ({
      value: name,
      label: text(name),
      data: { slot: typeSlotName },
    })),
    base: draft.baseId,
    bases:
      craft.mode === "rare"
        ? rareBasesForType(draft.type).map((entry) => ({
            value: entry.id,
            label: `Lv ${entry.level} · ${text(entry.name)}`,
          }))
        : baseChoices(craft, draft.type).map((value) => ({ value, label: text(value) })),
    beltBlendShown: slot === "belt",
    beltBlend: draft.beltBlendId,
    beltBlends: displayTexts(beltBlendChoices()),
    baseAffixes: draft.baseAffixes.map((affix, index) => ({
      index,
      value: affix.template,
      options: baseAffixChoices(craft, draft.type, index)
        .filter(
          (choice) =>
            !draft.baseAffixes.some((other, position) => position !== index && other.template === choice.template),
        )
        .map((choice) => ({
          value: choice.template,
          label:
            craft.mode === "rare"
              ? text(choice.template.replaceAll("\n", " / "))
              : `T${text(choice.tier)} · ${text(choice.template.replaceAll("\n", " / "))}`,
          data: { tier: choice.tier },
        })),
      rolls: rollViews(affix.template, affix.rolls),
    })),
    energyShown: equipmentEnergyAllowed(slot),
    energy: draft.energy,
    sequenceShown: towerSequencesForType(draft.type).length > 0,
    sequence: draft.sequenceId,
    sequences: displayTexts(towerSequenceChoices(towerSequencesForType(draft.type))),
    prefixHeading: craft.mode === "vorax" ? "Organ affixes" : "Prefixes",
    affixLists:
      craft.mode === "rare" ? (["prefix", "suffix"] as const).map((side) => affixList(craft, draft, side)) : null,
    affixes,
    preview: preview(item),
  };
}

function legendaryConfigView(
  craft: EquipmentCraft,
  preview: (item: CraftedItem) => ItemPreviewView,
): LegendaryConfigView | null {
  const draft = craft.legendary,
    entry = draft && legendaryById(draft.id),
    item = legendaryPreviewItem(craft);
  if (!draft || !entry || !item) return null;
  const pool = corrosionPool(draft.base),
    corrosion = pool[draft.corrosionIndex];
  return {
    kind: "legendary",
    icon: entry.icon,
    name: text(entry.name),
    slot: titleCase(entry.slot),
    base: draft.base,
    bases: baseTypesForSlot(entry.slot),
    beltBlend: entry.slot === "belt" ? { value: draft.beltBlendId, choices: displayTexts(beltBlendChoices()) } : null,
    energy: equipmentEnergyAllowed(entry.slot) ? draft.energy : null,
    sequence: towerSequencesForType(draft.base).length
      ? { value: draft.sequenceId, choices: displayTexts(towerSequenceChoices(towerSequencesForType(draft.base))) }
      : null,
    corrosion: String(draft.corrosionIndex),
    corrosions: pool.map((option, index) => ({ value: String(index), label: text(option.label) })),
    corroded: corrosion
      ? {
          text: text(legendaryCorrosionText(draft)),
          roll: corrosion.min !== corrosion.max ? draft.corrosionRoll : null,
        }
      : null,
    lines: entry.modifiers.map((_, index) => {
      const corroded = draft.corroded.includes(index),
        placeholders = placeholderPool(entry.id, index),
        tiers = corroded ? null : legendaryLineTiers(entry.id, index),
        chosenTier = tiers?.some((tier: { tier: number }) => tier.tier === Number(draft.tiers[index]))
          ? Number(draft.tiers[index])
          : tiers?.[0].tier;
      return {
        index,
        corroded,
        canCorrode: Boolean(legendaryCorrodedLine(entry.id, index)),
        text: modifierTextView(legendaryLineText(entry, draft, index)),
        ring: entry.id === "Folklore_of_Locking_Fingers" && index === 2 ? draft.ring : null,
        placeholder: placeholders
          ? {
              value: draft.placeholders[index] || "",
              options: [
                { value: "", label: `Not chosen · ${text(placeholders.placeholder)}` },
                ...placeholders.options.map((option: { id: string; label: string }) => ({
                  value: option.id,
                  label: text(option.label),
                })),
              ],
            }
          : null,
        tier: tiers
          ? {
              value: String(chosenTier),
              options: tiers.map((tier: { tier: number; text: string }) => ({
                value: String(tier.tier),
                label: `T${tier.tier} · ${text(tier.text.replace(/(\d|\))\s+%/g, "$1%"))}`,
              })),
            }
          : null,
        rolls: rollViews(legendaryLineTemplate(entry, draft, index), draft.rolls[index] || []),
      };
    }),
    preview: preview(item),
  };
}

/** The crafter's view; `preview` draws an item as the open build shows it. */
export function equipmentCrafterView(
  craft: EquipmentCraft,
  session: number,
  preview: (item: CraftedItem) => ItemPreviewView,
): EquipmentCrafterView {
  const title = craft.editingId
    ? `Edit ${craft.editingName}`
    : craft.mode === "legendary"
      ? "Craft Legendary"
      : craft.mode === "vorax"
        ? "Craft Vorax Item"
        : "Craft Rare Item";
  const base = { session, title, saveLabel: craft.editingId ? "Save Changes" : "Add to Inventory" };
  if (craft.mode === "vorax" && !craft.voraxBase)
    return {
      ...base,
      body: {
        kind: "vorax",
        limbs: voraxBases().map((limb) => ({ name: limb.name, label: text(limb.label), icon: limb.icon || "" })),
      },
    };
  if (craft.mode === "legendary") {
    const config = legendaryConfigView(craft, preview);
    if (config) return { ...base, body: config };
    const needle = craft.search.toLowerCase(),
      entries = legendaries.filter(
        (entry) => !craft.search || `${entry.name} ${entry.modifiers.join(" ")}`.toLowerCase().includes(needle),
      );
    return {
      ...base,
      body: {
        kind: "legendaryList",
        search: craft.search,
        results: entries.slice(0, 120).map((entry) => ({
          id: entry.id,
          name: text(entry.name),
          icon: entry.icon,
          detail: `${titleCase(entry.slot)} · Lv.${entry.level}`,
        })),
        count: `${entries.length} legendary gear available${entries.length > 120 ? " · refine the search to see more" : ""}`,
      },
    };
  }
  if (craft.pick) return { ...base, body: craftPickView(craft.pick) };
  const item = craftedRareItem(craft);
  if (!craft.rare || !item) throw new Error("The equipment crafter has no form to show");
  return { ...base, body: rareFormView(craft, craft.rare, item, preview) };
}

interface GearGroup {
  id: string;
  label: string;
  entries: { label: string; type: string }[];
}
const gearGroups = gearGroupsSs13 as GearGroup[];
const groupOfType = gearGroupOfType as (
  type: string,
) => { group: GearGroup; entry: GearGroup["entries"][number] } | undefined;

const STEP_HEADINGS: Record<CraftPickStep, string> = {
  group: "Select an item group",
  type: "Select a type",
  base: "Select a base",
};
const ALL_GROUPS = "Item groups";
const baseLabel = (base: { name: string; level: number }) => `Lv ${base.level} · ${text(base.name)}`;
const topBaseIcon = (type: string) => rareBasesForType(type)[0]?.icon || "";

function craftPickView(pick: CraftPick): CraftPickView {
  const step = craftPickStep(pick);
  const group = gearGroups.find((entry) => entry.id === pick.group);
  const entry = group?.entries.find((item) => item.type === pick.type);
  const path: CraftCrumbView[] = [{ label: ALL_GROUPS, step: step === "group" ? null : "group" }];
  if (group) path.push({ label: group.label, step: step === "type" ? null : "type" });
  if (entry) path.push({ label: entry.label, step: null });
  const cards =
    step === "group"
      ? gearGroups.map((item) => ({
          value: item.id,
          label: item.label,
          detail: `${item.entries.length} types`,
          icon: topBaseIcon(item.entries[0].type),
        }))
      : step === "type"
        ? (group?.entries || []).map((item) => ({
            value: item.type,
            label: item.label,
            detail: `${rareBasesForType(item.type).length} bases`,
            icon: topBaseIcon(item.type),
          }))
        : rareBasesForType(pick.type).map((base) => ({
            value: base.id,
            label: text(base.name),
            detail: `Lv ${base.level}`,
            icon: base.icon || "",
          }));
  return { kind: "craftPick", step, heading: STEP_HEADINGS[step], path, cards };
}

/** The form's way back: its group, type and base (a type no group holds goes back to the groups). */
function formPath(draft: RareDraft): CraftCrumbView[] {
  const found = groupOfType(draft.type);
  const base = rareBasesForType(draft.type).find((entry) => entry.id === draft.baseId);
  return [
    { label: ALL_GROUPS, step: "group" },
    ...(found
      ? [
          { label: found.group.label, step: "type" as const },
          { label: found.entry.label, step: "base" as const },
        ]
      : [{ label: text(draft.type || "Unknown type"), step: "group" as const }]),
    { label: base ? baseLabel(base) : "Base not offered", step: null },
  ];
}

const CATEGORY = /^\[([^\]]+)\]\s*/;
const withoutCategory = (label: string) => label.replace(CATEGORY, "");
/** A rare's prefix or suffix list: each family with its highest tier at the item level, or why it cannot be checked. */
function affixList(craft: EquipmentCraft, draft: RareDraft, side: AffixSide): AffixListView {
  const offset = affixSideOffset(side),
    chosen = draft.affixes.slice(offset, offset + 3).map((affix) => affix.familyId),
    full = chosen.every(Boolean),
    tabs = new Map<string, AffixOptionView[]>();
  for (const family of craftAffixPool(craft.mode, draft.type, offset, false)) {
    const category = family.label.match(CATEGORY)?.[1] || "Other",
      tiers = eligibleCraftTiers(draft, family),
      checked = chosen.includes(family.id),
      lowest = Math.min(...family.tiers.map((tier) => tier.level));
    const blocked = checked
      ? ""
      : !tiers.length
        ? lowest >= 100
          ? "Requires Priceless"
          : `Requires Lv.${lowest}`
        : full
          ? `Three ${side}es chosen`
          : "";
    tabs.set(category, [
      ...(tabs.get(category) || []),
      {
        value: family.id,
        label: text(withoutCategory(family.label)),
        highestTier: tiers.length ? `T${text(tiers[0].tier)}` : "",
        checked,
        blocked,
      },
    ]);
  }
  return {
    side,
    heading: side === "prefix" ? "Prefixes" : "Suffixes",
    count: `${chosen.filter(Boolean).length}/3`,
    tabs: [...tabs].map(([id, options]) => ({ id, label: id.replace(/ Affix$/, ""), options })),
  };
}

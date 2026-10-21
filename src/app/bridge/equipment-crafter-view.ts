// What the equipment crafter shows (apps/web/src/features/gear/EquipmentCrafterDialog.tsx), read from its draft
// (src/app/gear/equipment-craft.ts): the Vorax limb picker, the legendary list, a legendary's configuration, or the rare
// and Vorax form, each with its preview. Pure; the planner (src/app/gear/gear-controller.js) publishes it as the "equipmentCrafter"
// source and passes in how an item's preview looks, which depends on the open build. Texts are as the legacy markup
// printed them (src/app/bridge/display-text.ts).
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
  craftTypes,
  craftedRareItem,
  eligibleCraftTiers,
  equipmentEnergyAllowed,
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
export interface ItemPreviewEntryView {
  className: string;
  badge: { className: string; text: string } | null;
  text: ModifierTextView;
}
export interface ItemPreviewView {
  className: string;
  icon: string;
  rarity: string;
  name: string;
  /** "Base · Require Lv.N" */
  detail: string;
  sections: { label: string; detail: string; entries: ItemPreviewEntryView[] }[];
  source: string;
}
export interface CraftAffixView {
  index: number;
  label: string;
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
export interface RareFormView {
  kind: "form";
  name: string;
  level: string;
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
    affixes = draft.affixes.map((affix, index): CraftAffixView => {
      const family = craftFamily(craft, draft, index),
        tiers = eligibleCraftTiers(draft, family),
        tier = selectedCraftTier(craft, draft, index);
      return {
        index,
        label: index < 3 ? `Prefix ${index + 1}` : `Suffix ${index - 2}`,
        legendaryToggle: craft.mode === "vorax" ? { active: affix.legendary } : null,
        family: affix.familyId,
        families: craftAffixPool(craft.mode, draft.type, index, affix.legendary).map((entry) => ({
          value: entry.id,
          label: text(entry.label),
        })),
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
    name: draft.name,
    level: draft.level,
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
      options: baseAffixChoices(craft, draft.type, index).map((choice) => ({
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
  const item = craftedRareItem(craft);
  if (!craft.rare || !item) throw new Error("The equipment crafter has no form to show");
  return { ...base, body: rareFormView(craft, craft.rare, item, preview) };
}

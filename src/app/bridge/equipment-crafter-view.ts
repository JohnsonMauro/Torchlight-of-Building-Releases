// What the equipment crafter shows (apps/web/src/features/gear/EquipmentCrafterDialog.tsx), read from its draft
// (src/app/gear/equipment-craft.ts): the rare or Vorax item picker, the legendary list, a legendary's configuration, or
// the rare and Vorax form, each with its preview. Pure; the planner (src/app/gear/gear-controller.js) publishes it as the "equipmentCrafter"
// source and passes in how an item's preview looks, which depends on the open build. Texts are as the legacy markup
// printed them (src/app/bridge/display-text.ts).
import { gearGroupOfType, gearGroupsSs13 } from "../../data/gear/gear-groups-ss13.js";
import { placeholderPool } from "../../engine/gear/legendary-placeholder-pools.js";
import { legendaryLineTiers } from "../../engine/gear/legendary-affix-tiers.js";
import { normalizePercentageText } from "../../engine/text/percentage-text.js";
import { beltBlendChoices } from "../gear/belt-blend-options.js";
import { towerSequenceChoices } from "../gear/tower-sequence-options.js";
import { modifierRollRanges, modifierRollStep, negativeRollFill } from "../gear/affix-rolls.js";
import {
  baseAffixChoices,
  corrosionPool,
  craftAffixPool,
  affixSideOffset,
  craftPickStep,
  craftedRareItem,
  eligibleCraftTiers,
  equipmentEnergyAllowed,
  MAX_TYPED_LEVEL,
  PRICELESS_LEVEL,
  legendaries,
  legendaryById,
  legendaryCorrodedLine,
  legendaryCorrosionText,
  legendaryGroupOf,
  legendaryGroups,
  legendaryLineTemplate,
  legendaryLineText,
  legendaryPreviewItem,
  rareBasesForType,
  selectedCraftTier,
  towerSequencesForType,
  typeSlot,
  voraxBases,
  voraxGroupOfLimb,
  voraxGroups,
  voraxLegendaryDonors,
  type AffixSide,
  type CraftPick,
  type CraftPickStep,
  type CraftedItem,
  type EquipmentCraft,
  type LegendaryEntry,
  type CraftTier,
  type RareDraft,
} from "../gear/equipment-craft.ts";
import { displayTexts } from "./display-text.ts";
import { unsafePattern } from "../gear/safe-regex.ts";
import { groupIconKind, type GearSlotIconKind } from "./gear-slot-icon.ts";
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
  /** A corroded item: "Corroded" under its energy. */
  corroded: boolean;
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
/** A family in an affix list, or a donor's modifier in a Vorax item's Legendary tab. */
export interface AffixOptionView {
  value: string;
  /** Its label without its category ("+# Max Life"); a donor's modifier as it rolls ("+(80–100) Max Life"). */
  label: string;
  /** The highest tier the item level offers ("T0+"; "L" for a donor's modifier); "" when it offers none. */
  highestTier: string;
  checked: boolean;
  /** Why it cannot be checked ("Requires Priceless", "Requires Lv.82", "Three prefixes chosen"); "" when it can. */
  blocked: string;
  /**
   * A checked family's slot (0–5), the tiers the item level offers (its own marked; none to pick for a donor's modifier)
   * and its rolls; null unchecked.
   */
  config: {
    slot: number;
    tiers: { value: string; label: string; title: string; current: boolean }[];
    rolls: RollView[];
  } | null;
}
/** A base affix in the list: its fixed tier, and its slot and rolls once checked. */
export interface BaseAffixOptionView {
  value: string;
  label: string;
  /** Its tier ("T2"); "" for none. */
  tier: string;
  checked: boolean;
  /** "Two base affixes chosen" when both slots hold another; "" when it can be checked. */
  blocked: string;
  config: { slot: number; rolls: RollView[] } | null;
}
/** The base affix list: every base affix the type offers, up to two checked. */
export interface BaseAffixListView {
  /** "1/2". */
  count: string;
  options: BaseAffixOptionView[];
}
/** A prefix or suffix list: the families by category (Basic, Advanced, Ultimate), up to three checked. */
export interface AffixListView {
  side: AffixSide;
  heading: string;
  /** "1/3". */
  count: string;
  tabs: { id: string; label: string; options: AffixOptionView[] }[];
  /** A Vorax item's Legendary tab; null on a rare. */
  legendary: LegendaryAffixesView | null;
}
/** A Vorax item's Legendary affixes a side can take: each donor legendary's modifiers, up to two on the item. */
export interface LegendaryAffixesView {
  /** "1/2": the item's, on both sides. */
  count: string;
  donors: { id: string; name: string; icon: string; level: string; options: AffixOptionView[] }[];
}
/** A step of the item picker's path: `step` opens it again; null for where the picker or the form stands. */
export interface CraftCrumbView {
  label: string;
  step: CraftPickStep | null;
}
/** The item picker: the item groups, a group's types, then a type's bases (a Vorax item: a group's limbs), as cards. */
export interface CraftPickView {
  kind: "craftPick";
  step: CraftPickStep;
  heading: string;
  path: CraftCrumbView[];
  /** A group's card shows its gear slot silhouette (`slotIcon`) in place of an item's art. */
  cards: { value: string; label: string; detail: string; icon: string; slotIcon?: GearSlotIconKind | null }[];
}
export interface RareFormView {
  kind: "form";
  /** The item's group, type and base (a Vorax item's group and limb), each before the last a way back to the picker. */
  path: CraftCrumbView[];
  name: string;
  level: string;
  /** The highest level the field takes: 89 on a rare, whose level 100 is the Priceless check; 100 on a Vorax item. */
  levelMax: number;
  /** A rare's Priceless check (level 100); null on a Vorax form. */
  priceless: boolean | null;
  beltBlendShown: boolean;
  beltBlend: string;
  beltBlends: SelectChoice[];
  baseAffixList: BaseAffixListView;
  /** The Corroded check. */
  corroded: boolean;
  energyShown: boolean;
  energy: string;
  sequenceShown: boolean;
  sequence: string;
  sequences: SelectChoice[];
  /** The prefix and suffix lists. */
  affixLists: AffixListView[];
  preview: ItemPreviewView;
}
export interface LegendaryLineView {
  index: number;
  corroded: boolean;
  /** The line has a corroded form. */
  canCorrode: boolean;
  /** Its corroded form (the game's tier 0, "T0 · …"); null when it has none. */
  corrodedText: string | null;
  text: ModifierTextView;
  /** Folklore of Locking Fingers' ring effect line. */
  ring: "left" | "right" | null;
  placeholder: { value: string; options: OptionView[] } | null;
  /**
   * Its tiers ("1", "2"; each labelled "T1 · …"), also while corroded, and the one it holds; only T1 (the catalogue line)
   * when it has one range but a corroded form; null when it has neither.
   */
  tier: { value: string; options: OptionView[] } | null;
  rolls: RollView[];
}
export interface LegendaryConfigView {
  kind: "legendary";
  /** Its group, then its name: each step before it a way back to the list. */
  path: CraftCrumbView[];
  /** Its name (the dialog draws a new configuration for another legendary). */
  name: string;
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
/** The legendary list: the groups, then a group's legendaries with its types as filter chips; the search over them. */
export interface LegendaryListView {
  kind: "legendaryList";
  search: string;
  /** Why the search matches nothing ("Invalid regular expression: …"); "" when it reads. */
  searchError: string;
  /** Where the list stands: the group cards, or a group (no cards) whose legendaries are the results; null while searching every legendary. */
  browse: { step: CraftPickStep; heading: string; path: CraftCrumbView[]; cards: CraftPickView["cards"] } | null;
  /** The group's types, each a chip that keeps its legendaries ("STR" · 16); none on, all are kept. Empty without a group. */
  chips: { value: string; label: string; count: number; on: boolean }[];
  /** The group's legendaries the chips and the search keep, or the search's over every legendary (the first 120). */
  results: { id: string; name: string; icon: string; detail: string }[];
  /** "" while the group cards show. */
  count: string;
  /** The catalogue's longest legendary name: every card in the list takes its width. */
  widestName: string;
}
export type EquipmentCrafterBody = LegendaryListView | LegendaryConfigView | CraftPickView | RareFormView;
export interface EquipmentCrafterView {
  session: number;
  title: string;
  saveLabel: string;
  body: EquipmentCrafterBody;
}

const titleCase = (value: string) =>
  value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());
const text = (value: string) => normalizePercentageText(value);
/** A tier's line as its chip names it ("+(22–29) %" read as "+(22–29)%"). */
const tierText = (value: string) => text(value.replace(/(\d|\))\s+%/g, "$1%"));

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
  const slot = typeSlot(craft, draft.type);
  return {
    kind: "form",
    path: craft.mode === "vorax" ? voraxFormPath(draft) : formPath(draft),
    name: draft.name,
    level: draft.level,
    levelMax: craft.mode === "rare" ? MAX_TYPED_LEVEL : 100,
    priceless: craft.mode === "rare" ? draft.level === PRICELESS_LEVEL : null,
    beltBlendShown: slot === "belt",
    beltBlend: draft.beltBlendId,
    beltBlends: displayTexts(beltBlendChoices()),
    baseAffixList: baseAffixList(craft, draft),
    corroded: draft.corroded,
    energyShown: equipmentEnergyAllowed(slot),
    energy: draft.energy,
    sequenceShown: towerSequencesForType(draft.type).length > 0,
    sequence: draft.sequenceId,
    sequences: displayTexts(towerSequenceChoices(towerSequencesForType(draft.type))),
    affixLists: (["prefix", "suffix"] as const).map((side) => affixList(craft, draft, side)),
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
    corrosion = pool[draft.corrosionIndex],
    group = legendaryGroupOf(entry.id);
  return {
    kind: "legendary",
    path: [
      { label: ALL_GROUPS, step: "group" },
      ...(group ? [{ label: group.label, step: "type" as const }] : []),
      { label: text(entry.name), step: null },
    ],
    name: text(entry.name),
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
        corrodedLine = legendaryCorrodedLine(entry.id, index),
        tiers: { tier: number; text: string }[] | null =
          legendaryLineTiers(entry.id, index) ?? (corrodedLine ? [{ tier: 1, text: entry.modifiers[index] }] : null),
        chosenTier = tiers?.some((tier) => tier.tier === Number(draft.tiers[index]))
          ? Number(draft.tiers[index])
          : tiers?.[0].tier;
      return {
        index,
        corroded,
        canCorrode: Boolean(corrodedLine),
        corrodedText: corrodedLine ? `T0 · ${tierText(corrodedLine)}` : null,
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
              options: tiers.map((tier) => ({
                value: String(tier.tier),
                label: `T${tier.tier} · ${tierText(tier.text)}`,
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
    : craft.choosing
      ? "Craft Item"
      : craft.mode === "legendary"
        ? "Craft Legendary"
        : craft.mode === "vorax"
          ? "Craft Vorax Item"
          : "Craft Rare Item";
  const body = crafterBody(craft, preview);
  return {
    session,
    title,
    saveLabel: craft.editingId ? "Save Changes" : "Add to Inventory",
    // A new item's path starts at the crafter's first step (the kind of item); an edit's does not.
    body: craft.editingId || craft.choosing ? body : withModeCrumb(body),
  };
}

function crafterBody(craft: EquipmentCraft, preview: (item: CraftedItem) => ItemPreviewView): EquipmentCrafterBody {
  if (craft.choosing) return craftModeView();
  if (craft.mode === "legendary") return legendaryConfigView(craft, preview) ?? legendaryListView(craft);
  if (craft.pick) return craft.mode === "vorax" ? voraxPickView(craft.pick) : craftPickView(craft.pick);
  const item = craftedRareItem(craft);
  if (!craft.rare || !item) throw new Error("The equipment crafter has no form to show");
  return rareFormView(craft, craft.rare, item, preview);
}

const CRAFT_STEP = "Craft";
const MODE_CRUMB: CraftCrumbView = { label: CRAFT_STEP, step: "mode" };
/** The body with the crafter's first step ahead of its path. */
function withModeCrumb(body: EquipmentCrafterBody): EquipmentCrafterBody {
  if (body.kind === "legendaryList")
    return body.browse ? { ...body, browse: { ...body.browse, path: [MODE_CRUMB, ...body.browse.path] } } : body;
  return { ...body, path: [MODE_CRUMB, ...body.path] };
}

/** The crafter's first step: a rare item, a legendary or a Vorax item. */
function craftModeView(): CraftPickView {
  const legendaryCount = legendaries.length,
    limbCount = voraxBases().length;
  return {
    kind: "craftPick",
    step: "mode",
    heading: STEP_HEADINGS.mode,
    path: [{ label: CRAFT_STEP, step: null }],
    cards: [
      { value: "rare", label: "Rare Item", detail: "A base and its affixes", icon: topBaseIcon("STR Helmet") },
      {
        value: "legendary",
        label: "Legendary",
        detail: `${legendaryCount} legendaries`,
        icon: legendaryById("Ice_Pulse")?.icon ?? "",
      },
      { value: "vorax", label: "Vorax Item", detail: `${limbCount} limbs`, icon: limbIcon("Vorax Limb: Chest") },
    ],
  };
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
  mode: "Select what to craft",
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
          slotIcon: groupIconKind(item.id),
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

const limbLabel = (type: string) => text(type.replace(/^Vorax /, ""));
const limbIcon = (type: string) => voraxBases().find((limb) => limb.name === type)?.icon || "";

/** The Vorax item picker: the groups that hold limbs, then a group's limbs (a limb opens the form). */
function voraxPickView(pick: CraftPick): CraftPickView {
  const groups = voraxGroups(),
    group = groups.find((entry) => entry.id === pick.group);
  const path: CraftCrumbView[] = [{ label: ALL_GROUPS, step: group ? "group" : null }];
  if (group) path.push({ label: group.label, step: null });
  return {
    kind: "craftPick",
    step: group ? "type" : "group",
    heading: group ? "Select a limb" : STEP_HEADINGS.group,
    path,
    cards: group
      ? group.limbs.map((type) => ({ value: type, label: limbLabel(type), detail: "", icon: limbIcon(type) }))
      : groups.map((entry) => ({
          value: entry.id,
          label: entry.label,
          detail: `${entry.limbs.length} ${entry.limbs.length === 1 ? "limb" : "limbs"}`,
          icon: limbIcon(entry.limbs[0]),
          slotIcon: groupIconKind(entry.id),
        })),
  };
}

/** A Vorax form's way back: its group, then its limb. */
function voraxFormPath(draft: RareDraft): CraftCrumbView[] {
  const group = voraxGroupOfLimb(draft.type);
  return [
    { label: ALL_GROUPS, step: "group" },
    ...(group ? [{ label: group.label, step: "type" as const }] : []),
    { label: limbLabel(draft.type), step: null },
  ];
}

const legendaryCount = (count: number) => `${count} ${count === 1 ? "legendary" : "legendaries"}`;
const SEARCH_LIMIT = 120;
const widestLegendaryName = () =>
  text(legendaries.reduce((widest, entry) => (entry.name.length > widest.length ? entry.name : widest), ""));

/**
 * The search: text found in the name or a mod (any case), or a regular expression written /pattern/flags, tested on the
 * name and on each mod; `error` when the expression does not read.
 */
export function legendarySearch(search: string): { matches: (entry: LegendaryEntry) => boolean; error: string } {
  const regex = search.trim().match(/^\/(.+)\/([a-z]*)$/);
  if (regex) {
    // A pattern that could freeze the page is refused before it runs (src/app/gear/safe-regex.ts).
    const refused = unsafePattern(regex[1]);
    if (refused) return { matches: () => false, error: refused };
    try {
      // Always ignoring case; "g" and "y" would make test() remember where it stopped.
      const pattern = new RegExp(regex[1], [...new Set(`${regex[2]}i`.replace(/[gy]/g, ""))].join(""));
      return { matches: (entry) => [entry.name, ...entry.modifiers].some((line) => pattern.test(line)), error: "" };
    } catch (error) {
      return {
        matches: () => false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  const needle = search.trim().toLowerCase();
  return {
    matches: (entry) => [entry.name, ...entry.modifiers].some((line) => line.toLowerCase().includes(needle)),
    error: "",
  };
}

/** The legendary list: the groups; a group's legendaries, kept by its type chips and the search; or the search over all. */
function legendaryListView(craft: EquipmentCraft): LegendaryListView {
  const result = (entry: LegendaryEntry) => ({
    id: entry.id,
    name: text(entry.name),
    icon: entry.icon,
    detail: `${titleCase(entry.slot)} · Lv.${entry.level}`,
  });
  const searching = Boolean(craft.search.trim()),
    search = legendarySearch(craft.search),
    groups = legendaryGroups(),
    group = groups.find((entry) => entry.id === craft.pick?.group),
    base = {
      kind: "legendaryList" as const,
      search: craft.search,
      searchError: search.error,
      widestName: widestLegendaryName(),
    };
  if (!group && searching) {
    const entries = legendaries.filter(search.matches);
    return {
      ...base,
      browse: null,
      chips: [],
      results: entries.slice(0, SEARCH_LIMIT).map(result),
      count: `${entries.length} legendary gear available${entries.length > SEARCH_LIMIT ? " · refine the search to see more" : ""}`,
    };
  }
  if (!group)
    return {
      ...base,
      browse: {
        step: "group",
        heading: STEP_HEADINGS.group,
        path: [{ label: ALL_GROUPS, step: null }],
        cards: groups.map((item) => ({
          value: item.id,
          label: item.label,
          detail: legendaryCount(item.entries.reduce((count, type) => count + type.legendaries.length, 0)),
          icon: item.entries[0].legendaries[0].icon,
          slotIcon: groupIconKind(item.id),
        })),
      },
      chips: [],
      results: [],
      count: "",
    };
  const kept = group.entries.filter(
      (entry) => !craft.legendaryTypes.length || craft.legendaryTypes.includes(entry.type),
    ),
    entries = kept.flatMap((entry) => entry.legendaries).filter((entry) => !searching || search.matches(entry));
  return {
    ...base,
    browse: {
      step: "type",
      heading: "Select a legendary",
      path: [
        { label: ALL_GROUPS, step: "group" },
        { label: group.label, step: null },
      ],
      cards: [],
    },
    chips: group.entries.map((entry) => ({
      value: entry.type,
      label: entry.label,
      count: entry.legendaries.length,
      on: craft.legendaryTypes.includes(entry.type),
    })),
    results: entries.map(result),
    count: legendaryCount(entries.length),
  };
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
/** A prefix or suffix list: each family with its highest tier at the item level, or why it cannot be checked. */
function affixList(craft: EquipmentCraft, draft: RareDraft, side: AffixSide): AffixListView {
  const offset = affixSideOffset(side),
    slots = draft.affixes.slice(offset, offset + 3),
    // A Legendary affix's id is a donor's, never a family's: it sits in the Legendary tab only.
    chosen = slots.map((affix) => (affix.legendary ? "" : affix.familyId)),
    full = slots.every((affix) => affix.familyId),
    tabs = new Map<string, AffixOptionView[]>();
  for (const family of craftAffixPool(craft.mode, draft.type, offset, false)) {
    const category = family.label.match(CATEGORY)?.[1] || "Other",
      tiers = eligibleCraftTiers(draft, family),
      checked = chosen.includes(family.id),
      slot = offset + chosen.indexOf(family.id),
      lowest = Math.min(...family.tiers.map((tier) => tier.level));
    const blocked = checked
      ? ""
      : !tiers.length
        ? lowest >= 100 && craft.mode === "rare"
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
        config: checked ? affixConfig(craft, draft, slot, tiers) : null,
      },
    ]);
  }
  return {
    side,
    heading: side === "suffix" ? "Suffixes" : craft.mode === "vorax" ? "Organ affixes" : "Prefixes",
    count: `${slots.filter((affix) => affix.familyId).length}/3`,
    tabs: [...tabs].map(([id, options]) => ({ id, label: id.replace(/ Affix$/, ""), options })),
    legendary: craft.mode === "vorax" ? legendaryAffixes(craft, draft, side, full) : null,
  };
}

/** A Vorax item's Legendary tab on a side: each donor's modifiers, the checked ones with their slot and rolls. */
function legendaryAffixes(
  craft: EquipmentCraft,
  draft: RareDraft,
  side: AffixSide,
  full: boolean,
): LegendaryAffixesView {
  const offset = affixSideOffset(side),
    held = draft.affixes.filter((affix) => affix.legendary).length;
  return {
    count: `${held}/2`,
    donors: voraxLegendaryDonors(draft.type).map((donor) => ({
      id: donor.id,
      name: text(donor.name),
      icon: donor.icon,
      level: `Lv.${donor.level}`,
      options: donor.families.map((family): AffixOptionView => {
        const slot = draft.affixes.findIndex((affix) => affix.legendary && affix.familyId === family.id),
          checked = slot >= offset && slot < offset + 3,
          offered = eligibleCraftTiers(draft, family).length > 0,
          tier = checked ? selectedCraftTier(craft, draft, slot) : undefined;
        const blocked = checked
          ? ""
          : slot >= 0
            ? `Chosen as ${side === "prefix" ? "a suffix" : "a prefix"}`
            : !offered
              ? `Requires Lv.${donor.level}`
              : held >= 2
                ? "Two Legendary affixes chosen"
                : full
                  ? `Three ${side}es chosen`
                  : "";
        return {
          value: family.id,
          label: text(family.tiers[0].template),
          highestTier: offered ? "L" : "",
          checked,
          blocked,
          config: checked
            ? { slot, tiers: [], rolls: tier ? rollViews(tier.template, draft.affixes[slot].rolls) : [] }
            : null,
        };
      }),
    })),
  };
}

/** A checked family's tiers (the item level's, lowest first, its own marked) and the rolls of its tier. */
function affixConfig(
  craft: EquipmentCraft,
  draft: RareDraft,
  slot: number,
  tiers: CraftTier[],
): AffixOptionView["config"] {
  const affix = draft.affixes[slot],
    tier = selectedCraftTier(craft, draft, slot);
  return {
    slot,
    // From the lowest tier (T7) to the highest (T0+), left to right.
    tiers: [...tiers].reverse().map((entry) => ({
      value: entry.tier,
      label: `T${text(entry.tier)}`,
      title: `T${text(entry.tier)} · Requires Lv.${entry.level}`,
      current: entry.tier === affix.tier,
    })),
    rolls: tier ? rollViews(tier.template, affix.rolls) : [],
  };
}

/** Every base affix the type offers (a Vorax limb's two slots share one pool), the checked ones with their slot and rolls; up to two. */
function baseAffixList(craft: EquipmentCraft, draft: RareDraft): BaseAffixListView {
  const chosen = draft.baseAffixes.map((affix) => affix.template),
    full = chosen.every(Boolean);
  return {
    count: `${chosen.filter(Boolean).length}/2`,
    options: baseAffixChoices(craft, draft.type, 0).map((choice) => {
      const slot = chosen.indexOf(choice.template),
        checked = slot >= 0;
      return {
        value: choice.template,
        label: text(choice.template.replaceAll("\n", " / ")),
        tier: choice.tier ? `T${text(choice.tier)}` : "",
        checked,
        blocked: !checked && full ? "Two base affixes chosen" : "",
        config: checked ? { slot, rolls: rollViews(choice.template, draft.baseAffixes[slot].rolls) } : null,
      };
    }),
  };
}

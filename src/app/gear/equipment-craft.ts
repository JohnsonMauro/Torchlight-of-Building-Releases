// The equipment crafter's draft (the Gear section's Craft Rare Item, Craft Vorax Item and Craft Legendary, or Edit on a
// crafted rare or Vorax item): what each control holds, what a control's change does to the rest, and the item the draft
// crafts. Pure: the planner (src/app/gear/gear-controller.js) keeps the draft, applies each change with changeEquipmentCraft, and
// publishes the view (src/app/bridge/equipment-crafter-view.ts). Typed numbers stay text, as their fields hold them.
//
// The rules are the legacy crafter's, which kept this state in its controls (a roll snaps as a range input does), except
// that a change keeps what it does not touch: the legacy re-render also put every other roll back at its best value.
import {
  baseAffixesSs13,
  baseAffixTiersSs13,
  corrosionImplicitsForBase,
  craftAffixesSs13,
  craftItemTypes,
  defaultBaseForItem,
  folkloreRingModifier,
  gearGroupOfType,
  gearGroupsSs13,
  isLegacyRareBase,
  legendaryCorrodedModifiersSs13,
  legendaryGearSs13,
  legendaryGearTypesSs13,
  legendaryModifierSignature,
  legendaryTierTemplate,
  placeholderOption,
  placeholderOptionTemplate,
  rareBaseItemsSs13,
  voraxBaseAffixSlotPool,
  voraxCraftingSs13,
  voraxItemTypes,
} from "../../engine/index.ts";
import { beltBlendById } from "./belt-blend-options.js";
import { equipmentEnergyAllowed, maxEquipmentEnergy, towerSequenceById, towerSequencesForType } from "./gear-rules.js";
import {
  interpolateCorrosionRoll,
  modifierRollRanges,
  preferredModifierRoll,
  resolveModifierRolls,
  resolvedRollValues,
  snappedModifierRoll,
  tierMatchesResolved,
} from "./affix-rolls.js";

export type CraftMode = "rare" | "vorax" | "legendary";
export type AffixSide = "prefix" | "suffix";
/** A side's three slots: prefixes 0–2, suffixes 3–5. */
export const affixSideOffset = (side: AffixSide): number => (side === "prefix" ? 0 : 3);

export interface CraftTier {
  tier: string;
  level: number;
  template: string;
}
export interface CraftFamily {
  id: string;
  label: string;
  tiers: CraftTier[];
}
export interface RareBase {
  id: string;
  name: string;
  type: string;
  slot: string;
  level: number;
  icon?: string;
  source?: string;
  modifiers?: string[];
}
export interface VoraxBase {
  id: string;
  name: string;
  label: string;
  slot: string;
  level?: number;
  icon?: string;
  source?: string;
  modifiers?: string[];
}
export interface LegendaryEntry {
  id: string;
  name: string;
  slot: string;
  level: number;
  icon: string;
  modifiers: string[];
  remoteIcon?: string;
  source?: string;
  [field: string]: unknown;
}
interface CorrosionEntry {
  label: string;
  min: string;
  max: string;
}

/** A prefix or suffix slot. `tier` is its chosen tier ("" without one); `rolls` its roll controls. */
export interface CraftAffixDraft {
  familyId: string;
  tier: string;
  rolls: number[];
  /** A Vorax slot that inherits a Legendary affix. */
  legendary: boolean;
}
export interface BaseAffixDraft {
  template: string;
  rolls: number[];
}
export interface RareDraft {
  name: string;
  level: string;
  type: string;
  /** A rare base's id, a Vorax limb's type, or "" when the item's base is not offered. */
  baseId: string;
  energy: string;
  beltBlendId: string;
  sequenceId: string;
  /** The item was corroded (a mark the item keeps; it adds no line). */
  corroded: boolean;
  baseAffixes: BaseAffixDraft[];
  affixes: CraftAffixDraft[];
}
export interface LegendaryDraft {
  id: string;
  base: string;
  beltBlendId: string;
  sequenceId: string;
  /** Index in the base's corrosion implicits; -1 for none. */
  corrosionIndex: number;
  /** Percent of the corrosion implicit's roll. */
  corrosionRoll: number;
  /** Corroded lines, in the order they were corroded. */
  corroded: number[];
  placeholders: Record<number, string>;
  tiers: Record<number, number>;
  ring: "left" | "right";
  /** Each line's rolls (one per range of its template). */
  rolls: number[][];
  energy: string;
}
export interface EquipmentCraft {
  mode: CraftMode;
  /** The crafter's first step: which kind of item to craft (rare, legendary or Vorax); `mode` is not chosen yet. */
  choosing: boolean;
  /** The Inventory item being edited (Save Changes), or null (Add to Inventory). */
  editingId: string | null;
  editingName: string;
  /** Vorax: the limb chosen (the form shows once one is). */
  voraxBase: string;
  /** Legendary: the list's search, kept while a legendary is configured. */
  search: string;
  /** Legendary: the group's types its list keeps (its filter chips); none keeps them all. */
  legendaryTypes: string[];
  rare: RareDraft | null;
  legendary: LegendaryDraft | null;
  /**
   * Where the item picker stands (src/data/gear/gear-groups-ss13.js: a group, then its entry's type, then a base; a
   * Vorax item: a group, then a limb; a legendary: a group, whose legendaries the list shows); null while a
   * rare or Vorax form shows. Back in the picker from the form, `rare` keeps the draft until a base or limb is picked.
   */
  pick: CraftPick | null;
}
export interface CraftPick {
  /** The group's id; "" to pick one. */
  group: string;
  /** The entry's item type; "" to pick one. A Vorax pick never holds one: its limb opens the form. */
  type: string;
}
/** A step of the item picker; "mode" is the crafter's first step, the kind of item. */
export type CraftPickStep = "mode" | "group" | "type" | "base";
export const CRAFT_MODES: readonly CraftMode[] = ["rare", "legendary", "vorax"];
export const craftPickStep = (pick: CraftPick): CraftPickStep => (!pick.group ? "group" : !pick.type ? "type" : "base");

const craftAffixes = craftAffixesSs13 as Record<string, { prefix?: CraftFamily[]; suffix?: CraftFamily[] }>;
const vorax = voraxCraftingSs13 as {
  bases: VoraxBase[];
  affixes: Record<string, { prefix?: CraftFamily[]; suffix?: CraftFamily[] }>;
  legendaryDonors: Record<string, { id: string; name: string; level?: number; modifiers: string[] }[]>;
};
const rareBases = rareBaseItemsSs13 as RareBase[];
const baseAffixes = baseAffixesSs13 as Record<string, string[]>;
const baseAffixTiers = baseAffixTiersSs13 as Record<string, Record<string, string>>;
export const legendaries = legendaryGearSs13 as LegendaryEntry[];
const corrodedLines = legendaryCorrodedModifiersSs13 as Record<string, (string | undefined)[]>;
const AFFIX_SLOTS = [0, 1, 2, 3, 4, 5];
const EMPTY_AFFIX: CraftAffixDraft = { familyId: "", tier: "", rolls: [], legendary: false };

export const voraxBases = (): VoraxBase[] => vorax.bases;
export interface VoraxGroup {
  id: string;
  label: string;
  /** The limbs' types, in the catalogue's order. */
  limbs: string[];
}
/** The gear groups a Vorax limb belongs to (a limb sits in the group whose types share its slot), each with its limbs. */
export function voraxGroups(): VoraxGroup[] {
  const typeSlots = new Map(craftItemTypes as [string, string][]);
  return (gearGroupsSs13 as { id: string; label: string; entries: { type: string }[] }[])
    .map((group) => {
      const slots = new Set(group.entries.map((entry) => typeSlots.get(entry.type)));
      return {
        id: group.id,
        label: group.label,
        limbs: (voraxItemTypes as [string, string][]).filter(([, slot]) => slots.has(slot)).map(([name]) => name),
      };
    })
    .filter((group) => group.limbs.length);
}
export const voraxGroupOfLimb = (type: string): VoraxGroup | undefined =>
  voraxGroups().find((group) => group.limbs.includes(type));
export const legendaryById = (id: string): LegendaryEntry | undefined => legendaries.find((entry) => entry.id === id);

/** The item type a legendary drops as (legendary-gear-types-ss13.js); undefined for one without an attribute. */
function legendaryType(id: string): string | undefined {
  return Object.entries(legendaryGearTypesSs13 as Record<string, string[]>).find(([, ids]) => ids.includes(id))?.[0];
}
/**
 * The base a crafted legendary starts on: the type it drops as; else (a legendary without an attribute) the catalogue's
 * guess, which reads the icon or takes the slot's first base.
 */
export const legendaryDefaultBase = (entry: LegendaryEntry): string =>
  legendaryType(entry.id) || defaultBaseForItem(entry);

/** The group a legendary is listed in. */
export const legendaryGroupOf = (id: string): LegendaryGroup | undefined =>
  legendaryGroups().find((group) => group.entries.some((entry) => entry.legendaries.some((item) => item.id === id)));

/** The Legendary crafter's Special entry of a group: its legendaries without an attribute. */
export const SPECIAL_TYPE = "Special";
export interface LegendaryGroup {
  id: string;
  label: string;
  /** Each type that has legendaries, with them; an attribute group's Special entry last, when it has any. */
  entries: { label: string; type: string; legendaries: LegendaryEntry[] }[];
}
let legendaryGroupList: LegendaryGroup[] | null = null;
/**
 * The legendaries by gear group and item type (src/data/gear/legendary-gear-types-ss13.js). A legendary no type lists has
 * no attribute: it is the Special entry of the attribute group (STR/DEX/INT types) whose types share its slot.
 */
export function legendaryGroups(): LegendaryGroup[] {
  if (legendaryGroupList) return legendaryGroupList;
  const types = legendaryGearTypesSs13 as Record<string, string[]>,
    typeSlots = new Map(craftItemTypes as [string, string][]),
    listed = new Set(Object.values(types).flat()),
    unlisted = legendaries.filter((entry) => !listed.has(entry.id));
  // An id can repeat in the catalogue (Unholy Prayer): every entry it names.
  const byId = (ids: string[]) => ids.flatMap((id) => legendaries.filter((entry) => entry.id === id));
  legendaryGroupList = (gearGroupsSs13 as { id: string; label: string; entries: { label: string; type: string }[] }[])
    .map((group) => {
      const entries = group.entries.map((entry) => ({ ...entry, legendaries: byId(types[entry.type] || []) }));
      const attributes = group.entries.every((entry) => /^(STR|DEX|INT) /.test(entry.type)),
        slots = new Set(group.entries.map((entry) => typeSlots.get(entry.type))),
        special = attributes ? unlisted.filter((entry) => slots.has(entry.slot)) : [];
      return {
        id: group.id,
        label: group.label,
        entries: [
          ...entries,
          ...(special.length ? [{ label: SPECIAL_TYPE, type: SPECIAL_TYPE, legendaries: special }] : []),
        ].filter((entry) => entry.legendaries.length),
      };
    })
    .filter((group) => group.entries.length);
  return legendaryGroupList;
}
export const legendaryCorrodedLine = (id: string, index: number): string | undefined => corrodedLines[id]?.[index];
export const corrosionPool = (base: string): CorrosionEntry[] => corrosionImplicitsForBase(base);

/** The types the form crafts: [type, slot]. A Vorax form crafts only its limb. */
export function craftTypes(craft: EquipmentCraft): [string, string][] {
  return craft.mode === "vorax"
    ? (voraxItemTypes as [string, string][]).filter(([name]) => name === craft.voraxBase)
    : (craftItemTypes as [string, string][]);
}
export const typeSlot = (craft: EquipmentCraft, type: string): string | undefined =>
  craftTypes(craft).find(([name]) => name === type)?.[1];
export function rareBasesForType(type: string): RareBase[] {
  return rareBases
    .filter((entry) => entry.type === type && !isLegacyRareBase(entry))
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
}
/** The type's bases (a Vorax limb is its own). */
export const baseChoices = (craft: EquipmentCraft, type: string): string[] =>
  craft.mode === "rare" ? rareBasesForType(type).map((entry) => entry.id) : [type];
/** The base affixes the type offers: the template and its tier. */
export function baseAffixChoices(
  craft: EquipmentCraft,
  type: string,
  index: number,
): { template: string; tier: string }[] {
  return craft.mode === "rare"
    ? (baseAffixes[type] || []).map((template) => ({ template, tier: baseAffixTiers[type]?.[template] || "" }))
    : voraxBaseAffixSlotPool(type, index).map((affix: { modifier: string; tier: string }) => ({
        template: affix.modifier,
        tier: affix.tier,
      }));
}
export function voraxModifierLabel(template: string): string {
  return template
    .replace(/\((-?\d+(?:\.\d+)?)\s*–\s*(-?\d+(?:\.\d+)?)\)/g, (_, minimum, maximum) =>
      Number(minimum) < 0 && Number(maximum) < 0 ? "-#" : "#",
    )
    .replace(/(-?)\d+(?:\.\d+)?/g, "$1#");
}
export interface VoraxDonor {
  id: string;
  name: string;
  icon: string;
  level: number;
  /** Its modifiers, each a family with one tier ("L"). */
  families: CraftFamily[];
}
const donorsByType = new Map<string, VoraxDonor[]>();
/** The legendaries a Vorax limb inherits a Legendary affix from (the icon is the legendary's own, a local image). */
export function voraxLegendaryDonors(type: string): VoraxDonor[] {
  let donors = donorsByType.get(type);
  if (!donors) {
    donors = (vorax.legendaryDonors[type] || []).map((donor) => ({
      id: donor.id,
      name: donor.name,
      icon: legendaries.find((entry) => entry.name === donor.name)?.icon || "",
      level: donor.level || 1,
      families: donor.modifiers.map((template, modifierIndex) => ({
        id: `${donor.id}-mod-${modifierIndex}`,
        label: `[${donor.name}] ${voraxModifierLabel(template)}`,
        tiers: [{ tier: "L", level: donor.level || 1, template }],
      })),
    }));
    donorsByType.set(type, donors);
  }
  return donors;
}
const voraxLegendaryAffixPool = (type: string): CraftFamily[] =>
  voraxLegendaryDonors(type).flatMap((donor) => donor.families);
/** The families a prefix (0–2) or suffix (3–5) slot can take. */
export function craftAffixPool(mode: CraftMode, type: string, index: number, legendary: boolean): CraftFamily[] {
  if (mode === "vorax" && legendary) return voraxLegendaryAffixPool(type);
  return (mode === "vorax" ? vorax.affixes[type] : craftAffixes[type])?.[index < 3 ? "prefix" : "suffix"] || [];
}
export const craftLevel = (draft: RareDraft): number => Number(draft.level) || 100;
export function craftFamily(craft: EquipmentCraft, draft: RareDraft, index: number): CraftFamily | undefined {
  const affix = draft.affixes[index];
  return craftAffixPool(craft.mode, draft.type, index, affix.legendary).find((family) => family.id === affix.familyId);
}
export function eligibleCraftTiers(draft: RareDraft, family: CraftFamily | undefined): CraftTier[] {
  return (family?.tiers || []).filter((tier) => tier.level <= craftLevel(draft));
}
const preferredRolls = (template: string): number[] => modifierRollRanges(template || "").map(preferredModifierRoll);
/** Rolls read from a resolved line, snapped into the template's ranges; a missing value keeps the current roll. */
function readRolls(template: string, current: number[], values: number[]): number[] {
  const ranges = modifierRollRanges(template);
  return current.map((roll, index) =>
    values[index] === undefined || !ranges[index] ? roll : snappedModifierRoll(ranges[index], values[index]),
  );
}

// ---- Rare and Vorax form.

/**
 * A prefix or suffix slot with its family's tier picked (the preferred one when still offered, else T1, else the first),
 * at its best rolls; `shown`, the tier it showed before, keeps its rolls when it is picked again.
 */
function configuredAffix(
  craft: EquipmentCraft,
  draft: RareDraft,
  index: number,
  affix: CraftAffixDraft,
  preferredTier = "",
  shown?: CraftTier,
): CraftAffixDraft {
  const family = craftAffixPool(craft.mode, draft.type, index, affix.legendary).find(
    (entry) => entry.id === affix.familyId,
  );
  const tiers = eligibleCraftTiers(draft, family);
  if (!family || !tiers.length) return { ...affix, tier: "", rolls: [] };
  const selected =
    tiers.find((tier) => tier.tier === preferredTier) || tiers.find((tier) => tier.tier === "1") || tiers[0];
  return {
    ...affix,
    tier: affix.legendary ? "" : selected.tier,
    rolls: selected === shown ? affix.rolls : preferredRolls(selected.template),
  };
}
/** The tier a slot's rolls belong to: its chosen tier, or a Legendary affix's only one. */
export function selectedCraftTier(craft: EquipmentCraft, draft: RareDraft, index: number): CraftTier | undefined {
  const affix = draft.affixes[index],
    family = craftFamily(craft, draft, index),
    tiers = eligibleCraftTiers(draft, family);
  if (!family || !tiers.length) return undefined;
  return affix.legendary
    ? (tiers.find((tier) => tier.tier === "1") ?? tiers[0])
    : tiers.find((t) => t.tier === affix.tier);
}
function newRareDraft(craft: EquipmentCraft, type = craftTypes(craft)[0][0]): RareDraft {
  const slot = typeSlot(craft, type);
  return {
    name: "",
    level: "100",
    type,
    baseId: baseChoices(craft, type)[0] ?? "",
    energy: String(maxEquipmentEnergy(100, slot, type)),
    beltBlendId: "",
    sequenceId: "",
    corroded: false,
    baseAffixes: [0, 1].map(() => ({ template: "", rolls: [] })),
    affixes: AFFIX_SLOTS.map(() => ({ familyId: "", tier: "", rolls: [], legendary: false })),
  };
}
/** The type's own fields reset (base, base affixes, affix families, TOWER Sequence, energy; Belt Blend off a belt). */
function withType(craft: EquipmentCraft, draft: RareDraft, type: string): RareDraft {
  const known = craftTypes(craft).some(([name]) => name === type),
    nextType = known ? type : "",
    slot = typeSlot(craft, nextType);
  return {
    ...draft,
    type: nextType,
    baseId: baseChoices(craft, nextType)[0] ?? "",
    baseAffixes: draft.baseAffixes.map(() => ({ template: "", rolls: [] })),
    affixes: draft.affixes.map((affix) => ({ ...affix, familyId: "", tier: "", rolls: [] })),
    sequenceId: "",
    energy: String(maxEquipmentEnergy(draft.level, slot, nextType)),
    beltBlendId: slot === "belt" ? draft.beltBlendId : "",
  };
}

export function newEquipmentCraft(mode: CraftMode): EquipmentCraft {
  const craft: EquipmentCraft = {
    mode,
    choosing: false,
    editingId: null,
    editingName: "",
    voraxBase: "",
    search: "",
    legendaryTypes: [],
    rare: null,
    legendary: null,
    pick: null,
  };
  return { ...craft, pick: { group: "", type: "" } };
}
/** The crafter opened on its first step: the kind of item to craft. */
export const newCraftChoice = (): EquipmentCraft => ({ ...newEquipmentCraft("rare"), choosing: true });

/** Edit on a crafted rare or Vorax item: the form filled from it. */
export function equipmentCraftFromItem(item: CraftedItem, weaponType: string): EquipmentCraft {
  const mode: CraftMode = item.rarity === "vorax" ? "vorax" : "rare";
  const craft: EquipmentCraft = {
    ...newEquipmentCraft(mode),
    pick: null,
    editingId: item.id ?? null,
    editingName: item.name || "",
    voraxBase: mode === "vorax" ? item.base || item.name || "" : "",
  };
  let draft = withType(craft, newRareDraft(craft), item.base || weaponType);
  const bases = baseChoices(craft, draft.type),
    blendId = item.beltBlendId || "",
    sequenceId = item.towerSequenceId || "";
  draft = {
    ...draft,
    name: item.name || "",
    level: String(item.itemLevel || item.level || 100),
    baseId: item.baseId ? (bases.includes(item.baseId) ? item.baseId : "") : draft.baseId,
    energy: String(item.energy || 0),
    corroded: Boolean(item.corroded),
    beltBlendId: beltBlendById(blendId) ? blendId : "",
    sequenceId: towerSequencesForType(draft.type).some((entry: { id: string }) => entry.id === sequenceId)
      ? sequenceId
      : "",
  };
  const baseAffixDrafts = [...draft.baseAffixes];
  (item.baseAffixModifiers || []).slice(0, 2).forEach((resolved, index) => {
    const template = baseAffixChoices(craft, draft.type, index).find(
      (choice) => legendaryModifierSignature(choice.template) === legendaryModifierSignature(resolved),
    )?.template;
    if (!template) return;
    baseAffixDrafts[index] = {
      template,
      rolls: readRolls(template, preferredRolls(template), resolvedRollValues(template, resolved)),
    };
  });
  let affixes = draft.affixes.map((affix, index) =>
    mode === "vorax" && item.craftAffixLegendary?.[index] ? { ...affix, legendary: true } : affix,
  );
  draft = { ...draft, baseAffixes: baseAffixDrafts, affixes };
  // A slot set to the item's family and tier (or the tier its Item Level offers instead), its rolls read from the line.
  const place = (index: number, family: CraftFamily, tier: CraftTier, resolved: string | undefined) => {
    const affix = configuredAffix(craft, draft, index, { ...affixes[index], familyId: family.id }, tier.tier);
    affixes = affixes.map((entry, position) => (position === index ? affix : entry));
    const shown = selectedCraftTier(craft, { ...draft, affixes }, index);
    if (!resolved || !shown) return;
    const rolls = readRolls(shown.template, affix.rolls, resolvedRollValues(tier.template, resolved));
    affixes = affixes.map((entry, position) => (position === index ? { ...affix, rolls } : entry));
  };
  const storedFamilies = item.craftAffixFamilyIds,
    storedTiers = item.craftAffixTierIds;
  if (Array.isArray(storedFamilies) && storedFamilies.some(Boolean)) {
    let prefixIndex = 0,
      suffixIndex = 0;
    storedFamilies.slice(0, 6).forEach((familyId, index) => {
      if (!familyId) return;
      const resolved =
          index < 3 ? (item.prefixModifiers || [])[prefixIndex++] : (item.suffixModifiers || [])[suffixIndex++],
        family = craftAffixPool(mode, draft.type, index, affixes[index].legendary).find(
          (entry) => entry.id === familyId,
        ),
        tier = affixes[index].legendary
          ? family?.tiers[0]
          : family?.tiers.find((candidate) => String(candidate.tier) === String(storedTiers?.[index] || ""));
      if (family && tier) place(index, family, tier, resolved);
    });
  } else {
    (
      [
        [item.prefixModifiers || [], 0],
        [item.suffixModifiers || [], 3],
      ] as [string[], number][]
    ).forEach(([resolvedModifiers, offset]) =>
      resolvedModifiers.slice(0, 3).forEach((resolved, position) => {
        const index = offset + position;
        for (const family of craftAffixPool(mode, draft.type, index, affixes[index].legendary)) {
          const tier = family.tiers.find((candidate) => tierMatchesResolved(candidate, resolved));
          if (tier) {
            place(index, family, tier, resolved);
            return;
          }
        }
      }),
    );
  }
  return { ...craft, rare: { ...draft, affixes } };
}

// ---- Legendary.

function legendaryTemplate(entry: LegendaryEntry, draft: LegendaryDraft, index: number): string {
  const corroded = draft.corroded.includes(index),
    choice = placeholderOption(entry.id, index, draft.placeholders[index]);
  if (choice) return placeholderOptionTemplate(choice, corroded);
  if (entry.id === "Folklore_of_Locking_Fingers" && index === 2) return folkloreRingModifier(draft.ring, corroded);
  const tierTemplate = corroded ? null : legendaryTierTemplate(entry.id, index, draft.tiers[index]);
  if (tierTemplate) return tierTemplate;
  return corroded ? corrodedLines[entry.id]?.[index] || entry.modifiers[index] : entry.modifiers[index];
}
export const legendaryLineTemplate = legendaryTemplate;
/** A line whose template changed (a tier, random roll or corroded form) rolled again at its best value; the rest kept. */
function rerolledLines(entry: LegendaryEntry, before: LegendaryDraft, after: LegendaryDraft): LegendaryDraft {
  return {
    ...after,
    rolls: entry.modifiers.map((_, index) => {
      const template = legendaryTemplate(entry, after, index);
      return before.rolls[index] && template === legendaryTemplate(entry, before, index)
        ? before.rolls[index]
        : preferredRolls(template);
    }),
  };
}
/** On its base: the energy at the base's cap and no corrosion implicit (the base's own pool). */
function legendaryOnBase(entry: LegendaryEntry, draft: LegendaryDraft): LegendaryDraft {
  return {
    ...draft,
    energy: String(maxEquipmentEnergy(100, entry.slot, draft.base)),
    corrosionIndex: -1,
    corrosionRoll: 100,
  };
}
function newLegendaryDraft(entry: LegendaryEntry): LegendaryDraft {
  const draft: LegendaryDraft = {
    id: entry.id,
    base: legendaryDefaultBase(entry),
    beltBlendId: "",
    sequenceId: "",
    corrosionIndex: -1,
    corrosionRoll: 100,
    corroded: [],
    placeholders: {},
    tiers: {},
    ring: "left",
    rolls: [],
    energy: "",
  };
  return legendaryOnBase(entry, rerolledLines(entry, draft, draft));
}
/** A legendary line as its controls resolve it. */
export function legendaryLineText(entry: LegendaryEntry, draft: LegendaryDraft, index: number): string {
  const template = legendaryTemplate(entry, draft, index),
    rolls = draft.rolls[index] || [];
  return rolls.length ? resolveModifierRolls(template, rolls) : template;
}
export function legendaryCorrosionText(draft: LegendaryDraft): string {
  const entry = corrosionPool(draft.base)[draft.corrosionIndex];
  return entry ? interpolateCorrosionRoll(entry, draft.corrosionRoll) : "";
}

// ---- Changes.

/** Which roll a roll control sets. */
export interface RollTarget {
  group: "base" | "affix" | "legendary";
  index: number;
  rangeIndex: number;
}
export type CraftChange =
  | { kind: "name" | "level" | "energy" | "beltBlend" | "sequence"; value: string }
  | { kind: "baseAffix" | "affixFamily" | "affixTier"; index: number; value: string }
  /**
   * An affix list: a family checked takes the side's first free slot (refused past three, or without a tier at the item
   * level); unchecked, it leaves its slot and the ones below move up. `legendary`: a Vorax item's Legendary affix (a
   * donor's modifier), up to two on the item.
   */
  | { kind: "toggleAffix"; side: AffixSide; familyId: string; legendary?: boolean }
  /** The base affix list: checked, a base affix takes the free slot (refused past two); unchecked, the other moves up. */
  | { kind: "toggleBaseAffix"; template: string }
  /** A rare's Priceless check: level 100, or back to the highest typed level. */
  | { kind: "priceless"; value: boolean }
  | { kind: "corroded"; value: boolean }
  /**
   * The item picker: a group, its entry's type, a base (the form shows); back to a step from the form. A Vorax item's
   * pickType is its limb, which opens the form.
   */
  | { kind: "pickGroup" | "pickType" | "pickBase"; value: string }
  | { kind: "repick"; step: CraftPickStep }
  | { kind: "search"; value: string }
  /** The crafter's first step: the kind of item ("rare", "legendary", "vorax"), whose picker opens. */
  | { kind: "craftMode"; value: string }
  /** The legendary list's filter chip of a type of its group: on, its legendaries are kept (with the other chips on). */
  | { kind: "toggleLegendaryType"; value: string }
  | { kind: "legendary"; id: string }
  | { kind: "legendaryBeltBlend" | "legendarySequence" | "legendaryEnergy"; value: string }
  | { kind: "legendaryRing"; value: "left" | "right" }
  | { kind: "legendaryCorrosion"; value: number }
  | { kind: "corrosionRoll"; value: number }
  | { kind: "legendaryTier"; index: number; value: number }
  | { kind: "legendaryPlaceholder"; index: number; value: string }
  | { kind: "toggleLegendaryCorrosion"; index: number }
  /** A roll as slid or typed (a typed value outside the range is ignored), or committed (clamped into it). */
  | ({ kind: "roll"; value: number; commit?: boolean } & RollTarget);

/** The rolls a roll control belongs to, with their ranges. */
function rollSlot(craft: EquipmentCraft, target: RollTarget): { template: string; rolls: number[] } | null {
  const draft = craft.rare;
  if (target.group === "legendary") {
    const entry = craft.legendary && legendaryById(craft.legendary.id);
    return entry && craft.legendary
      ? {
          template: legendaryTemplate(entry, craft.legendary, target.index),
          rolls: craft.legendary.rolls[target.index] || [],
        }
      : null;
  }
  if (!draft) return null;
  if (target.group === "base") return draft.baseAffixes[target.index] ?? null;
  const tier = selectedCraftTier(craft, draft, target.index);
  return tier ? { template: tier.template, rolls: draft.affixes[target.index].rolls } : null;
}
function changedRoll(craft: EquipmentCraft, change: Extract<CraftChange, { kind: "roll" }>): EquipmentCraft {
  const slot = rollSlot(craft, change),
    range = slot && modifierRollRanges(slot.template)[change.rangeIndex];
  if (!slot || !range || slot.rolls[change.rangeIndex] === undefined || !Number.isFinite(change.value)) return craft;
  if (!change.commit && (change.value < range.min || change.value > range.max)) return craft;
  const rolls = slot.rolls.map((roll, index) =>
    index === change.rangeIndex ? snappedModifierRoll(range, change.value) : roll,
  );
  const { legendary, rare: draft } = craft;
  if (change.group === "legendary")
    return legendary
      ? {
          ...craft,
          legendary: { ...legendary, rolls: legendary.rolls.map((r, i) => (i === change.index ? rolls : r)) },
        }
      : craft;
  if (!draft) return craft;
  return change.group === "base"
    ? {
        ...craft,
        rare: { ...draft, baseAffixes: draft.baseAffixes.map((a, i) => (i === change.index ? { ...a, rolls } : a)) },
      }
    : {
        ...craft,
        rare: { ...draft, affixes: draft.affixes.map((a, i) => (i === change.index ? { ...a, rolls } : a)) },
      };
}
/**
 * A rare's Item Level is typed up to 89, or Priceless: level 100, the only level above it a rare is crafted at, which
 * offers the T0+ tiers (src/app/gear/gear-items.js isPricelessItem reads a level 100 rare as Priceless).
 */
export const MAX_TYPED_LEVEL = 89;
export const PRICELESS_LEVEL = "100";
/** The level changed: the energy capped at it, each affix's tier picked again among those it offers. */
function withLevel(craft: EquipmentCraft, draft: RareDraft, level: string): RareDraft {
  const next = {
    ...draft,
    level,
    energy: String(maxEquipmentEnergy(level, typeSlot(craft, draft.type), draft.type)),
  };
  return {
    ...next,
    affixes: draft.affixes.map((affix, index) =>
      configuredAffix(craft, next, index, affix, affix.tier, selectedCraftTier(craft, draft, index)),
    ),
  };
}
function changedRare(craft: EquipmentCraft, draft: RareDraft, change: CraftChange): RareDraft | { notice: string } {
  const setAffix = (index: number, affix: CraftAffixDraft) =>
    draft.affixes.map((entry, position) => (position === index ? affix : entry));
  switch (change.kind) {
    case "name":
    case "energy":
    case "beltBlend":
    case "sequence": {
      const field = {
        name: "name",
        energy: "energy",
        beltBlend: "beltBlendId",
        sequence: "sequenceId",
      }[change.kind] as "name" | "energy" | "beltBlendId" | "sequenceId";
      return { ...draft, [field]: change.value };
    }
    case "level":
      return withLevel(
        craft,
        draft,
        craft.mode === "rare" && Number(change.value) > MAX_TYPED_LEVEL ? String(MAX_TYPED_LEVEL) : change.value,
      );
    case "corroded":
      return { ...draft, corroded: change.value };
    case "priceless":
      return withLevel(craft, draft, change.value ? PRICELESS_LEVEL : String(MAX_TYPED_LEVEL));
    case "baseAffix":
      return {
        ...draft,
        baseAffixes: draft.baseAffixes.map((affix, index) =>
          index === change.index ? { template: change.value, rolls: preferredRolls(change.value) } : affix,
        ),
      };
    case "affixFamily":
      return {
        ...draft,
        affixes: setAffix(
          change.index,
          configuredAffix(craft, draft, change.index, { ...draft.affixes[change.index], familyId: change.value }),
        ),
      };
    case "toggleAffix": {
      const legendary = Boolean(change.legendary),
        offset = affixSideOffset(change.side),
        slots = draft.affixes.slice(offset, offset + 3),
        at = slots.findIndex((affix) => affix.familyId === change.familyId && affix.legendary === legendary);
      if (at >= 0) {
        const moved = [...slots.slice(0, at), ...slots.slice(at + 1), EMPTY_AFFIX];
        return { ...draft, affixes: draft.affixes.map((affix, index) => moved[index - offset] ?? affix) };
      }
      // A donor's modifier is one affix: the other side cannot take it too.
      if (legendary && draft.affixes.some((affix) => affix.legendary && affix.familyId === change.familyId))
        return draft;
      if (legendary && draft.affixes.filter((affix) => affix.legendary).length >= 2)
        return { notice: "A Vorax item can inherit up to two Legendary affixes" };
      const free = slots.findIndex((affix) => !affix.familyId);
      if (free < 0) return { notice: `An item takes up to three ${change.side}es` };
      const index = offset + free,
        family = craftAffixPool(craft.mode, draft.type, index, legendary).find((entry) => entry.id === change.familyId);
      if (!family) return draft;
      if (!eligibleCraftTiers(draft, family).length)
        return { notice: `${family.label.replace(/^\[[^\]]+\]\s*/, "")} needs a higher item level` };
      return {
        ...draft,
        affixes: setAffix(
          index,
          configuredAffix(craft, draft, index, { ...EMPTY_AFFIX, familyId: family.id, legendary }),
        ),
      };
    }
    case "toggleBaseAffix": {
      const at = draft.baseAffixes.findIndex((affix) => affix.template === change.template);
      if (at >= 0)
        return {
          ...draft,
          baseAffixes: [...draft.baseAffixes.filter((_, index) => index !== at), { template: "", rolls: [] }],
        };
      const free = draft.baseAffixes.findIndex((affix) => !affix.template);
      if (free < 0) return { notice: "An item takes up to two base affixes" };
      if (!baseAffixChoices(craft, draft.type, free).some((choice) => choice.template === change.template))
        return draft;
      return changedRare(craft, draft, { kind: "baseAffix", index: free, value: change.template });
    }
    case "affixTier": {
      const affix = draft.affixes[change.index],
        tier = craftFamily(craft, draft, change.index)?.tiers.find((entry) => entry.tier === change.value);
      return {
        ...draft,
        affixes: setAffix(change.index, { ...affix, tier: change.value, rolls: preferredRolls(tier?.template || "") }),
      };
    }
    default:
      return draft;
  }
}
function changedLegendary(entry: LegendaryEntry, draft: LegendaryDraft, change: CraftChange): LegendaryDraft {
  switch (change.kind) {
    case "legendaryBeltBlend":
      return { ...draft, beltBlendId: change.value };
    case "legendarySequence":
      return { ...draft, sequenceId: change.value };
    case "legendaryEnergy":
      return { ...draft, energy: change.value };
    case "legendaryRing":
      return { ...draft, ring: change.value };
    case "legendaryCorrosion":
      return { ...draft, corrosionIndex: change.value, corrosionRoll: 100 };
    case "corrosionRoll":
      return { ...draft, corrosionRoll: change.value };
    case "legendaryTier":
      return rerolledLines(entry, draft, { ...draft, tiers: { ...draft.tiers, [change.index]: change.value } });
    case "legendaryPlaceholder": {
      const placeholders = Object.fromEntries(
        Object.entries({ ...draft.placeholders, [change.index]: change.value }).filter(([, id]) => id),
      );
      return rerolledLines(entry, draft, { ...draft, placeholders });
    }
    case "toggleLegendaryCorrosion":
      return rerolledLines(entry, draft, {
        ...draft,
        corroded: draft.corroded.includes(change.index)
          ? draft.corroded.filter((index) => index !== change.index)
          : [...draft.corroded, change.index],
      });
    default:
      return draft;
  }
}
/** A base picked: the form shows it, keeping the draft's other fields when it had one (a new type resets its own). */
function pickedBase(craft: EquipmentCraft, baseId: string): EquipmentCraft {
  const base = rareBases.find((entry) => entry.id === baseId);
  if (!base) return craft;
  const draft = !craft.rare
    ? newRareDraft(craft, base.type)
    : craft.rare.type === base.type
      ? craft.rare
      : withType(craft, craft.rare, base.type);
  return { ...craft, pick: null, rare: { ...draft, baseId } };
}
/**
 * Back from a legendary's configuration (or the list) to a step of the list: the groups, or the group the legendary
 * belongs to, its search cleared.
 */
function legendaryRepicked(craft: EquipmentCraft, step: CraftPickStep): EquipmentCraft {
  const group = step === "group" ? "" : (legendaryGroupOf(craft.legendary?.id ?? "")?.id ?? craft.pick?.group ?? "");
  return { ...craft, legendary: null, search: "", pick: { group, type: "" } };
}
/** A Vorax limb picked: the form shows it, keeping the draft when it is the limb the draft holds. */
function pickedLimb(craft: EquipmentCraft, type: string): EquipmentCraft {
  if (!voraxBases().some((limb) => limb.name === type)) return craft;
  const next = { ...craft, voraxBase: type, pick: null };
  return { ...next, rare: craft.rare?.type === type ? craft.rare : newRareDraft(next) };
}
/** Back to a picker step, from the picker or from the form (its draft's type tells where it stands). */
function repicked(craft: EquipmentCraft, step: CraftPickStep): CraftPick {
  const type = craft.pick ? craft.pick.type : craft.rare?.type || "";
  const group = craft.pick
    ? craft.pick.group
    : (craft.mode === "vorax" ? voraxGroupOfLimb(type)?.id : gearGroupOfType(type)?.group.id) || "";
  if (step === "group" || !group) return { group: "", type: "" };
  return { group, type: step === "base" ? type : "" };
}
/** The draft after a control's change; `notice` (and the draft unchanged) when the change is refused. */
export function changeEquipmentCraft(
  craft: EquipmentCraft,
  change: CraftChange,
): { craft: EquipmentCraft; notice?: string } {
  if (change.kind === "roll") return { craft: changedRoll(craft, change) };
  if (change.kind === "craftMode") {
    const mode = CRAFT_MODES.find((entry) => entry === change.value);
    return { craft: mode ? newEquipmentCraft(mode) : craft };
  }
  if (change.kind === "repick" && change.step === "mode") return { craft: craft.editingId ? craft : newCraftChoice() };
  if (change.kind === "pickGroup")
    return { craft: { ...craft, pick: { group: change.value, type: "" }, legendaryTypes: [] } };
  if (change.kind === "pickType" && craft.mode === "vorax") return { craft: pickedLimb(craft, change.value) };
  if (change.kind === "pickType")
    return { craft: craft.pick ? { ...craft, pick: { ...craft.pick, type: change.value } } : craft };
  if (change.kind === "pickBase") return { craft: pickedBase(craft, change.value) };
  if (change.kind === "repick" && craft.mode === "legendary") return { craft: legendaryRepicked(craft, change.step) };
  if (change.kind === "repick") return { craft: { ...craft, pick: repicked(craft, change.step) } };
  if (change.kind === "search") return { craft: { ...craft, search: change.value } };
  if (change.kind === "toggleLegendaryType") {
    const on = craft.legendaryTypes.includes(change.value);
    return {
      craft: {
        ...craft,
        legendaryTypes: on
          ? craft.legendaryTypes.filter((type) => type !== change.value)
          : [...craft.legendaryTypes, change.value],
      },
    };
  }
  if (change.kind === "legendary") {
    const entry = legendaryById(change.id);
    return { craft: { ...craft, legendary: entry ? newLegendaryDraft(entry) : null } };
  }
  if (craft.legendary) {
    const entry = legendaryById(craft.legendary.id);
    return { craft: entry ? { ...craft, legendary: changedLegendary(entry, craft.legendary, change) } : craft };
  }
  if (!craft.rare) return { craft };
  const result = changedRare(craft, craft.rare, change);
  if ("notice" in result) return { craft, notice: result.notice };
  return { craft: result === craft.rare ? craft : { ...craft, rare: result } };
}

// ---- The crafted item.

/** An item as the crafter reads and writes it (other fields are kept as they are). */
export interface CraftedItem {
  id?: string;
  name: string;
  base?: string;
  baseId?: string;
  slot?: string;
  level?: number;
  itemLevel?: number;
  energy?: number;
  rarity?: string;
  beltBlendId?: string;
  towerSequenceId?: string;
  baseAffixModifiers?: string[];
  prefixModifiers?: string[];
  suffixModifiers?: string[];
  craftAffixFamilyIds?: string[];
  craftAffixTierIds?: string[];
  craftAffixLegendary?: boolean[];
  corroded?: boolean;
  modifiers?: string[];
  [field: string]: unknown;
}
const definedFields = <T extends object>(item: T): T =>
  Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined)) as T;

function affixText(craft: EquipmentCraft, draft: RareDraft, index: number): string {
  const affix = draft.affixes[index],
    family = craftFamily(craft, draft, index),
    tier = affix.legendary ? family?.tiers[0] : family?.tiers.find((entry) => entry.tier === affix.tier);
  if (!tier) return "";
  return affix.rolls.length ? resolveModifierRolls(tier.template, affix.rolls) : tier.template;
}
/** The rare or Vorax item the form crafts (its preview, and what Add to Inventory or Save Changes stores). */
export function craftedRareItem(craft: EquipmentCraft): CraftedItem | null {
  const draft = craft.rare;
  if (!draft) return null;
  const baseAffixModifiers = draft.baseAffixes
      .map((affix) =>
        affix.template.trim()
          ? affix.rolls.length
            ? resolveModifierRolls(affix.template.trim(), affix.rolls)
            : affix.template.trim()
          : "",
      )
      .filter(Boolean),
    prefixModifiers = [0, 1, 2].map((index) => affixText(craft, draft, index)).filter(Boolean),
    suffixModifiers = [3, 4, 5].map((index) => affixText(craft, draft, index)).filter(Boolean),
    modifiers = [...baseAffixModifiers, ...prefixModifiers, ...suffixModifiers];
  const baseAffixTierIds = draft.baseAffixes.map((affix, index) =>
    affix.template
      ? baseAffixChoices(craft, draft.type, index).find((choice) => choice.template === affix.template)?.tier || ""
      : "",
  );
  const baseEntry =
    craft.mode === "rare"
      ? rareBases.find((entry) => entry.id === draft.baseId)
      : craft.mode === "vorax"
        ? vorax.bases.find((entry) => entry.name === draft.type)
        : undefined;
  const slot = baseEntry?.slot || typeSlot(craft, draft.type);
  const blend = slot === "belt" ? beltBlendById(draft.beltBlendId) : null;
  if (blend) modifiers.push(blend.modifier);
  const sequence = towerSequenceById(draft.sequenceId);
  if (sequence) modifiers.push(sequence.modifier);
  const baseLabel = craft.mode === "rare" && baseEntry ? `Lv ${baseEntry.level} · ${baseEntry.name}` : draft.baseId;
  return definedFields({
    name:
      draft.name.trim() ||
      baseEntry?.name ||
      baseLabel ||
      `${craft.mode === "vorax" ? "Crafted" : "Rare"} ${draft.type}`,
    base: draft.type,
    baseId: baseEntry?.id,
    beltBlendId: blend?.id,
    towerSequenceId: sequence?.id,
    corroded: draft.corroded || undefined,
    implicitModifiers: [...(baseEntry?.modifiers || [])],
    baseAffixModifiers,
    baseAffixTierIds,
    prefixModifiers,
    suffixModifiers,
    craftAffixFamilyIds: AFFIX_SLOTS.map((index) => draft.affixes[index].familyId),
    craftAffixTierIds: AFFIX_SLOTS.map((index) => (draft.affixes[index].legendary ? "L" : draft.affixes[index].tier)),
    craftAffixLegendary: AFFIX_SLOTS.map((index) => draft.affixes[index].legendary),
    slot,
    level: baseEntry?.level || craftLevel(draft),
    itemLevel: craftLevel(draft),
    energy: equipmentEnergyAllowed(slot) ? Number(draft.energy) || 0 : 0,
    icon: baseEntry?.icon,
    source: baseEntry?.source,
    modifiers: [...(baseEntry?.modifiers || []), ...modifiers],
    affixCount: modifiers.length,
    defenses: {},
    rarity: craft.mode,
  });
}
/** The legendary the configuration shows in its preview. */
export function legendaryPreviewItem(craft: EquipmentCraft): CraftedItem | null {
  const draft = craft.legendary,
    entry = draft && legendaryById(draft.id);
  if (!draft || !entry) return null;
  const blend = beltBlendById(draft.beltBlendId),
    sequence = towerSequenceById(draft.sequenceId),
    corrosion = legendaryCorrosionText(draft);
  return {
    ...entry,
    base: draft.base,
    energy: equipmentEnergyAllowed(entry.slot) ? Number(draft.energy) || 0 : 0,
    corrodedModifierIndices: [...draft.corroded],
    modifiers: [
      ...entry.modifiers.map((_, index) => legendaryLineText(entry, draft, index)),
      ...(blend ? [blend.modifier] : []),
      ...(sequence ? [sequence.modifier] : []),
    ],
    corrosionModifiers: corrosion ? [corrosion] : [],
  };
}
/** The legendary Add to Inventory stores. */
export function craftedLegendaryItem(craft: EquipmentCraft): CraftedItem | null {
  const draft = craft.legendary,
    entry = draft && legendaryById(draft.id);
  if (!draft || !entry) return null;
  const localItem = structuredClone(entry);
  delete localItem.remoteIcon;
  const blend = beltBlendById(draft.beltBlendId),
    sequence = towerSequenceById(draft.sequenceId),
    legendaryModifiers = entry.modifiers.map((_, index) => legendaryLineText(entry, draft, index)),
    corrosion = legendaryCorrosionText(draft);
  const item: CraftedItem = {
    ...localItem,
    ...(blend ? { beltBlendId: blend.id } : {}),
    ...(sequence ? { towerSequenceId: sequence.id } : {}),
    legendaryModifiers,
    itemLevel: 100,
    energy: equipmentEnergyAllowed(entry.slot) ? Number(draft.energy) || 0 : 0,
    modifiers: [...legendaryModifiers, ...(blend ? [blend.modifier] : []), ...(sequence ? [sequence.modifier] : [])],
    corrodedModifierIndices: [...draft.corroded],
    base: draft.base || legendaryDefaultBase(entry),
    rarity: "legendary",
  };
  if (corrosion) item.corrosionModifiers = [corrosion];
  return item;
}
export { equipmentEnergyAllowed, maxEquipmentEnergy, towerSequencesForType };

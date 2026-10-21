// The equipment crafter's draft (the Gear section's Craft Rare Item, Craft Vorax Item and Craft Legendary, or Edit on a
// crafted rare or Vorax item): what each control holds, what a control's change does to the rest, and the item the draft
// crafts. Pure: the planner (src/app/gear/gear-controller.js) keeps the draft, applies each change with changeEquipmentCraft, and
// publishes the view (src/app/bridge/equipment-crafter-view.ts). Typed numbers stay text, as their fields hold them.
//
// The rules are the legacy crafter's, which kept this state in its controls (a roll snaps as a range input does), except
// that a change keeps what it does not touch: the legacy re-render also put every other roll back at its best value.
import { craftItemTypes, voraxItemTypes } from "../../data/gear/crafting-catalog-ss13.js";
import { gearGroupOfType } from "../../data/gear/gear-groups-ss13.js";
import { rareBaseItemsSs13 } from "../../data/gear/rare-base-items-ss13.generated.js";
import { baseAffixesSs13, baseAffixTiersSs13 } from "../../data/gear/base-affixes-ss13.generated.js";
import { craftAffixesSs13 } from "../../data/gear/craft-affixes-ss13.generated.js";
import { voraxCraftingSs13 } from "../../data/gear/vorax-crafting-ss13.generated.js";
import { legendaryGearSs13 } from "../../data/gear/legendary-gear-ss13.generated.js";
import { legendaryCorrodedModifiersSs13 } from "../../data/gear/legendary-corroded-modifiers-ss13.generated.js";
import { corrosionImplicitsForBase, defaultBaseForItem } from "../../data/gear/corrosion-implicits-ss13.js";
import { isLegacyRareBase } from "../../engine/gear/rare-base-lookup.js";
import { voraxBaseAffixSlotPool } from "../../engine/gear/vorax-base-affixes.js";
import { legendaryModifierSignature } from "../../engine/gear/legendary-modifier-signature.js";
import { legendaryTierTemplate } from "../../engine/gear/legendary-affix-tiers.js";
import { placeholderOption, placeholderOptionTemplate } from "../../engine/gear/legendary-placeholder-pools.js";
import { folkloreRingModifier } from "../../engine/gear/legendary-ring-options.js";
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

/** A prefix or suffix slot. `tier` is what its tier select holds ("" without one); `rolls` its roll controls. */
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
  /** The Base Item select: a rare base's id, a Vorax limb's type, or "" when the item's base is not offered. */
  baseId: string;
  energy: string;
  beltBlendId: string;
  sequenceId: string;
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
  /** The Inventory item being edited (Save Changes), or null (Add to Inventory). */
  editingId: string | null;
  editingName: string;
  /** Vorax: the limb chosen (the form shows once one is). */
  voraxBase: string;
  /** Legendary: the list's search, kept while a legendary is configured. */
  search: string;
  rare: RareDraft | null;
  legendary: LegendaryDraft | null;
  /**
   * Rare: where the item picker stands (src/data/gear/gear-groups-ss13.js: a group, then its entry's type, then a
   * base); null while the form shows. Back in the picker from the form, `rare` keeps the draft until a base is picked.
   */
  pick: CraftPick | null;
}
export interface CraftPick {
  /** The group's id; "" to pick one. */
  group: string;
  /** The entry's item type; "" to pick one. */
  type: string;
}
export type CraftPickStep = "group" | "type" | "base";
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
export const legendaryById = (id: string): LegendaryEntry | undefined => legendaries.find((entry) => entry.id === id);
export const legendaryCorrodedLine = (id: string, index: number): string | undefined => corrodedLines[id]?.[index];
export const corrosionPool = (base: string): CorrosionEntry[] => corrosionImplicitsForBase(base);

/** The Item Type select's choices: [type, slot]. A Vorax form offers only its limb. */
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
/** The Base Item select's values for the type. */
export const baseChoices = (craft: EquipmentCraft, type: string): string[] =>
  craft.mode === "rare" ? rareBasesForType(type).map((entry) => entry.id) : [type];
/** A Base Affix select's choices: the template and its tier. */
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
function voraxLegendaryAffixPool(type: string): CraftFamily[] {
  return (vorax.legendaryDonors[type] || []).flatMap((donor) =>
    donor.modifiers.map((template, modifierIndex) => ({
      id: `${donor.id}-mod-${modifierIndex}`,
      label: `[${donor.name}] ${voraxModifierLabel(template)}`,
      tiers: [{ tier: "L", level: donor.level || 1, template }],
    })),
  );
}
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
/** The tier a slot's rolls belong to: its select's tier, or a Legendary affix's only one. */
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
    editingId: null,
    editingName: "",
    voraxBase: "",
    search: "",
    rare: null,
    legendary: null,
    pick: null,
  };
  return mode === "rare" ? { ...craft, pick: { group: "", type: "" } } : craft;
}

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
/** On a new base: the energy at the base's cap and no corrosion implicit (the base's own pool). */
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
    base: defaultBaseForItem(entry),
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
  | { kind: "name" | "level" | "type" | "base" | "energy" | "beltBlend" | "sequence"; value: string }
  | { kind: "baseAffix" | "affixFamily" | "affixTier"; index: number; value: string }
  | { kind: "voraxLegendary"; index: number }
  | { kind: "voraxBase"; value: string }
  /**
   * A rare's affix list: a family checked takes the side's first free slot (refused past three, or without a tier at the
   * item level); unchecked, it leaves its slot and the ones below move up.
   */
  | { kind: "toggleAffix"; side: AffixSide; familyId: string }
  /** A rare's Priceless check: level 100, or back to the highest typed level. */
  | { kind: "priceless"; value: boolean }
  /** The rare item picker: a group, its entry's type, a base (the form shows); back to a step from the form. */
  | { kind: "pickGroup" | "pickType" | "pickBase"; value: string }
  | { kind: "repick"; step: CraftPickStep }
  | { kind: "search"; value: string }
  | { kind: "legendary"; id: string }
  | { kind: "changeLegendary" }
  | { kind: "legendaryBase" | "legendaryBeltBlend" | "legendarySequence" | "legendaryEnergy"; value: string }
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
    case "base":
    case "energy":
    case "beltBlend":
    case "sequence": {
      const field = {
        name: "name",
        base: "baseId",
        energy: "energy",
        beltBlend: "beltBlendId",
        sequence: "sequenceId",
      }[change.kind] as "name" | "baseId" | "energy" | "beltBlendId" | "sequenceId";
      return { ...draft, [field]: change.value };
    }
    case "level":
      return withLevel(
        craft,
        draft,
        craft.mode === "rare" && Number(change.value) > MAX_TYPED_LEVEL ? String(MAX_TYPED_LEVEL) : change.value,
      );
    case "priceless":
      return withLevel(craft, draft, change.value ? PRICELESS_LEVEL : String(MAX_TYPED_LEVEL));
    case "type":
      return withType(craft, draft, change.value);
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
      const offset = affixSideOffset(change.side),
        slots = draft.affixes.slice(offset, offset + 3),
        at = slots.findIndex((affix) => affix.familyId === change.familyId);
      if (at >= 0) {
        const moved = [...slots.slice(0, at), ...slots.slice(at + 1), EMPTY_AFFIX];
        return { ...draft, affixes: draft.affixes.map((affix, index) => moved[index - offset] ?? affix) };
      }
      const free = slots.findIndex((affix) => !affix.familyId);
      if (free < 0) return { notice: `An item takes up to three ${change.side}es` };
      const index = offset + free,
        family = craftAffixPool(craft.mode, draft.type, index, false).find((entry) => entry.id === change.familyId);
      if (!family) return draft;
      if (!eligibleCraftTiers(draft, family).length)
        return { notice: `${family.label.replace(/^\[[^\]]+\]\s*/, "")} needs a higher item level` };
      return changedRare(craft, draft, { kind: "affixFamily", index, value: change.familyId });
    }
    case "affixTier": {
      const affix = draft.affixes[change.index],
        tier = craftFamily(craft, draft, change.index)?.tiers.find((entry) => entry.tier === change.value);
      return {
        ...draft,
        affixes: setAffix(change.index, { ...affix, tier: change.value, rolls: preferredRolls(tier?.template || "") }),
      };
    }
    case "voraxLegendary": {
      const affix = draft.affixes[change.index];
      if (!affix.legendary && draft.affixes.filter((entry) => entry.legendary).length >= 2)
        return { notice: "A Vorax item can inherit up to two Legendary affixes" };
      return {
        ...draft,
        affixes: setAffix(change.index, { familyId: "", tier: "", rolls: [], legendary: !affix.legendary }),
      };
    }
    default:
      return draft;
  }
}
function changedLegendary(entry: LegendaryEntry, draft: LegendaryDraft, change: CraftChange): LegendaryDraft {
  switch (change.kind) {
    case "legendaryBase":
      return legendaryOnBase(entry, {
        ...draft,
        base: change.value,
        sequenceId: towerSequenceById(draft.sequenceId)?.weaponType === change.value ? draft.sequenceId : "",
      });
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
/** Back to a picker step, from the picker or from the form (its draft's type tells where it stands). */
function repicked(craft: EquipmentCraft, step: CraftPickStep): CraftPick {
  const type = craft.pick ? craft.pick.type : craft.rare?.type || "";
  const group = craft.pick ? craft.pick.group : gearGroupOfType(type)?.group.id || "";
  if (step === "group" || !group) return { group: "", type: "" };
  return { group, type: step === "base" ? type : "" };
}
/** The draft after a control's change; `notice` (and the draft unchanged) when the change is refused. */
export function changeEquipmentCraft(
  craft: EquipmentCraft,
  change: CraftChange,
): { craft: EquipmentCraft; notice?: string } {
  if (change.kind === "roll") return { craft: changedRoll(craft, change) };
  if (change.kind === "voraxBase") {
    const next = { ...craft, voraxBase: change.value };
    return { craft: { ...next, rare: newRareDraft(next) } };
  }
  if (change.kind === "pickGroup") return { craft: { ...craft, pick: { group: change.value, type: "" } } };
  if (change.kind === "pickType")
    return { craft: craft.pick ? { ...craft, pick: { ...craft.pick, type: change.value } } : craft };
  if (change.kind === "pickBase") return { craft: pickedBase(craft, change.value) };
  if (change.kind === "repick") return { craft: { ...craft, pick: repicked(craft, change.step) } };
  if (change.kind === "search") return { craft: { ...craft, search: change.value } };
  if (change.kind === "legendary") {
    const entry = legendaryById(change.id);
    return { craft: { ...craft, legendary: entry ? newLegendaryDraft(entry) : null } };
  }
  if (change.kind === "changeLegendary") return { craft: { ...craft, legendary: null } };
  if (craft.legendary) {
    const entry = legendaryById(craft.legendary.id);
    return { craft: entry ? { ...craft, legendary: changedLegendary(entry, craft.legendary, change) } : craft };
  }
  if (!craft.rare) return { craft };
  const result = changedRare(craft, craft.rare, change);
  return "notice" in result ? { craft, notice: result.notice } : { craft: { ...craft, rare: result } };
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
    base: draft.base || defaultBaseForItem(entry),
    rarity: "legendary",
  };
  if (corrosion) item.corrosionModifiers = [corrosion];
  return item;
}
export { equipmentEnergyAllowed, maxEquipmentEnergy, towerSequencesForType };

// Inventory and equipped gear as the planner shows it: rarity, icon, affix sections and the preview card.
import {
  baseAffixTiersSs13,
  canDropGearInSlot,
  craftAffixesSs13,
  craftItemTypes,
  gearGroupOfType,
  itemCardRarity,
  legendaryGearSs13,
  rareBaseById,
  rareBaseByName,
  rareBaseForItem,
  rareBaseItemsSs13,
  selenaScorchingBeamGearSs13,
  voraxCraftingSs13,
} from "../../engine/index.ts";
import { beltBlendById } from "./belt-blend-options.js";
import { displayTexts } from "../bridge/display-text.ts";
import { modifierTextView } from "../bridge/gear-item-view.ts";
import { titleCase } from "../planner/page.js";
import { currentEquipmentImpact, disabledEquipmentSlots, plannerState } from "../planner/session.js";
import { ui } from "../planner/ui-state.js";
import { tierMatchesResolved } from "./affix-rolls.js";
import { tierBadgeKey, tierMarkerClasses } from "./tier-badge.ts";
import { equipmentEnergyAllowed, maxEquipmentEnergy, towerSequenceById } from "./gear-rules.js";
import { legendaryKnownModifierSignatures, modifierSignature } from "./stored-items.js";

// The Inventory entry an equipped slot holds: its source, or an entry of the same name that fits the slot (a drag of
// the slot carries it).
export function equippedSlotInventoryItem(slot, equipped) {
  const sourceId = plannerState.equipmentOverrides?.[slot]?.sourceInventoryId;
  return (
    inventoryItems().find((entry) => entry.id === sourceId) ||
    inventoryItems().find(
      (entry) => entry.name === equipped.name && (entry.slot === slot || canDropGearInSlot(entry, slot)),
    ) ||
    null
  );
}

export function compatibleEquipmentSlot(item) {
  if (item.slot === "leftRing") {
    const equipped = currentEquipmentImpact().allItems.filter((entry) => !disabledEquipmentSlots.has(entry.slot)),
      occupied = (slot) => equipped.some((entry) => entry.slot === slot);
    if (ui.selectedEquipmentSlot === "rightRing") return "rightRing";
    if (ui.selectedEquipmentSlot === "leftRing" && !occupied("leftRing")) return "leftRing";
    if (occupied("leftRing") && !occupied("rightRing")) return "rightRing";
    if (!occupied("leftRing")) return "leftRing";
    return ui.selectedEquipmentSlot === "rightRing" ? "rightRing" : "leftRing";
  }
  if (item.slot === "mainHand") {
    if (ui.selectedEquipmentSlot === "secondaryHand") return "secondaryHand";
    if (!disabledEquipmentSlots.has("mainHand") && disabledEquipmentSlots.has("secondaryHand")) return "secondaryHand";
    return "mainHand";
  }
  return item.slot;
}
export function itemWeaponType(item) {
  return (
    rareBaseItemsSs13.find((entry) => entry.id === item?.baseId)?.type ||
    craftItemTypes.find(([type]) => type === item?.base)?.[0] ||
    item?.base ||
    ""
  );
}
export function modifiersWithoutSpecials(item) {
  const blend = beltBlendById(item?.beltBlendId),
    sequence = towerSequenceById(item?.towerSequenceId);
  let modifiers = [...(item?.modifiers || [])];
  for (const special of [
    ...(item?.beltBlendModifiers || []),
    blend?.modifier,
    sequence?.modifier,
    ...(item?.rarity === "legendary" ? item.implicitModifiers || [] : []),
  ]) {
    const index = modifiers.lastIndexOf(special);
    if (index >= 0) modifiers.splice(index, 1);
  }
  return modifiers;
}
export function applyEditedModifierStructure(item, values) {
  if (
    ![
      item.implicitModifiers,
      item.baseAffixModifiers,
      item.prefixModifiers,
      item.suffixModifiers,
      item.legendaryModifiers,
    ].some(Array.isArray)
  )
    return;
  // A legendary item's base implicit is not edited (modifiersWithoutSpecials leaves it out); it keeps its lines.
  let offset = 0;
  for (const key of [
    "implicitModifiers",
    "baseAffixModifiers",
    "prefixModifiers",
    "suffixModifiers",
    "legendaryModifiers",
  ].filter((key) => !(item.rarity === "legendary" && key === "implicitModifiers"))) {
    const count = item[key]?.length || 0;
    item[key] = values.slice(offset, offset + count);
    offset += count;
  }
}
function equippedInventorySource(item) {
  const sourceId = plannerState?.equipmentOverrides?.[item?.slot]?.sourceInventoryId;
  return sourceId ? (plannerState.equipmentInventory || []).find((entry) => entry.id === sourceId) : null;
}
export function itemDisplayRarity(item) {
  const displayItem = item?.rarity ? item : equippedInventorySource(item) || item;
  if (
    displayItem?.rarity === "vorax" ||
    /^Vorax Limb:/i.test(displayItem?.name || item?.name || "") ||
    /^Vorax(?: Gear| Limb:)/i.test(displayItem?.base || item?.base || "")
  )
    return "vorax";
  const normalized = (item?.name || "").replace(/ - Priceless$/i, "").toLowerCase();
  if (displayItem?.rarity === "legendary" || legendaryGearSs13.some((entry) => entry.name.toLowerCase() === normalized))
    return "legendary";
  const base = rareBaseForItem(item, [normalized, item?.base]);
  const implicitCount = base?.modifiers?.length || 0;
  const affixCount = Number.isInteger(item?.affixCount)
    ? item.affixCount
    : Math.max(0, (item?.modifiers?.length || 0) - implicitCount) + (item?.corrosionModifiers?.length || 0);
  return affixCount === 0 ? "common" : affixCount <= 2 ? "magic" : "epic";
}
export function hasSixCraftAffixes(item) {
  if (["legendary", "vorax"].includes(itemDisplayRarity(item))) return false;
  const displayItem = item?.prefixModifiers || item?.suffixModifiers ? item : equippedInventorySource(item) || item;
  return (
    (displayItem?.prefixModifiers?.filter(Boolean).length || 0) === 3 &&
    (displayItem?.suffixModifiers?.filter(Boolean).length || 0) === 3
  );
}
export function sixAffixClass(item) {
  return hasSixCraftAffixes(item) ? " six-affix" : "";
}
export function isPricelessItem(item) {
  const namedPriceless = /(?:^|\s)-?\s*Priceless$/i.test(item?.name || "");
  const rarity = itemDisplayRarity(item);
  const level100Crafted = Number(item?.itemLevel) === 100 && !["legendary", "vorax"].includes(rarity);
  return namedPriceless || level100Crafted;
}
export function pricelessClass(item) {
  return isPricelessItem(item) ? " priceless-item" : "";
}
export function itemLevel100Class(item) {
  return !["vorax", "legendary"].includes(itemDisplayRarity(item)) &&
    Number(item?.itemLevel ?? equippedInventorySource(item)?.itemLevel) === 100
    ? " item-level-100"
    : "";
}
export function inventoryItems() {
  const removed = new Set(plannerState.removedInventoryItemIds || []);
  return [
    ...selenaScorchingBeamGearSs13.items.map((item) => ({ ...item, id: `captured-${item.slot}`, rarity: "captured" })),
    ...(plannerState.equipmentInventory || []),
  ].filter((item) => !removed.has(item.id));
}
// Gear section commands (apps/web/src/features/gear). The item dialog and the crafter stay here.
export const inventoryItemById = (id) => inventoryItems().find((item) => item.id === id);
export function equippedSlotForInventoryItem(item) {
  const overrideSlot = Object.entries(plannerState.equipmentOverrides || {}).find(
    ([slot, override]) => override.sourceInventoryId === item?.id && !disabledEquipmentSlots.has(slot),
  )?.[0];
  if (overrideSlot) return overrideSlot;
  if (item?.id?.startsWith("captured-"))
    return (
      currentEquipmentImpact().allItems.find(
        (entry) => !disabledEquipmentSlots.has(entry.slot) && entry.name === item.name && entry.slot === item.slot,
      )?.slot || null
    );
  return null;
}
export function isItemEquipped(item) {
  const overrideSlot = equippedSlotForInventoryItem(item);
  if (overrideSlot) return true;
  if (item?.id && !item.id.startsWith("captured-")) return false;
  return currentEquipmentImpact().allItems.some(
    (entry) => !disabledEquipmentSlots.has(entry.slot) && entry.name === item.name && entry.slot === item.slot,
  );
}
const capturedGearIcons = {
  "Long Night Sorcerer's Robe - Priceless": "./src/assets/tli/gear/base-Long_Night_Sorcerers_Robe.webp",
  "Elder Sage Girdle - Priceless": "./src/assets/tli/gear/base-Elder_Sage_Girdle.webp",
  "Dark Gaze Scepter - Priceless": "./src/assets/tli/gear/base-Dark_Gaze_Scepter.webp",
  "Vorax Limb: Digits": "./src/assets/tli/gear/base-Vorax_Limb_Digits.webp",
};
export function gearIcon(item) {
  // A rare item shows its own base's icon (by base id), so a stored icon from an older lookup cannot stick.
  const ownBase = rareBaseById(item.baseId);
  if (ownBase) return ownBase.icon;
  if (item.icon) return item.icon;
  const normalizedName = (item.name || "")
    .replace(/ - Priceless$/i, "")
    .trim()
    .toLowerCase();
  const normalizedBase = (item.base || "").trim().toLowerCase();
  return (
    capturedGearIcons[item.name] ||
    (rareBaseByName(normalizedName) || rareBaseByName(normalizedBase))?.icon ||
    legendaryGearSs13.find((entry) => entry.name.toLowerCase() === normalizedName)?.icon ||
    legendaryGearSs13.find((entry) => entry.slot === compatibleEquipmentSlot(item))?.icon ||
    legendaryGearSs13[0]?.icon ||
    ""
  );
}
export function itemModifierSections(item) {
  const modifiers = item.modifiers || [],
    used = new Set(),
    entries = (values, tone = "", badges = []) =>
      (values || []).map((text, position) => {
        const index = modifiers.findIndex((value, i) => value === text && !used.has(i));
        if (index >= 0) used.add(index);
        return { text, index, tone, badge: badges[position] || "" };
      });
  const base = rareBaseForItem(item, [item.base]);
  const corrodedBase = (item.corrosionModifiers || []).length > 0,
    normalImplicit = item.implicitModifiers ?? base?.modifiers ?? [],
    implicit = corrodedBase ? [] : normalImplicit;
  if (corrodedBase) entries(normalImplicit);
  const blend = beltBlendById(item.beltBlendId),
    blendModifiers = blend ? [blend.modifier] : item.beltBlendModifiers || [],
    sequence = towerSequenceById(item.towerSequenceId);
  const baseBadges = (item.baseAffixModifiers || [])
    .map(
      (resolved, position) =>
        item.baseAffixTierIds?.[position] ||
        Object.entries(baseAffixTiersSs13[item.base] || {}).find(
          ([template]) => modifierSignature(template) === modifierSignature(resolved),
        )?.[1] ||
        "",
    )
    .map((tier) => (tier ? `T${tier}` : ""));
  const craftedEntries = (values, offset) => {
    let position = 0;
    return [0, 1, 2].flatMap((slot) => {
      const index = offset + slot,
        familyId = item.craftAffixFamilyIds?.[index];
      if (!familyId) return [];
      const text = values?.[position++];
      if (!text) return [];
      const legendary = Boolean(item.craftAffixLegendary?.[index]),
        badge = legendary ? "L" : item.craftAffixTierIds?.[index] ? `T${item.craftAffixTierIds[index]}` : "";
      return entries([text], legendary ? "legendary" : "", [badge]);
    });
  };
  const inferredBadges = (values, side) =>
    (values || []).map((resolved) => {
      for (const family of (item.rarity === "vorax"
        ? voraxCraftingSs13.affixes[item.base]
        : craftAffixesSs13[item.base])?.[side] || []) {
        const tier = family.tiers.find((candidate) => tierMatchesResolved(candidate, resolved));
        if (tier) return `T${tier.tier}`;
      }
      return "";
    });
  const prefixEntries = item.craftAffixFamilyIds?.length
    ? craftedEntries(item.prefixModifiers, 0)
    : entries(item.prefixModifiers, "", inferredBadges(item.prefixModifiers, "prefix"));
  const suffixEntries = item.craftAffixFamilyIds?.length
    ? craftedEntries(item.suffixModifiers, 3)
    : entries(item.suffixModifiers, "", inferredBadges(item.suffixModifiers, "suffix"));
  const sections = [
    {
      label: corrodedBase ? "Implicit · Corroded" : "Implicit",
      detail: base?.name || item.base || titleCase(item.slot),
      entries: [
        ...entries(implicit),
        ...(item.corrosionModifiers || []).map((text) => ({ text, index: -1, tone: "corrosion" })),
      ],
    },
    { label: "Base Affix", entries: entries(item.baseAffixModifiers, "", baseBadges) },
    { label: "Belt Blend", detail: blend?.label || "", entries: entries(blendModifiers) },
    {
      label: "TOWER Sequence",
      detail: sequence ? `${sequence.grade} · ${sequence.sequence}` : "",
      entries: entries(sequence ? [sequence.modifier] : []),
    },
    { label: "Prefix", entries: prefixEntries },
    { label: "Suffix", entries: suffixEntries },
    { label: "Legendary Mod", entries: entries(item.legendaryModifiers) },
  ];
  const legendarySource = legendaryGearSs13.find(
    (entry) => entry.name.toLowerCase() === (item.name || "").replace(/ - Priceless$/i, "").toLowerCase(),
  );
  const structuredLegendarySignatures =
    item.legendaryModifiers?.length && legendarySource ? legendaryKnownModifierSignatures(legendarySource) : new Set();
  const remainder = modifiers
    .map((text, index) => ({ text, index }))
    .filter((entry) => !used.has(entry.index) && !structuredLegendarySignatures.has(modifierSignature(entry.text)));
  if (remainder.length) {
    if (itemDisplayRarity(item) === "legendary") sections.push({ label: "Legendary Mod", entries: remainder });
    else {
      const prefixSection = sections.find((section) => section.label === "Prefix"),
        suffixSection = sections.find((section) => section.label === "Suffix");
      const prefixCount = Math.min(3, Math.ceil(remainder.length / 2));
      prefixSection.entries.push(...remainder.slice(0, prefixCount));
      suffixSection.entries.push(...remainder.slice(prefixCount));
    }
  }
  return sections.filter((section) => section.entries.length);
}
// An item's preview card as data, for the crafter and the item editor (src/app/bridge/equipment-crafter-view.ts).
// The preview's blocks, as the game's card splits them: the implicit, the base lines, then the affixes.
const BASE_LINE_KINDS = new Set(["Base Affix", "Belt Blend", "TOWER Sequence"]);
export function equipmentPreviewView(item) {
  const corroded = new Set(item.corrodedModifierIndices || []),
    group = gearGroupOfType(item.base)?.group.label,
    energy = Number(item.energy),
    energyMax = maxEquipmentEnergy(item.itemLevel ?? 100, item.slot, item.base),
    priceless = isPricelessItem(item);
  return {
    className: `equipment-preview rarity-${itemCardRarity(itemDisplayRarity(item), item)}${sixAffixClass(item)}${pricelessClass(item)}${itemLevel100Class(item)}`,
    icon: gearIcon(item),
    priceless,
    corroded: Boolean(item.corroded),
    ...displayTexts({
      // The game names a Priceless item "<name>- Priceless".
      name: priceless && !/Priceless$/i.test(item.name || "") ? `${item.name}- Priceless` : item.name,
      itemLevel: item.itemLevel ? `Lv.${item.itemLevel}` : "",
      typeLine: `${item.base || titleCase(item.slot)}${group ? `(${group})` : ""}`,
      require: `Require lv ${item.level || 1}`,
    }),
    energy:
      equipmentEnergyAllowed(item.slot) && Number.isFinite(energy)
        ? { text: `Energy ${energy}`, fill: energyMax ? Math.min(100, (energy / energyMax) * 100) : 0 }
        : null,
    // The lines in the game's order, each with where it comes from (its kind and title) and its tier's marker.
    lines: itemModifierSections(item).flatMap((section) =>
      section.entries.map((entry) => {
        const corrosion = entry.tone === "corrosion" || corroded.has(entry.index);
        const kind = section.label.replace(" · Corroded", "");
        return {
          kind,
          block: kind === "Implicit" ? "implicit" : BASE_LINE_KINDS.has(kind) ? "base" : "affix",
          title: displayTexts([section.label, section.detail, entry.badge].filter(Boolean).join(" · ")),
          marker: {
            className: tierMarkerClasses(entry.badge ? tierBadgeKey(entry.badge) : corrosion ? "corrosion" : ""),
            text: entry.badge || "",
          },
          className: `${entry.tone === "legendary" || entry.badge === "L" ? "legendary-affix " : ""}${corrosion ? "corrosion-affix" : ""}`,
          text: modifierTextView(entry.text),
        };
      }),
    ),
    source: item.source || "",
  };
}
export function definedItemFields(item) {
  return Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined));
}

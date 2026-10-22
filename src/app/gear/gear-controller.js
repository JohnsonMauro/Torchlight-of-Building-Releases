// The Gear section, the Inventory item dialog, the item editor and the equipment crafter: their state and commands.
import { equipmentSlots } from "../../data/gear/crafting-catalog-ss13.js";
import { legendaryCorrodedModifiersSs13 } from "../../data/gear/legendary-corroded-modifiers-ss13.generated.js";
import { legendaryGearSs13 } from "../../data/gear/legendary-gear-ss13.generated.js";
import { canDropGearInSlot } from "../../engine/gear/gear-drag.js";
import { itemCardRarity } from "../../engine/gear/graft-legendaries.js";
import { legendaryLineTiers, legendaryTierTemplate } from "../../engine/gear/legendary-affix-tiers.js";
import {
  placeholderOption,
  placeholderOptionForText,
  placeholderOptionTemplate,
  placeholderPool,
} from "../../engine/gear/legendary-placeholder-pools.js";
import { folkloreRingModifier, folkloreRingOptionFromModifiers } from "../../engine/gear/legendary-ring-options.js";
import { rareBaseForItem } from "../../engine/gear/rare-base-lookup.js";
import { normalizeSunsEmbraceItem } from "../../engine/state/suns-embrace-normalization.js";
import { beltBlendById, beltBlendChoices } from "./belt-blend-options.js";
import { closeDialog, openDialog } from "../bridge/dialogs.ts";
import { displayTexts } from "../bridge/display-text.ts";
import { equipmentCrafterView, rollViews } from "../bridge/equipment-crafter-view.ts";
import { gearTooltipView, modifierTextView } from "../bridge/gear-item-view.ts";
import { equipmentView } from "../bridge/equipment-view-model.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import {
  applyLegendaryEditorEdits,
  editableLegendarySlots,
  legendaryEditorModel,
  legendarySourceForItem,
  legendaryTierForText,
  rollValuesFromText,
} from "./legendary-editor-model.js";
import { gearLineCoverage } from "../planner/calculation-coverage.js";
import { curseItemOffReason, curseLineLeftOutReason } from "../planner/curse-notes.js";
import { showToast, titleCase } from "../planner/page.js";
import {
  currentEquipmentImpact,
  currentPlanner,
  disabledEquipmentSlots,
  persistPlannerState,
  plannerState,
  renderCandidateViews,
  withRenderPass,
} from "../planner/session.js";
import { ui } from "../planner/ui-state.js";
import { towerSequenceChoices } from "./tower-sequence-options.js";
import { sortedInventory } from "./inventory-sort.ts";
import {
  modifierRollRange,
  modifierRollRanges,
  modifierRollStep,
  preferredModifierRoll,
  resolveModifierRolls,
  snappedModifierRoll,
} from "./affix-rolls.js";
import {
  changeEquipmentCraft as changeEquipmentCraftDraft,
  craftedLegendaryItem,
  craftedRareItem,
  equipmentCraftFromItem,
  newCraftChoice,
  newEquipmentCraft,
} from "./equipment-craft.ts";
import {
  applyEditedModifierStructure,
  compatibleEquipmentSlot,
  definedItemFields,
  equipmentPreviewView,
  equippedSlotForInventoryItem,
  equippedSlotInventoryItem,
  gearIcon,
  hasSixCraftAffixes,
  inventoryItemById,
  inventoryItems,
  isItemEquipped,
  isPricelessItem,
  itemDisplayRarity,
  itemLevel100Class,
  itemModifierSections,
  itemWeaponType,
  modifiersWithoutSpecials,
  pricelessClass,
  sixAffixClass,
} from "./gear-items.js";
import { equipmentEnergyAllowed, towerSequenceById, towerSequencesForType } from "./gear-rules.js";

// The equipment crafter's draft (src/app/gear/equipment-craft.ts); the session counts its openings.
let equipmentCraft = newEquipmentCraft("rare");
let equipmentCrafterSession = 0;
let selectedInventoryItemId = null;
let inventoryItemEditing = false;
let editingCorrodedModifierIndices = new Set();
let editingFolkloreRingOption = "left";
let editingPlaceholderChoices = new Map();
let editingTierChoices = new Map();
let editingLegendaryTexts = new Map();
// The item editor's typed fields (src/app/bridge/inventory-item-editor-view.ts InventoryItemFields).
let inventoryItemFields = null;
export const gearCommands = {
  // Gear section (apps/web/src/features/gear).
  openEquipmentSlot,
  unequipEquipmentSlot,
  equipInventoryItem: (id) => equipInventoryItem(inventoryItemById(id)),
  toggleSelectedItemEquip,
  copySelectedItem,
  deleteSelectedItem,
  saveInventoryItemEdit,
  changeInventoryItemEditor,
  openInventoryItem: (id) => {
    const item = inventoryItemById(id);
    if (item) openInventoryItemDialog(item);
  },
  editInventoryItem: (id) => openInventoryItemEditor(inventoryItemById(id)),
  duplicateInventoryItem,
  resetEquipment,
  sortInventory,
  openEquipmentCrafter,
  changeEquipmentCraft,
  addCraftedEquipment,
  closeEquipmentCrafter: () => {
    equipmentCraft = { ...equipmentCraft, editingId: null };
  },
  dropGear,
};
export const gearQueries = {
  // An equipped slot's or an Inventory item's tooltip (apps/web/src/features/gear/GearTooltip.tsx).
  gearTooltip,
};
export const gearViewSources = {
  // The Gear section's data (src/app/bridge/equipment-view-model.ts).
  equipment: equipmentSource,
  // The Inventory item dialog.
  inventoryItem: inventoryItemSource,
  // The equipment crafter.
  equipmentCrafter: equipmentCrafterSource,
};

// An item's tooltip (src/app/bridge/gear-item-view.ts): its lines with whether the calculation uses them. An equipped
// slot's item counts in the calculation; an Inventory item counts when it is equipped.
function gearTooltip(target) {
  return withRenderPass(() => {
    const inventory = "inventoryId" in target;
    const item = inventory
      ? inventoryItemById(target.inventoryId)
      : currentEquipmentImpact().allItems.find((entry) => entry.slot === target.slot);
    if (!item || (!inventory && disabledEquipmentSlots.has(item.slot))) return null;
    const active = inventory ? isItemEquipped(item) : true;
    const { block, lowResources, blurEffects } = currentPlanner();
    return gearTooltipView({
      item,
      rarity: itemDisplayRarity(item),
      icon: gearIcon(item),
      sixAffix: hasSixCraftAffixes(item),
      priceless: isPricelessItem(item),
      itemLevel100: Boolean(itemLevel100Class(item)),
      sections: itemModifierSections(item),
      energyAllowed: equipmentEnergyAllowed(item.slot),
      inventory,
      lineStatus: (line) => gearLineCoverage(item, line, active, block, lowResources, blurEffects),
      curseReason: (line) => (active ? curseLineLeftOutReason(line, item) : ""),
    });
  });
}

// ---- Inventory item dialog commands (apps/web/src/features/gear/InventoryItemDialog.tsx).
// Equip / Unequip of the open item; the dialog closes.
function toggleSelectedItemEquip() {
  const item = inventoryItems().find((entry) => entry.id === selectedInventoryItemId);
  if (isItemEquipped(item)) {
    disabledEquipmentSlots.add(equippedSlotForInventoryItem(item) || compatibleEquipmentSlot(item));
    persistPlannerState();
    renderCandidateViews();
    showToast(`${item.name} unequipped`);
  } else equipInventoryItem(item);
  closeDialog("inventory-item-dialog");
}
function copySelectedItem() {
  if (duplicateInventoryItem(selectedInventoryItemId)) closeDialog("inventory-item-dialog");
}
function deleteSelectedItem() {
  const item = inventoryItems().find((entry) => entry.id === selectedInventoryItemId);
  if (item?.id.startsWith("captured-")) {
    plannerState.removedInventoryItemIds = [...new Set([...(plannerState.removedInventoryItemIds || []), item.id])];
    disabledEquipmentSlots.add(item.slot);
  } else
    plannerState.equipmentInventory = plannerState.equipmentInventory.filter(
      (entry) => entry.id !== selectedInventoryItemId,
    );
  for (const [slot, override] of Object.entries(plannerState.equipmentOverrides)) {
    if (override.sourceInventoryId === selectedInventoryItemId) {
      delete plannerState.equipmentOverrides[slot];
      disabledEquipmentSlots.add(slot);
    }
  }
  closeDialog("inventory-item-dialog");
  persistPlannerState();
  renderCandidateViews();
  showToast("Item deleted from Inventory");
}
// The item editor's Save Changes: reads the editor's fields, saves the item and comes back to it.
function saveInventoryItemEdit() {
  let item = plannerState.equipmentInventory.find((entry) => entry.id === selectedInventoryItemId);
  const source = inventoryItems().find((entry) => entry.id === selectedInventoryItemId);
  if (!item && source) {
    item = { ...structuredClone(source), id: `gear-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
    plannerState.equipmentInventory.push(item);
    selectedInventoryItemId = item.id;
  }
  if (item) {
    const fields = inventoryItemFields || inventoryItemFieldsFrom(source);
    item.name = fields.name.trim() || item.name;
    item.level = Number(fields.level) || item.level;
    item.energy = equipmentEnergyAllowed(item.slot) ? Number(fields.energy) || 0 : 0;
    item.base = fields.base.trim() || item.base;
    const blend = item.slot === "belt" ? beltBlendById(fields.beltBlendId) : null,
      sequence = towerSequenceById(fields.sequenceId),
      editedModifiers = fields.texts.map((text) => text.trim()).filter(Boolean);
    const legendarySource = legendaryEditorSource(item);
    if (legendarySource) {
      const texts = new Map(
        editorLegendaryLines(item, legendarySource)
          .map((line) => [line.index, line.value.trim()])
          .filter(([, text]) => text),
      );
      Object.assign(
        item,
        applyLegendaryEditorEdits(item, inventoryLegendaryModel(item, legendarySource), {
          texts,
          corrodedCatalog: editingCorrodedModifierIndices,
          specials: [
            { from: beltBlendById(item.beltBlendId)?.modifier, to: blend?.modifier },
            { from: towerSequenceById(item.towerSequenceId)?.modifier, to: sequence?.modifier },
          ],
        }),
      );
    } else applyEditedModifierStructure(item, editedModifiers);
    if (blend) item.beltBlendId = blend.id;
    else delete item.beltBlendId;
    if (sequence) item.towerSequenceId = sequence.id;
    else delete item.towerSequenceId;
    if (!legendarySource) {
      item.modifiers = [...editedModifiers, ...(item.rarity === "legendary" ? item.implicitModifiers || [] : [])];
      if (blend) item.modifiers.push(blend.modifier);
      if (sequence) item.modifiers.push(sequence.modifier);
      item.corrodedModifierIndices = [...editingCorrodedModifierIndices];
    }
    item.corrosionModifiers = fields.corrosion.split(" | ").filter(Boolean);
    const base = rareBaseForItem(item, [(item.name || "").replace(/ - Priceless$/i, ""), item.base]);
    if (!legendarySource)
      item.affixCount =
        Math.max(0, item.modifiers.length - (base?.modifiers?.length || 0)) + item.corrosionModifiers.length;
    // Its equipped copies follow (the calculation reads them), as Save Changes in the crafter does.
    for (const [slot, override] of Object.entries(plannerState.equipmentOverrides || {}))
      if (override.sourceInventoryId === item.id)
        plannerState.equipmentOverrides[slot] = {
          ...structuredClone(equippedOverride(item)),
          sourceInventoryId: item.id,
        };
    inventoryItemEditing = false;
    persistPlannerState();
    renderCandidateViews();
    renderInventoryItemDialog();
    showToast("Inventory item updated");
  }
}

// The Gear section is React (apps/web/src/features/gear): it re-reads its source.
export function renderEquipment() {
  viewSourceChanged("equipment");
}
// The Gear section's data (src/app/bridge/equipment-view-model.ts).
function equipmentSource() {
  return equipmentView({
    slots: equipmentSlots,
    items: currentEquipmentImpact().allItems,
    disabled: disabledEquipmentSlots,
    selectedSlot: ui.selectedEquipmentSlot,
    inventory: inventoryItems(),
    look: (item) => ({
      rarityClass: `rarity-${itemCardRarity(itemDisplayRarity(item), item)}${sixAffixClass(item)}${pricelessClass(item)}${itemLevel100Class(item)}`,
      icon: gearIcon(item),
    }),
    curseOffReason: curseItemOffReason,
    isEquipped: isItemEquipped,
    slotDragItem: equippedSlotInventoryItem,
  });
}
// An Inventory item as an equipped slot stores it: without the Inventory's own id, source page, slot and remote icon.
function equippedOverride(item) {
  const override = { ...item };
  for (const key of ["id", "source", "slot", "remoteIcon"]) delete override[key];
  return override;
}
function equipInventoryItem(item, targetSlot = null) {
  if (!item) return;
  const slot = targetSlot || compatibleEquipmentSlot(item);
  if (!canDropGearInSlot(item, slot)) return;
  const previousSlot = equippedSlotForInventoryItem(item);
  if (previousSlot && previousSlot !== slot) disabledEquipmentSlots.add(previousSlot);
  const id = item.id,
    override = equippedOverride(item);
  for (const [equippedSlot, equipped] of Object.entries(plannerState.equipmentOverrides || {}))
    if (equippedSlot !== slot && equipped.sourceInventoryId === id)
      delete plannerState.equipmentOverrides[equippedSlot];
  plannerState.equipmentOverrides[slot] = { ...structuredClone(override), sourceInventoryId: id };
  disabledEquipmentSlots.delete(slot);
  ui.selectedEquipmentSlot = slot;
  persistPlannerState();
  renderCandidateViews();
  showToast(`${item.name} equipped`);
}
function openInventoryItemDialog(item) {
  selectedInventoryItemId = item.id;
  inventoryItemEditing = false;
  renderInventoryItemDialog();
  openDialog("inventory-item-dialog");
}
function openEquipmentSlot(slot) {
  ui.selectedEquipmentSlot = slot;
  const equippedItem = currentEquipmentImpact().allItems.find((entry) => entry.slot === slot);
  if (!equippedItem || disabledEquipmentSlots.has(slot)) {
    renderEquipment();
    return;
  }
  const sourceId = plannerState.equipmentOverrides?.[slot]?.sourceInventoryId;
  const inventoryItem =
    inventoryItemById(sourceId) ||
    inventoryItems().find((entry) => entry.slot === slot && entry.name === equippedItem.name);
  if (inventoryItem) openInventoryItemDialog(inventoryItem);
}
function unequipEquipmentSlot(slot) {
  if (disabledEquipmentSlots.has(slot)) return false;
  disabledEquipmentSlots.add(slot);
  persistPlannerState();
  renderCandidateViews();
  showToast(`${titleCase(slot)} unequipped`);
  return true;
}
function duplicateInventoryItem(id) {
  const source = inventoryItemById(id);
  if (!source) return false;
  const copy = structuredClone(source);
  copy.id = `gear-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  copy.name = `${copy.name} Copy`;
  plannerState.equipmentInventory.push(copy);
  persistPlannerState();
  renderCandidateViews();
  showToast(`${source.name} duplicated`);
  return true;
}
// The Inventory's Sort order: the game's bag order (src/app/gear/inventory-sort.ts), kept in the saved build.
function sortInventory() {
  plannerState.equipmentInventory = sortedInventory(plannerState.equipmentInventory || []);
  persistPlannerState();
}
function resetEquipment() {
  equipmentSlots.forEach(([slot]) => disabledEquipmentSlots.add(slot));
  plannerState.equipmentOverrides = {};
  persistPlannerState();
  renderCandidateViews();
  showToast("Gear reset to empty");
}
// ---- Equipment crafter (apps/web/src/features/gear/EquipmentCrafterDialog.tsx): the planner keeps its draft
// (src/app/gear/equipment-craft.ts) and publishes the "equipmentCrafter" source; the controls are commands.
function showEquipmentCrafter(craft) {
  equipmentCraft = craft;
  equipmentCrafterSession++;
  viewSourceChanged("equipmentCrafter");
  openDialog("equipment-crafter");
}
// The Gear section's Craft: the crafter on its first step (the kind of item); a mode opens that kind's picker.
function openEquipmentCrafter(mode) {
  showEquipmentCrafter(mode ? newEquipmentCraft(mode) : newCraftChoice());
}
function equipmentCrafterSource() {
  return equipmentCrafterView(equipmentCraft, equipmentCrafterSession, equipmentPreviewView);
}
function changeEquipmentCraft(change) {
  const { craft, notice } = changeEquipmentCraftDraft(equipmentCraft, change);
  if (notice) showToast(notice);
  if (craft === equipmentCraft) return;
  equipmentCraft = craft;
  viewSourceChanged("equipmentCrafter");
}
// Add to Inventory, or Save Changes on the item being edited (its equipped copies follow).
function addCraftedEquipment() {
  let item;
  if (equipmentCraft.mode === "legendary") {
    item = craftedLegendaryItem(equipmentCraft);
    if (!item) {
      showToast("Select a legendary item first");
      return;
    }
  } else {
    item = equipmentCraft.pick ? null : craftedRareItem(equipmentCraft);
    if (!item) {
      showToast("Select an item base first");
      return;
    }
  }
  item = definedItemFields(item);
  const editingItem = equipmentCraft.editingId
    ? plannerState.equipmentInventory.find((entry) => entry.id === equipmentCraft.editingId)
    : null;
  if (editingItem) {
    const id = editingItem.id;
    Object.keys(editingItem).forEach((key) => delete editingItem[key]);
    Object.assign(editingItem, item, { id });
    for (const [slot, override] of Object.entries(plannerState.equipmentOverrides || {})) {
      if (override.sourceInventoryId === id) {
        plannerState.equipmentOverrides[slot] = {
          ...structuredClone(equippedOverride(editingItem)),
          sourceInventoryId: id,
        };
      }
    }
  } else {
    item.id = `gear-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    plannerState.equipmentInventory.push(item);
  }
  const edited = Boolean(editingItem);
  equipmentCraft = { ...equipmentCraft, editingId: null };
  persistPlannerState();
  closeDialog("equipment-crafter");
  renderCandidateViews();
  showToast(`${item.name} ${edited ? "updated" : "added to Inventory"}`);
}
// The end of a gear drag (src/app/bridge/planner-commands.js GearDrop): on another slot the item equips there; dragged
// out of a slot onto the Inventory, the slot is unequipped.
function dropGear({ itemId, fromSlot, toSlot }) {
  const item = inventoryItemById(itemId);
  if (!item) return;
  if (toSlot) {
    if (toSlot !== fromSlot) equipInventoryItem(item, toSlot);
    return;
  }
  if (!fromSlot) return;
  disabledEquipmentSlots.add(fromSlot);
  persistPlannerState();
  renderCandidateViews();
  showToast(`${item.name} unequipped`);
}
function editingLegendaryModifierTemplate(source, index) {
  const corroded = editingCorrodedModifierIndices.has(index),
    choice = placeholderOption(source.id, index, editingPlaceholderChoices.get(index));
  if (choice) return placeholderOptionTemplate(choice, corroded);
  if (source.id === "Folklore_of_Locking_Fingers" && index === 2)
    return folkloreRingModifier(editingFolkloreRingOption, corroded);
  const tierTemplate = corroded ? null : legendaryTierTemplate(source.id, index, editingTierChoices.get(index));
  if (tierTemplate) return tierTemplate;
  return corroded
    ? legendaryCorrodedModifiersSs13[source.id]?.[index] || source.modifiers[index]
    : source.modifiers[index];
}
// Legendary (and captured legendary) items edit their catalog lines only; base implicits and other non-catalog lines are
// found by text (src/app/gear/legendary-editor-model.js), stay out of the controls and are kept as they are on save.
function legendaryEditorSource(item) {
  if (!item || !["legendary", "captured"].includes(item.rarity)) return null;
  return legendarySourceForItem(item, legendaryGearSs13, legendaryCorrodedModifiersSs13);
}
function inventoryLegendaryModel(item, source = legendaryEditorSource(item)) {
  return source
    ? legendaryEditorModel(item, source, {
        corrodedLines: legendaryCorrodedModifiersSs13[source.id],
        specialTexts: [
          beltBlendById(item?.beltBlendId)?.modifier,
          towerSequenceById(item?.towerSequenceId)?.modifier,
          ...(item?.beltBlendModifiers || []),
        ].filter(Boolean),
      })
    : null;
}
function editingLegendaryLineText(source, index) {
  if (editingLegendaryTexts.has(index)) return editingLegendaryTexts.get(index);
  const template = editingLegendaryModifierTemplate(source, index),
    ranges = modifierRollRanges(template);
  return ranges.length ? resolveModifierRolls(template, ranges.map(preferredModifierRoll)) : template;
}
function inventoryEditingPreview(item) {
  const source = legendaryEditorSource(item);
  if (!source) return item;
  const model = inventoryLegendaryModel(item, source);
  return {
    ...item,
    ...applyLegendaryEditorEdits(item, model, {
      texts: new Map(
        editableLegendarySlots(model, source).map((slot) => [
          slot.catalogIndex,
          editingLegendaryLineText(source, slot.catalogIndex),
        ]),
      ),
      corrodedCatalog: editingCorrodedModifierIndices,
    }),
  };
}
// The Inventory item dialog (apps/web/src/features/gear/InventoryItemDialog.tsx) shows the "inventoryItem" source: the
// item and its actions, or, while editing, the item editor, which the planner still writes into the body React gives it
// (data-legacy-editor) once React shows the editor.
function renderInventoryItemDialog() {
  viewSourceChanged("inventoryItem");
}
function inventoryItemSource() {
  const item = inventoryItems().find((entry) => entry.id === selectedInventoryItemId);
  if (!item) return { id: "", title: "Item", editing: false, item: null, editor: null };
  return {
    id: item.id,
    title: item.name,
    editing: inventoryItemEditing,
    item: {
      ...displayTexts({ name: item.name }),
      classes: `rarity-${itemCardRarity(itemDisplayRarity(item), item)}${sixAffixClass(item)}${pricelessClass(item)}`,
      icon: gearIcon(item),
      equipped: isItemEquipped(item),
    },
    editor: inventoryItemEditing ? inventoryItemEditorView(item) : null,
  };
}
// ---- Item editor (apps/web/src/features/gear/InventoryItemEditor.tsx): Edit on a legendary or captured item. The
// fields hold what was typed; the lines' tiers, random rolls, corroded forms and texts are the editing* state above.
// The legacy editor printed values through escapeHtml, so the fields start from the item's texts as it printed them.
function inventoryItemFieldsFrom(item) {
  const sequences = towerSequencesForType(itemWeaponType(item));
  return {
    ...displayTexts({ name: item.name, base: item.base || "", corrosion: (item.corrosionModifiers || []).join(" | ") }),
    level: String(item.level || 100),
    energy: String(item.energy || 0),
    beltBlendId: beltBlendById(item.beltBlendId) ? item.beltBlendId : "",
    sequenceId: sequences.some((entry) => entry.id === item.towerSequenceId) ? item.towerSequenceId : "",
    texts: legendaryEditorSource(item) ? [] : displayTexts(modifiersWithoutSpecials(item)),
  };
}
// The editable catalog lines of a legendary (src/app/gear/legendary-editor-model.js), each with its controls.
function editorLegendaryLines(item, source) {
  return editableLegendarySlots(inventoryLegendaryModel(item, source), source).map(({ catalogIndex: index }) => {
    const corroded = editingCorrodedModifierIndices.has(index),
      template = editingLegendaryModifierTemplate(source, index),
      ranges = modifierRollRanges(template),
      resolved = editingLegendaryLineText(source, index),
      values = rollValuesFromText(template, resolved) || ranges.map(preferredModifierRoll),
      pool = placeholderPool(source.id, index),
      corrodedLine = legendaryCorrodedModifiersSs13[source.id]?.[index],
      // Its tiers also while corroded (the chips switch back), or only T1 when it has one range but a corroded form.
      tiers =
        legendaryLineTiers(source.id, index) ?? (corrodedLine ? [{ tier: 1, text: source.modifiers[index] }] : null),
      tier = tiers?.some((entry) => entry.tier === Number(editingTierChoices.get(index)))
        ? Number(editingTierChoices.get(index))
        : tiers?.[0].tier;
    return {
      index,
      corroded,
      canCorrode: Boolean(corrodedLine),
      corrodedText: corrodedLine ? displayTexts(`T0 · ${corrodedLine.replace(/(\d|\))\s+%/g, "$1%")}`) : null,
      text: modifierTextView(resolved),
      value: displayTexts(resolved),
      ring: source.id === "Folklore_of_Locking_Fingers" && index === 2 ? editingFolkloreRingOption : null,
      placeholder: pool
        ? {
            value: editingPlaceholderChoices.get(index) || "",
            options: displayTexts([
              { value: "", label: `Not chosen · ${pool.placeholder}` },
              ...pool.options.map((option) => ({ value: option.id, label: option.label })),
            ]),
          }
        : null,
      tier: tiers
        ? {
            value: String(tier),
            options: tiers.map((entry) => ({
              value: String(entry.tier),
              label: displayTexts(`T${entry.tier} · ${entry.text.replace(/(\d|\))\s+%/g, "$1%")}`),
            })),
          }
        : null,
      rolls: rollViews(template, values),
    };
  });
}
// A line of an item without a catalog legendary: a text field, with a slider when its catalog line has a range.
function editorTextLine(item, modifier, index, value) {
  const source = legendaryGearSs13.find(
      (entry) => entry.name.toLowerCase() === (item.name || "").replace(/ - Priceless$/i, "").toLowerCase(),
    ),
    range = modifierRollRange(source?.modifiers?.[index] || modifier);
  if (!range) return { kind: "text", index, value, range: null };
  const roll = Math.min(range.max, Math.max(range.min, Number(modifier.match(/-?\d+(?:\.\d+)?/)?.[0]) || range.max));
  return {
    kind: "text",
    index,
    value,
    range: { min: range.min, max: range.max, step: modifierRollStep(range), value: roll },
  };
}
function inventoryItemEditorView(item) {
  const source = legendaryEditorSource(item),
    fields = inventoryItemFields || inventoryItemFieldsFrom(item),
    sequences = towerSequencesForType(itemWeaponType(item)),
    corrosion = item.corrosionModifiers || [];
  return {
    icon: gearIcon(item),
    ...displayTexts({ name: item.name, detail: item.base || titleCase(item.slot) }),
    fields: {
      name: fields.name,
      level: fields.level,
      energy: equipmentEnergyAllowed(item.slot) ? fields.energy : null,
      base: fields.base,
      beltBlend: item.slot === "belt" ? { value: fields.beltBlendId, choices: displayTexts(beltBlendChoices()) } : null,
      sequence: sequences.length
        ? { value: fields.sequenceId, choices: displayTexts(towerSequenceChoices(sequences)) }
        : null,
      corrosion: {
        value: fields.corrosion,
        options: [
          { value: "", label: "None" },
          {
            value: displayTexts(corrosion.join(" | ")),
            label: corrosion.length ? displayTexts(corrosion.join(" · ")) : "Corroded implicit",
          },
        ],
      },
    },
    heading: item.rarity === "legendary" ? "Legendary Mods" : source ? "Legendary affixes" : "Prefixes and Suffixes",
    legendaryLines: source ? editorLegendaryLines(item, source) : [],
    textLines: source
      ? []
      : modifiersWithoutSpecials(item).map((modifier, index) =>
          editorTextLine(item, modifier, index, fields.texts[index] ?? ""),
        ),
    corrosionLines: displayTexts(corrosion),
    preview: equipmentPreviewView(inventoryEditingPreview(item)),
  };
}
// A change in the item editor (the typed fields stay through a line's change; the legacy redraw reset them).
function changeInventoryItemEditor(change) {
  const item = inventoryItems().find((entry) => entry.id === selectedInventoryItemId),
    source = legendaryEditorSource(item);
  if (!item || !inventoryItemEditing) return;
  switch (change.kind) {
    case "field":
      inventoryItemFields = { ...(inventoryItemFields || inventoryItemFieldsFrom(item)), [change.field]: change.value };
      break;
    case "text": {
      const fields = inventoryItemFields || inventoryItemFieldsFrom(item);
      inventoryItemFields = {
        ...fields,
        texts: fields.texts.map((text, index) => (index === change.index ? change.value : text)),
      };
      break;
    }
    case "corrosion":
      if (editingCorrodedModifierIndices.has(change.index)) editingCorrodedModifierIndices.delete(change.index);
      else editingCorrodedModifierIndices.add(change.index);
      editingLegendaryTexts.delete(change.index);
      break;
    case "tier":
      editingTierChoices.set(change.index, change.value);
      editingLegendaryTexts.delete(change.index);
      break;
    case "placeholder":
      if (change.value) editingPlaceholderChoices.set(change.index, change.value);
      else editingPlaceholderChoices.delete(change.index);
      editingLegendaryTexts.delete(change.index);
      break;
    case "ring":
      editingFolkloreRingOption = change.value;
      editingLegendaryTexts.set(
        2,
        folkloreRingModifier(editingFolkloreRingOption, editingCorrodedModifierIndices.has(2)),
      );
      break;
    case "roll": {
      if (!source) return;
      const template = editingLegendaryModifierTemplate(source, change.index),
        ranges = modifierRollRanges(template),
        range = ranges[change.rangeIndex];
      if (!range || !Number.isFinite(change.value)) return;
      if (!change.commit && (change.value < range.min || change.value > range.max)) return;
      const current = rollValuesFromText(template, editingLegendaryLineText(source, change.index)) || [],
        values = ranges.map((entry, rangeIndex) =>
          snappedModifierRoll(
            entry,
            rangeIndex === change.rangeIndex ? change.value : (current[rangeIndex] ?? preferredModifierRoll(entry)),
          ),
        );
      editingLegendaryTexts.set(change.index, resolveModifierRolls(template, values));
      break;
    }
    default:
      return;
  }
  viewSourceChanged("inventoryItem");
}
function openCraftedItemEditor(item) {
  closeDialog("inventory-item-dialog");
  showEquipmentCrafter(equipmentCraftFromItem(item, itemWeaponType(item)));
}
function openInventoryItemEditor(item) {
  if (!item) return;
  normalizeSunsEmbraceItem(item);
  selectedInventoryItemId = item.id;
  if (
    item.rarity !== "legendary" &&
    !legendaryEditorSource(item) &&
    plannerState.equipmentInventory.some((entry) => entry.id === item.id)
  ) {
    openCraftedItemEditor(item);
    return;
  }
  inventoryItemEditing = true;
  const legendaryModel = inventoryLegendaryModel(item);
  // The editor keys corrosion and line text by catalog index; corrodedModifierIndices are positions in item.modifiers.
  editingCorrodedModifierIndices = legendaryModel
    ? new Set(legendaryModel.slots.filter((slot) => slot.corroded).map((slot) => slot.catalogIndex))
    : new Set(item.corrodedModifierIndices || []);
  editingLegendaryTexts = new Map(
    legendaryModel
      ? legendaryModel.slots.filter((slot) => slot.position >= 0).map((slot) => [slot.catalogIndex, slot.text])
      : [],
  );
  editingFolkloreRingOption = folkloreRingOptionFromModifiers(item.legendaryModifiers || item.modifiers);
  const placeholderSource = legendaryEditorSource(item);
  editingPlaceholderChoices = new Map(
    legendaryModel && placeholderSource
      ? legendaryModel.slots
          .filter((slot) => slot.position >= 0)
          .map((slot) => [
            slot.catalogIndex,
            placeholderOptionForText(placeholderSource.id, slot.catalogIndex, slot.text, slot.corroded)?.option.id,
          ])
          .filter(([, id]) => id)
      : [],
  );
  // A tiered line keeps the tier its stored roll was rolled in (Ice Pulse "+29% Spell Damage" opens on T2); unset = the best tier.
  editingTierChoices = new Map(
    legendaryModel && placeholderSource
      ? legendaryModel.slots
          .filter((slot) => slot.position >= 0 && !slot.corroded)
          .map((slot) => [slot.catalogIndex, legendaryTierForText(placeholderSource, slot.catalogIndex, slot.text)])
          .filter(([, tier]) => tier)
      : [],
  );
  inventoryItemFields = inventoryItemFieldsFrom(item);
  renderInventoryItemDialog();
  openDialog("inventory-item-dialog");
}

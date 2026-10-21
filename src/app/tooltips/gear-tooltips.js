// The tooltip of an equipped or Inventory item.
import { neutralStatuses } from "../../engine/text/line-coverage.js";
import { gearLineCoverage } from "../calculation-coverage.js";
import {
  affixTierBadge,
  gearIcon,
  hasSixCraftAffixes,
  inventoryItems,
  isItemEquipped,
  isPricelessItem,
  itemDisplayRarity,
  itemLevel100Class,
  itemModifierSections,
  modifierTextMarkup,
} from "../gear/gear-items.js";
import { equipmentEnergyAllowed } from "../gear/gear-rules.js";
import { escapeHtml } from "../html.js";
import { curseLimitNoteHtml, curseLineLeftOutReason } from "../planner/curse-notes.js";
import { titleCase } from "../planner/page.js";
import { currentEquipmentImpact, currentPlanner, disabledEquipmentSlots } from "../planner/session.js";

export function gearTooltipContent(element) {
  const inventoryId = element.dataset.equipInventory;
  const item = inventoryId
    ? inventoryItems().find((entry) => entry.id === inventoryId)
    : currentEquipmentImpact().allItems.find((entry) => entry.slot === element.dataset.equipmentSlot);
  if (!item || (!inventoryId && disabledEquipmentSlots.has(item.slot))) return null;
  const rarity = titleCase(itemDisplayRarity(item));
  const active = inventoryId ? isItemEquipped(item) : !disabledEquipmentSlots.has(item.slot);
  const corrodedIndices = new Set(item.corrodedModifierIndices || []),
    kindCodes = {
      Implicit: "I",
      "Implicit · Corroded": "I",
      "Base Affix": "BA",
      "Belt Blend": "BL",
      "TOWER Sequence": "TS",
      Prefix: "P",
      Suffix: "S",
      "Legendary Mod": "L",
      "Corrosion Implicit": "C",
      Affix: "A",
    };
  const sections = itemModifierSections(item).map((section) => ({
    ...section,
    entries: section.entries.map((entry) => {
      const corroded = entry.tone === "corrosion" || corrodedIndices.has(entry.index),
        legendary = entry.tone === "legendary" || entry.badge === "L";
      const status = gearLineCoverage(
          item,
          entry.text,
          active,
          currentPlanner().block,
          currentPlanner().lowResources,
          currentPlanner().blurEffects,
        ),
        curseReason = active ? curseLineLeftOutReason(entry.text, item) : "";
      return {
        ...entry,
        legendary,
        status,
        curseReason,
        tone: corroded ? "corrosion" : status === "In calc" ? "calculated" : "pending",
        kind: corroded ? "C" : kindCodes[section.label] || "A",
      };
    }),
  }));
  return {
    title: item.name,
    rarity: rarity.toLowerCase(),
    sixAffix: hasSixCraftAffixes(item),
    priceless: isPricelessItem(item),
    itemLevel100: Boolean(itemLevel100Class(item)),
    html: `<div class="gear-tooltip-head"><img src="${gearIcon(item)}" alt=""><strong>${escapeHtml(item.name)}</strong><div><span>${escapeHtml(item.base || titleCase(item.slot))}</span><em class="${rarity.toLowerCase()}">${rarity}</em></div></div><div class="gear-tooltip-body">${curseLimitNoteHtml(sections.flatMap((section) => section.entries).find((row) => row.curseReason)?.curseReason)}<span class="gear-level">Require Lv ${item.level || 1}</span>${item.energy && equipmentEnergyAllowed(item.slot) ? `<span class="gear-energy">${item.energy} Equipment Energy</span>` : ""}<div class="tooltip-mod-sections">${sections.map((section) => `<section><h4>${escapeHtml(section.label)}${section.detail ? `<small>${escapeHtml(section.detail)}</small>` : ""}</h4>${section.entries.length ? `<ul>${section.entries.map((row) => `<li class="${row.legendary ? "legendary-affix " : ""}${row.tone === "corrosion" ? "corrosion-affix" : ""}">${row.badge ? affixTierBadge(row.badge) : `<i>${row.kind}</i>`}<span>${modifierTextMarkup(row.text, (line) => gearLineCoverage(item, line, active, currentPlanner().block, currentPlanner().lowResources, currentPlanner().blurEffects))}</span><b class="${row.status === "In calc" ? "calculated" : neutralStatuses.has(row.status) ? "neutral" : "pending"}"${row.curseReason ? ` title="${escapeHtml(`${row.status}: ${row.curseReason}`)}"` : ""}>${row.status}</b></li>`).join("")}</ul>` : ""}</section>`).join("") || "<p>No modifiers configured</p>"}</div></div><small>${inventoryId ? "Click to manage · Right-click to equip" : "Click to inspect · Right-click to unequip"}</small>`,
  };
}

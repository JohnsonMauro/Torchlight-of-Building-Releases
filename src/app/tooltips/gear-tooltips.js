// The tooltip of an equipped or Inventory item.
import { neutralStatuses } from "../../engine/text/line-coverage.js";
import { gearLineCoverage } from "../planner/calculation-coverage.js";
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

// The parts' classes. The frame (apps/web/src/shell/planner-tooltip-classes.ts) gives the rarity's colours as
// --tip-accent / --tip-edge, and --tip-name / --tip-line turn pink for six-affix and Priceless items.
const HEAD =
  "gear-tooltip-head grid grid-cols-[32px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1.5 border-b border-(--tip-line) bg-black/30 px-3 pt-[11px] pb-2.5";
const ICON = "row-start-1 size-8 rounded-[3px] border border-(--tip-name) bg-black/40 object-contain p-0.5";
const NAME =
  "min-w-0 font-[Arial,sans-serif] text-[0.91rem]/[1.25] font-bold text-(--tip-name) [text-shadow:0_2px_6px_#000a]";
const CHIP = "border border-[#684c31] px-1.5 py-1 text-[0.6rem]/none text-[#c7b8a9] uppercase not-italic";
const BODY = "gear-tooltip-body bg-black/40 p-4";
const STAT = "mr-[5px] mb-2.5 inline-block border border-[#634b37] px-[7px] py-1 text-[0.65rem]/none text-[#d1c3b6]";
const SECTION = "rounded-[5px] border border-white/15 bg-black/30 p-2.5";
const SECTION_TITLE = "mt-0.5 mb-2 text-[0.62rem] font-bold tracking-[0.08em] text-[#b39a82] uppercase";
const MOD = "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-[9px] text-[0.73rem]/[1.4] text-[#f2ece7]";
const KIND = "mt-px grid size-[15px] place-items-center rounded-[3px] border text-[0.55rem] not-italic";
const STATUS =
  "mt-px justify-self-end rounded-[3px] border px-[5px] py-px text-[0.52rem]/[1.2] font-bold whitespace-nowrap [&.calculated]:border-[#426b42] [&.calculated]:bg-[#15351c] [&.calculated]:text-[#70d67b] [&.neutral]:border-[#4f5a66] [&.neutral]:bg-[#20262d] [&.neutral]:text-[#aab6c3] [&.pending]:border-[#705c3c] [&.pending]:bg-[#342712] [&.pending]:text-[#d6aa63]";
const FOOT = "block border-t border-white/15 px-4 py-2.5 text-[0.62rem] text-[#a8988a]";

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
    html: `<div class="${HEAD}"><img class="${ICON}" src="${gearIcon(item)}" alt=""><strong class="${NAME}">${escapeHtml(item.name)}</strong><div class="col-start-2 flex flex-wrap gap-[5px]"><span class="${CHIP}">${escapeHtml(item.base || titleCase(item.slot))}</span><em class="${rarity.toLowerCase()} ${CHIP} border-(--tip-edge) text-(--tip-accent)">${rarity}</em></div></div><div class="${BODY}">${curseLimitNoteHtml(sections.flatMap((section) => section.entries).find((row) => row.curseReason)?.curseReason)}<span class="gear-level ${STAT}">Require Lv ${item.level || 1}</span>${item.energy && equipmentEnergyAllowed(item.slot) ? `<span class="gear-energy ${STAT} text-[#5fd6ee]">${item.energy} Equipment Energy</span>` : ""}<div class="tooltip-mod-sections mt-2.5 grid gap-[9px]">${sections.map((section) => `<section class="${SECTION}"><h4 class="${SECTION_TITLE}">${escapeHtml(section.label)}${section.detail ? `<small class="ml-1.5 font-normal tracking-normal normal-case">${escapeHtml(section.detail)}</small>` : ""}</h4>${section.entries.length ? `<ul class="grid gap-[7px]">${section.entries.map((row) => `<li class="${row.legendary ? "legendary-affix " : ""}${row.tone === "corrosion" ? "corrosion-affix " : ""}${MOD}">${row.badge ? affixTierBadge(row.badge) : `<i class="${KIND} ${row.tone === "corrosion" ? "border-[#9a58b7] text-[#e69aff]" : "border-[#796c60] text-[#ddd1c6]"}">${row.kind}</i>`}<span class="min-w-0 whitespace-pre-line">${modifierTextMarkup(row.text, (line) => gearLineCoverage(item, line, active, currentPlanner().block, currentPlanner().lowResources, currentPlanner().blurEffects))}</span><b class="${row.status === "In calc" ? "calculated" : neutralStatuses.has(row.status) ? "neutral" : "pending"} ${STATUS}"${row.curseReason ? ` title="${escapeHtml(`${row.status}: ${row.curseReason}`)}"` : ""}>${row.status}</b></li>`).join("")}</ul>` : ""}</section>`).join("") || "<p>No modifiers configured</p>"}</div></div><small class="${FOOT}">${inventoryId ? "Click to manage · Right-click to equip" : "Click to inspect · Right-click to unequip"}</small>`,
  };
}

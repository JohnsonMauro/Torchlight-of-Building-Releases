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

// The parts' classes. The frame (apps/web/src/ui/tooltip/tooltip-classes.ts) gives the rarity's colours as
// --tip-accent / --tip-edge, and --tip-name turns pink for six-affix and Priceless items.
const HEAD =
  "gear-tooltip-head grid grid-cols-[32px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1.5 border-b border-(--tip-edge) px-3 pt-3 pb-2.5";
const ICON = "row-start-1 size-8 rounded-sm border border-(--tip-edge) bg-sunken object-contain p-0.5";
const NAME = "min-w-0 font-display text-sm/tight font-bold text-(--tip-name)";
const CHIP = "rounded-sm border px-1.5 py-1 text-[10px]/none uppercase not-italic";
const BODY = "gear-tooltip-body p-4";
const STAT = "mr-1 mb-2.5 inline-block rounded-sm border border-line px-2 py-1 text-xs/none";
const SECTION = "rounded-md border border-line bg-sunken/60 p-2.5";
const SECTION_TITLE = "mt-0.5 mb-2 text-[10px] font-bold tracking-widest text-muted uppercase";
const MOD = "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 text-xs/snug text-text";
const KIND = "mt-px grid size-4 place-items-center rounded-sm border text-[10px] not-italic";
const STATUS =
  "mt-px justify-self-end rounded-sm border px-1 py-px text-[10px]/tight font-bold whitespace-nowrap [&.calculated]:border-ok/50 [&.calculated]:bg-ok/10 [&.calculated]:text-ok [&.neutral]:border-line [&.neutral]:bg-raised [&.neutral]:text-muted [&.pending]:border-warn/50 [&.pending]:bg-warn/10 [&.pending]:text-warn";
const FOOT = "block border-t border-line px-4 py-2.5 text-xs text-dim";

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
    html: `<div class="${HEAD}"><img class="${ICON}" src="${gearIcon(item)}" alt=""><strong class="${NAME}">${escapeHtml(item.name)}</strong><div class="col-start-2 flex flex-wrap gap-1"><span class="${CHIP} border-line text-muted">${escapeHtml(item.base || titleCase(item.slot))}</span><em class="${rarity.toLowerCase()} ${CHIP} border-(--tip-edge) text-(--tip-accent)">${rarity}</em></div></div><div class="${BODY}">${curseLimitNoteHtml(sections.flatMap((section) => section.entries).find((row) => row.curseReason)?.curseReason)}<span class="gear-level ${STAT} text-muted">Require Lv ${item.level || 1}</span>${item.energy && equipmentEnergyAllowed(item.slot) ? `<span class="gear-energy ${STAT} text-info">${item.energy} Equipment Energy</span>` : ""}<div class="tooltip-mod-sections mt-2.5 grid gap-2">${sections.map((section) => `<section class="${SECTION}"><h4 class="${SECTION_TITLE}">${escapeHtml(section.label)}${section.detail ? `<small class="ml-1.5 font-normal tracking-normal normal-case">${escapeHtml(section.detail)}</small>` : ""}</h4>${section.entries.length ? `<ul class="grid gap-2">${section.entries.map((row) => `<li class="${row.legendary ? "legendary-affix " : ""}${row.tone === "corrosion" ? "corrosion-affix " : ""}${MOD}">${row.badge ? affixTierBadge(row.badge) : `<i class="${KIND} ${row.tone === "corrosion" ? "border-grade-rare text-grade-rare" : "border-line-strong text-muted"}">${row.kind}</i>`}<span class="min-w-0 whitespace-pre-line">${modifierTextMarkup(row.text, (line) => gearLineCoverage(item, line, active, currentPlanner().block, currentPlanner().lowResources, currentPlanner().blurEffects))}</span><b class="${row.status === "In calc" ? "calculated" : neutralStatuses.has(row.status) ? "neutral" : "pending"} ${STATUS}"${row.curseReason ? ` title="${escapeHtml(`${row.status}: ${row.curseReason}`)}"` : ""}>${row.status}</b></li>`).join("")}</ul>` : ""}</section>`).join("") || "<p>No modifiers configured</p>"}</div></div><small class="${FOOT}">${inventoryId ? "Click to manage · Right-click to equip" : "Click to inspect · Right-click to unequip"}</small>`,
  };
}

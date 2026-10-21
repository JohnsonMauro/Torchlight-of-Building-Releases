// A slate's tooltip as the legacy tooltip's HTML. The board and the Slate Inventory show theirs with React
// (apps/web/src/features/slates/SlateTooltip.tsx, from src/app/bridge/slate-tooltip-view.ts); only a damage path source
// naming one slate still comes here (planner-tooltips.js damageSourceTooltipContent), until the Stats tooltips move.
// Delete this file then.
import { divinitySlateAffixesSs13 } from "../../data/divinity-slate-affixes-ss13.js";
import { isCopySlate } from "../../engine/talents/slate-board.js";
import {
  isActiveJudgment,
  judgmentAffectedSlateIds,
  judgmentAffixTargetPercent,
  scaleJudgmentAffix,
} from "../../engine/talents/slate-judgment.js";
import { coverageBadge, slateLineCoverage } from "../planner/calculation-coverage.js";
import { escapeHtml } from "../html.js";
import { currentPlanner, equippedSlateIds, parkedSlates, slatePlacements, slatesForBoard } from "../planner/session.js";
import { legendaryTalentSlotTypes, slateCraftedAffixGroups, slateGodFamilyClass } from "../slates/slate-catalog.js";
import { coloredSlateAffix } from "../slates/slate-shapes.js";
import { slateAffixes } from "../slates/slates-controller.js";
import { slateClasses as sc } from "./tooltip-kind-classes.js";

export function slateTooltipContent(element) {
  const id = element.dataset.slateId || element.dataset.craftedSlateInventory;
  const slate = slatesForBoard().find((item) => item.id === id);
  if (!slate) return null;
  const icon = slate.icon || slate.cellIcon || "";
  const pose = slatePlacements[id] || parkedSlates[id] || slate;
  const rotation = (((Number(pose.rotation) || 0) % 360) + 360) % 360;
  const flipX = Number(pose.flipX) === -1 ? -1 : 1,
    flipY = Number(pose.flipY) === -1 ? -1 : 1;
  const affixes = slateAffixes(slate);
  const affected = judgmentAffectedSlateIds(slatesForBoard(), slatePlacements, equippedSlateIds).has(slate.id);
  const judgmentContext = {
    linked: affected,
    ownAuthority: Boolean(isActiveJudgment(slate) && equippedSlateIds.has(slate.id) && slatePlacements[slate.id]),
  };
  const displayed = (affix) =>
    scaleJudgmentAffix(affix, slate.amplifiedPercent || 0, judgmentAffixTargetPercent(slate, affix, judgmentContext));
  const limited = new Set(
    Object.values(divinitySlateAffixesSs13)
      .flat()
      .filter((affix) => affix.maxDivinityEffect === 1)
      .map((affix) => `${affix.tree}: ${affix.name}: ${affix.effect}`),
  );
  const renderAffixRows = (entries) =>
    entries
      .filter(Boolean)
      .map((affix) => {
        const core = affix.match(/^(.+?): (Lv\.[12] Core Talent): (.+?)(?:\s+[—–]\s+|$)/);
        return `<li class="${sc.affix} ${core ? `core-slate-affix ${sc.coreAffix}` : ""} ${limited.has(affix) ? `max-one-divinity ${core ? "" : sc.limitedAffix}` : ""}">${core ? `<strong class="core-slate-badge ${sc.coreBadge}">Core Talent</strong><span class="core-slate-summary ${sc.coreSummary}">${coloredSlateAffix(`${core[1]}: ${core[3]}`)}</span><small class="core-slate-hint ${sc.coreHint}">Hold Alt for details</small><span class="core-slate-detail ${sc.coreDetail}">${coloredSlateAffix(displayed(affix))}</span>` : `<span class="block">${coloredSlateAffix(displayed(affix))}</span>`}<div class="slate-affix-badges ${sc.badges}">${limited.has(affix) ? `<strong class="max-divinity-badge ${sc.limitBadge}" title="Only one copy of this effect is active across equipped slates">Max active: 1</strong>` : ""}${coverageBadge(/^Copies?\b/i.test(affix) ? (equippedSlateIds.has(slate.id) && !!slatePlacements[slate.id] ? "In calc" : "Not equipped") : slateLineCoverage(displayed(affix), equippedSlateIds.has(slate.id) && !!slatePlacements[slate.id]))}</div></li>`;
      })
      .join("");
  const template = slate.template || slate.name;
  const craftedGroups =
    slate.affixes && !legendaryTalentSlotTypes[template] && !slate.copyRule ? slateCraftedAffixGroups(slate) : null;
  const groups = craftedGroups
    ? [
        ["Fixed Affixes", craftedGroups.fixed],
        ["Random Affixes", craftedGroups.random || craftedGroups.brand || []],
      ]
    : slate.brands
      ? [
          ["Fixed Affixes", affixes],
          ["Brand Talent Nodes", slate.brands],
        ]
      : legendaryTalentSlotTypes[template]
        ? [["Talent Affixes", affixes]]
        : slate.copyRule
          ? [["Fixed Affix", affixes.length ? affixes : [slate.copyRule]]]
          : [
              ["Fixed Affixes", affixes.slice(0, 2)],
              ["Random Affixes", affixes.slice(2)],
            ];
  const affixSections = groups
    .map(([title, entries]) => {
      const rows = renderAffixRows(entries);
      return rows
        ? `<section class="${sc.section}"><h3 class="${sc.heading}">${title}</h3><ul class="${sc.list}">${rows}</ul></section>`
        : "";
    })
    .join("");
  const copySlate = isCopySlate(slate);
  const placed = equippedSlateIds.has(slate.id) && !!slatePlacements[slate.id];
  const copied =
    copySlate && placed
      ? currentPlanner().resolvedSlates.find((item) => item.id === slate.id)?.copiedAffixSources || []
      : [];
  const copiedSection = copySlate
    ? `<section class="slate-copied-affixes ${sc.copied}"><h3 class="${sc.copiedHeading}">Copied affixes</h3>${copied.length ? `<ul class="${sc.copiedList}">${copied.map(({ source, affix }) => `<li class="${sc.copiedAffix}"><div class="copied-affix-meta ${sc.copiedMeta}"><small>${escapeHtml(source)}</small><strong class="copied-affix-badge ${sc.copiedBadge}">Copied</strong></div><span>${coloredSlateAffix(affix)}</span>${coverageBadge(slateLineCoverage(affix, placed))}</li>`).join("")}</ul>` : `<p>${placed ? "No eligible adjacent affixes to copy." : "Place on the grid to see copied affixes."}</p>`}</section>`
    : "";
  return {
    slateHtml: `<div class="slate-tooltip-head ${sc.head} ${slateGodFamilyClass(slate.god)}">${icon ? `<img src="${escapeHtml(icon)}" alt="" style="transform:scale(${flipX},${flipY}) rotate(${rotation}deg)">` : ""}<div><strong class="${sc.title}">${escapeHtml(slate.name)}</strong><small class="${sc.kicker}">DIVINITY SLATE · ${escapeHtml(slate.rarity || "magic").toUpperCase()}</small></div></div>${affected ? `<div class="slate-judgment-badge ${sc.judgment}">Judgment · Affix effect +70%</div>` : ""}<div class="slate-craft-affix-preview ${sc.preview}">${affixSections || `<p>${copySlate ? "Copy effect" : "No affixes selected."}</p>`}${copiedSection}</div>`,
  };
}

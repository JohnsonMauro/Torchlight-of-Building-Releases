// Tooltips of the talent trees: core talent slots and nodes (with an installed prism's effects).
import { tliArt } from "../../data/assets/tli-art.js";
import { modeledCoreTalents } from "../../engine/talents/core-talent-model.js";
import {
  inverseImageEffectMultiplier,
  inverseImageRoll,
  prismAreaBounds,
  prismBaseEffect,
  prismNodeAffixes,
  prismReplacesCore,
} from "../../engine/talents/prism-crafting.js";
import { talentEffectText } from "../../engine/talents/talent-rules.js";
import { dazeStatus, refineCoverage } from "../../engine/text/line-coverage.js";
import { escapeHtml } from "../html.js";
import {
  coverageBadge,
  prismAffixCoverage,
  prismAffixCoverageReason,
  talentEffectCoverage,
  talentLineCoverage,
} from "../planner/calculation-coverage.js";
import { titleCase } from "../planner/page.js";
import { currentPlanner, plannerState, talentRanks } from "../planner/session.js";
import { prismTooltipHtml } from "../talents/prism-controller.js";
import { prismIcon, prismName } from "../talents/prism-icons.js";
import { effectLabel, formatEffect, nodeTitle } from "../talents/talent-labels.js";
import { currentTalentPanel, talentDisplayNodes } from "../talents/talent-trees.js";
import { talentClasses as tc } from "./tooltip-kind-classes.js";

// A core talent slot of the open tree, or the prism that replaces its core.
export function coreTalentTooltipContent(element) {
  const panel = currentTalentPanel(),
    isPrism = element.classList.contains("prism");
  const installed = isPrism
    ? (plannerState.talents.prismInventory || []).find(
        (item) => item.id === plannerState.talents.installedPrisms?.[panel.name],
      )
    : null;
  const threshold = Number(element.dataset.coreSlot || 0);
  const selectedName = plannerState.talents.coreSelections[`${panel.name}:${threshold}`];
  const core = isPrism
    ? null
    : panel.coreTalents.find((item) => item.unlockPoints === threshold && item.name === selectedName);
  if (isPrism && !installed) return null;
  const title = isPrism ? installed.base : core?.name || `${threshold}-point Core Talent`;
  const icon = isPrism ? prismIcon(installed) : core && (tliArt.coreTalents[core.name] || core.icon);
  const description = isPrism
    ? prismBaseEffect(installed.type, installed.base, installed.legendaryAffix)
    : core?.description || "Choose a core talent to view its effects.";
  const lines = description
    .split(/\s*\|\s*|\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const label = isPrism
    ? prismReplacesCore(installed)
      ? "Prism core override"
      : "Separate prism effect"
    : `Core talent · ${threshold} points`;
  const badge = isPrism ? "Prism" : core ? "Selected" : element.classList.contains("locked") ? "Locked" : "Open";
  const footer = isPrism
    ? "Base prism effect"
    : core
      ? "Selected · Click to change"
      : element.classList.contains("locked")
        ? `Requires ${threshold} points in ${panel.name}`
        : "Click to select a core talent";
  const coreStatus =
    core?.name === "Subtle Impact" && !currentPlanner().conditions.blur
      ? currentPlanner().blurSources.some((source) => source.available)
        ? "Inactive"
        : "Missing Blur source"
      : !core && !installed
        ? "Not selected"
        : isPrism
          ? prismAffixCoverage(installed, "base")
          : core?.name === "Daze"
            ? dazeStatus(currentPlanner())
            : modeledCoreTalents.includes(core?.name)
              ? "In calc"
              : refineCoverage("Not independently modeled", lines.join("\n"));
  return {
    talentType: isPrism ? "prism-core" : "core",
    basicTalentHtml: `<div class="basic-talent-head ${tc.head}"><span class="basic-talent-icon ${tc.icon}">${icon ? `<img src="${escapeHtml(icon)}" alt="">` : "✦"}</span><div><small class="${tc.kicker}">${escapeHtml(label)}</small><strong class="${tc.title}">${escapeHtml(title)}</strong></div><b class="${tc.badge}">${escapeHtml(badge)}</b></div><div class="basic-talent-body core-talent-body ${tc.coreBody}">${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}${coverageBadge(coreStatus, isPrism ? prismAffixCoverageReason(installed, "base") : "")}${core?.name === "Subtle Impact" ? `<p>Damage over time only · Requires a Blur grant in the build and Blur enabled in Configuration. Conditional uptime is assumed.</p>` : core?.name === "Fueling" ? `<p>Nearby target assumed · Fire Resistance fixed at 0%.</p>` : core?.name === "True Flame" ? `<p>Fire hits only · Requires a modeled Ignite source and uses configured average Affliction.</p>` : ""}</div><footer class="${tc.footer}">${escapeHtml(footer)}</footer>`,
  };
}

// A talent node of the open tree, with the effects of an installed prism on it.
export function talentNodeTooltipContent(element) {
  const panel = currentTalentPanel(),
    installed = (plannerState.talents.prismInventory || []).find(
      (item) => item.id === plannerState.talents.installedPrisms?.[panel.name],
    );
  const prismCoordinate = plannerState.talents.installedPrismNodes?.[panel.name];
  if (installed && prismCoordinate === element.dataset.coordinate) return { prismHtml: prismTooltipHtml(installed) };
  const nodes = talentDisplayNodes(panel),
    node = nodes.find((item) => item.coordinate.join(",") === element.dataset.coordinate);
  if (!node) return null;
  const rank = talentRanks.get(panel.name + ":" + node.coordinate) || 0;
  const effects = node.effectsPerRank || node.effects || {};
  const type = node.type || "micro",
    max = node.maxRank || (node.effectsPerRank ? 3 : 1),
    title = node.placeholder ? `${titleCase(type)} Talent` : nodeTitle(node);
  const icon = element.querySelector(".talent-node-art")?.getAttribute("src");
  const inverseMultiplier = node.reflectedFrom ? inverseImageEffectMultiplier(installed, type) : 1;
  const effectRows = Object.entries(effects)
    .map(
      ([key, value]) =>
        `<div class="basic-talent-effect ${tc.effect}"><span class="${tc.effectLabel}">${escapeHtml(effectLabel(key))}</span><strong class="${tc.effectValue}">${escapeHtml(formatEffect(key, typeof value === "number" ? value * (node.effectsPerRank ? rank : 1) * inverseMultiplier : value))}</strong>${coverageBadge(talentEffectCoverage(key, value, rank))}</div>`,
    )
    .join("");
  let prismEffects = "";
  if (installed && prismCoordinate && element.classList.contains("prism-affected-node")) {
    if (installed.type === "inverse") {
      const roll = inverseImageRoll(
        installed,
        type === "legendary" ? "legendary" : type === "medium" ? "medium" : "micro",
      );
      prismEffects = node.reflectedFrom
        ? `<section class="basic-talent-prism ${tc.prism}"><h4 class="${tc.prismHeading}">Inverse Image <span class="${tc.prismHeadingNote}">Reflected from ${escapeHtml(node.reflectedFrom)}</span></h4><div class="talent-prism-affix ${tc.affix} ${rank > 0 ? `active ${tc.affixOn}` : `inactive ${tc.affixOff}`}"><b class="${tc.affixTier}">Fixed affix</b><p class="${tc.affixText}">${escapeHtml(titleCase(type))} Talent Effect Range: ${roll > 0 ? "+" : ""}${roll}%</p><small class="${tc.affixReason}">${rank > 0 ? "Active on this reflected talent" : "Allocate this reflected talent to activate"}</small></div></section>`
        : "";
    } else {
      const bounds = prismAreaBounds(installed, prismCoordinate);
      const activeLegendaryCount = nodes.filter(
        (candidate) =>
          candidate.type === "legendary" &&
          candidate.coordinate.join(",") !== prismCoordinate &&
          candidate.coordinate[0] >= bounds.left &&
          candidate.coordinate[0] < bounds.left + bounds.width &&
          candidate.coordinate[1] >= bounds.top &&
          candidate.coordinate[1] < bounds.top + bounds.height &&
          (talentRanks.get(`${panel.name}:${candidate.coordinate}`) || 0) > 0,
      ).length;
      const affixes = prismNodeAffixes(installed, node.type, rank, activeLegendaryCount);
      prismEffects = `<section class="basic-talent-prism ${tc.prism}"><h4 class="${tc.prismHeading}">Prism effects <span class="${tc.prismHeadingNote}">${escapeHtml(prismName(installed))}</span></h4>${affixes.length ? affixes.map((affix) => `<div class="talent-prism-affix ${tc.affix} ${affix.active ? `active ${tc.affixOn}` : `inactive ${tc.affixOff}`}"><b class="${tc.affixTier}">${affix.tier} affix</b><p class="${tc.affixText}">${escapeHtml(affix.effect)} ${coverageBadge(affix.active ? prismAffixCoverage(installed, affix.tier === "Rare" ? "rareAffix" : "legendaryAffix") : "Inactive")}</p><small class="${tc.affixReason}">${escapeHtml(affix.reason)}</small></div>`).join("") : `<p class="talent-prism-none ${tc.prismNone}">No node-specific affix applies to this talent.</p>`}</section>`;
    }
  }
  return {
    basicTalentHtml: `<div class="basic-talent-head ${tc.head}"><span class="basic-talent-icon ${tc.icon}">${icon ? `<img src="${escapeHtml(icon)}" alt="">` : "✦"}</span><div><small class="${tc.kicker}">${escapeHtml(type === "legendary" ? "Legendary Medium Talent" : `${titleCase(type)} Talent`)}</small><strong class="${tc.title}">${escapeHtml(title)}</strong></div><b class="${tc.badge}">${rank}/${max}</b></div><div class="basic-talent-body ${tc.body}">${effectRows || `<p>${escapeHtml(node.description ? talentEffectText(node.description, rank, inverseMultiplier) : "Profession-tree node")}</p>${coverageBadge(talentLineCoverage(node.description || "", rank > 0))}`}</div>${prismEffects}<footer class="${tc.footer}">${rank > 0 ? "Allocated" : element.classList.contains("locked") ? "Locked · prerequisites not met" : "Click to allocate"}</footer>`,
  };
}

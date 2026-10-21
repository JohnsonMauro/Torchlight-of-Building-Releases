// Tooltips of skills and supports on the skill board.
import { tliArt } from "../../data/assets/tli-art.js";
import { tlidbSkillCatalogSs13, tlidbSupportCatalogSs13 } from "../../data/catalogs/tlidb-ss13.js";
import {
  activationMediumSecondaryTierData,
  activationMediumSelectedLines,
  configurableSupportTierData,
  defaultConfigurableSupportConfig,
  normalizeProgressionSupportConfig,
  progressionSupportHasStars,
  progressionSupportText,
  progressionSupportTierData,
  specialSupportStarBonus,
} from "../../data/skills/special-support-tiers-ss13.js";
import { skillBoardRows } from "../../engine/skills/skill-board-slots.js";
import {
  classifySkillCoverage,
  supportClauseCoverage,
  supportLineCoverage,
} from "../../engine/skills/skill-coverage.js";
import { coverageBadge } from "../calculation-coverage.js";
import { heroTraitSupportConfig } from "../hero-memory-display.js";
import { escapeHtml } from "../html.js";
import { curseLimitNoteHtml, curseLimitState, curseSkillLeftOut } from "../planner/curse-notes.js";
import { titleCase } from "../planner/page.js";
import { currentEditedSetups, currentPlanner, plannerState } from "../planner/session.js";
import { highlightedAuraEffect, highlightedSkillEffect, skillDisplaySs13 } from "../skill-display-ss13.js";
import { activeSkillBoardTab, skillRoleLabels } from "../skills/skill-board.js";
import { highlightedSupportEffect, supportDisplaySs13 } from "../support-display-ss13.js";
import { traitGrantNoteHtml } from "../trait-keyword-markup.js";

function skillLevelLabel(skill) {
  const added = Number(skill.addedLevels) || 0;
  return `Lv.${skill.baseLevel}${added ? ` <span class="skill-level-bonus ${added < 0 ? "negative" : ""}">${added > 0 ? "+" : ""}${added}</span>` : ""}`;
}
export function skillTooltipContent(element) {
  const heroSupportId = element.dataset.heroTraitSupportId;
  const boardSetups = skillBoardRows(currentEditedSetups(), plannerState.skills.boardSlots, activeSkillBoardTab, {
    traitGrants: true,
  });
  const rowSetup = boardSetups[Number(element.dataset.selectorRow)];
  const supportSlot = Number(element.dataset.selectorSupportSlot);
  const supportName =
    element.dataset.supportTooltip ||
    (Number.isInteger(supportSlot) ? rowSetup?.supports?.filter((entry) => entry.enabled)[supportSlot]?.name : "");
  const skillName =
    element.dataset.skillTooltip ||
    element.dataset.parentSkill ||
    heroTraitSupportConfig[heroSupportId]?.skill ||
    rowSetup?.name;
  const setup =
    (element.closest("#skill-groups") ? rowSetup : null) ||
    currentEditedSetups().find((entry) => entry.name === skillName) ||
    rowSetup;
  const heroInstalled =
    heroSupportId && supportName
      ? {
          ...tlidbSupportCatalogSs13.find((entry) => entry.name === supportName),
          level: plannerState.hero.heroTraitSupportLevels?.[heroSupportId] || 20,
          specialConfig: plannerState.hero.heroTraitSupportConfigs?.[heroSupportId],
        }
      : null;
  const installed =
    heroInstalled || (supportName ? setup?.supports.find((entry) => entry.name === supportName) : setup);
  const catalog = supportName
    ? tlidbSupportCatalogSs13.find((entry) => entry.name === supportName)
    : tlidbSkillCatalogSs13.find((entry) => entry.name === skillName);
  if (!installed && !catalog) return null;
  const name = supportName || skillName,
    level = installed?.effectiveLevel || installed?.level || catalog?.level || catalog?.baseLevel || 20;
  const levelLabel = installed?.baseLevel !== undefined ? skillLevelLabel(installed) : `Lv. ${level}`;
  const tags = catalog?.tags || [supportName ? "Support" : skillRoleLabels[setup?.role] || "Skill"];
  const skillDisplay = !supportName && catalog ? skillDisplaySs13(catalog, level) : null;
  const supportDisplay = supportName && catalog ? supportDisplaySs13(catalog, level) : null;
  const facts = skillDisplay?.facts || supportDisplay?.facts || [];
  const detailEffects = installed?.displayEffects || installed?.effects || catalog?.effects || [];
  const observed =
    setup && !supportName
      ? Object.entries(setup.observed || setup.databaseLevel20 || {})
          .slice(0, 5)
          .map(([key, value]) => `${titleCase(key)}: ${Array.isArray(value) ? value.join("–") : value}`)
      : [];
  const effects = skillDisplay?.effects?.length
    ? skillDisplay.effects
    : supportDisplay?.effects?.length
      ? supportDisplay.effects
      : detailEffects.length
        ? detailEffects
        : observed;
  const icon = supportName ? catalog?.icon || tliArt.supports[name] : catalog?.icon || tliArt.skills[name];
  const specialTiers = supportName ? configurableSupportTierData(name) : null;
  const progressionTiers = supportName ? progressionSupportTierData(name) : null;
  const specialConfig =
    specialTiers || progressionTiers
      ? normalizeProgressionSupportConfig(name, installed?.specialConfig) ||
        defaultConfigurableSupportConfig(name, installed?.effects || catalog?.effects)
      : null;
  const specialTier = specialTiers?.find((entry) => entry.tier === specialConfig?.tier);
  const progressionTier = progressionTiers?.find((entry) => entry.tier === specialConfig?.tier);
  const secondaryTiers = supportName ? activationMediumSecondaryTierData(name) : null;
  const secondaryTier = secondaryTiers?.find((entry) => entry.tier === specialConfig?.secondaryTier);
  const headerMeta = Number.isFinite(specialConfig?.stars)
    ? `<small class="special-support-stars" aria-label="${specialConfig.stars} stars">${"★".repeat(specialConfig.stars)}${"☆".repeat(5 - specialConfig.stars)} <em>${specialConfig.stars}/5</em></small><small>${levelLabel}</small>`
    : `<small>${specialConfig ? `Tier ${specialConfig.tier} · ${levelLabel}` : !supportName && setup ? skillLevelLabel(setup) : levelLabel}</small>`;
  const effectReference = skillDisplay?.effectEstimate
    ? `<p class="skill-effect-reference">${escapeHtml(skillDisplay.effectEstimate)}</p>`
    : ((skillDisplay && !skillDisplay.hasLevelProgression) ||
          (supportDisplay && !supportDisplay.hasLevelProgression && !specialTier && !progressionTier)) &&
        level !== 20
      ? ""
      : "";
  const displayEffects =
    specialConfig && progressionTier
      ? [
          ...(activationMediumSelectedLines(name, specialConfig)?.map((line) => `T${line.tier} · ${line.text}`) ||
            progressionSupportText(name, specialConfig)
              .split(" | ")
              .map((line, index) => (index ? line : `Main affix · T${progressionTier.tier} · ${line}`))),
          ...(progressionSupportHasStars(name)
            ? [`Star level · +${specialSupportStarBonus(specialConfig.stars)}% additional damage`]
            : []),
        ]
      : specialConfig && specialTier
        ? [
            ...(name === "Activation Medium: Spell Burst"
              ? [
                  supportDisplay?.effects?.[0] ||
                    catalog?.effects?.[0] ||
                    "Triggers the supported skill when activating Spell Burst. Interval: 0.1s",
                ]
              : []),
            ...(secondaryTier
              ? [
                  `Activation affix · T${specialConfig.secondaryTier} · Prepares the supported skill every ${specialConfig.secondaryRoll} s`,
                ]
              : []),
            `Main affix · T${specialConfig.tier} · ${specialConfig.roll >= 0 ? "+" : ""}${specialConfig.roll}% ${specialConfig.rollKind ? `additional ${specialConfig.rollKind === "cooldown" ? "Cooldown Recovery Speed" : "Duration"} for the supported skill` : specialTier.effect}`,
            ...(Number.isFinite(specialConfig.stars)
              ? [
                  `Star bonus · ${specialConfig.stars} ★ · +${specialSupportStarBonus(specialConfig.stars)}% additional damage`,
                ]
              : []),
          ]
        : effects;
  const isAura = !supportName && (catalog?.role === "aura" || setup?.role === "aura");
  const supportCoverageArgs = {
      skillName: setup?.name || skillName,
      supportName,
      installed: Boolean(installed),
      enabled: !(setup?.enabled === false || installed?.enabled === false),
    },
    supportClauses = supportName ? supportClauseCoverage(currentPlanner(), supportCoverageArgs) : [],
    supportOverall = supportName ? classifySkillCoverage(currentPlanner(), supportCoverageArgs) : null,
    supportLineBadge = (line) => {
      const lineCoverage = supportLineCoverage(supportClauses, line, supportOverall);
      return lineCoverage
        ? ` ${coverageBadge(lineCoverage.status, lineCoverage.reason ? `${lineCoverage.status}: ${lineCoverage.reason}` : "")}`
        : "";
    },
    effectsHtml = `${effectReference}<div class="skill-tooltip-effect-list"><h4>${escapeHtml(name)}:</h4>${(displayEffects.length
      ? displayEffects
      : ["See TLIDB for complete level scaling."]
    )
      .map(
        (effect) =>
          `<p>${
            supportName
              ? String(effect)
                  .split("\n")
                  .map((line) => `${highlightedSupportEffect(line)}${supportLineBadge(line)}`)
                  .join("\n")
              : isAura
                ? highlightedAuraEffect(effect)
                : highlightedSkillEffect(effect, name)
          }</p>`,
      )
      .join("")}</div>`;
  const coverage = classifySkillCoverage(currentPlanner(), {
    skillName: supportName ? setup?.name || skillName : name,
    supportName: supportName || "",
    installed: Boolean(installed),
    enabled: !(setup?.enabled === false || installed?.enabled === false),
  });
  return {
    supportTooltip: Boolean(supportName),
    auraTooltip: isAura,
    skillHtml: `<div class="skill-tooltip-head"><img src="${icon || ""}" alt=""><div><strong>${escapeHtml(name)}</strong>${headerMeta}</div></div><div class="skill-tooltip-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}${coverageBadge(coverage.status, coverage.reason ? `${coverage.status}: ${coverage.reason}` : "")}</div>${!supportName && curseSkillLeftOut(name) ? curseLimitNoteHtml(curseLimitState()?.reason) : ""}${traitGrantNoteHtml(installed)}<div class="skill-tooltip-facts">${facts.map(([label, value]) => `<div class="${label === "Effectiveness of Added Damage" ? "skill-added-damage-stat" : ""}"><span>${escapeHtml(String(label))}</span><b>${escapeHtml(String(value))}</b></div>`).join("")}</div>${effectsHtml}${catalog?.source || setup?.source ? `<small class="skill-tooltip-source">${heroSupportId || element.dataset.carinoSupportSlot !== undefined ? "Click to edit · Right-click to remove" : "TLIDB · hover details"}</small>` : ""}`,
  };
}

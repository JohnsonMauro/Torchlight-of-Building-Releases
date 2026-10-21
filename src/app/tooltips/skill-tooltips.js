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
import { coverageBadge } from "../planner/calculation-coverage.js";
import { heroTraitSupportConfig } from "../hero/hero-memory-display.js";
import { escapeHtml } from "../html.js";
import { curseLimitNoteHtml, curseLimitState, curseSkillLeftOut } from "../planner/curse-notes.js";
import { titleCase } from "../planner/page.js";
import { currentEditedSetups, currentPlanner, plannerState } from "../planner/session.js";
import { highlightedAuraEffect, highlightedSkillEffect, skillDisplaySs13 } from "../skills/skill-display-ss13.js";
import { activeSkillBoardTab, skillRoleLabels } from "../skills/skill-board.js";
import { highlightedSupportEffect, supportDisplaySs13 } from "../skills/support-display-ss13.js";
import { traitGrantNoteHtml } from "../hero/trait-keyword-markup.js";

// The parts' classes. The frame (apps/web/src/shell/planner-tooltip-classes.ts) gives the skill, support or aura
// colours: --tip-name, --tip-line, --tip-icon, --tip-tag, --tip-tag-text, --tip-soft, --tip-heading.
const HEAD =
  "skill-tooltip-head grid grid-cols-[34px_minmax(0,1fr)] items-center gap-2 bg-black/35 px-[11px] pt-2.5 pb-[3px]";
const ICON = "size-8 rounded-[4px] border border-(--tip-icon) bg-[#101822] object-contain [&[src='']]:invisible";
const NAME = "min-w-0 font-[Arial,sans-serif] text-[0.93rem]/[1.25] font-bold text-(--tip-name)";
const LEVEL = "flex-none text-[0.69rem] font-extrabold whitespace-nowrap text-gold";
const TAGS =
  "skill-tooltip-tags flex flex-wrap items-center gap-1 border-b-2 border-(--tip-line) bg-black/40 pt-0.5 pr-2.5 pb-[9px] pl-[53px] [&>.calc-coverage]:m-0 [&>.calc-coverage]:ml-auto";
const TAG = "border border-(--tip-tag) bg-[#1a1e22]/80 px-1.5 py-0.5 text-[0.63rem] text-(--tip-tag-text) uppercase";
const EFFECTS =
  "skill-tooltip-effect-list mx-[11px] mt-1 mb-2.5 border-t border-white/20 px-px pt-[9px] [&_:is(.skill-damage-value,.support-effect-value,.aura-effect-value)]:font-extrabold [&_:is(.skill-damage-value,.support-effect-value,.aura-effect-value)]:text-[#9fec65]";
const SOURCE =
  "skill-tooltip-source block border-t border-white/20 bg-black/40 px-[11px] py-2 text-[0.62rem] tracking-[0.08em] text-[#8fa0ae] uppercase";

function skillLevelLabel(skill) {
  const added = Number(skill.addedLevels) || 0;
  return `Lv.${skill.baseLevel}${added ? ` <span class="skill-level-bonus ${added < 0 ? "negative text-[#ff777b]" : "text-[#6ee29b]"} ml-0.5 font-bold">${added > 0 ? "+" : ""}${added}</span>` : ""}`;
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
    ? `<small class="special-support-stars text-[0.69rem] tracking-[1px] text-[#ffd15c]" aria-label="${specialConfig.stars} stars">${"★".repeat(specialConfig.stars)}${"☆".repeat(5 - specialConfig.stars)} <em class="ml-1 tracking-normal text-[#bcae87] not-italic">${specialConfig.stars}/5</em></small><small class="${LEVEL}">${levelLabel}</small>`
    : `<small class="${LEVEL}">${specialConfig ? `Tier ${specialConfig.tier} · ${levelLabel}` : !supportName && setup ? skillLevelLabel(setup) : levelLabel}</small>`;
  const effectReference = skillDisplay?.effectEstimate
    ? `<p class="skill-effect-reference mx-[11px] mt-0.5 mb-[5px] text-[0.72rem] text-[#96a9b8]">${escapeHtml(skillDisplay.effectEstimate)}</p>`
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
    effectsHtml = `${effectReference}<div class="${EFFECTS}"><h4 class="mb-[5px] text-[0.78rem] font-normal text-(--tip-heading)">${escapeHtml(name)}:</h4>${(displayEffects.length
      ? displayEffects
      : ["See TLIDB for complete level scaling."]
    )
      .map(
        (effect) =>
          `<p class="mb-[7px] text-[0.76rem]/[1.42] whitespace-pre-line text-[#eef1f5]">${
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
    skillHtml: `<div class="${HEAD}"><img class="${ICON}" src="${icon || ""}" alt=""><div class="flex min-w-0 items-baseline justify-between gap-2"><strong class="${NAME}">${escapeHtml(name)}</strong>${headerMeta}</div></div><div class="${TAGS}">${tags.map((tag) => `<span class="${TAG}">${escapeHtml(tag)}</span>`).join("")}${coverageBadge(coverage.status, coverage.reason ? `${coverage.status}: ${coverage.reason}` : "")}</div>${!supportName && curseSkillLeftOut(name) ? curseLimitNoteHtml(curseLimitState()?.reason) : ""}${traitGrantNoteHtml(installed)}<div class="skill-tooltip-facts px-[11px] py-[7px]">${facts.map(([label, value]) => `<div class="${label === "Effectiveness of Added Damage" ? "skill-added-damage-stat " : ""}flex items-baseline justify-between gap-3 py-1"><span class="text-[0.74rem] text-(--tip-soft)">${escapeHtml(String(label))}</span><b class="${label === "Effectiveness of Added Damage" ? "text-gold" : "text-[#f1f4f6]"} text-right">${escapeHtml(String(value))}</b></div>`).join("")}</div>${effectsHtml}${catalog?.source || setup?.source ? `<small class="${SOURCE}">${heroSupportId || element.dataset.carinoSupportSlot !== undefined ? "Click to edit · Right-click to remove" : "TLIDB · hover details"}</small>` : ""}`,
  };
}

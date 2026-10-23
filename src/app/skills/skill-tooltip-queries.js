// The tooltips of skills and supports: the skill board's sockets and names, a hero trait's support slot and Carino's
// Special Ammo slots (src/app/bridge/skill-tooltip-view.ts). Queries only (src/app/bridge/planner-queries.js);
// apps/web/src/features/skills/SkillTooltip.tsx renders them.
import {
  classifySkillCoverage,
  skillBoardRows,
  supportClauseCoverage,
  supportLineCoverage,
  tlidbSkillCatalogSs14,
  tlidbSupportCatalogSs14,
} from "#engine";
import { coverageView } from "../bridge/gear-item-view.ts";
import { skillTooltipView } from "../bridge/skill-tooltip-view.ts";
import { heroTraitSupportConfig } from "../hero/hero-memory-display.js";
import { curseLimitState, curseSkillLeftOut } from "../planner/curse-notes.js";
import { currentEditedSetups, currentPlanner, plannerState, withRenderPass } from "../planner/session.js";
import { activeSkillBoardTab, skillRoleLabels } from "./skill-board.js";

export const skillTooltipQueries = {
  // A skill ({ skill }), on a board row ({ row, skill }), or a support ({ support } with its row, its skill, or a hero
  // trait's support slot: { heroSupportId }); `editable` for a hero panel slot.
  skillTooltip: (target) => withRenderPass(() => skillTooltip(target)),
};

const badge = (coverage) =>
  coverageView(coverage.status, coverage.reason ? `${coverage.status}: ${coverage.reason}` : "");

function skillTooltip({ row = null, skill = "", support = "", heroSupportId = "", editable = false }) {
  const rowSetup =
    row === null
      ? undefined
      : skillBoardRows(currentEditedSetups(), plannerState.skills.boardSlots, activeSkillBoardTab, {
          traitGrants: true,
        })[row];
  const skillName = skill || heroTraitSupportConfig[heroSupportId]?.skill || rowSetup?.name;
  const setup = rowSetup || currentEditedSetups().find((entry) => entry.name === skillName);
  const heroInstalled =
    heroSupportId && support
      ? {
          ...tlidbSupportCatalogSs14.find((entry) => entry.name === support),
          level: plannerState.hero.heroTraitSupportLevels?.[heroSupportId] || 20,
          specialConfig: plannerState.hero.heroTraitSupportConfigs?.[heroSupportId],
        }
      : null;
  const installed = heroInstalled || (support ? setup?.supports.find((entry) => entry.name === support) : setup);
  const catalog = support
    ? tlidbSupportCatalogSs14.find((entry) => entry.name === support)
    : tlidbSkillCatalogSs14.find((entry) => entry.name === skillName);
  if (!installed && !catalog) return null;
  const coverageArgs = {
    skillName: support ? setup?.name || skillName : skillName,
    supportName: support,
    installed: Boolean(installed),
    enabled: !(setup?.enabled === false || installed?.enabled === false),
  };
  const coverage = classifySkillCoverage(currentPlanner(), coverageArgs);
  const clauses = support ? supportClauseCoverage(currentPlanner(), coverageArgs) : [];
  return skillTooltipView({
    name: support || skillName,
    support: Boolean(support),
    catalog: catalog ?? null,
    installed: installed ?? null,
    setup: setup ?? null,
    roleLabel: skillRoleLabels[setup?.role] || "",
    coverage: badge(coverage),
    lineCoverage: (line) => {
      const lineCoverage = supportLineCoverage(clauses, line, coverage);
      return lineCoverage ? badge(lineCoverage) : null;
    },
    curseNote: !support && curseSkillLeftOut(skillName) ? curseLimitState()?.reason || "" : "",
    editable,
  });
}

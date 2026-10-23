// The Skills section: the open board tab, its rows, and the edits made on the board itself.
import {
  assignSkillBoardSlot,
  moveSkillBoardSlot,
  skillBoardRows,
  transferSupportSlot,
  userInstalledSupports,
} from "#engine";
import { skillsView } from "../bridge/skills-view-model.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { showToast } from "../planner/page.js";
import {
  currentEditedSetups,
  currentPlanner,
  disabledSupportNames,
  persistPlannerState,
  plannerState,
  renderCandidateViews,
  setupStateKey,
  supportStateKey,
} from "../planner/session.js";

export let activeSkillBoardTab = "skills";
export const skillBoardCommands = {
  // Skills section (apps/web/src/features/skills).
  setSkillBoardTab: (tab) => {
    activeSkillBoardTab = tab === "auras" ? "auras" : "skills";
    renderSkills();
  },
  removeSkill: removeBoardSkill,
  removeSupport: removeBoardSupport,
  moveSkill: moveBoardSkill,
  moveSupport: moveBoardSupport,
  resetSkills,
};
export const skillBoardViewSources = {
  // The Skills section's data (src/app/bridge/skills-view-model.ts) for the open board tab.
  skills: () => skillsView(currentPlanner(), plannerState.skills, activeSkillBoardTab),
};

export const skillRoleLabels = {
  main: "Main damage",
  empower: "Empower",
  elixir: "Elixir",
  curse: "Curse",
  aura: "Precise aura",
};

// The Skills section (apps/web/src/features/skills) re-reads its source (src/app/bridge/skills-view-model.ts).
export function renderSkills() {
  viewSourceChanged("skills");
}
export function selectorBoardSetups(traitGrants = false) {
  return skillBoardRows(currentEditedSetups(), plannerState.skills.boardSlots, activeSkillBoardTab, { traitGrants });
}
// Right-click on a skill: false when the row holds none of the user's skills (the browser menu opens instead).
function removeBoardSkill(row) {
  const board = selectorBoardSetups();
  const setup = board[row];
  if (!setup) return false;
  plannerState.skills.boardSlots = assignSkillBoardSlot(
    plannerState.skills.boardSlots,
    activeSkillBoardTab,
    board,
    row,
    "",
  );
  const setupKey = setupStateKey(setup),
    customIndex = plannerState.skills.customSetups.findIndex((item) => (item.instanceId || item.name) === setupKey);
  if (customIndex >= 0) plannerState.skills.customSetups.splice(customIndex, 1);
  else plannerState.skills.setupEnabled[setupKey] = false;
  delete plannerState.skills.customSupports[setupKey];
  delete plannerState.skills.supportOrder[setupKey];
  delete plannerState.skills.skillLevels[setupKey];
  persistPlannerState();
  renderCandidateViews();
  showToast(`${setup.name} removed`);
  return true;
}
// Right-click on a support: false when the socket holds none of the user's supports.
function removeBoardSupport(row, slot) {
  const setup = selectorBoardSetups(true)[row];
  if (!setup) return false;
  const setupKey = setupStateKey(setup),
    order = [
      ...(plannerState.skills.supportOrder[setupKey] || userInstalledSupports(setup).map((support) => support.name)),
    ];
  const name = order[slot];
  const support = setup.supports.find((item) => item.enabled && item.name === name);
  if (!support) return false;
  if (support.custom)
    plannerState.skills.customSupports[setupKey] = (plannerState.skills.customSupports[setupKey] || []).filter(
      (item) => item.name !== support.name,
    );
  else plannerState.skills.supportEnabled[supportStateKey(setupKey, support.name)] = false;
  while (order.length < 5) order.push("");
  order[slot] = "";
  plannerState.skills.supportOrder[setupKey] = order.slice(0, 5);
  persistPlannerState();
  renderCandidateViews();
  showToast(`${support.name} removed`);
  return true;
}
// A skill dropped on another row of its tab: the two swap places (or the skill moves to the empty row).
function moveBoardSkill(tab, from, to) {
  if (tab !== activeSkillBoardTab) {
    showToast("Invalid drop · skill returned to its original slot");
    return;
  }
  if (to === from) return;
  const rows = selectorBoardSetups();
  plannerState.skills.boardSlots = moveSkillBoardSlot(plannerState.skills.boardSlots, tab, rows, from, to);
  persistPlannerState();
  renderCandidateViews();
  const label = tab === "auras" ? "Auras" : "Active skills";
  showToast(rows[to] ? `${label} swapped` : `${label} moved`);
}
// A support dropped on a socket of its tab: moved, swapped with the support there, or (duplicate) copied.
function moveBoardSupport({ tab, fromRow, fromSlot, setupKey, toRow, toSlot, duplicate }) {
  if (tab !== activeSkillBoardTab) {
    showToast("Invalid drop · support returned to its slot");
    return;
  }
  const rows = selectorBoardSetups(true),
    fromSetup = rows[fromRow],
    toSetup = rows[toRow];
  if (!fromSetup || !toSetup || setupStateKey(fromSetup) !== setupKey) {
    showToast("The skill board changed during the drag");
    return;
  }
  const result = transferSupportSlot(plannerState.skills, fromSetup, fromSlot, toSetup, toSlot, { duplicate });
  if (result.error) {
    showToast(result.error);
    return;
  }
  if (result.action === "unchanged") return;
  plannerState.skills = result.skills;
  persistPlannerState();
  renderCandidateViews();
  showToast(
    `${duplicate ? "Support duplicated" : result.action === "swapped" ? "Supports swapped" : "Support moved"} to ${toSetup.name}`,
  );
}
function resetSkills() {
  for (const setup of currentEditedSetups()) plannerState.skills.setupEnabled[setupStateKey(setup)] = false;
  plannerState.skills.customSetups = [];
  plannerState.skills.customSupports = {};
  plannerState.skills.supportOrder = {};
  plannerState.skills.skillLevels = {};
  plannerState.skills.supportLevels = {};
  plannerState.skills.specialSupportConfigs = {};
  plannerState.skills.supportEnabled = {};
  plannerState.skills.setupOrder = null;
  plannerState.skills.boardSlots = { skills: [], auras: [] };
  disabledSupportNames.clear();
  persistPlannerState();
  renderCandidateViews();
  showToast("Skills reset to empty");
}

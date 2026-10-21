// Where the planner is: the open workspace view, talent tree, stats panel and selections shared by several sections.

// Where the planner is, read and changed by several sections: the workspace view, the talent tree on show and its slot,
// the slate board shown in the tree's place, the Stats view's panel, damage path and stat sheet skill, the Gear
// section's selected slot, and the hero trait whose support the skill selector edits.
export const ui = {
  activeWorkspaceView: "hero",
  activeTalentPanel: "Goddess of Deception",
  activeTalentSlot: 0,
  talentSlateMode: false,
  activeStatsPanel: "sheet",
  selectedDamagePath: "hit",
  selectedStatSheetSkill: "Scorching Beam",
  selectedEquipmentSlot: "helmet",
  activeHeroTraitSupportId: "",
};
/** The views that show one page on their own (the rest are the build's tabs, beside the character column). */
export const FOCUSED_VIEWS = new Set(["builds", "character", "configuration"]);
// The damage path tabs' keys (src/app/stats/damage-path-panel.js): a skill's hits, its ailments, a minion, the combined view.
export const DAMAGE_PATH_KEY = /^(hit|ignite|reaping|combined|hit:[\w:-]+|ailment:[\w:-]+|minion:[\w:-]+)$/;
const workspaceLocationKey = "tli-builder:workspace-location:v1";
export function readWorkspaceLocation() {
  try {
    return JSON.parse(sessionStorage.getItem(workspaceLocationKey) || "null");
  } catch {
    return null;
  }
}
export function saveWorkspaceLocation() {
  try {
    sessionStorage.setItem(
      workspaceLocationKey,
      JSON.stringify({
        view: ui.activeWorkspaceView === "talents" && ui.talentSlateMode ? "slates" : ui.activeWorkspaceView,
        panel: ui.activeTalentPanel,
        statsPanel: ui.activeStatsPanel,
        damagePath: ui.selectedDamagePath,
        statSheetSkill: ui.selectedStatSheetSkill,
        scrollY: window.scrollY,
      }),
    );
  } catch {
    // Without session storage (blocked, full) the next load starts on the default view.
  }
}

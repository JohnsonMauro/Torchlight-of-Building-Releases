// Commands the legacy planner (src/app.js) carries out for the React UI (apps/web) while it still owns the open
// build's state: anything that loads a different build, changes the library or edits the open build goes through here,
// so the planner can save the open build, recalculate and re-render its own views (React views re-read their
// src/view-sources.ts source). src/app.js provides them when it loads.

/**
 * @typedef {object} PlannerCommands
 * @property {(id: string) => void} openBuild Opens a saved build and stays on the Builds view.
 * @property {(id: string) => void} editBuild Opens a saved build in the Build view.
 * @property {() => void} newBuild Creates an empty build, opens it in the Build view.
 * @property {() => void} duplicateActiveBuild Saves the open build, then opens a copy of it.
 * @property {(details: { name: string, notes: string }) => void} saveBuildDetails Renames the open build and sets its notes.
 * @property {(id: string) => void} deleteBuild Deletes a saved build (already confirmed by the user).
 * @property {() => void} deleteAllBuilds Deletes every saved build (already confirmed by the user).
 * @property {() => void} backupBuilds Downloads every saved build as a JSON backup.
 * @property {() => void} restoreBuilds Asks for a backup file and restores the builds in it.
 * @property {(auto: boolean) => void} setBestCaseMode Config tab: Best case (automatic conditions) on, or manual.
 * @property {(id: string, on: boolean) => void} setCombatCondition Switches a combat condition (or own buffs built before
 *   the fight, `prebuiltSelfBuffs`).
 * @property {(toggle: string, on: boolean) => void} setBestCaseAssumption Switches a best-case assumption.
 * @property {() => void} resetBestCaseAssumptions Turns every best-case assumption back on.
 * @property {(group: string, index: number) => void} pinExclusiveChoice Pins an option of an exclusive choice group (the
 *   best option clears the pin).
 * @property {(auto: boolean) => void} setAimUptimeAuto Aim uptime derived from the build, or manual.
 * @property {(key: string, value: string) => void} setCombatValue Sets an Advanced number as typed (combat[key]).
 */

/** @type {PlannerCommands | null} */
let commands = null;

/** @param {PlannerCommands} implementation */
export function providePlannerCommands(implementation) {
  commands = implementation;
}

/** @returns {PlannerCommands} */
export function plannerCommands() {
  if (!commands) throw new Error("The planner has not started yet");
  return commands;
}

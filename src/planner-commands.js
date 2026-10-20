// Commands the legacy planner (src/app.js) carries out for the React UI (apps/web) while it still owns the open
// build's state: anything that loads a different build or changes the library goes through here, so the planner can
// save the open build first, reload its state and re-render its own views. src/app.js provides them when it loads.

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

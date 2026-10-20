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
 * @property {(slot: number) => void} openPactspiritSelector Opens the Pactspirit selector for pact slot 0–2.
 * @property {(slot: number) => void} removePactspirit Empties pact slot 0–2.
 * @property {(name: string, level: number) => void} setPactspiritLevel Sets a Pactspirit's level (1–6).
 * @property {(name: string, nodeIndex: number) => void} togglePactNode Kismet slot mode: allocates or refunds a node
 *   (with the nodes it needs or that need it).
 * @property {(key: string, kind: "micro" | "medium") => void} openKismetCrafter Opens the Kismet crafter for a slot.
 * @property {(key: string) => void} clearKismetSlot Removes the Kismet in a slot.
 * @property {(name: string) => void} openFateSlotSelector Opens the extra Fate slot choices of a Pactspirit.
 * @property {(name: string) => void} clearFateSlots Removes a Pactspirit's extra Fate slots (and their Kismets).
 * @property {(from: string, to: string, kind: "micro" | "medium", copy: boolean) => void} moveKismet Moves (or copies)
 *   a Kismet to another slot of the same kind, or swaps the two.
 * @property {(text: string) => void} showToast Shows a short message (plain text).
 * @property {() => void} hideTooltip Hides the planner's hover tooltip (a drag starts, a dialog opens).
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

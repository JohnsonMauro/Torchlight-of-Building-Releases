// Commands the legacy planner (src/app/app.js) carries out for the React UI (apps/web) while it still owns the open
// build's state: anything that loads a different build, changes the library or edits the open build goes through here,
// so the planner can save the open build, recalculate and re-render its own views (React views re-read their
// src/app/bridge/view-sources.ts source). src/app/app.js provides them when it loads.

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
 * @property {() => void} openFollowerSelector Opens the follower selector.
 * @property {(slot: number) => void} openFollowerSkillSelector Opens the skill picker for a follower skill slot.
 * @property {(slot: number) => void} clearFollowerSkill Empties a follower skill slot.
 * @property {(tab: "skills" | "auras") => void} setSkillBoardTab Shows the Skills or the Auras board.
 * @property {(row: number, supportSlot: number | null) => void} openSkillSelector Opens the skill selector for a row of
 *   the open board (supportSlot null), or the support selector for one of its sockets (0–4).
 * @property {(row: number) => boolean} removeSkill Takes the user's skill off a row; false when the row holds none.
 * @property {(row: number, slot: number) => boolean} removeSupport Takes the user's support out of a socket; false when
 *   the socket holds none.
 * @property {(tab: "skills" | "auras", from: number, to: number) => void} moveSkill Moves a skill to another row of its
 *   board tab, swapping with the skill there.
 * @property {(move: SupportMove) => void} moveSupport Moves (or copies) a support to another socket of the same board tab,
 *   swapping with the support there.
 * @property {() => void} resetSkills Empties both board tabs.
 */

/**
 * @typedef {object} SupportMove
 * @property {"skills" | "auras"} tab
 * @property {number} fromRow
 * @property {number} fromSlot
 * @property {string} setupKey The dragged support's setup (the move is refused if the row changed during the drag).
 * @property {number} toRow
 * @property {number} toSlot
 * @property {boolean} duplicate
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

// What the Config tab shows, read from the calculated build (coordinator design with the user, 2026-10-14). Conditions the
// build can create stay automatic (best case); only the scenario switches, the exclusive choices (src/engine/planner.js
// exclusiveConditionGroups), the best-case assumptions (src/engine/planner.js bestCaseAssumptions) and the rarely used numbers
// (Advanced) are shown. Every control writes the same combat state keys as before (src/app/bridge/planner-commands.js).
import type { PlannerResult } from "@legacy/engine/index.ts";

// Manual mode lists only the conditions this build has a source for (read from the automatic-mode probe).
const MANUAL_CONDITIONS: readonly (readonly [id: string, label: string])[] = [
  ["blur", "Blur active"],
  ["blurRecentlyEnded", "Within 3 s after Blur ends"],
  ["tideContact", "Player has Tide effect"],
  ["onTheTide", "Enemy is On the Tide"],
  ["waveAria", "Wave Aria applies"],
  ["idyll", "Idyll of the Tide applies"],
  ["fireInfiltration", "Fire Infiltration"],
  ["entangledPain", "Entangled Pain"],
  ["scorch", "Scorch curse"],
  ["affliction", "Affliction cycle"],
  ["aim", "Aim active during cycle"],
  ["nearbyElite", "Elite within 10 m"],
  ["moving", "Moving"],
  ["nearTarget", "Close to the dummy (Nearby and Proximity)"],
  ["lowLifeAssumed", "Low Life"],
  ["lowManaAssumed", "Low Mana"],
];
/** Conditions that belong to an exclusive choice group: listed when the build has that group. */
const GROUP_CONDITIONS: Readonly<Record<string, string>> = {
  moving: "Movement",
  nearTarget: "Distance",
  lowLifeAssumed: "Life",
  lowManaAssumed: "Mana",
};
/** Conditions that need a skill with enough Energy. */
const ENERGY_SKILLS: Readonly<Record<string, string>> = {
  aim: "Aim",
  entangledPain: "Entangled Pain",
  scorch: "Scorch",
};

export interface ConditionRow {
  id: string;
  label: string;
  note: string;
  checked: boolean;
  disabled: boolean;
}

/** Which manual conditions this build has a source for. `probe` is the same build calculated in automatic mode. */
export function applicableManualConditions(
  planner: PlannerResult,
  probe: PlannerResult | null,
): (readonly [string, string])[] {
  const groups = new Set((probe?.assumptions ?? []).map((item) => item.group));
  return MANUAL_CONDITIONS.filter(([id]) => {
    if (GROUP_CONDITIONS[id])
      return groups.has(GROUP_CONDITIONS[id]) || (id === "nearTarget" && planner.conditions.nearTarget === false);
    if (id === "blurRecentlyEnded") return groups.has("Blur");
    return probe?.conditions[id] === true;
  });
}

/** The manual condition switches: on or off as calculated, with why (sealed resources, a skill short of Energy). */
export function manualConditionRows(
  planner: PlannerResult,
  probe: PlannerResult | null,
  activeNames: ReadonlySet<string>,
): ConditionRow[] {
  return applicableManualConditions(planner, probe).map(([id, label]) => {
    const sealed =
      id === "lowLifeAssumed"
        ? planner.lowResources.lowLife
        : id === "lowManaAssumed"
          ? planner.lowResources.lowMana
          : false;
    const active =
      sealed ||
      (GROUP_CONDITIONS[id] && id !== "moving" && id !== "nearTarget"
        ? planner.conditions[id] === true
        : planner.conditions[id] !== false);
    const skill = ENERGY_SKILLS[id];
    const note = sealed
      ? `Sealed ${id === "lowLifeAssumed" ? "Life" : "Mana"} keeps it below 35%`
      : skill && !activeNames.has(skill)
        ? `${skill} inactive: insufficient Energy or disabled`
        : active
          ? "On"
          : "Off";
    return { id, label, note, checked: active, disabled: sealed };
  });
}

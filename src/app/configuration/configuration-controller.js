// The Config card.
import { automaticCombatConditionIds, clampCombatNumber, combatNumberLimits } from "#engine";
import { aimUptimeAfterToggle } from "./aim-controls.js";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { conditionSourceProbe, currentPlanner, persistPlannerState, plannerState } from "../planner/session.js";

// Condition ids an exclusive choice can pin (packages/engine/src/planner.js exclusiveConditionGroups).
const exclusiveChoiceConditionIds = [
  "blur",
  "blurRecentlyEnded",
  "moving",
  "nearTarget",
  "lowLifeAssumed",
  "lowManaAssumed",
];
export const configurationCommands = {
  // Config tab (apps/web/src/features/configuration): every edit is saved and the card re-reads its source.
  setBestCaseMode: (auto) => {
    if (!auto) {
      const active = currentPlanner().conditions;
      for (const id of automaticCombatConditionIds) plannerState.combat.conditions[id] = active[id] !== false;
      // Keep the Life / Mana group choices automatic mode made (packages/engine/src/planner.js exclusiveConditionGroups).
      for (const id of ["lowLifeAssumed", "lowManaAssumed"]) plannerState.combat.conditions[id] = active[id] === true;
      plannerState.combat.conditions.nearTarget = active.nearTarget !== false;
      // The Config tab's pinned choices (combat.bestCaseOverrides) become the manual switches they selected.
      plannerState.combat.conditions.blurRecentlyEnded = active.blurRecentlyEnded === true;
      plannerState.combat.bestCaseOverrides = Object.fromEntries(
        Object.entries(plannerState.combat.bestCaseOverrides || {}).filter(
          ([id]) => !exclusiveChoiceConditionIds.includes(id),
        ),
      );
    }
    // Back to automatic: drop the manual Distance choice so the Distance group compares again (a saved nearTarget applies
    // in both modes).
    else delete plannerState.combat.conditions.nearTarget;
    plannerState.combat.conditionMode = auto ? "auto" : "manual";
    persistPlannerState();
    renderConfiguration();
  },
  setCombatCondition: (id, on) => {
    // Own buffs built before the fight: stored in combat.bestCaseOverrides (packages/engine/src/combat-condition-mode.js; 2026-10-14).
    if (id === "prebuiltSelfBuffs")
      plannerState.combat.bestCaseOverrides = {
        ...(plannerState.combat.bestCaseOverrides || {}),
        prebuiltSelfBuffs: on,
      };
    else plannerState.combat.conditions[id] = on;
    persistPlannerState();
    renderConfiguration();
  },
  // Best-case assumption switches (packages/engine/src/planner.js bestCaseAssumptions): stored per build in combat.bestCaseOverrides.
  setBestCaseAssumption: (toggle, on) => {
    plannerState.combat.bestCaseOverrides = { ...(plannerState.combat.bestCaseOverrides || {}), [toggle]: on };
    persistPlannerState();
    renderConfiguration();
  },
  // "Reset to best case" turns every switch back on: the overrides are cleared, and so is a stored "off" for the same ids
  // in the conditions.
  resetBestCaseAssumptions: () => {
    for (const item of currentPlanner().bestCaseAssumptions || [])
      if (plannerState.combat.conditions[item.toggle] === false) delete plannerState.combat.conditions[item.toggle];
    plannerState.combat.bestCaseOverrides = {};
    persistPlannerState();
    renderConfiguration();
  },
  // A choice pins that option of an exclusive group (combat.bestCaseOverrides; packages/engine/src/planner.js exclusiveChoicePins);
  // picking the best-case option clears the pin.
  pinExclusiveChoice: (groupName, index) => {
    const group = (currentPlanner().assumptions || []).find((item) => item.group === groupName);
    const option = group?.compared?.[index];
    if (!option || option.label === group.chosen) return;
    const overrides = { ...(plannerState.combat.bestCaseOverrides || {}) };
    for (const key of Object.keys(option.overrides || {})) {
      delete overrides[key];
      delete plannerState.combat.conditions[key];
    }
    if (option.label !== (group.best ?? group.chosen)) Object.assign(overrides, option.overrides);
    plannerState.combat.bestCaseOverrides = overrides;
    persistPlannerState();
    renderConfiguration();
  },
  setAimUptimeAuto: (auto) => {
    plannerState.combat.aimUptimePercent = aimUptimeAfterToggle(auto, currentPlanner().aim);
    persistPlannerState();
    renderConfiguration();
  },
  // Kept within what a stored build accepts (packages/engine/src/state/state-validation.ts combatNumberLimits): a value out of range, or a
  // field the schema lacked, used to make every later save of the session throw.
  setCombatValue: (key, text) => {
    if (!Object.hasOwn(combatNumberLimits, key)) return;
    plannerState.combat[key] = clampCombatNumber(key, Number(text));
    persistPlannerState();
    renderConfiguration();
  },
};
export const configurationViewSources = {
  // The Config tab's data (src/app/bridge/view-sources.ts). Manual mode also needs the same build in automatic mode (which conditions
  // have a source); it is calculated only then.
  configuration: () => {
    const planner = currentPlanner();
    return {
      planner,
      combat: structuredClone(plannerState.combat),
      probe: plannerState.combat.conditionMode === "manual" ? conditionSourceProbe() : null,
      activeNames: planner.activation.activeNames,
    };
  },
};

// The Config card is React (apps/web/src/features/configuration): it re-reads its source.
export function renderConfiguration() {
  viewSourceChanged("configuration");
}

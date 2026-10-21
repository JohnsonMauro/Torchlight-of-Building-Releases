import { PLANNER_TOOLTIP } from "./planner-tooltip-classes";

// The planner's one tooltip: src/app/tooltips/planner-tooltips.js fills it, shows it ("visible") and places it.
export function PlannerTooltip() {
  return (
    <div id="planner-tooltip" className={PLANNER_TOOLTIP} role="tooltip" aria-hidden="true">
      <strong />
      <span />
      <small>Click to edit</small>
    </div>
  );
}

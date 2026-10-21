import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { NOTICE_BUTTON_CLASS, NOTICE_CLASS } from "@legacy/app/notice-classes.js";
import { useViewSource } from "../../ui/use-view-source";

/** Over the Builds view in safe mode (the planner opens there and calculates nothing until resumed). */
export function SafeModeNotice() {
  const paused = useViewSource("pageNotices")?.calculationsPaused;
  if (!paused) return null;
  return (
    <div className={NOTICE_CLASS} role="status">
      <strong>Safe mode: calculations paused</strong>
      <button className={NOTICE_BUTTON_CLASS} type="button" onClick={() => plannerCommands().resumeCalculations()}>
        Resume calculations
      </button>
    </div>
  );
}

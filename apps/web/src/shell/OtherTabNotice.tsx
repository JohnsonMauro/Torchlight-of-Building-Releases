import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { STICKY_TOAST_BUTTON_CLASS, STICKY_TOAST_CLASS } from "@legacy/app/notice-classes.js";
import { useViewSource } from "../ui/use-view-source";

// Another tab saved a different version of the open build (the "otherTabNotice" source): the toast's look, but it stays
// until the user reloads that version or dismisses it.
export function OtherTabNotice() {
  const shown = useViewSource("otherTabNotice");
  if (!shown) return null;
  return (
    <div className={STICKY_TOAST_CLASS} role="status" aria-live="polite">
      <span>{"This build was changed in another tab · "}</span>
      <button
        type="button"
        className={STICKY_TOAST_BUTTON_CLASS}
        onClick={() => plannerCommands().reloadOtherTabBuild()}
      >
        Reload it
      </button>
      <button
        type="button"
        className="ml-1.5 cursor-pointer text-lg/none"
        aria-label="Dismiss"
        onClick={() => plannerCommands().dismissOtherTabChange()}
      >
        ×
      </button>
    </div>
  );
}

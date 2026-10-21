// "Reset this build?" (the header's Reset Build): Keep Build, focused, closes it; Reset Build empties the open build
// (the resetBuild command).
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import {
  dangerDialogButtonClass,
  plainDialogActionsClass,
  plainDialogButtonClass,
  plainDialogClass,
  plainDialogTextClass,
  plainDialogTitleClass,
} from "../../ui/dialog-classes";
import { closeDialog, registerDialog } from "../../ui/dialog-registry";
import { setAutofocusAttribute } from "../autofocus";

const ID = "reset-build-confirm";

export function ResetBuildConfirmDialog() {
  return (
    <dialog
      id={ID}
      ref={registerDialog}
      className={`${plainDialogClass} w-107.5`}
      aria-labelledby="reset-build-confirm-title"
      aria-describedby="reset-build-confirm-message"
    >
      <h2 id="reset-build-confirm-title" className={plainDialogTitleClass}>
        Reset this build?
      </h2>
      <p id="reset-build-confirm-message" className={plainDialogTextClass}>
        This will clear the current build’s hero, skills, talents, gear, and other selections. Other saved builds will
        remain available.
      </p>
      <div className={plainDialogActionsClass}>
        <button
          type="button"
          ref={setAutofocusAttribute}
          className={plainDialogButtonClass}
          onClick={() => closeDialog(ID)}
        >
          Keep Build
        </button>
        <button
          type="button"
          data-confirm-reset-build=""
          className={dangerDialogButtonClass}
          onClick={() => {
            closeDialog(ID);
            plannerCommands().resetBuild();
          }}
        >
          Reset Build
        </button>
      </div>
    </dialog>
  );
}

// "Reset this build?" (the header's Reset Build): Keep Build, focused, closes it; Reset Build empties the open build
// (the resetBuild command). The CSS styles the confirm button by data-confirm-reset-build, so it stays.
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { closeDialog, registerDialog } from "../../ui/dialog-registry";
import { setAutofocusAttribute } from "../autofocus";

const ID = "reset-build-confirm";

export function ResetBuildConfirmDialog() {
  return (
    <dialog
      id={ID}
      ref={registerDialog}
      className="reset-build-confirm"
      aria-labelledby="reset-build-confirm-title"
      aria-describedby="reset-build-confirm-message"
    >
      <h2 id="reset-build-confirm-title">Reset this build?</h2>
      <p id="reset-build-confirm-message">
        This will clear the current build’s hero, skills, talents, gear, and other selections. Other saved builds will
        remain available.
      </p>
      <div>
        <button type="button" ref={setAutofocusAttribute} onClick={() => closeDialog(ID)}>
          Keep Build
        </button>
        <button
          type="button"
          data-confirm-reset-build=""
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

import { setAutofocusAttribute } from "../autofocus";

export function ResetBuildConfirmDialog() {
  return (
    <dialog
      id="reset-build-confirm"
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
        <button type="button" data-cancel-reset-build="" ref={setAutofocusAttribute}>
          Keep Build
        </button>
        <button type="button" data-confirm-reset-build="">
          Reset Build
        </button>
      </div>
    </dialog>
  );
}

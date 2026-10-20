import { setAutofocusAttribute } from "../autofocus";

export function DeleteAllBuildsConfirmDialog() {
  return (
    <dialog
      id="delete-all-builds-confirm"
      className="reset-build-confirm"
      aria-labelledby="delete-all-builds-title"
      aria-describedby="delete-all-builds-message"
    >
      <h2 id="delete-all-builds-title">Delete all builds?</h2>
      <p id="delete-all-builds-message">
        This will permanently delete every saved build and its autosaves from this browser. This cannot be undone.
      </p>
      <div>
        <button type="button" data-cancel-delete-all-builds="" ref={setAutofocusAttribute}>
          Keep Builds
        </button>
        <button type="button" data-confirm-delete-all-builds="">
          Delete All Builds
        </button>
      </div>
    </dialog>
  );
}

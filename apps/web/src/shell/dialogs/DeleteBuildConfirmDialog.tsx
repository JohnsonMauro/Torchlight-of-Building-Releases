import { setAutofocusAttribute } from "../autofocus";

export function DeleteBuildConfirmDialog() {
  return (
    <dialog
      id="delete-build-confirm"
      className="reset-build-confirm"
      aria-labelledby="delete-build-title"
      aria-describedby="delete-build-message"
    >
      <h2 id="delete-build-title">Delete this build?</h2>
      <p id="delete-build-message" />
      <div>
        <button type="button" data-cancel-delete-build="" ref={setAutofocusAttribute}>
          Keep Build
        </button>
        <button type="button" data-confirm-delete-build="">
          Delete Build
        </button>
      </div>
    </dialog>
  );
}

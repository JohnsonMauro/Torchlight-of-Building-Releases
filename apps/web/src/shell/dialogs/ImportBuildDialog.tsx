export function ImportBuildDialog() {
  return (
    <dialog
      id="import-build-dialog"
      className="reset-build-confirm import-build-dialog"
      aria-labelledby="import-build-title"
    >
      <h2 id="import-build-title">Import build</h2>
      <label>
        Paste a build code
        <textarea id="import-build-code" rows={4} placeholder="Paste a Torchlight of Building build code" />
      </label>
      <div>
        <button type="button" data-cancel-import-build="">
          Cancel
        </button>
        <button type="button" data-import-build-code="">
          Import Code
        </button>
      </div>
    </dialog>
  );
}

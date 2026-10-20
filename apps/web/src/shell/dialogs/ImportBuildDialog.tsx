// "Import build" (the header's Import): a pasted build code becomes a new library build (the importBuild command, which
// closes the dialog on success and says when it cannot read the code). The text stays for the next opening.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { closeDialog, registerDialog } from "../../ui/dialog-registry";

const ID = "import-build-dialog";

export function ImportBuildDialog() {
  const code = useRef<HTMLTextAreaElement>(null);
  return (
    <dialog
      id={ID}
      ref={registerDialog}
      className="reset-build-confirm import-build-dialog"
      aria-labelledby="import-build-title"
    >
      <h2 id="import-build-title">Import build</h2>
      <label>
        Paste a build code
        <textarea id="import-build-code" ref={code} rows={4} placeholder="Paste a Torchlight of Building build code" />
      </label>
      <div>
        <button type="button" onClick={() => closeDialog(ID)}>
          Cancel
        </button>
        <button type="button" onClick={() => plannerCommands().importBuild(code.current?.value ?? "")}>
          Import Code
        </button>
      </div>
    </dialog>
  );
}

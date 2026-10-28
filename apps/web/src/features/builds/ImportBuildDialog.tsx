// "Import build" (the header's Import): a pasted build code becomes a new library build (the importBuild command, which
// closes the dialog on success and says when it cannot read the code). The field starts empty each time; under it, the
// last codes imported here (import-history.ts), newest first, each with its time and a button that puts it back.
import { useRef, useState } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import {
  fieldControlClass,
  fieldHelpClass,
  fieldLabelClass,
  plainDialogActionsClass,
  plainDialogButtonClass,
  primaryDialogButtonClass,
  plainDialogClass,
  plainDialogTitleClass,
} from "../../ui/dialog-classes";
import { closeDialog, registerDialog } from "../../ui/dialog-registry";
import { importTime, loadImportHistory, rememberImport, type ImportedCode } from "./import-history";

const ID = "import-build-dialog";
const RECENT_ROW = "flex min-w-0 items-center gap-3 rounded-sm border border-line bg-sunken px-3 py-2";
/** The part of a code a recent import shows before "…". */
const CODE_PREVIEW = 48;

export function ImportBuildDialog() {
  const code = useRef<HTMLTextAreaElement>(null);
  const [history, setHistory] = useState<ImportedCode[]>(loadImportHistory);
  const importCode = async () => {
    const text = code.current?.value.trim() ?? "";
    if (!text) return;
    if (await plannerCommands().importBuild(text)) setHistory((current) => rememberImport(current, text));
  };
  return (
    <dialog
      id={ID}
      ref={registerDialog}
      className={`${plainDialogClass} w-200 max-w-[calc(100vw-2rem)]`}
      aria-labelledby="import-build-title"
      onClose={() => {
        if (code.current) code.current.value = "";
      }}
    >
      <h2 id="import-build-title" className={plainDialogTitleClass}>
        Import build
      </h2>
      <label className={`mt-4 grid gap-2 ${fieldLabelClass}`}>
        Paste a build code
        <textarea
          id="import-build-code"
          ref={code}
          rows={10}
          placeholder="Paste a Torchlight of Building build code"
          className={`${fieldControlClass} min-h-60 font-normal`}
        />
      </label>
      {history.length ? (
        <section className="mt-4 grid gap-2" aria-labelledby="import-build-recent">
          <h3 id="import-build-recent" className={fieldLabelClass}>
            Recent imports
          </h3>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
            {history.map((entry) => (
              <li key={entry.importedAt} className={RECENT_ROW}>
                <span className="text-sm text-text tabular-nums">{importTime(entry.importedAt)}</span>
                <code className={`min-w-0 flex-1 truncate ${fieldHelpClass}`} title={entry.code.slice(0, 200)}>
                  {entry.code.length > CODE_PREVIEW ? `${entry.code.slice(0, CODE_PREVIEW)}…` : entry.code}
                </code>
                <button
                  type="button"
                  className={plainDialogButtonClass}
                  aria-label={`Use the build code imported ${importTime(entry.importedAt)}`}
                  onClick={() => {
                    if (code.current) code.current.value = entry.code;
                  }}
                >
                  Use
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className={plainDialogActionsClass}>
        <button type="button" className={plainDialogButtonClass} onClick={() => closeDialog(ID)}>
          Cancel
        </button>
        <button type="button" className={primaryDialogButtonClass} onClick={importCode}>
          Import Code
        </button>
      </div>
    </dialog>
  );
}

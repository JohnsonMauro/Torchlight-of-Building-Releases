// The page's dialogs by id (src/app/bridge/dialogs.ts): the planner and a button elsewhere in the shell (the header)
// open and close a dialog that another component renders.
import { useEffect, type RefObject } from "react";
import { registerDialog } from "@legacy/app/bridge/dialogs.ts";

export { closeDialog, openDialog, registerDialog } from "@legacy/app/bridge/dialogs.ts";

/** Registers a dialog component's own ref under the dialog's id once it is mounted. */
export function useRegisteredDialog(dialog: RefObject<HTMLDialogElement | null>): void {
  useEffect(() => registerDialog(dialog.current), [dialog]);
}

// The planner's static dialogs by id, so a button elsewhere in the shell (the header) can open one that another
// component renders, as the legacy code did with document.querySelector(...).showModal().
const dialogs = new Map<string, HTMLDialogElement>();

/** A ref callback that registers the dialog under its id. */
export const registerDialog = (element: HTMLDialogElement | null): void => {
  if (element) dialogs.set(element.id, element);
};

export function openDialog(id: string): void {
  const dialog = dialogs.get(id);
  if (dialog && !dialog.open) dialog.showModal();
}

export function closeDialog(id: string): void {
  dialogs.get(id)?.close();
}

// The page's dialogs by id. React renders each <dialog> and registers it here (its ref); the planner and other
// components open and close one by id, without looking it up in the page.
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

export function dialogOpen(id: string): boolean {
  return dialogs.get(id)?.open ?? false;
}

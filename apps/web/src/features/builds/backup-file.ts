// The backup file picker behind Builds → Restore from backup: a hidden file input (RestoreBackupInput) that a button
// elsewhere opens; the picked file's text goes to the planner's restoreBackup command.
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";

let input: HTMLInputElement | null = null;

/** The hidden input's ref callback. */
export const registerBackupInput = (element: HTMLInputElement | null): void => {
  input = element;
};

/** Opens the browser's file picker. */
export function pickBackupFile(): void {
  input?.click();
}

/** The picked file (the input then forgets it, so the same file can be picked again). */
export async function restorePickedBackup(target: HTMLInputElement): Promise<void> {
  const file = target.files?.[0];
  target.value = "";
  if (!file) return;
  plannerCommands().restoreBackup(await file.text());
}

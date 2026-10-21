import { registerBackupInput, restorePickedBackup } from "./backup-file";

/** The hidden file input of Builds → Restore from backup (opened by pickBackupFile). */
export function RestoreBackupInput() {
  return (
    <input
      ref={registerBackupInput}
      type="file"
      accept="application/json,.json"
      hidden
      onChange={(event) => void restorePickedBackup(event.currentTarget)}
    />
  );
}

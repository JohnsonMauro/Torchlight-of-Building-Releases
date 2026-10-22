/**
 * The plain dialogs' look (the yes/no confirmations, Import build, Import from game): the shared
 * panel with its own padding, an accent serif title, a right-aligned row of buttons, and framed fields. Utility lists
 * only; the shared panel itself is app.css's `dialog-panel`.
 */

/** The dialog: the panel, padded; the caller gives its width (`w-107.5` for a yes/no question). */
export const plainDialogClass = "dialog-panel p-5 text-sm/[normal] text-text max-[480px]:p-4";

/** The dialog's title. */
export const plainDialogTitleClass = "mb-2.5 font-display text-xl/[normal] font-bold text-accent wrap-anywhere";

/** A paragraph of the dialog's text. */
export const plainDialogTextClass = "text-sm/normal";

/** The row of buttons at the bottom: Cancel, then the main action, then any other action (every dialog's order). */
export const plainDialogActionsClass = "mt-6 flex flex-wrap justify-end gap-2";

/** A button in that row (Cancel, Import Code…); `btn` fades it while disabled. */
export const plainDialogButtonClass = "btn min-h-9 px-3 text-xs font-bold";

/** The row's main action (Import Code, Send to GitHub), right of Cancel. */
export const primaryDialogButtonClass = "btn-primary min-h-9 px-3 text-xs font-bold";

/** The row's destructive button (Reset Build, Delete Build). */
export const dangerDialogButtonClass = "btn-danger min-h-9 px-3 text-xs font-bold";

/** A field's label above its control. */
export const fieldLabelClass = "text-xs font-bold text-accent";

/** A text box, text area or file picker in a dialog. */
export const fieldControlClass = "field w-full min-w-0 px-2.5 py-2 text-sm";

/** Small helper text under a field. */
export const fieldHelpClass = "text-xs text-muted";

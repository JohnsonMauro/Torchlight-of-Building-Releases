/**
 * The plain dialogs' look (the yes/no confirmations, Import build, Import from game, the feedback form): the
 * bronze-edged panel with its own padding, a gold serif title, a right-aligned row of bronze buttons, and framed
 * fields. Utility lists only; the shared panel itself is app.css's `dialog-panel`.
 */

/** The dialog: the panel, padded; the caller gives its width (`w-107.5` for a yes/no question). */
export const plainDialogClass = "dialog-panel p-5.5 text-sm/[normal] text-[#e9dfd0] max-[480px]:p-4";

/** The dialog's title. */
export const plainDialogTitleClass = "mb-2.5 font-serif text-xl/[normal] font-bold text-gold wrap-anywhere";

/** A paragraph of the dialog's text. */
export const plainDialogTextClass = "text-[0.85rem]/[1.5]";

/** The row of buttons at the bottom. */
export const plainDialogActionsClass = "mt-6 flex flex-wrap justify-end gap-2.25";

/** A button in that row (Cancel, Import Code…); faded while disabled. */
export const plainDialogButtonClass =
  "btn-bronze min-h-9.5 px-3.25 py-1.75 text-[0.72rem] font-bold off:cursor-default off:opacity-45";

/** The row's destructive button (Reset Build, Delete Build): ember red instead of bronze. */
export const dangerDialogButtonClass =
  "min-h-9.5 cursor-pointer rounded-[3px] border border-[#c46b39] bg-[linear-gradient(180deg,#633025,#251a1c)] px-3.25 py-1.75 text-[0.72rem] font-bold text-[#ffbd8b] hover:brightness-117 focus-visible:outline-none focus-visible:brightness-117";

/** A field's label above its control. */
export const fieldLabelClass = "text-[0.76rem] font-bold text-[#f0c77e]";

/** A text box, text area or file picker in a dialog: slate frame, ember edge and glow while focused. */
export const fieldControlClass =
  "w-full min-w-0 rounded-[3px] border border-[#465363] bg-[#111922] px-2.5 py-2.25 text-[0.82rem] text-[#eee5d7] shadow-[inset_0_2px_5px_rgb(0_0_0/0.22)] focus:border-[#e78136] focus:shadow-[0_0_0_2px_rgb(231_129_54/0.16),inset_0_2px_5px_rgb(0_0_0/0.2)] focus:outline-none";

/** Small grey helper text under a field. */
export const fieldHelpClass = "text-[0.74rem] text-[#a9b5c4]";

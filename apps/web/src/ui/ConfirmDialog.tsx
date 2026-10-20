import { useEffect, useRef, type ReactNode } from "react";
import { setAutofocusAttribute } from "../shell/autofocus";

interface ConfirmDialogProps {
  id: string;
  titleId: string;
  messageId: string;
  open: boolean;
  title: string;
  message: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Extra attributes for the confirm button (the planner's stylesheet styles some by their data-* name). */
  confirmProps?: Record<string, string>;
}

/** A modal yes/no question. The cancel button takes the focus when it opens; Escape counts as cancel. */
export function ConfirmDialog({
  id,
  titleId,
  messageId,
  open,
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmProps,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      id={id}
      className="reset-build-confirm"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onClose={() => {
        if (open) onCancel();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      <p id={messageId}>{message}</p>
      <div>
        <button type="button" ref={setAutofocusAttribute} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" {...confirmProps} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

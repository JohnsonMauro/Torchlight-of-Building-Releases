import { useEffect, useRef, type ReactNode } from "react";
import { setAutofocusAttribute } from "../shell/autofocus";
import {
  dangerDialogButtonClass,
  plainDialogActionsClass,
  plainDialogButtonClass,
  plainDialogClass,
  plainDialogTextClass,
  plainDialogTitleClass,
} from "./dialog-classes";

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
  /** Extra attributes for the confirm button (a data-* hook). */
  confirmProps?: Record<string, string>;
}

/**
 * A modal yes/no question whose yes is destructive (drawn in the danger colour). The cancel button takes the focus when it
 * opens; Escape counts as cancel.
 */
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
      className={`${plainDialogClass} w-107.5`}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onClose={() => {
        if (open) onCancel();
      }}
    >
      <h2 id={titleId} className={plainDialogTitleClass}>
        {title}
      </h2>
      <p id={messageId} className={plainDialogTextClass}>
        {message}
      </p>
      <div className={plainDialogActionsClass}>
        <button type="button" ref={setAutofocusAttribute} className={plainDialogButtonClass} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className={dangerDialogButtonClass} {...confirmProps} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

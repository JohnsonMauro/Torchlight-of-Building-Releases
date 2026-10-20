import { useEffect, useRef, type InputHTMLAttributes } from "react";

interface CommitNumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: number | string | null | undefined;
  /** Called with the typed text when the user commits it (native `change`: Enter, leaving the field, the spin arrows). */
  onCommit?: (value: string) => void;
}

/**
 * A number field that reports a value once the user commits it, not on every keystroke (React's onChange is the
 * `input` event), so typing "120" does not recalculate the build for "1" and "12". It shows `value` as given and starts
 * over from it whenever it changes (key it by the value), as the planner's re-rendered markup did.
 */
export function CommitNumberInput({ value, onCommit, ...attributes }: CommitNumberInputProps) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const element = input.current;
    if (!element || !onCommit) return;
    const commit = () => onCommit(element.value);
    element.addEventListener("change", commit);
    return () => element.removeEventListener("change", commit);
  }, [onCommit]);
  return <input ref={input} type="number" defaultValue={String(value ?? "")} {...attributes} />;
}

// A number field that reports every typed number (React's onChange is the `input` event), as the planner's crafters
// did on input, and skips an empty field. While focused it shows what was typed; on leaving it or Enter it shows
// `value` again (the planner's clamped number), as the legacy re-render on `change` did; `onCommit` gets the text then.
import { useState, type InputHTMLAttributes } from "react";

interface LiveNumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: number;
  onValue: (value: number) => void;
  /** The typed text when the field is left or Enter is pressed (the planner's `change`). */
  onCommit?: (text: string) => void;
}

export function LiveNumberInput({ value, onValue, onCommit, onBlur, onKeyDown, ...attributes }: LiveNumberInputProps) {
  const [typed, setTyped] = useState<string | null>(null);
  return (
    <input
      type="number"
      value={typed ?? String(value)}
      onChange={(event) => {
        setTyped(event.target.value);
        if (event.target.value !== "") onValue(Number(event.target.value));
      }}
      onBlur={(event) => {
        if (typed !== null) onCommit?.(typed);
        setTyped(null);
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          if (typed !== null) onCommit?.(typed);
          setTyped(null);
        }
        onKeyDown?.(event);
      }}
      {...attributes}
    />
  );
}

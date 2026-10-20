// A number field that reports every typed number (React's onChange is the `input` event), as the planner's crafters
// did on input, and skips an empty field. While focused it shows what was typed; on leaving it or Enter it shows
// `value` again (the planner's clamped number), as the legacy re-render on `change` did.
import { useState, type InputHTMLAttributes } from "react";

interface LiveNumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: number;
  onValue: (value: number) => void;
}

export function LiveNumberInput({ value, onValue, onBlur, onKeyDown, ...attributes }: LiveNumberInputProps) {
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
        setTyped(null);
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") setTyped(null);
        onKeyDown?.(event);
      }}
      {...attributes}
    />
  );
}

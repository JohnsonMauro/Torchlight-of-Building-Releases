// A value picked on a slider with its number field after it: every slider and number pair of the page (skill and
// Pactspirit levels, support, gear, Kismet and memory rolls). The slider reports as it moves. The field either reports
// every typed number and the typed text once committed (`live`, for rolls), or only the committed text (`commit`, for a
// level, so typing "35" does not recalculate for "3"); a committed text without `onCommit` is clamped to min–max (an
// empty or unreadable one goes back to the value).
import type { CSSProperties, InputHTMLAttributes } from "react";
import { CommitNumberInput } from "./CommitNumberInput";
import { LiveNumberInput } from "./LiveNumberInput";
import { RANGE_FIELD, RANGE_FIELD_NEGATIVE, RANGE_NUMBER } from "./range-classes";

/** Attributes an e2e test or the planner finds a slider or field by (aria-label, data-*, an extra hook class). */
type FieldAttributes = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "min" | "max" | "step" | "onChange"
> &
  Record<`data-${string}`, string | number | undefined>;

interface RangeInputProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onValue: (value: number) => void;
  /** The typed text when the field is committed (Enter, leaving it, its arrows); clamped into onValue when omitted. */
  onCommit?: (text: string) => void;
  field?: "live" | "commit";
  /** A range of negative values: the fill runs from the left end to `rollFill` (percent). */
  negative?: { rollFill: number };
  slider?: FieldAttributes;
  number?: FieldAttributes;
  /** The wrapper's own classes (a hook class, a margin); its grid is the slider and a 4rem field. */
  className?: string;
}

export function RangeInput({
  min,
  max,
  step = 1,
  value,
  onValue,
  onCommit,
  field = "live",
  negative,
  slider = {},
  number = {},
  className = "",
}: RangeInputProps) {
  const fill = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  const style = {
    "--range-fill": `${fill}%`,
    ...(negative ? { "--roll-fill": `${negative.rollFill}%` } : {}),
  } as CSSProperties;
  const commit =
    onCommit ??
    ((text: string) => {
      const typed = Number(text);
      onValue(text.trim() && Number.isFinite(typed) ? Math.min(max, Math.max(min, typed)) : value);
    });
  const { className: numberClass = "", ...numberAttributes } = number;
  const numberProps = { ...numberAttributes, min, max, step, value, className: `${RANGE_NUMBER} ${numberClass}` };
  return (
    // A span, so it may sit inside a <label>.
    <span className={`grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-2.5 ${className}`}>
      <input
        type="range"
        className={negative ? RANGE_FIELD_NEGATIVE : RANGE_FIELD}
        min={min}
        max={max}
        step={step}
        value={value}
        style={style}
        {...slider}
        onChange={(event) => onValue(Number(event.target.value))}
      />
      {field === "commit" ? (
        <CommitNumberInput key={value} {...numberProps} onCommit={commit} />
      ) : (
        <LiveNumberInput {...numberProps} onValue={onValue} onCommit={commit} />
      )}
    </span>
  );
}

// The tag column left of a list (the skill selector's skill tags, the Pactspirit selector's categories): "All", then one
// button per option with the count picking it would leave; a picked one is accent-tinted, one that would leave nothing
// is disabled. The caller decides what a press does (toggle one of several tags, or pick one category). Under 900px the
// column becomes a wrapping row above the list (FILTER_COLUMN).
import { FILTER_COLUMN, FILTER_OPTION, FILTER_OPTION_PICKED } from "./filter-classes";

export interface FilterOption {
  key: string;
  label: string;
  count: number;
  picked: boolean;
}

interface FilterColumnProps {
  /** The column's accessible name ("Filter by tag"). */
  label: string;
  options: readonly FilterOption[];
  onPick: (key: string) => void;
  /** "All": picked while no option is, and a press clears the picks. */
  onAll: () => void;
  className?: string;
}

export function FilterColumn({ label, options, onPick, onAll, className = "" }: FilterColumnProps) {
  if (!options.length) return null;
  const none = !options.some((option) => option.picked);
  return (
    <nav className={`${FILTER_COLUMN} ${className}`} aria-label={label}>
      <button type="button" className={none ? FILTER_OPTION_PICKED : FILTER_OPTION} aria-pressed={none} onClick={onAll}>
        All
      </button>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={option.picked ? FILTER_OPTION_PICKED : FILTER_OPTION}
          aria-pressed={option.picked}
          disabled={!option.picked && !option.count}
          onClick={() => onPick(option.key)}
        >
          {option.label}
          <small className="tabular-nums opacity-70">{option.count}</small>
        </button>
      ))}
    </nav>
  );
}

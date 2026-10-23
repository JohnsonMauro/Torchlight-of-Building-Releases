import { useState, type ReactNode } from "react";
import type { OptionView, SelectChoice } from "@legacy/app/bridge/equipment-crafter-view.ts";
import { searchMatcher, searchText } from "@legacy/app/bridge/search-match.ts";
import { flatChoices } from "./choices";
import { SearchField } from "./SearchField";
import { KeywordText } from "./KeywordText";

const CHOICE_ROW =
  "flex cursor-pointer items-start gap-2.5 rounded border border-line bg-raised px-2.5 py-2 text-sm text-text hover:border-accent";
const CHOICE_ROW_ON = "border-accent/60";
/** Past this many options, a list offers a filter. */
const FILTER_FROM = 12;

/**
 * One choice among options (by group when they have one) in place of a select: a radio row each, "None" first unless
 * `none` is null, a filter over a long list, and `detail` under the chosen row (its roll). `query` is a search from
 * outside (one field over several lists, the prism crafter's): it filters the options and the list offers no field.
 */
export function ChoiceList({
  label,
  choices,
  value,
  onChange,
  none = "None",
  noneValue = "",
  attributes,
  detail,
  query,
}: {
  label: string;
  choices: SelectChoice[];
  value: string;
  onChange: (value: string) => void;
  none?: string | null;
  noneValue?: string;
  attributes?: Record<`data-${string}`, string | number>;
  detail?: ReactNode;
  query?: string;
}) {
  const [filter, setFilter] = useState("");
  const matcher = searchMatcher(query ?? filter);
  const keep = (option: OptionView) => matcher.matches(searchText([option.label]));
  const row = (option: OptionView) => {
    const on = option.value === value;
    return (
      <div key={option.value} className="grid gap-2">
        <label className={`${CHOICE_ROW} ${on ? CHOICE_ROW_ON : ""}`}>
          <input
            type="radio"
            className="mt-0.5 size-4 shrink-0 accent-accent"
            checked={on}
            data-choice-value={option.value}
            onChange={() => onChange(option.value)}
          />
          <span className="min-w-0 flex-1 whitespace-pre-line">
            <KeywordText text={option.label} />
            {option.data?.optionMeta ? (
              <small className="block text-xs text-muted">{option.data.optionMeta}</small>
            ) : null}
          </span>
        </label>
        {on && detail ? <div className="pl-7">{detail}</div> : null}
      </div>
    );
  };
  return (
    <div className="grid gap-1.5" role="radiogroup" aria-label={label} {...attributes}>
      {query === undefined && flatChoices(choices).length > FILTER_FROM ? (
        <SearchField value={filter} onChange={setFilter} placeholder={`Filter ${label}…`} error={matcher.error} />
      ) : null}
      {none === null ? null : row({ value: noneValue, label: none })}
      {choices.map((choice, index) =>
        "group" in choice ? (
          choice.options.some(keep) ? (
            <div key={index} className="grid gap-1.5">
              <small className="mt-1 text-xs font-bold tracking-wide text-muted uppercase">{choice.group}</small>
              {choice.options.filter(keep).map(row)}
            </div>
          ) : null
        ) : keep(choice) ? (
          row(choice)
        ) : null,
      )}
    </div>
  );
}

// Pieces the equipment crafter's views share (src/app/bridge/equipment-crafter-view.ts): the item preview (its lines
// through ModifierText), a select's options and groups (with the data-* attributes the planner's searchable select
// reads), a list of choices in place of a select, a folding section, a roll's slider and number field, and a legendary
// line with its controls (the crafter's and the item editor's differ by their data-* names).
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { tierBadgeClasses, tierBadgeKey } from "@legacy/app/gear/tier-badge.ts";
import { searchMatcher, searchText } from "@legacy/app/bridge/search-match.ts";
import { flatChoices } from "./choices";
import type {
  ItemPreviewView,
  LegendaryLineView,
  OptionView,
  RollView,
  SelectChoice,
} from "@legacy/app/bridge/equipment-crafter-view.ts";
import { RangeInput } from "../../ui/RangeInput";
import { SearchField } from "../../ui/SearchField";
import { ModifierText } from "../../ui/ModifierText";
import {
  AFFIX_ROW,
  AFFIX_ROW_CORRODED,
  AFFIX_ROW_HEAD,
  AFFIX_ROW_PLAIN,
  MOD_CHOICE,
  TIER_CHIP,
  TIER_CHIP_OTHER,
  TIER_CHIPS,
  itemCardLook,
  ROLL_VALUE,
} from "./crafter-classes";

// The item card: its rarity's art and colours (itemCardLook), a framed box per modifier section.
// The item preview, laid out as the game's item card: name and level, type, requirement and energy beside the icon, then
// the implicit (muted), the base lines and the affixes, a rule above each; a base line or affix is led by a diamond in
// its tier's colour (the line's source and tier on hover).
const PREVIEW = "relative block rounded-md border border-(--item-frame) p-4 text-left";
// A modifier line; a corroded one (corrosion-affix, read by the e2e tests) in violet.
const MOD_LINE = "flex items-start gap-2.5 text-sm whitespace-pre-line";
const BLOCKS = ["implicit", "base", "affix"] as const;
const lineClasses = (className: string, block: string) =>
  `${MOD_LINE} ${className}${className.split(" ").includes("corrosion-affix") ? " text-violet" : block === "implicit" ? " text-muted" : ""}`;

export function ItemPreview({ preview }: { preview: ItemPreviewView }) {
  return (
    <article className={`${PREVIEW} ${itemCardLook(preview.className)} ${preview.className}`}>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg/tight font-bold text-(--item-name)">{preview.name}</h3>
          <div className="mt-2 grid gap-1 text-sm text-muted">
            {preview.itemLevel ? (
              <p className={preview.priceless ? "text-accent" : undefined}>{preview.itemLevel}</p>
            ) : null}
            <p>{preview.typeLine}</p>
            <p>{preview.require}</p>
            {preview.energy ? (
              <div>
                <p>{preview.energy.text}</p>
                <i className="mt-1 block h-1 overflow-hidden rounded-full bg-sunken">
                  <b className="block h-full bg-accent" style={{ width: `${preview.energy.fill}%` }} />
                </i>
              </div>
            ) : null}
            {preview.corroded ? <p className="text-violet">Corroded</p> : null}
          </div>
        </div>
        <img src={preview.icon} alt="" className="size-24 object-contain" />
      </header>
      {preview.lines.length ? (
        BLOCKS.map((block) => {
          const lines = preview.lines.filter((line) => line.block === block);
          return lines.length ? (
            <ul key={block} className="mt-3 grid gap-1.5 border-t border-line pt-3">
              {lines.map((line, index) => (
                <li
                  key={index}
                  className={lineClasses(line.className, block)}
                  data-preview-line={line.kind}
                  title={line.title}
                >
                  {block === "implicit" ? null : (
                    <i className={line.marker.className}>
                      {line.marker.text ? <span className="sr-only">{line.marker.text}</span> : null}
                    </i>
                  )}
                  <span className="min-w-0">
                    <ModifierText text={line.text} />
                  </span>
                </li>
              ))}
            </ul>
          ) : null;
        })
      ) : (
        <p className="mt-3 border-t border-line pt-3 text-sm text-muted">Configure affixes to preview this item.</p>
      )}
      {preview.source ? (
        <a
          href={preview.source}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs text-info underline"
        >
          Open TLIDB source
        </a>
      ) : null}
    </article>
  );
}

const dataAttributes = (data: Record<string, string> = {}) =>
  Object.fromEntries(
    Object.entries(data).map(([key, value]) => [`data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value]),
  );
export function Options({ options }: { options: OptionView[] }) {
  return options.map((option) => (
    <option key={option.value} value={option.value} {...dataAttributes(option.data)}>
      {option.label}
    </option>
  ));
}
export function Choices({ choices }: { choices: SelectChoice[] }) {
  return choices.map((choice, index) =>
    "group" in choice ? (
      <optgroup key={index} label={choice.group}>
        <Options options={choice.options} />
      </optgroup>
    ) : (
      <Options key={index} options={[choice]} />
    ),
  );
}

/** A section folded by its heading (open at first); `summary` beside the heading says what it holds. */
export function CraftSection({
  heading,
  summary,
  open = true,
  children,
}: {
  heading: string;
  summary?: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={open} className="group/section border-t border-line pt-3" data-craft-section="">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="text-muted transition-transform group-open/section:rotate-90">
          ›
        </span>
        <h3>{heading}</h3>
        {summary ? <span className="min-w-0 truncate text-xs font-normal text-muted">{summary}</span> : null}
      </summary>
      <div className="mt-3 grid gap-3">{children}</div>
    </details>
  );
}

const CHOICE_ROW =
  "flex cursor-pointer items-start gap-2.5 rounded border border-line bg-raised px-2.5 py-2 text-sm text-text hover:border-accent";
const CHOICE_ROW_ON = "border-accent/60";
/** Past this many options, a list offers a filter. */
const FILTER_FROM = 12;

/**
 * One choice among options (by group when they have one) in place of a select: a radio row each, "None" first unless
 * `none` is null, a filter over a long list, and `detail` under the chosen row (its roll).
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
}: {
  label: string;
  choices: SelectChoice[];
  value: string;
  onChange: (value: string) => void;
  none?: string | null;
  noneValue?: string;
  attributes?: Record<`data-${string}`, string | number>;
  detail?: ReactNode;
}) {
  const [filter, setFilter] = useState("");
  const matcher = searchMatcher(filter);
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
          <span className="min-w-0 flex-1">
            {option.label}
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
      {flatChoices(choices).length > FILTER_FROM ? (
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

/** A roll's slider (with the attributes that name its line) and number field, then the range it takes ("80 – 100"). */
export function RollInputs({
  roll,
  attributes,
  onValue,
}: {
  roll: RollView;
  attributes: InputHTMLAttributes<HTMLInputElement> & Record<`data-${string}`, string | number>;
  onValue: (value: number, commit?: boolean) => void;
}) {
  return (
    <>
      <RangeInput
        min={roll.min}
        max={roll.max}
        step={roll.step}
        value={roll.value}
        negative={roll.negative ? { rollFill: roll.rollFill } : undefined}
        slider={attributes}
        number={{ className: "affix-roll-number", "data-affix-roll-number": "" }}
        onValue={(value) => onValue(value)}
        // Committed, a typed value is clamped into the range (an empty field reads 0), as the planner's change did.
        onCommit={(text) => onValue(Number(text), true)}
      />
      <em className={ROLL_VALUE}>{`${roll.min} – ${roll.max}`}</em>
    </>
  );
}

// A chip to pick from, its look picked in code from its state (a utility may not spell a state word the e2e tests read).
const PICK_CHIP = "chip cursor-pointer px-2 py-1 text-xs hover:border-accent";
const PICK_CHIP_ON = "border-accent bg-accent/15 text-accent";
const RING_EFFECTS = [
  { value: "left", label: "Left Ring · regain Blur" },
  { value: "right", label: "Right Ring · gain Blur Rating" },
] as const;

/** A line's tier chips, lowest first: T2, T1, then T0 (its corroded form), the one it holds lit. */
function LineTiers({
  line,
  names,
  onChange,
}: {
  line: LegendaryLineView;
  names: LegendaryLineNames;
  onChange: (change: LegendaryLineChange) => void;
}) {
  const tiers = [...(line.tier?.options ?? [])].reverse();
  return (
    <span className={TIER_CHIPS} role="group" aria-label="Tier" {...{ [names.tier]: line.index }}>
      {tiers.map((option) => {
        const current = !line.corroded && option.value === line.tier?.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`${tierBadgeClasses(tierBadgeKey(`T${option.value}`))} ${TIER_CHIP} ${current ? "" : TIER_CHIP_OTHER}`}
            title={option.label}
            aria-pressed={current}
            data-tier-option={option.value}
            onClick={() => {
              if (line.corroded) onChange({ kind: "corrosion" });
              if (option.value !== line.tier?.value) onChange({ kind: "tier", value: Number(option.value) });
            }}
          >
            {`T${option.value}`}
          </button>
        );
      })}
      {line.corrodedText ? (
        <button
          type="button"
          className={`${tierBadgeClasses(tierBadgeKey("T0"))} ${TIER_CHIP} ${line.corroded ? "" : TIER_CHIP_OTHER}`}
          title={line.corrodedText}
          aria-pressed={line.corroded}
          data-tier-option="0"
          {...{ [names.toggle]: line.index }}
          onClick={() => {
            if (!line.corroded) onChange({ kind: "corrosion" });
          }}
        >
          T0
        </button>
      ) : null}
    </span>
  );
}

/** The data-* names of a legendary line's controls. */
export interface LegendaryLineNames {
  toggle: string;
  text: string;
  ring: string;
  placeholder: string;
  tier: string;
  roll: string;
}
export type LegendaryLineChange =
  | { kind: "corrosion" }
  | { kind: "ring"; value: "left" | "right" }
  | { kind: "placeholder"; value: string }
  | { kind: "tier"; value: number }
  | { kind: "roll"; rangeIndex: number; value: number; commit?: boolean };

/**
 * A legendary line: its tier chips (T2, T1, then T0, its corroded form; each names its line on hover, as a tier can change
 * what the line does) beside its text, then its ring effect, random roll and rolls when it has them.
 */
export function LegendaryModControl({
  line,
  names,
  saved,
  onChange,
}: {
  line: LegendaryLineView;
  names: LegendaryLineNames;
  /** A hidden field holding the line as saved (the item editor's). */
  saved?: { name: string; value: string };
  onChange: (change: LegendaryLineChange) => void;
}) {
  return (
    <div
      className={`legendary-mod-control ${AFFIX_ROW} ${line.corroded ? `corrosion-affix ${AFFIX_ROW_CORRODED}` : AFFIX_ROW_PLAIN}`}
    >
      <div className={AFFIX_ROW_HEAD}>
        <span className="min-w-0 flex-1 whitespace-pre-line" {...{ [names.text]: line.index }}>
          <ModifierText text={line.text} />
        </span>
        {line.tier ? <LineTiers line={line} names={names} onChange={onChange} /> : null}
        {saved ? <input type="hidden" {...{ [saved.name]: line.index }} value={saved.value} /> : null}
      </div>
      {line.ring ? (
        <div className={MOD_CHOICE}>
          Ring effect
          <span className="flex flex-wrap gap-1.5" role="group" aria-label="Ring effect" {...{ [names.ring]: "" }}>
            {RING_EFFECTS.map((effect) => (
              <button
                key={effect.value}
                type="button"
                className={`${PICK_CHIP} ${line.ring === effect.value ? PICK_CHIP_ON : ""}`}
                aria-pressed={line.ring === effect.value}
                data-ring-effect={effect.value}
                onClick={() => onChange({ kind: "ring", value: effect.value })}
              >
                {effect.label}
              </button>
            ))}
          </span>
        </div>
      ) : null}
      {line.placeholder ? (
        <ChoiceList
          label="Random roll"
          choices={line.placeholder.options}
          value={line.placeholder.value}
          none={null}
          attributes={{ [names.placeholder]: line.index }}
          onChange={(value) => onChange({ kind: "placeholder", value })}
        />
      ) : null}
      {line.rolls.map((roll) => (
        <label key={roll.rangeIndex} className="grid gap-1">
          <RollInputs
            roll={roll}
            attributes={{ [names.roll]: line.index, "data-range-index": roll.rangeIndex }}
            onValue={(value, commit) => onChange({ kind: "roll", rangeIndex: roll.rangeIndex, value, commit })}
          />
        </label>
      ))}
    </div>
  );
}

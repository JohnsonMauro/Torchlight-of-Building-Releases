// Pieces the equipment crafter's views share (src/app/bridge/equipment-crafter-view.ts): a modifier line (a keyword roll
// collapses to its keyword; holding Alt shows its effect, by CSS), the item preview, a select's options and groups (with
// the data-* attributes the planner's searchable select reads), a roll's slider and number field, and a legendary line
// with its controls (the crafter's and the item editor's differ by their data-* names).
import type { CSSProperties, InputHTMLAttributes } from "react";
import type {
  ItemPreviewView,
  LegendaryLineView,
  ModifierTextView,
  OptionView,
  RollView,
  SelectChoice,
} from "@legacy/app/bridge/equipment-crafter-view.ts";
import { LiveNumberInput } from "../../ui/LiveNumberInput";

export function ModifierText({ text }: { text: ModifierTextView }) {
  if (text.kind === "plain") return <>{text.text}</>;
  if (text.inline)
    return (
      <span className="keyword-roll">
        {text.inline.before}
        <span className="keyword-roll-name">{text.keyword}</span>
        {text.inline.after}
        <span className="keyword-roll-effect">{text.effect}</span>
      </span>
    );
  return (
    <>
      <span className="keyword-roll">
        <span className="keyword-roll-name">{text.keyword}</span>
        <span className="keyword-roll-effect">{text.effect}</span>
      </span>
      {text.rest}
    </>
  );
}

export function ItemPreview({ preview }: { preview: ItemPreviewView }) {
  return (
    <article className={preview.className}>
      <img src={preview.icon} alt="" />
      <p>{preview.rarity}</p>
      <h3>{preview.name}</h3>
      <small>{preview.detail}</small>
      <div className="item-mod-sections">
        {preview.sections.length ? (
          preview.sections.map((section, index) => (
            <section key={index} className="item-mod-section">
              <h4>
                {section.label}
                {section.detail ? <small>{section.detail}</small> : null}
              </h4>
              <ul>
                {section.entries.map((entry, position) => (
                  <li key={position} className={entry.className}>
                    {entry.badge ? <i className={entry.badge.className}>{entry.badge.text}</i> : null}
                    <span>
                      <ModifierText text={entry.text} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p>Configure affixes to preview this item.</p>
        )}
      </div>
      {preview.source ? (
        <a href={preview.source} target="_blank" rel="noreferrer">
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

/** A roll's slider (with the attributes that name its line) and number field, then the value shown. */
export function RollInputs({
  roll,
  attributes,
  onValue,
}: {
  roll: RollView;
  attributes: InputHTMLAttributes<HTMLInputElement> & Record<`data-${string}`, string | number>;
  onValue: (value: number, commit?: boolean) => void;
}) {
  const style = {
    "--range-fill": `${roll.rangeFill}%`,
    ...(roll.negative ? { "--roll-fill": `${roll.rollFill}%` } : {}),
  } as CSSProperties;
  return (
    <>
      <span className={`affix-roll-inputs${roll.negative ? " negative-roll" : ""}`}>
        <input
          type="range"
          className={roll.negative ? "negative-roll-range" : ""}
          min={roll.min}
          max={roll.max}
          step={roll.step}
          value={roll.value}
          style={style}
          {...attributes}
          onChange={(event) => onValue(Number(event.target.value))}
        />
        <LiveNumberInput
          className="affix-roll-number"
          min={roll.min}
          max={roll.max}
          step={roll.step}
          value={roll.value}
          data-affix-roll-number=""
          onValue={(value) => onValue(value)}
          // Committed, a typed value is clamped into the range (an empty field reads 0), as the planner's change did.
          onCommit={(text) => onValue(Number(text), true)}
        />
      </span>
      <em>{roll.value}</em>
    </>
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

/** A legendary line: Normal / Corroded, its text, and its ring effect, random roll, tier and rolls when it has them. */
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
    <div className={`legendary-mod-control ${line.corroded ? "corrosion-affix" : ""}`}>
      <span>
        <button
          type="button"
          {...{ [names.toggle]: line.index }}
          disabled={!line.canCorrode}
          onClick={() => onChange({ kind: "corrosion" })}
        >
          {line.corroded ? "Corroded" : "Normal"}
        </button>
        <span {...{ [names.text]: line.index }}>
          <ModifierText text={line.text} />
        </span>
        {saved ? <input type="hidden" {...{ [saved.name]: line.index }} value={saved.value} /> : null}
      </span>
      {line.ring ? (
        <label className="legendary-ring-choice">
          Ring effect
          <select
            {...{ [names.ring]: "" }}
            value={line.ring}
            onChange={(event) => onChange({ kind: "ring", value: event.target.value === "right" ? "right" : "left" })}
          >
            <option value="left">Left Ring · regain Blur</option>
            <option value="right">Right Ring · gain Blur Rating</option>
          </select>
        </label>
      ) : null}
      {line.placeholder ? (
        <label className="legendary-ring-choice">
          Random roll
          <select
            {...{ [names.placeholder]: line.index }}
            value={line.placeholder.value}
            onChange={(event) => onChange({ kind: "placeholder", value: event.target.value })}
          >
            <Options options={line.placeholder.options} />
          </select>
        </label>
      ) : null}
      {line.tier ? (
        <label className="legendary-ring-choice">
          Tier
          <select
            {...{ [names.tier]: line.index }}
            value={line.tier.value}
            onChange={(event) => onChange({ kind: "tier", value: Number(event.target.value) })}
          >
            <Options options={line.tier.options} />
          </select>
        </label>
      ) : null}
      {line.rolls.map((roll) => (
        <label key={roll.rangeIndex}>
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

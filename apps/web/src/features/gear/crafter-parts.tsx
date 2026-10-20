// Pieces the equipment crafter's views share (src/app/bridge/equipment-crafter-view.ts): a modifier line (a keyword roll
// collapses to its keyword; holding Alt shows its effect, by CSS), the item preview, a select's options and groups (with
// the data-* attributes the planner's searchable select reads), and a roll's slider and number field.
import type { CSSProperties, InputHTMLAttributes } from "react";
import type {
  ItemPreviewView,
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

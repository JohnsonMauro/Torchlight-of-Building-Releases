// Pieces the equipment crafter's views share (src/app/bridge/equipment-crafter-view.ts): the item preview (its lines
// through ModifierText), a select's options and groups (with the data-* attributes the planner's searchable select
// reads), a roll's slider and number field, and a legendary line with its controls (the crafter's and the item editor's
// differ by their data-* names).
import type { CSSProperties, InputHTMLAttributes } from "react";
import type {
  ItemPreviewView,
  LegendaryLineView,
  OptionView,
  RollView,
  SelectChoice,
} from "@legacy/app/bridge/equipment-crafter-view.ts";
import { LiveNumberInput } from "../../ui/LiveNumberInput";
import { ModifierText } from "../../ui/ModifierText";
import {
  CONTROL,
  MOD_BOX,
  MOD_BOX_CORRODED,
  MOD_CHOICE,
  MOD_HEAD,
  MOD_TAG,
  MOD_TAG_CORRODED,
  itemCardLook,
  RANGE,
  RANGE_NEGATIVE,
  ROLL_NUMBER,
  ROLL_ROW,
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
      <span className={ROLL_ROW}>
        <input
          type="range"
          className={roll.negative ? RANGE_NEGATIVE : RANGE}
          min={roll.min}
          max={roll.max}
          step={roll.step}
          value={roll.value}
          style={style}
          {...attributes}
          onChange={(event) => onValue(Number(event.target.value))}
        />
        <LiveNumberInput
          className={`affix-roll-number ${ROLL_NUMBER}`}
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
      <em className={ROLL_VALUE}>{roll.value}</em>
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
    <div className={`legendary-mod-control ${line.corroded ? `corrosion-affix ${MOD_BOX_CORRODED}` : MOD_BOX}`}>
      <span className={MOD_HEAD}>
        <button
          type="button"
          className={`${line.corroded ? MOD_TAG_CORRODED : MOD_TAG} cursor-pointer off:cursor-default off:opacity-70`}
          {...{ [names.toggle]: line.index }}
          disabled={!line.canCorrode}
          onClick={() => onChange({ kind: "corrosion" })}
        >
          {line.corroded ? "Corroded" : "Normal"}
        </button>
        <span className="pt-0.5" {...{ [names.text]: line.index }}>
          <ModifierText text={line.text} />
        </span>
        {saved ? <input type="hidden" {...{ [saved.name]: line.index }} value={saved.value} /> : null}
      </span>
      {line.ring ? (
        <label className={MOD_CHOICE}>
          Ring effect
          <select
            className={CONTROL}
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
        <label className={MOD_CHOICE}>
          Random roll
          <select
            className={CONTROL}
            {...{ [names.placeholder]: line.index }}
            value={line.placeholder.value}
            onChange={(event) => onChange({ kind: "placeholder", value: event.target.value })}
          >
            <Options options={line.placeholder.options} />
          </select>
        </label>
      ) : null}
      {line.tier ? (
        <label className={MOD_CHOICE}>
          Tier
          <select
            className={CONTROL}
            {...{ [names.tier]: line.index }}
            value={line.tier.value}
            onChange={(event) => onChange({ kind: "tier", value: Number(event.target.value) })}
          >
            <Options options={line.tier.options} />
          </select>
        </label>
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

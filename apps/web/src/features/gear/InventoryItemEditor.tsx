// The item editor (Edit on a legendary or captured item, in the Inventory item dialog): name, Item level, Equipment
// Energy, base, Belt Blend, TOWER Sequence, corrosion implicit, then a legendary's catalog lines with their controls, or
// another item's lines as text fields, and the preview. Fields and controls are changes to the planner's editor state
// (src/app/app.js changeInventoryItemEditor); the dialog's Save Changes saves them.
import { useState } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type {
  InventoryItemEditorChange,
  InventoryItemEditorView,
} from "@legacy/app/bridge/inventory-item-editor-view.ts";
import { LiveNumberInput } from "../../ui/LiveNumberInput";
import { Choices, ItemPreview, LegendaryModControl } from "./crafter-parts";

const change = (editorChange: InventoryItemEditorChange) => plannerCommands().changeInventoryItemEditor(editorChange);
const LINE_NAMES = {
  toggle: "data-toggle-edit-corrosion",
  text: "data-edit-modifier-text",
  ring: "data-edit-legendary-ring-option",
  placeholder: "data-edit-legendary-placeholder",
  tier: "data-edit-legendary-tier",
  roll: "data-edit-legendary-roll",
};

/** A line's slider and number: they follow each other and leave the text alone, as in the legacy editor. */
function TextLineRoll({ range }: { range: NonNullable<InventoryItemEditorView["textLines"][number]["range"]> }) {
  const [value, setValue] = useState(range.value);
  const clamp = (typed: number) => Math.min(range.max, Math.max(range.min, typed));
  return (
    <span className="affix-roll-inputs">
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        data-modifier-roll=""
        onChange={(event) => setValue(Number(event.target.value))}
      />
      <LiveNumberInput
        className="affix-roll-number"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        data-affix-roll-number=""
        onValue={(typed) => {
          if (typed >= range.min && typed <= range.max) setValue(typed);
        }}
        onCommit={(text) => setValue(clamp(Number(text)))}
      />
    </span>
  );
}

export function InventoryItemEditor({ editor }: { editor: InventoryItemEditorView }) {
  const { fields } = editor;
  const field = (name: Extract<InventoryItemEditorChange, { kind: "field" }>["field"], value: string) =>
    change({ kind: "field", field: name, value });
  const lines = [
    ...editor.legendaryLines.map((line) => (
      <LegendaryModControl
        key={line.index}
        line={line}
        names={LINE_NAMES}
        saved={{ name: "data-edit-modifier", value: line.value }}
        onChange={(lineChange) =>
          change(lineChange.kind === "ring" ? lineChange : { ...lineChange, index: line.index })
        }
      />
    )),
    ...editor.textLines.map((line) => {
      const input = (
        <input
          data-edit-modifier={line.index}
          value={line.value}
          onChange={(event) => change({ kind: "text", index: line.index, value: event.target.value })}
        />
      );
      return line.range ? (
        <label key={line.index}>
          <span>
            <b>Normal</b>
            {input}
          </span>
          <TextLineRoll range={line.range} />
          <em>{`${line.range.min}–${line.range.max}`}</em>
        </label>
      ) : (
        <div key={line.index} className="fixed-mod">
          <b>Normal</b>
          {input}
        </div>
      );
    }),
  ];
  return (
    <div className="gear-edit-layout">
      <section>
        <div className="gear-edit-selected">
          <img src={editor.icon} alt="" />
          <span>
            <strong>{editor.name}</strong>
            <small>{editor.detail}</small>
          </span>
          <button type="button" data-change-edit-item="">
            Change
          </button>
        </div>
        <label>
          Name
          <input
            data-inventory-edit-name=""
            value={fields.name}
            onChange={(event) => field("name", event.target.value)}
          />
        </label>
        <div className="gear-edit-pair">
          <label>
            Item level
            <input
              type="number"
              min="1"
              max="100"
              data-inventory-edit-level=""
              value={fields.level}
              onChange={(event) => field("level", event.target.value)}
            />
          </label>
          {fields.energy !== null ? (
            <label>
              Equipment Energy
              <input
                type="number"
                min="0"
                data-inventory-edit-energy=""
                value={fields.energy}
                onChange={(event) => field("energy", event.target.value)}
              />
            </label>
          ) : null}
        </div>
        <label>
          Base item
          <input
            data-inventory-edit-base=""
            value={fields.base}
            onChange={(event) => field("base", event.target.value)}
          />
        </label>
        {fields.beltBlend ? (
          <label>
            Belt Blend
            <select
              data-edit-belt-blend=""
              value={fields.beltBlend.value}
              onChange={(event) => field("beltBlendId", event.target.value)}
            >
              <option value="">None</option>
              <Choices choices={fields.beltBlend.choices} />
            </select>
          </label>
        ) : null}
        {fields.sequence ? (
          <label>
            TOWER Sequence
            <select
              data-edit-tower-sequence=""
              value={fields.sequence.value}
              onChange={(event) => field("sequenceId", event.target.value)}
            >
              <option value="">None</option>
              <Choices choices={fields.sequence.choices} />
            </select>
          </label>
        ) : null}
        <label>
          Corrosion Implicit
          <select
            data-edit-corrosion=""
            value={fields.corrosion.value}
            onChange={(event) => field("corrosion", event.target.value)}
          >
            {/* Without a corrosion implicit both options hold "" (the legacy editor's), so they are keyed by position. */}
            {fields.corrosion.options.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <h3>{editor.heading}</h3>
        <div className="gear-mod-editor">
          {lines.length ? lines : <p>No modifiers configured.</p>}
          {editor.corrosionLines.map((line, index) => (
            <div key={`corroded:${index}`} className="fixed-mod corrosion-affix">
              <b>Corroded</b>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </section>
      <aside>
        <small>Preview</small>
        <ItemPreview preview={editor.preview} />
      </aside>
    </div>
  );
}

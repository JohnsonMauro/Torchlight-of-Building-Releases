// The item editor (Edit on a legendary or captured item, in the Inventory item dialog): name, Item level, Equipment
// Energy, base, Belt Blend, TOWER Sequence, corrosion implicit, then a legendary's catalog lines with their controls, or
// another item's lines as text fields, and the preview. Fields and controls are changes to the planner's editor state
// (src/app/gear/gear-controller.js changeInventoryItemEditor); the dialog's Save Changes saves them.
import { useState } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type {
  InventoryItemEditorChange,
  InventoryItemEditorView,
} from "@legacy/app/bridge/inventory-item-editor-view.ts";
import { LiveNumberInput } from "../../ui/LiveNumberInput";
import {
  CONTROL,
  CRAFT_ASIDE,
  CRAFT_ASIDE_LABEL,
  CRAFT_FORM,
  CRAFT_HEADING,
  CRAFT_LAYOUT,
  FIELD,
  FIELD_PAIR,
  MOD_BOX,
  MOD_BOX_CORRODED,
  MOD_TAG,
  MOD_TAG_CORRODED,
  RANGE,
  ROLL_NUMBER,
  ROLL_ROW,
  ROLL_VALUE,
  SELECTED_CARD,
  SELECTED_CHANGE,
  SELECTED_ICON,
} from "./crafter-classes";
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
    <span className={ROLL_ROW}>
      <input
        type="range"
        className={RANGE}
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        data-modifier-roll=""
        onChange={(event) => setValue(Number(event.target.value))}
      />
      <LiveNumberInput
        className={`affix-roll-number ${ROLL_NUMBER}`}
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
          className={`${CONTROL} flex-1`}
          data-edit-modifier={line.index}
          value={line.value}
          onChange={(event) => change({ kind: "text", index: line.index, value: event.target.value })}
        />
      );
      return line.range ? (
        <label key={line.index} className={MOD_BOX}>
          <span className="flex items-center gap-2.5">
            <b className={MOD_TAG}>Normal</b>
            {input}
          </span>
          <TextLineRoll range={line.range} />
          <em className={ROLL_VALUE}>{`${line.range.min}–${line.range.max}`}</em>
        </label>
      ) : (
        <div key={line.index} className={`fixed-mod ${MOD_BOX} grid-cols-[auto_minmax(0,1fr)] items-center`}>
          <b className={MOD_TAG}>Normal</b>
          {input}
        </div>
      );
    }),
  ];
  return (
    <div className={CRAFT_LAYOUT}>
      <section className={CRAFT_FORM}>
        <div className={SELECTED_CARD}>
          <img src={editor.icon} alt="" className={SELECTED_ICON} />
          <span className="min-w-0">
            <strong className="block text-[1.05rem] text-[#ff9a3f]">{editor.name}</strong>
            <small className="block text-[0.82rem] text-[#c9d1da]">{editor.detail}</small>
          </span>
          <button type="button" className={SELECTED_CHANGE} data-change-edit-item="">
            Change
          </button>
        </div>
        <label className={FIELD}>
          Name
          <input
            className={CONTROL}
            data-inventory-edit-name=""
            value={fields.name}
            onChange={(event) => field("name", event.target.value)}
          />
        </label>
        <div className={FIELD_PAIR}>
          <label className={FIELD}>
            Item level
            <input
              className={CONTROL}
              type="number"
              min="1"
              max="100"
              data-inventory-edit-level=""
              value={fields.level}
              onChange={(event) => field("level", event.target.value)}
            />
          </label>
          {fields.energy !== null ? (
            <label className={FIELD}>
              Equipment Energy
              <input
                className={CONTROL}
                type="number"
                min="0"
                data-inventory-edit-energy=""
                value={fields.energy}
                onChange={(event) => field("energy", event.target.value)}
              />
            </label>
          ) : null}
        </div>
        <label className={FIELD}>
          Base item
          <input
            className={CONTROL}
            data-inventory-edit-base=""
            value={fields.base}
            onChange={(event) => field("base", event.target.value)}
          />
        </label>
        {fields.beltBlend ? (
          <label className={FIELD}>
            Belt Blend
            <select
              className={CONTROL}
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
          <label className={FIELD}>
            TOWER Sequence
            <select
              className={CONTROL}
              data-edit-tower-sequence=""
              value={fields.sequence.value}
              onChange={(event) => field("sequenceId", event.target.value)}
            >
              <option value="">None</option>
              <Choices choices={fields.sequence.choices} />
            </select>
          </label>
        ) : null}
        <label className={FIELD}>
          Corrosion Implicit
          <select
            className={CONTROL}
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
        <h3 className={CRAFT_HEADING}>{editor.heading}</h3>
        <div className="gear-mod-editor grid gap-2.5">
          {lines.length ? lines : <p className="text-[0.82rem] text-muted">No modifiers configured.</p>}
          {editor.corrosionLines.map((line, index) => (
            <div
              key={`corroded:${index}`}
              className={`fixed-mod corrosion-affix ${MOD_BOX_CORRODED} grid-cols-[auto_minmax(0,1fr)] items-center`}
            >
              <b className={MOD_TAG_CORRODED}>Corroded</b>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </section>
      <aside className={CRAFT_ASIDE}>
        <small className={CRAFT_ASIDE_LABEL}>Preview</small>
        <ItemPreview preview={editor.preview} />
      </aside>
    </div>
  );
}

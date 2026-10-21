// The equipment crafter's legendary views: the list (a search over names and mods, the first 120) and a legendary's
// configuration (base, Belt Blend, Equipment Energy, TOWER Sequence, corrosion implicit and its roll, and each line with
// its corroded form, ring effect, random roll, tier and rolls), with the preview. Each control is a change to the
// planner's draft (src/app/gear/equipment-craft.ts).
import type { CraftChange } from "@legacy/app/gear/equipment-craft.ts";
import type { EquipmentCrafterBody, LegendaryConfigView } from "@legacy/app/bridge/equipment-crafter-view.ts";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { CSSProperties } from "react";
import {
  CONTROL,
  CRAFT_ASIDE,
  CRAFT_ASIDE_LABEL,
  CRAFT_FORM,
  CRAFT_HEADING,
  CRAFT_LAYOUT,
  FIELD,
  MOD_BOX_CORRODED,
  MOD_TAG_CORRODED,
  RANGE,
  SELECTED_CARD,
  SELECTED_CHANGE,
  SELECTED_DETAIL,
  SELECTED_ICON,
  SELECTED_NAME,
} from "./crafter-classes";
import { Choices, ItemPreview, LegendaryModControl, Options, type LegendaryLineChange } from "./crafter-parts";

// The list column: the search, the results (they scroll), the count.
const LIST_COLUMN =
  "grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 border-r border-line p-4 max-[800px]:shrink-0 max-[800px]:border-r-0";
// A legendary in the list: its art, name and slot · level.
const CHOICE =
  "legendary-choice grid min-h-17.5 cursor-pointer grid-cols-[54px_minmax(0,1fr)] items-center gap-2.5 rounded border border-line bg-raised p-2 text-left text-text hover:border-accent focus-visible:border-accent focus-visible:outline-none";

const change = (craftChange: CraftChange) => plannerCommands().changeEquipmentCraft(craftChange);
const LINE_NAMES = {
  toggle: "data-toggle-legendary-corrosion",
  text: "data-legendary-mod",
  ring: "data-legendary-ring-option",
  placeholder: "data-legendary-placeholder",
  tier: "data-legendary-tier",
  roll: "data-legendary-roll",
};
function craftLineChange(index: number, lineChange: LegendaryLineChange): CraftChange {
  switch (lineChange.kind) {
    case "corrosion":
      return { kind: "toggleLegendaryCorrosion", index };
    case "ring":
      return { kind: "legendaryRing", value: lineChange.value };
    case "placeholder":
      return { kind: "legendaryPlaceholder", index, value: lineChange.value };
    case "tier":
      return { kind: "legendaryTier", index, value: lineChange.value };
    default:
      return {
        kind: "roll",
        group: "legendary",
        index,
        rangeIndex: lineChange.rangeIndex,
        value: lineChange.value,
        commit: lineChange.commit,
      };
  }
}

export function LegendaryList({ list }: { list: Extract<EquipmentCrafterBody, { kind: "legendaryList" }> }) {
  return (
    <div className={CRAFT_LAYOUT}>
      <section className={LIST_COLUMN}>
        <label className="field-search">
          ⌕
          <input
            className="flex-1"
            type="search"
            data-legendary-search=""
            value={list.search}
            placeholder="Search legendary or @Mod…"
            onChange={(event) => change({ kind: "search", value: event.target.value })}
          />
        </label>
        <div className="grid min-h-0 grid-cols-2 content-start gap-2 overflow-auto max-[800px]:grid-cols-1">
          {/* An id can repeat in the catalog (Unholy Prayer), so the list is keyed by position. */}
          {list.results.map((entry, index) => (
            <button
              key={index}
              type="button"
              className={CHOICE}
              data-legendary-id={entry.id}
              onClick={() => change({ kind: "legendary", id: entry.id })}
            >
              <img src={entry.icon} alt="" className="h-14.5 w-13 object-contain" />
              <span className="min-w-0">
                <strong className="block">{entry.name}</strong>
                <small className="mt-1 block text-xs text-muted">{entry.detail}</small>
              </span>
            </button>
          ))}
        </div>
        <small className="text-sm text-muted">{list.count}</small>
      </section>
      <aside className={CRAFT_ASIDE}>
        <p>Select a legendary item to configure it.</p>
      </aside>
    </div>
  );
}

export function LegendaryConfig({ config }: { config: LegendaryConfigView }) {
  return (
    <div className={CRAFT_LAYOUT}>
      <section className={CRAFT_FORM}>
        <div className={SELECTED_CARD}>
          <img src={config.icon} alt="" className={SELECTED_ICON} />
          <span className="min-w-0">
            <strong className={SELECTED_NAME}>{config.name}</strong>
            <small className={SELECTED_DETAIL}>{config.slot}</small>
          </span>
          <button
            type="button"
            className={SELECTED_CHANGE}
            data-change-legendary=""
            onClick={() => change({ kind: "changeLegendary" })}
          >
            Change
          </button>
        </div>
        <label className={FIELD}>
          Base
          <select
            className={CONTROL}
            data-legendary-base=""
            value={config.base}
            onChange={(event) => change({ kind: "legendaryBase", value: event.target.value })}
          >
            {config.bases.map((base) => (
              <option key={base} value={base}>
                {base}
              </option>
            ))}
          </select>
        </label>
        {config.beltBlend ? (
          <label className={FIELD}>
            Belt Blend
            <select
              className={CONTROL}
              data-legendary-belt-blend=""
              value={config.beltBlend.value}
              onChange={(event) => change({ kind: "legendaryBeltBlend", value: event.target.value })}
            >
              <option value="">None</option>
              <Choices choices={config.beltBlend.choices} />
            </select>
          </label>
        ) : null}
        {config.energy !== null ? (
          <label className={FIELD}>
            Equipment Energy
            <input
              className={CONTROL}
              data-legendary-energy=""
              type="number"
              min="0"
              value={config.energy}
              onChange={(event) => change({ kind: "legendaryEnergy", value: event.target.value })}
            />
          </label>
        ) : null}
        {config.sequence ? (
          <label className={FIELD}>
            TOWER Sequence
            <select
              className={CONTROL}
              data-legendary-tower-sequence=""
              value={config.sequence.value}
              onChange={(event) => change({ kind: "legendarySequence", value: event.target.value })}
            >
              <option value="">None</option>
              <Choices choices={config.sequence.choices} />
            </select>
          </label>
        ) : null}
        <label className={FIELD}>
          Corrosion Implicit
          <select
            className={CONTROL}
            data-legendary-corrosion=""
            value={config.corrosion}
            onChange={(event) => change({ kind: "legendaryCorrosion", value: Number(event.target.value) })}
          >
            <option value="-1">None</option>
            <Options options={config.corrosions} />
          </select>
        </label>
        {config.corroded ? (
          <div className={`fixed-mod corrosion-affix ${MOD_BOX_CORRODED}`}>
            <span className="flex items-start gap-2.5">
              <b className={MOD_TAG_CORRODED}>Corroded</b>
              <span data-corrosion-text="">{config.corroded.text}</span>
            </span>
            {config.corroded.roll !== null ? (
              <input
                type="range"
                min="0"
                max="100"
                value={config.corroded.roll}
                className={RANGE}
                data-corrosion-roll=""
                style={{ "--range-fill": `${config.corroded.roll}%` } as CSSProperties}
                onChange={(event) => change({ kind: "corrosionRoll", value: Number(event.target.value) })}
              />
            ) : null}
          </div>
        ) : null}
        <h3 className={CRAFT_HEADING}>Legendary Mods</h3>
        <div className="grid gap-2.5">
          {config.lines.map((line) => (
            <LegendaryModControl
              key={line.index}
              line={line}
              names={LINE_NAMES}
              onChange={(lineChange) => change(craftLineChange(line.index, lineChange))}
            />
          ))}
        </div>
      </section>
      <aside id="legendary-config-preview" className={CRAFT_ASIDE}>
        <small className={CRAFT_ASIDE_LABEL}>Preview</small>
        <ItemPreview preview={config.preview} />
      </aside>
    </div>
  );
}

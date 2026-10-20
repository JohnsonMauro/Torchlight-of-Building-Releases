// The equipment crafter's legendary views: the list (a search over names and mods, the first 120) and a legendary's
// configuration (base, Belt Blend, Equipment Energy, TOWER Sequence, corrosion implicit and its roll, and each line with
// its corroded form, ring effect, random roll, tier and rolls), with the preview. Each control is a change to the
// planner's draft (src/app/gear/equipment-craft.ts).
import type { CraftChange } from "@legacy/app/gear/equipment-craft.ts";
import type { EquipmentCrafterBody, LegendaryConfigView } from "@legacy/app/bridge/equipment-crafter-view.ts";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { CSSProperties } from "react";
import { Choices, ItemPreview, LegendaryModControl, Options, type LegendaryLineChange } from "./crafter-parts";

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
    <div className="legendary-craft-layout">
      <section>
        <label className="gear-search">
          ⌕
          <input
            type="search"
            data-legendary-search=""
            value={list.search}
            placeholder="Search legendary or @Mod…"
            onChange={(event) => change({ kind: "search", value: event.target.value })}
          />
        </label>
        <div className="legendary-results">
          {/* An id can repeat in the catalog (Unholy Prayer), so the list is keyed by position. */}
          {list.results.map((entry, index) => (
            <button
              key={index}
              type="button"
              className="legendary-choice"
              data-legendary-id={entry.id}
              onClick={() => change({ kind: "legendary", id: entry.id })}
            >
              <img src={entry.icon} alt="" />
              <span>
                <strong>{entry.name}</strong>
                <small>{entry.detail}</small>
              </span>
            </button>
          ))}
        </div>
        <small>{list.count}</small>
      </section>
      <aside>
        <p>Select a legendary item to configure it.</p>
      </aside>
    </div>
  );
}

export function LegendaryConfig({ config }: { config: LegendaryConfigView }) {
  return (
    <div className="legendary-config-layout">
      <section>
        <div className="gear-edit-selected">
          <img src={config.icon} alt="" />
          <span>
            <strong>{config.name}</strong>
            <small>{config.slot}</small>
          </span>
          <button type="button" data-change-legendary="" onClick={() => change({ kind: "changeLegendary" })}>
            Change
          </button>
        </div>
        <label>
          Base
          <select
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
          <label>
            Belt Blend
            <select
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
          <label>
            Equipment Energy
            <input
              data-legendary-energy=""
              type="number"
              min="0"
              value={config.energy}
              onChange={(event) => change({ kind: "legendaryEnergy", value: event.target.value })}
            />
          </label>
        ) : null}
        {config.sequence ? (
          <label>
            TOWER Sequence
            <select
              data-legendary-tower-sequence=""
              value={config.sequence.value}
              onChange={(event) => change({ kind: "legendarySequence", value: event.target.value })}
            >
              <option value="">None</option>
              <Choices choices={config.sequence.choices} />
            </select>
          </label>
        ) : null}
        <label>
          Corrosion Implicit
          <select
            data-legendary-corrosion=""
            value={config.corrosion}
            onChange={(event) => change({ kind: "legendaryCorrosion", value: Number(event.target.value) })}
          >
            <option value="-1">None</option>
            <Options options={config.corrosions} />
          </select>
        </label>
        {config.corroded ? (
          <div className="fixed-mod corrosion-affix">
            <b>Corroded</b>
            <span data-corrosion-text="">{config.corroded.text}</span>
            {config.corroded.roll !== null ? (
              <input
                type="range"
                min="0"
                max="100"
                value={config.corroded.roll}
                data-corrosion-roll=""
                style={{ "--range-fill": `${config.corroded.roll}%` } as CSSProperties}
                onChange={(event) => change({ kind: "corrosionRoll", value: Number(event.target.value) })}
              />
            ) : null}
          </div>
        ) : null}
        <h3>Legendary Mods</h3>
        <div className="gear-mod-editor">
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
      <aside id="legendary-config-preview">
        <small>Preview</small>
        <ItemPreview preview={config.preview} />
      </aside>
    </div>
  );
}

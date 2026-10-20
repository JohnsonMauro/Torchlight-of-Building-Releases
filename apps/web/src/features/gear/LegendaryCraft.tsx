// The equipment crafter's legendary views: the list (a search over names and mods, the first 120) and a legendary's
// configuration (base, Belt Blend, Equipment Energy, TOWER Sequence, corrosion implicit and its roll, and each line with
// its corroded form, ring effect, random roll, tier and rolls), with the preview. Each control is a change to the
// planner's draft (src/app/gear/equipment-craft.ts).
import type { CraftChange } from "@legacy/app/gear/equipment-craft.ts";
import type { EquipmentCrafterBody, LegendaryConfigView } from "@legacy/app/bridge/equipment-crafter-view.ts";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { CSSProperties } from "react";
import { Choices, ItemPreview, ModifierText, Options, RollInputs } from "./crafter-parts";

const change = (craftChange: CraftChange) => plannerCommands().changeEquipmentCraft(craftChange);

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
            <div key={line.index} className={`legendary-mod-control ${line.corroded ? "corrosion-affix" : ""}`}>
              <span>
                <button
                  type="button"
                  data-toggle-legendary-corrosion={line.index}
                  disabled={!line.canCorrode}
                  onClick={() => change({ kind: "toggleLegendaryCorrosion", index: line.index })}
                >
                  {line.corroded ? "Corroded" : "Normal"}
                </button>
                <span data-legendary-mod={line.index}>
                  <ModifierText text={line.text} />
                </span>
              </span>
              {line.ring ? (
                <label className="legendary-ring-choice">
                  Ring effect
                  <select
                    data-legendary-ring-option=""
                    value={line.ring}
                    onChange={(event) =>
                      change({ kind: "legendaryRing", value: event.target.value === "right" ? "right" : "left" })
                    }
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
                    data-legendary-placeholder={line.index}
                    value={line.placeholder.value}
                    onChange={(event) =>
                      change({ kind: "legendaryPlaceholder", index: line.index, value: event.target.value })
                    }
                  >
                    <Options options={line.placeholder.options} />
                  </select>
                </label>
              ) : null}
              {line.tier ? (
                <label className="legendary-ring-choice">
                  Tier
                  <select
                    data-legendary-tier={line.index}
                    value={line.tier.value}
                    onChange={(event) =>
                      change({ kind: "legendaryTier", index: line.index, value: Number(event.target.value) })
                    }
                  >
                    <Options options={line.tier.options} />
                  </select>
                </label>
              ) : null}
              {line.rolls.map((roll) => (
                <label key={roll.rangeIndex}>
                  <RollInputs
                    roll={roll}
                    attributes={{ "data-legendary-roll": line.index, "data-range-index": roll.rangeIndex }}
                    onValue={(value, commit) =>
                      change({
                        kind: "roll",
                        group: "legendary",
                        index: line.index,
                        rangeIndex: roll.rangeIndex,
                        value,
                        commit,
                      })
                    }
                  />
                </label>
              ))}
            </div>
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

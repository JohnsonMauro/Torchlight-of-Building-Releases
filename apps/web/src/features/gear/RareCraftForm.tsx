// The equipment crafter's rare and Vorax form: name, Item Level, type, base, Belt Blend, two base affixes, Equipment
// Energy, TOWER Sequence, three prefixes (a Vorax item's organ affixes, each able to inherit a Legendary affix) and three
// suffixes with their tiers and rolls, and the preview. Each control is a change to the planner's draft
// (src/app/gear/equipment-craft.ts); the fields a slot does not allow stay hidden, as before.
import type { CraftChange } from "@legacy/app/gear/equipment-craft.ts";
import type { CraftAffixView, RareFormView } from "@legacy/app/bridge/equipment-crafter-view.ts";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { Choices, ItemPreview, Options, RollInputs } from "./crafter-parts";

const change = (craftChange: CraftChange) => plannerCommands().changeEquipmentCraft(craftChange);

function CraftAffix({ affix }: { affix: CraftAffixView }) {
  const { index, config } = affix,
    active = Boolean(affix.legendaryToggle?.active);
  return (
    <div className={`craft-affix-control${active ? " legendary-affix-active" : ""}`}>
      <span>
        {affix.legendaryToggle ? (
          <button
            type="button"
            className="vorax-legendary-toggle"
            data-toggle-vorax-legendary={index}
            data-legendary-active={String(active)}
            aria-pressed={active}
            title="Use a Legendary item affix in this slot"
            onClick={() => change({ kind: "voraxLegendary", index })}
          >
            <b>L</b>
            <i />
          </button>
        ) : null}
        <span>{affix.label}</span>
      </span>
      <select
        data-craft-affix-family={index}
        value={affix.family}
        onChange={(event) => change({ kind: "affixFamily", index, value: event.target.value })}
      >
        <option value="">None</option>
        <Options options={affix.families} />
      </select>
      <div className="craft-affix-config" data-craft-affix-config={index}>
        {config.kind === "warning" ? (
          <small className="affix-level-warning">No tiers available at this item level.</small>
        ) : config.kind === "tiers" ? (
          <>
            {config.tier ? (
              <label className="craft-tier-select">
                Tier
                <select
                  data-craft-affix-tier={index}
                  value={config.tier.value}
                  onChange={(event) => change({ kind: "affixTier", index, value: event.target.value })}
                >
                  <Options options={config.tier.options} />
                </select>
              </label>
            ) : null}
            <div className="craft-tier-rolls" data-craft-affix-rolls={index}>
              {config.rolls.map((roll) => (
                <label key={roll.rangeIndex}>
                  <RollInputs
                    roll={roll}
                    attributes={{ "data-craft-affix-roll": index, "data-range-index": roll.rangeIndex }}
                    onValue={(value, commit) =>
                      change({ kind: "roll", group: "affix", index, rangeIndex: roll.rangeIndex, value, commit })
                    }
                  />
                </label>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function RareCraftForm({ form }: { form: RareFormView }) {
  return (
    <div className="rare-craft-layout detailed-crafter">
      <section>
        <div className="craft-name-level">
          <label>
            Name
            <input
              data-craft-name=""
              placeholder="Custom name (optional)"
              value={form.name}
              onChange={(event) => change({ kind: "name", value: event.target.value })}
            />
          </label>
          <label>
            Item Level
            <input
              data-craft-level=""
              type="number"
              min="1"
              max="100"
              value={form.level}
              onChange={(event) => change({ kind: "level", value: event.target.value })}
            />
          </label>
        </div>
        <label>
          Item Type
          <select
            data-craft-type=""
            value={form.type}
            onChange={(event) => change({ kind: "type", value: event.target.value })}
          >
            <Options options={form.types} />
          </select>
        </label>
        <label>
          Base Item
          <select
            data-craft-base=""
            value={form.base}
            onChange={(event) => change({ kind: "base", value: event.target.value })}
          >
            <Options options={form.bases} />
          </select>
        </label>
        <label data-belt-blend-field="" hidden={!form.beltBlendShown}>
          Belt Blend
          <select
            data-craft-belt-blend=""
            value={form.beltBlend}
            onChange={(event) => change({ kind: "beltBlend", value: event.target.value })}
          >
            <option value="">None</option>
            <Choices choices={form.beltBlends} />
          </select>
        </label>
        {form.baseAffixes.map((affix) => (
          <div key={affix.index} className="base-affix-control">
            <label>
              {`Base Affix ${affix.index + 1}`}
              <select
                data-craft-base-affix={affix.index}
                value={affix.value}
                onChange={(event) => change({ kind: "baseAffix", index: affix.index, value: event.target.value })}
              >
                <option value="">None</option>
                <Options options={affix.options} />
              </select>
            </label>
            <div className="base-affix-rolls" data-base-affix-rolls={affix.index}>
              {affix.rolls.map((roll) => (
                <label key={roll.rangeIndex} className="base-affix-roll">
                  <RollInputs
                    roll={roll}
                    attributes={{ "data-base-affix-roll": affix.index, "data-range-index": roll.rangeIndex }}
                    onValue={(value, commit) =>
                      change({
                        kind: "roll",
                        group: "base",
                        index: affix.index,
                        rangeIndex: roll.rangeIndex,
                        value,
                        commit,
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <label>
          Corrosion Implicit
          <select>
            <option>None</option>
            <option>Corroded implicit</option>
          </select>
        </label>
        <div className="craft-energy-row">
          <label data-equipment-energy-field="" hidden={!form.energyShown}>
            Equipment Energy
            <input
              data-craft-energy=""
              type="number"
              min="0"
              value={form.energy}
              onChange={(event) => change({ kind: "energy", value: event.target.value })}
            />
          </label>
          <label data-tower-sequence-field="" hidden={!form.sequenceShown}>
            TOWER Sequence
            <select
              data-craft-sequence=""
              value={form.sequence}
              onChange={(event) => change({ kind: "sequence", value: event.target.value })}
            >
              <option value="">None</option>
              <Choices choices={form.sequences} />
            </select>
          </label>
        </div>
        <h3>{form.prefixHeading}</h3>
        {form.affixes.slice(0, 3).map((affix) => (
          <CraftAffix key={affix.index} affix={affix} />
        ))}
        <h3>Suffixes</h3>
        {form.affixes.slice(3).map((affix) => (
          <CraftAffix key={affix.index} affix={affix} />
        ))}
      </section>
      <aside id="crafted-equipment-preview">
        <small>Preview</small>
        <ItemPreview preview={form.preview} />
      </aside>
    </div>
  );
}

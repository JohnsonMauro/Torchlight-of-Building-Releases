// The equipment crafter's rare and Vorax form: name, Item Level (a rare's up to 89, or Priceless: 100), type, base, Belt Blend, two base affixes, Equipment
// Energy, TOWER Sequence, three prefixes (a Vorax item's organ affixes, each able to inherit a Legendary affix) and three
// suffixes with their tiers and rolls, and the preview. Each control is a change to the planner's draft
// (src/app/gear/equipment-craft.ts); the fields a slot does not allow stay hidden, as before.
import type { ReactNode } from "react";
import type { CraftChange } from "@legacy/app/gear/equipment-craft.ts";
import type { CraftAffixView, RareFormView } from "@legacy/app/bridge/equipment-crafter-view.ts";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
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
  MOD_BOX_LEGENDARY,
} from "./crafter-classes";
import { Choices, ItemPreview, Options, RollInputs } from "./crafter-parts";
import { AffixList, BaseAffixList } from "./AffixList";
import { CraftPath } from "./CraftPicker";

// The Vorax Legendary toggle: an L badge and a switch whose knob moves right and takes the legendary orange when
// pressed.
const LEGENDARY_TOGGLE =
  "group flex cursor-pointer items-center gap-0.5 text-muted hover:text-text aria-pressed:text-grade-legendary";
const LEGENDARY_TOGGLE_BADGE = "grid size-3.75 place-items-center rounded-full border border-current text-[10px]";
const LEGENDARY_TOGGLE_SWITCH =
  "relative h-3 w-6.5 rounded-full border border-line-strong bg-sunken after:absolute after:top-px after:left-0.5 after:size-2 after:rounded-full after:bg-dim after:transition-[left] after:content-[''] group-aria-pressed:border-grade-legendary group-aria-pressed:bg-grade-legendary/25 group-aria-pressed:after:left-3.5 group-aria-pressed:after:bg-grade-legendary";

const change = (craftChange: CraftChange) => plannerCommands().changeEquipmentCraft(craftChange);

/** A Vorax slot: its family, tier and rolls. */
function CraftAffix({ affix }: { affix: CraftAffixView }) {
  const { index, config } = affix,
    active = Boolean(affix.legendaryToggle?.active);
  return (
    <div className={`craft-affix-control ${active ? `legendary-affix-active ${MOD_BOX_LEGENDARY}` : MOD_BOX}`}>
      <span className="flex items-center gap-2.25 text-sm text-text">
        {affix.legendaryToggle ? (
          <button
            type="button"
            className={LEGENDARY_TOGGLE}
            data-toggle-vorax-legendary={index}
            data-legendary-active={String(active)}
            aria-pressed={active}
            title="Use a Legendary item affix in this slot"
            onClick={() => change({ kind: "voraxLegendary", index })}
          >
            <b className={LEGENDARY_TOGGLE_BADGE}>L</b>
            <i className={LEGENDARY_TOGGLE_SWITCH} />
          </button>
        ) : null}
        <span className="flex-1">{affix.label}</span>
      </span>
      <select
        className={CONTROL}
        data-craft-affix-family={index}
        value={affix.family}
        onChange={(event) => change({ kind: "affixFamily", index, value: event.target.value })}
      >
        <option value="">None</option>
        <Options options={affix.families} />
      </select>
      <div className="craft-affix-config grid gap-2" data-craft-affix-config={index}>
        {config.kind === "warning" ? (
          <small className="text-xs text-danger">No tiers available at this item level.</small>
        ) : config.kind === "tiers" ? (
          <>
            {config.tier ? (
              <label className={FIELD}>
                Tier
                <select
                  className={CONTROL}
                  data-craft-affix-tier={index}
                  value={config.tier.value}
                  onChange={(event) => change({ kind: "affixTier", index, value: event.target.value })}
                >
                  <Options options={config.tier.options} />
                </select>
              </label>
            ) : null}
            <div className="grid gap-2" data-craft-affix-rolls={index}>
              {config.rolls.map((roll) => (
                <label key={roll.rangeIndex} className="grid gap-1">
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

/** A rare's affix section, folded by its heading (open at first). */
function CraftSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <details open className="group/section border-t border-line pt-3" data-craft-section="">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="text-muted transition-transform group-open/section:rotate-90">
          ›
        </span>
        <h3>{heading}</h3>
      </summary>
      <div className="mt-3 grid gap-3">{children}</div>
    </details>
  );
}

export function RareCraftForm({ form }: { form: RareFormView }) {
  return (
    <div className={CRAFT_LAYOUT}>
      <section className={CRAFT_FORM}>
        {form.path ? <CraftPath path={form.path} /> : null}
        {/* Level and Energy take the same width; the name takes what is left. */}
        <div
          className={`grid gap-3 max-[800px]:grid-cols-1 ${form.energyShown ? "grid-cols-[minmax(0,1fr)_96px_96px_auto_auto]" : "grid-cols-[minmax(0,1fr)_96px_auto_auto]"}`}
        >
          <label className={FIELD}>
            Name
            <input
              className={CONTROL}
              data-craft-name=""
              placeholder="Custom name (optional)"
              value={form.name}
              onChange={(event) => change({ kind: "name", value: event.target.value })}
            />
          </label>
          <label className={FIELD} data-equipment-energy-field="" hidden={!form.energyShown}>
            Energy
            <input
              className={CONTROL}
              data-craft-energy=""
              type="number"
              min="0"
              value={form.energy}
              onChange={(event) => change({ kind: "energy", value: event.target.value })}
            />
          </label>
          <label className={FIELD}>
            Item Level
            <input
              className={`${CONTROL} off:cursor-not-allowed off:text-muted`}
              data-craft-level=""
              type="number"
              min="1"
              max={form.levelMax}
              disabled={form.priceless === true}
              value={form.level}
              onChange={(event) => change({ kind: "level", value: event.target.value })}
            />
          </label>
          {form.priceless === null ? null : (
            <label className="flex items-center gap-2 self-end pb-2.5 text-xs text-muted">
              <input
                type="checkbox"
                className="size-4 accent-accent"
                data-craft-priceless=""
                checked={form.priceless}
                onChange={(event) => change({ kind: "priceless", value: event.target.checked })}
              />
              Priceless
            </label>
          )}
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2.5 text-xs text-muted">
            <input
              type="checkbox"
              className="size-4 accent-accent"
              data-craft-corroded=""
              checked={form.corroded}
              onChange={(event) => change({ kind: "corroded", value: event.target.checked })}
            />
            Corroded
          </label>
        </div>
        {form.path ? null : (
          <>
            <label className={FIELD}>
              Item Type
              <select
                className={CONTROL}
                data-craft-type=""
                value={form.type}
                onChange={(event) => change({ kind: "type", value: event.target.value })}
              >
                <Options options={form.types} />
              </select>
            </label>
            <label className={FIELD}>
              Base Item
              <select
                className={CONTROL}
                data-craft-base=""
                value={form.base}
                onChange={(event) => change({ kind: "base", value: event.target.value })}
              >
                <Options options={form.bases} />
              </select>
            </label>
          </>
        )}
        <label className={FIELD} data-belt-blend-field="" hidden={!form.beltBlendShown}>
          Belt Blend
          <select
            className={CONTROL}
            data-craft-belt-blend=""
            value={form.beltBlend}
            onChange={(event) => change({ kind: "beltBlend", value: event.target.value })}
          >
            <option value="">None</option>
            <Choices choices={form.beltBlends} />
          </select>
        </label>
        {form.baseAffixList ? (
          <CraftSection heading={`Base affixes (${form.baseAffixList.count})`}>
            <BaseAffixList list={form.baseAffixList} />
          </CraftSection>
        ) : (
          form.baseAffixes.map((affix) => (
            <div key={affix.index} className="grid gap-2">
              <label className={FIELD}>
                {`Base Affix ${affix.index + 1}`}
                <select
                  className={CONTROL}
                  data-craft-base-affix={affix.index}
                  value={affix.value}
                  onChange={(event) => change({ kind: "baseAffix", index: affix.index, value: event.target.value })}
                >
                  <option value="">None</option>
                  <Options options={affix.options} />
                </select>
              </label>
              <div
                className={`base-affix-rolls grid gap-2 ${affix.rolls.length ? "" : "hidden"}`}
                data-base-affix-rolls={affix.index}
              >
                {affix.rolls.map((roll) => (
                  <label key={roll.rangeIndex} className="base-affix-roll grid gap-1">
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
          ))
        )}
        <div className={FIELD_PAIR}>
          <label className={FIELD} data-tower-sequence-field="" hidden={!form.sequenceShown}>
            TOWER Sequence
            <select
              className={CONTROL}
              data-craft-sequence=""
              value={form.sequence}
              onChange={(event) => change({ kind: "sequence", value: event.target.value })}
            >
              <option value="">None</option>
              <Choices choices={form.sequences} />
            </select>
          </label>
        </div>
        {form.affixLists ? (
          form.affixLists.map((list) => (
            <CraftSection key={list.side} heading={`${list.heading} (${list.count})`}>
              <AffixList list={list} />
            </CraftSection>
          ))
        ) : (
          <>
            <h3 className={CRAFT_HEADING}>{form.prefixHeading}</h3>
            {form.affixes.slice(0, 3).map((affix) => (
              <CraftAffix key={affix.index} affix={affix} />
            ))}
            <h3 className={CRAFT_HEADING}>Suffixes</h3>
            {form.affixes.slice(3).map((affix) => (
              <CraftAffix key={affix.index} affix={affix} />
            ))}
          </>
        )}
      </section>
      <aside id="crafted-equipment-preview" className={CRAFT_ASIDE}>
        <small className={CRAFT_ASIDE_LABEL}>Preview</small>
        <ItemPreview preview={form.preview} />
      </aside>
    </div>
  );
}

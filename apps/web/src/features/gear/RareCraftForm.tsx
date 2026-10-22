// The equipment crafter's rare and Vorax form: its path back to the picker, name, Equipment Energy, Item Level (a rare's
// up to 89, or Priceless: 100), Corroded, the base affix list, Belt Blend and TOWER Sequence, and the prefix and suffix lists (a Vorax
// item's prefixes are its organ affixes, and either side can take a Legendary affix), and the preview. Each control is a
// change to the planner's draft (src/app/gear/equipment-craft.ts); the fields a slot does not allow stay hidden.
import type { CraftChange } from "@legacy/app/gear/equipment-craft.ts";
import type { RareFormView } from "@legacy/app/bridge/equipment-crafter-view.ts";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { CONTROL, CRAFT_ASIDE, CRAFT_ASIDE_LABEL, CRAFT_FORM, CRAFT_LAYOUT, FIELD } from "./crafter-classes";
import { choiceLabel } from "./choices";
import { ChoiceList, CraftSection, ItemPreview } from "./crafter-parts";
import { AffixList, BaseAffixList } from "./AffixList";
import { CraftPath } from "./CraftPicker";

const change = (craftChange: CraftChange) => plannerCommands().changeEquipmentCraft(craftChange);

export function RareCraftForm({ form }: { form: RareFormView }) {
  return (
    <div className={CRAFT_LAYOUT}>
      <section className={CRAFT_FORM}>
        <CraftPath path={form.path} />
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
        <CraftSection heading={`Base affixes (${form.baseAffixList.count})`}>
          <BaseAffixList list={form.baseAffixList} />
        </CraftSection>
        {form.beltBlendShown ? (
          <CraftSection
            heading="Belt Blend"
            summary={choiceLabel(form.beltBlends, form.beltBlend)}
            open={Boolean(form.beltBlend)}
          >
            <ChoiceList
              label="Belt Blend"
              choices={form.beltBlends}
              value={form.beltBlend}
              attributes={{ "data-craft-belt-blend": "" }}
              onChange={(value) => change({ kind: "beltBlend", value })}
            />
          </CraftSection>
        ) : null}
        {form.sequenceShown ? (
          <CraftSection
            heading="TOWER Sequence"
            summary={choiceLabel(form.sequences, form.sequence)}
            open={Boolean(form.sequence)}
          >
            <ChoiceList
              label="TOWER Sequence"
              choices={form.sequences}
              value={form.sequence}
              attributes={{ "data-craft-sequence": "" }}
              onChange={(value) => change({ kind: "sequence", value })}
            />
          </CraftSection>
        ) : null}
        {form.affixLists.map((list) => (
          <CraftSection key={list.side} heading={`${list.heading} (${list.count})`}>
            <AffixList list={list} />
          </CraftSection>
        ))}
      </section>
      <aside id="crafted-equipment-preview" className={CRAFT_ASIDE}>
        <small className={CRAFT_ASIDE_LABEL}>Preview</small>
        <ItemPreview preview={form.preview} />
      </aside>
    </div>
  );
}

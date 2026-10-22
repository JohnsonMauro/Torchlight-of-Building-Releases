// The hero memory crafter (Craft Memory, or Edit on a memory): the memory type, rarity, base stat and enhancement level,
// the revival (Wax and Wane, Rising Moon, a revived affix with its tier and roll), two fixed and two random affix lines
// with their tiers and rolls, and the preview. Every control is a planner command on the draft (src/app/hero/hero-memory-controller.js);
// the revived affix's select keeps data-memory-field="revivedAffix", which the planner's select search popover reads.
import { useLayoutEffect, useRef, useState } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { tierBadgeClasses } from "@legacy/app/gear/tier-badge.ts";
import type {
  MemoryAffixLineView,
  MemoryCrafterView,
  MemoryPreviewView,
  MemoryRollView,
} from "@legacy/app/bridge/hero-memory-view.ts";
import { CommitNumberInput } from "../../ui/CommitNumberInput";
import { RevivedEffect } from "./RevivedEffect";
import {
  affixRow,
  choiceRow,
  crafterForm,
  memoryAccent,
  previewCard,
  rarityButton,
  rollControls,
  switchInput,
  switchRow,
  tierButton,
  typeButton,
} from "./hero-memory-classes";
import { RangeInput } from "../../ui/RangeInput";
import { RANGE_FIELD, RANGE_NUMBER } from "../../ui/range-classes";

const commands = plannerCommands;
const craftAction = "btn min-h-10 flex-1 text-xs font-bold tracking-wider uppercase";

function RollControls({
  roll,
  label,
  onValue,
}: {
  roll: MemoryRollView;
  label: string;
  onValue: (value: number) => void;
}) {
  return (
    <RangeInput
      className="memory-roll-controls"
      min={roll.min}
      max={roll.max}
      value={roll.value}
      slider={{ "aria-label": `${label} roll slider` }}
      number={{ "aria-label": `${label} roll value` }}
      onValue={onValue}
    />
  );
}

/** A line whose tiers differ by a number: a slider over the tiers and the tier's number, applied on change. */
function TierValueControls({
  line,
  tierValue,
}: {
  line: MemoryAffixLineView;
  tierValue: NonNullable<MemoryAffixLineView["tierValue"]>;
}) {
  // The typed number shows the chosen tier's again once applied, as the planner's re-render did.
  const [commits, setCommits] = useState(0);
  return (
    <div className={`memory-roll-controls ${rollControls}`}>
      <input
        type="range"
        className={RANGE_FIELD}
        min={0}
        max={tierValue.count - 1}
        step={1}
        value={tierValue.index}
        aria-label={`${line.label} tier value slider`}
        onChange={(event) => commands().setMemoryTierPosition(line.group, line.index, Number(event.target.value))}
      />
      <CommitNumberInput
        className={RANGE_NUMBER}
        key={`${tierValue.value}:${commits}`}
        min={tierValue.min}
        max={tierValue.max}
        step="any"
        value={tierValue.value}
        aria-label={`${line.label} tier value`}
        onCommit={(text) => {
          setCommits(commits + 1);
          commands().setMemoryTierValue(line.group, line.index, text);
        }}
      />
    </div>
  );
}

function AffixLine({ line, onTier }: { line: MemoryAffixLineView; onTier: (focus: string[]) => void }) {
  const rollGroup = line.group === "fixedAffixes" ? "fixedRolls" : "randomRolls";
  return (
    <label>
      {line.label}
      <select
        aria-label={line.label}
        value={line.value}
        onChange={(event) => commands().setMemoryField(`${line.group}.${line.index}`, event.target.value)}
      >
        <option value="">None</option>
        {line.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {line.tiers.length ? (
        <span className="memory-tier-row flex gap-0.75">
          {line.tiers.map((tier) => (
            <button
              key={tier.tier}
              type="button"
              className={`${tier.active ? "active" : ""} ${tierButton}`}
              onClick={() => {
                // The tier's roll value (or, without a roll, the tier's number) takes the focus, as in the planner.
                onTier([`${line.label} roll value`, `${line.label} tier value`]);
                commands().setMemoryAffixTier(line.group, line.index, tier.tier);
              }}
            >
              {`T${tier.tier}`}
            </button>
          ))}
        </span>
      ) : null}
      {line.roll ? (
        <RollControls
          roll={line.roll}
          label={line.label}
          onValue={(value) => commands().setMemoryField(`${rollGroup}.${line.index}`, value)}
        />
      ) : line.tierValue ? (
        <TierValueControls line={line} tierValue={line.tierValue} />
      ) : null}
    </label>
  );
}

function AffixRows({ heading, rows }: { heading: string; rows: MemoryPreviewView["fixed"] }) {
  if (!rows.length) return null;
  return (
    <>
      <h4>{heading}</h4>
      {rows.map((row) => (
        <div key={row.index} className={`memory-affix-row ${affixRow}`}>
          {row.tier !== null ? <i className={tierBadgeClasses(`t${row.tier}`)}>{`T${row.tier}`}</i> : null}
          <span>{row.text}</span>
        </div>
      ))}
    </>
  );
}

function Preview({ preview }: { preview: MemoryPreviewView }) {
  return (
    <>
      <header className="flex items-center gap-2.5 border-b border-(--memory-accent) pb-2">
        <img src={preview.icon} alt="" className="size-8.75 object-contain" />
        <div>
          <strong className="block text-(--memory-accent)">{preview.type}</strong>
          <small className="mt-0.75 block text-muted uppercase">{`${preview.rarity} · HERO MEMORY`}</small>
        </div>
      </header>
      {preview.revived ? (
        <span className="memory-revival-badge mt-2 mb-0.5 inline-flex w-max items-center gap-1 rounded-sm border border-info bg-info/15 px-2 py-0.5 text-xs font-bold text-info">
          <span className="text-sm leading-none" aria-hidden="true">
            ☾
          </span>
          {" Revived"}
        </span>
      ) : null}
      <p className="mt-1.5">
        <span>{preview.enhancement}</span>
        <br />
        <span data-memory-trait-preview="">
          Trait Level <b className="memory-trait-bonus font-bold text-ok">{`+${preview.traitBonus}`}</b>
        </span>
      </p>
      <h4>Implicit</h4>
      <div className={`memory-implicit ${preview.waxAndWane ? "wax-applied font-bold text-ok" : ""}`}>
        {preview.implicit}
      </div>
      {preview.waxAndWane ? (
        <>
          <h4>Memory Revival</h4>
          <div>Wax and Wane · +30% base stat</div>
        </>
      ) : null}
      {preview.revivedAffix ? (
        <>
          <h4>{`Revived Affix${preview.revivedAffix.lunar ? " · Lunar Phase" : ""}`}</h4>
          <RevivedEffect effect={preview.revivedAffix.effect} />
        </>
      ) : null}
      <AffixRows heading="Fixed Affixes" rows={preview.fixed} />
      <AffixRows heading="Random Affixes" rows={preview.random} />
    </>
  );
}

export function HeroMemoryCrafter({ view }: { view: MemoryCrafterView }) {
  const form = useRef<HTMLElement>(null);
  // A tier button moves the focus to the first of these fields the crafter shows with the new tier.
  const focus = useRef<string[]>([]);
  useLayoutEffect(() => {
    const labels = focus.current;
    if (!labels.length) return;
    focus.current = [];
    const input = labels
      .map((label) => form.current?.querySelector<HTMLInputElement>(`input[aria-label="${CSS.escape(label)}"]`))
      .find(Boolean);
    if (!input) return;
    input.focus();
    input.select();
  });
  const onTier = (labels: string[]) => {
    focus.current = labels;
  };
  const count = (lines: MemoryAffixLineView[]) => lines.filter((line) => line.value).length;
  return (
    <div className="hero-memory-craft grid h-[min(690px,75vh)] grid-cols-[minmax(0,1.7fr)_minmax(240px,1fr)] gap-5.5 px-5.5 py-4 max-[700px]:h-[min(700px,78vh)] max-[700px]:grid-cols-1 max-[700px]:overflow-auto">
      <section className={`hero-memory-form ${crafterForm}`} ref={form}>
        <label>Memory Type</label>
        <div className={`hero-memory-choice-row memory-types ${choiceRow}`}>
          {view.types.map((type) => (
            <button
              key={type.type}
              type="button"
              className={`${type.active ? "active" : ""} ${typeButton}`}
              onClick={() => commands().setMemoryType(type.type)}
            >
              <img src={type.icon} alt="" className="h-6.5 w-6 object-contain" />
              {type.type}
            </button>
          ))}
        </div>
        <label>Crafting Rarity *</label>
        <div className={`hero-memory-choice-row rarities ${choiceRow}`}>
          {view.rarities.map((rarity) => (
            <button
              key={rarity.value}
              type="button"
              className={`memory-rarity-${rarity.value} ${rarity.active ? "active" : ""} ${rarityButton} ${memoryAccent(rarity.value)}`}
              onClick={() => commands().setMemoryRarity(rarity.value)}
            >
              {rarity.label}
            </button>
          ))}
        </div>
        <label>
          Base Stat *
          <select
            aria-label="Base stat"
            value={view.baseStat}
            onChange={(event) => commands().setMemoryField("baseStat", event.target.value)}
          >
            <option value="">None</option>
            {view.baseStats.map((stat) => (
              <option key={stat.value} value={stat.value}>
                {stat.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Enhancement Level <strong className="text-text">{`Lv.${view.enhancement.level}`}</strong>
          <RangeInput
            className="memory-roll-controls memory-enhancement-controls"
            min={1}
            max={view.enhancement.max}
            value={view.enhancement.level}
            slider={{ "aria-label": "Enhancement level slider" }}
            number={{ "aria-label": "Enhancement level value" }}
            onValue={(value) => commands().setMemoryField("enhancementLevel", value)}
          />
        </label>
        <h3>Memory Revival</h3>
        <label className={`memory-wax ${switchRow}`}>
          <span>Wax and Wane (+30% base stat)</span>
          <input
            type="checkbox"
            className={switchInput}
            checked={view.waxAndWane}
            onChange={(event) => commands().setMemoryField("waxAndWane", event.target.checked)}
          />
        </label>
        <label className={`memory-wax ${switchRow}`}>
          <span>Rising Moon (T0 fixed affixes)</span>
          <input
            type="checkbox"
            className={switchInput}
            checked={view.risingMoon}
            onChange={(event) => commands().setMemoryField("risingMoon", event.target.checked)}
          />
        </label>
        <label>
          Revived Affix
          <select
            data-memory-field="revivedAffix"
            aria-label="Revived affix"
            value={view.revived.value}
            onChange={(event) => commands().setMemoryField("revivedAffix", event.target.value)}
          >
            <option value="">None</option>
            <optgroup label="Regular Revived Affixes">
              {view.revived.regular.map((entry) => (
                <option key={entry.name} value={entry.name} data-revived-description={entry.description}>
                  {entry.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Lunar Phase">
              {view.revived.lunar.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
            {view.revived.saved ? <option value={view.revived.value}>Saved effect</option> : null}
          </select>
        </label>
        {view.revived.tiers ? (
          <div className="memory-revived-controls grid gap-2">
            <span className="memory-tier-row flex gap-0.75">
              {view.revived.tiers.map((tier) => (
                <button
                  key={tier.tier}
                  type="button"
                  className={`${tier.active ? "active" : ""} ${tierButton}`}
                  onClick={() => {
                    onTier(["Revived affix roll value"]);
                    commands().setRevivedTier(tier.tier);
                  }}
                >
                  {`T${tier.tier}`}
                </button>
              ))}
            </span>
            {view.revived.roll ? (
              <RangeInput
                className="memory-roll-controls"
                min={view.revived.roll.min}
                max={view.revived.roll.max}
                value={view.revived.roll.value}
                slider={{ "aria-label": "Revived affix roll slider" }}
                number={{ "aria-label": "Revived affix roll value" }}
                onValue={(value) => commands().setMemoryField("revivedRoll", value)}
              />
            ) : null}
          </div>
        ) : null}
        <h3>{`Fixed Affixes (${count(view.fixed)}/2)`}</h3>
        {view.fixed.map((line) => (
          <AffixLine key={line.index} line={line} onTier={onTier} />
        ))}
        <h3>{`Random Affixes (${count(view.random)}/2)`}</h3>
        {view.random.map((line) => (
          <AffixLine key={line.index} line={line} onTier={onTier} />
        ))}
      </section>
      <aside className="flex min-h-0 flex-col text-xs text-muted">
        <span>Preview</span>
        <div
          className={`hero-memory-preview memory-rarity-${view.previewRarity} ${previewCard} ${memoryAccent(view.previewRarity)}`}
        >
          {view.preview ? (
            <Preview preview={view.preview} />
          ) : (
            <p className="hero-memory-preview-empty grid min-h-37.5 place-items-center text-center text-muted">
              Select a base stat to preview memory
            </p>
          )}
        </div>
        <div className="hero-memory-craft-actions mt-auto flex gap-2.5 pt-3">
          <button type="button" className={craftAction} onClick={() => commands().cancelMemoryCraft()}>
            Cancel
          </button>
          <button
            type="button"
            className={craftAction}
            disabled={!view.canSave}
            onClick={() => commands().saveMemoryCraft()}
          >
            {view.saveLabel}
          </button>
        </div>
      </aside>
    </div>
  );
}

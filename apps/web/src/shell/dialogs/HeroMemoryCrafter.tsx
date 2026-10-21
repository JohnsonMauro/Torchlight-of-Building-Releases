// The hero memory crafter (Craft Memory, or Edit on a memory): the memory type, rarity, base stat and enhancement level,
// the revival (Wax and Wane, Rising Moon, a revived affix with its tier and roll), two fixed and two random affix lines
// with their tiers and rolls, and the preview. Every control is a planner command on the draft (src/app/hero/hero-memory-controller.js);
// the revived affix's select keeps data-memory-field="revivedAffix", which the planner's select search popover reads.
import { useLayoutEffect, useRef, useState } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { tierBadgeClasses, tierBadgeKey } from "@legacy/app/gear/tier-badge.ts";
import type {
  MemoryAffixLineView,
  MemoryCrafterView,
  MemoryPreviewView,
  MemoryRevivedEffectView,
  MemoryRollView,
} from "@legacy/app/bridge/hero-memory-view.ts";
import { CommitNumberInput } from "../../ui/CommitNumberInput";
import { LiveNumberInput } from "../../ui/LiveNumberInput";
import { rarityArt } from "../../features/hero/hero-classes";
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
import { numberField, rangeField } from "./selector-classes";

const commands = plannerCommands;
const craftAction =
  "btn-bronze min-h-10 flex-1 text-[0.72rem] font-extrabold tracking-[0.08em] uppercase off:cursor-not-allowed off:opacity-50";

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
    <div className={`memory-roll-controls ${rollControls}`}>
      <input
        type="range"
        className={rangeField}
        min={roll.min}
        max={roll.max}
        value={roll.value}
        aria-label={`${label} roll slider`}
        onChange={(event) => onValue(Number(event.target.value))}
      />
      <LiveNumberInput
        className={numberField}
        min={roll.min}
        max={roll.max}
        step={1}
        value={roll.value}
        aria-label={`${label} roll value`}
        onValue={onValue}
      />
    </div>
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
        className={rangeField}
        min={0}
        max={tierValue.count - 1}
        step={1}
        value={tierValue.index}
        aria-label={`${line.label} tier value slider`}
        onChange={(event) => commands().setMemoryTierPosition(line.group, line.index, Number(event.target.value))}
      />
      <CommitNumberInput
        className={numberField}
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

function RevivedEffect({ effect }: { effect: MemoryRevivedEffectView }) {
  return (
    <div
      className={`memory-revived-effect ${effect.special ? "special" : ""} flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 whitespace-pre-line`}
    >
      {effect.tierBadge ? <i className={tierBadgeClasses(tierBadgeKey(effect.tierBadge))}>{effect.tierBadge}</i> : null}
      <span
        className={`memory-revived-name ${effect.special ? "font-bold text-[#75d8f6] underline underline-offset-2" : ""}`}
      >
        {effect.effect}
      </span>
      {effect.details ? (
        <>
          <small className="memory-revived-hint text-[0.64rem] whitespace-nowrap text-[#a8bac7]">
            Hold Alt for details
          </small>
          <div className="memory-revived-detail mt-1.25 hidden basis-full border-l-2 border-[#75d8f6] bg-[#12232b] px-2 py-1.75 font-[Arial,sans-serif] text-[0.72rem] leading-[1.45] whitespace-normal text-[#d8eaf0] [.revival-alt-held_&]:block">
            <ul className="grid gap-1.25">
              {effect.details.effects.map((line, index) => (
                <li
                  key={index}
                  className="relative pl-2.5 before:absolute before:top-[0.48em] before:left-0 before:size-1 before:rounded-full before:bg-[#75d8f6] before:content-['']"
                >
                  {line}
                </li>
              ))}
            </ul>
            {effect.details.exclusive !== null ? (
              <div className="memory-revived-exclusive mt-2.25 grid gap-0.5 border-t border-[#365463] pt-1.75 text-[#bcd4df]">
                <small className="text-[0.6rem] font-bold tracking-[0.04em] text-[#75d8f6] uppercase">
                  Hero trait exclusive
                </small>
                <span className="text-[0.67rem] leading-[1.35]">{effect.details.exclusive}</span>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
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
          <small className="mt-0.75 block text-[#d7b99f] uppercase">{`${preview.rarity} · HERO MEMORY`}</small>
        </div>
      </header>
      {preview.revived ? (
        <span className="memory-revival-badge mt-2.25 mb-0.5 inline-flex w-max items-center gap-1 rounded-[3px] border border-[#7dc5ff] bg-[linear-gradient(90deg,#2568c4,#52abff)] px-2 py-0.5 font-[Arial,sans-serif] text-[0.67rem] font-bold tracking-[0.02em] text-white shadow-[0_1px_5px_#1e6bb666]">
          <span className="text-[0.85rem] leading-[0.75]" aria-hidden="true">
            ☾
          </span>
          {" Revived"}
        </span>
      ) : null}
      <p className="mt-1.5">
        <span>{preview.enhancement}</span>
        <br />
        <span data-memory-trait-preview="">
          Trait Level <b className="memory-trait-bonus font-bold text-[#70d88a]">{`+${preview.traitBonus}`}</b>
        </span>
      </p>
      <h4>Implicit</h4>
      <div className={`memory-implicit ${preview.waxAndWane ? "wax-applied font-bold text-[#72df92]" : ""}`}>
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
          Enhancement Level <strong className="text-[#eaf0f6]">{`Lv.${view.enhancement.level}`}</strong>
          <span className={`memory-roll-controls memory-enhancement-controls ${rollControls}`}>
            <input
              type="range"
              className={rangeField}
              min={1}
              max={view.enhancement.max}
              value={view.enhancement.level}
              aria-label="Enhancement level slider"
              onChange={(event) => commands().setMemoryField("enhancementLevel", Number(event.target.value))}
            />
            <LiveNumberInput
              className={numberField}
              min={1}
              max={view.enhancement.max}
              step={1}
              value={view.enhancement.level}
              aria-label="Enhancement level value"
              onValue={(value) => commands().setMemoryField("enhancementLevel", value)}
            />
          </span>
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
              <div className={`memory-roll-controls ${rollControls}`}>
                <input
                  type="range"
                  className={rangeField}
                  min={view.revived.roll.min}
                  max={view.revived.roll.max}
                  value={view.revived.roll.value}
                  aria-label="Revived affix roll slider"
                  onChange={(event) => commands().setMemoryField("revivedRoll", Number(event.target.value))}
                />
                <LiveNumberInput
                  className={numberField}
                  min={view.revived.roll.min}
                  max={view.revived.roll.max}
                  step={1}
                  value={view.revived.roll.value}
                  aria-label="Revived affix roll value"
                  onValue={(value) => commands().setMemoryField("revivedRoll", value)}
                />
              </div>
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
      <aside className="flex min-h-0 flex-col text-[0.75rem] text-[#aeb9c5]">
        <span>Preview</span>
        <div
          className={`hero-memory-preview memory-rarity-${view.previewRarity} ${previewCard} ${rarityArt(view.previewRarity) || "border-[#5b4838] bg-[#271b16]"} ${memoryAccent(view.previewRarity)}`}
        >
          {view.preview ? (
            <Preview preview={view.preview} />
          ) : (
            <p className="hero-memory-preview-empty grid min-h-37.5 place-items-center text-center text-[#a3acb7]">
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

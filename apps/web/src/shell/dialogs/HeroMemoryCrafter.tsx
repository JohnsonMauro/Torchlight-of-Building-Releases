// The hero memory crafter (Craft Memory, or Edit on a memory): the memory type, rarity, base stat and enhancement level,
// the revival (Wax and Wane, Rising Moon, a revived affix with its tier and roll), two fixed and two random affix lines
// with their tiers and rolls, and the preview. Every control is a planner command on the draft (src/app/hero/hero-memory-controller.js);
// the revived affix's select keeps data-memory-field="revivedAffix", which the planner's select search popover reads.
import { useLayoutEffect, useRef, useState } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type {
  MemoryAffixLineView,
  MemoryCrafterView,
  MemoryPreviewView,
  MemoryRevivedEffectView,
  MemoryRollView,
} from "@legacy/app/bridge/hero-memory-view.ts";
import { CommitNumberInput } from "../../ui/CommitNumberInput";
import { LiveNumberInput } from "../../ui/LiveNumberInput";

const commands = plannerCommands;
const tierBadgeClass = (badge: string) => `affix-tier-badge tier-${badge.toLowerCase().replace("+", "plus")}`;

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
    <div className="memory-roll-controls">
      <input
        type="range"
        min={roll.min}
        max={roll.max}
        value={roll.value}
        aria-label={`${label} roll slider`}
        onChange={(event) => onValue(Number(event.target.value))}
      />
      <LiveNumberInput
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
    <div className="memory-roll-controls">
      <input
        type="range"
        min={0}
        max={tierValue.count - 1}
        step={1}
        value={tierValue.index}
        aria-label={`${line.label} tier value slider`}
        onChange={(event) => commands().setMemoryTierPosition(line.group, line.index, Number(event.target.value))}
      />
      <CommitNumberInput
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
        <span className="memory-tier-row">
          {line.tiers.map((tier) => (
            <button
              key={tier.tier}
              type="button"
              className={tier.active ? "active" : ""}
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
    <div className={`memory-revived-effect ${effect.special ? "special" : ""}`}>
      {effect.tierBadge ? <i className={tierBadgeClass(effect.tierBadge)}>{effect.tierBadge}</i> : null}
      <span className="memory-revived-name">{effect.effect}</span>
      {effect.details ? (
        <>
          <small className="memory-revived-hint">Hold Alt for details</small>
          <div className="memory-revived-detail">
            <ul>
              {effect.details.effects.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
            {effect.details.exclusive !== null ? (
              <div className="memory-revived-exclusive">
                <small>Hero trait exclusive</small>
                <span>{effect.details.exclusive}</span>
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
        <div key={row.index} className="memory-affix-row">
          {row.tier !== null ? <i className={tierBadgeClass(`T${row.tier}`)}>{`T${row.tier}`}</i> : null}
          <span>{row.text}</span>
        </div>
      ))}
    </>
  );
}

function Preview({ preview }: { preview: MemoryPreviewView }) {
  return (
    <>
      <header>
        <img src={preview.icon} alt="" />
        <div>
          <strong>{preview.type}</strong>
          <small>{`${preview.rarity} · HERO MEMORY`}</small>
        </div>
      </header>
      {preview.revived ? (
        <span className="memory-revival-badge">
          <span aria-hidden="true">☾</span>
          {" Revived"}
        </span>
      ) : null}
      <p>
        <span>{preview.enhancement}</span>
        <br />
        <span data-memory-trait-preview="">
          Trait Level <b className="memory-trait-bonus">{`+${preview.traitBonus}`}</b>
        </span>
      </p>
      <h4>Implicit</h4>
      <div className={`memory-implicit ${preview.waxAndWane ? "wax-applied" : ""}`}>{preview.implicit}</div>
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
    <div className="hero-memory-craft">
      <section className="hero-memory-form" ref={form}>
        <label>Memory Type</label>
        <div className="hero-memory-choice-row memory-types">
          {view.types.map((type) => (
            <button
              key={type.type}
              type="button"
              className={type.active ? "active" : ""}
              onClick={() => commands().setMemoryType(type.type)}
            >
              <img src={type.icon} alt="" />
              {type.type}
            </button>
          ))}
        </div>
        <label>Crafting Rarity *</label>
        <div className="hero-memory-choice-row rarities">
          {view.rarities.map((rarity) => (
            <button
              key={rarity.value}
              type="button"
              className={`memory-rarity-${rarity.value} ${rarity.active ? "active" : ""}`}
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
          Enhancement Level <strong>{`Lv.${view.enhancement.level}`}</strong>
          <span className="memory-roll-controls memory-enhancement-controls">
            <input
              type="range"
              min={1}
              max={view.enhancement.max}
              value={view.enhancement.level}
              aria-label="Enhancement level slider"
              onChange={(event) => commands().setMemoryField("enhancementLevel", Number(event.target.value))}
            />
            <LiveNumberInput
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
        <label className="memory-wax">
          <span>Wax and Wane (+30% base stat)</span>
          <input
            type="checkbox"
            checked={view.waxAndWane}
            onChange={(event) => commands().setMemoryField("waxAndWane", event.target.checked)}
          />
        </label>
        <label className="memory-wax">
          <span>Rising Moon (T0 fixed affixes)</span>
          <input
            type="checkbox"
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
          <div className="memory-revived-controls">
            <span className="memory-tier-row">
              {view.revived.tiers.map((tier) => (
                <button
                  key={tier.tier}
                  type="button"
                  className={tier.active ? "active" : ""}
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
              <div className="memory-roll-controls">
                <input
                  type="range"
                  min={view.revived.roll.min}
                  max={view.revived.roll.max}
                  value={view.revived.roll.value}
                  aria-label="Revived affix roll slider"
                  onChange={(event) => commands().setMemoryField("revivedRoll", Number(event.target.value))}
                />
                <LiveNumberInput
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
      <aside>
        <span>Preview</span>
        <div className={`hero-memory-preview memory-rarity-${view.previewRarity}`}>
          {view.preview ? (
            <Preview preview={view.preview} />
          ) : (
            <p className="hero-memory-preview-empty">Select a base stat to preview memory</p>
          )}
        </div>
        <div className="hero-memory-craft-actions">
          <button type="button" className="button button-secondary" onClick={() => commands().cancelMemoryCraft()}>
            Cancel
          </button>
          <button
            type="button"
            className="button"
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

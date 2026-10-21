// The skill selector's detail for the highlighted choice: the skill level, a support's tier controls (an Activation
// Medium's affix lines; a progression support's tiers and rolls; a star support's main affix), and the preview with its
// tags, facts, highlighted effects and TLIDB link. A follower skill's detail is the planner's HTML (its tier and affix
// selects are handled by src/app/skills/skill-selector.js). Every control is a planner command.
import { Fragment, type CSSProperties } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type {
  ProgressionView,
  RollControlView,
  SkillSelectorDetailView,
  SpecialView,
  StarsView,
} from "@legacy/app/bridge/skill-selector-view.ts";
import { Artwork } from "../../ui/Artwork";

const tierButtonsClass = (count: number) => `special-tier-buttons ${count === 4 ? "four-tiers" : ""}`;
const signed = (value: number) => `${value >= 0 ? "+" : ""}${value}`;
// The planner refreshes a range's fill on input/change events and on added range nodes (src/app/planner/range-fill.js updateRangeFill); a
// tier change here keeps the same input and only moves its min, max and value, so the fill is set from them.
const rangeFill = ({ min, max, value }: RollControlView) => {
  const percent = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  return { "--range-fill": `${percent}%` } as CSSProperties;
};

function RollInputs({
  roll,
  onChange,
  output,
}: {
  roll: RollControlView;
  onChange: (value: string) => void;
  output: string;
}) {
  return (
    <div className="special-roll-control">
      <input
        type="range"
        min={roll.min}
        max={roll.max}
        step={roll.step}
        value={roll.value}
        style={rangeFill(roll)}
        onChange={(event) => onChange(event.target.value)}
      />
      <input
        type="number"
        min={roll.min}
        max={roll.max}
        step={roll.step}
        value={roll.value}
        onChange={(event) => onChange(event.target.value)}
      />
      <output>{output}</output>
    </div>
  );
}

function Stars({ stars }: { stars: StarsView }) {
  return (
    <div className="special-stars">
      <span>
        <strong>Star level</strong>
        <small>{`+${stars.bonus}% additional damage`}</small>
      </span>
      <div>
        {[1, 2, 3, 4, 5].map((count) => (
          <button
            key={count}
            type="button"
            className={count === stars.value ? "active" : ""}
            aria-label={`${count} stars`}
            onClick={() => plannerCommands().setSupportStars(count)}
          >
            {"★".repeat(count)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Progression({ view }: { view: ProgressionView }) {
  const commands = plannerCommands;
  if (view.medium)
    return (
      <section className="special-support-config activation-affix-config">
        <div className="special-affix-block">
          <div className="special-support-heading">
            <strong>Set all affixes</strong>
            <span>{`Tier ${view.tier}`}</span>
          </div>
          <div className={tierButtonsClass(view.tiers.length)}>
            {view.tiers.map((tier) => (
              <button
                key={tier.tier}
                type="button"
                className={tier.active ? "active" : ""}
                onClick={() => commands().setProgressionTier(tier.tier)}
              >
                {`T${tier.tier}`}
              </button>
            ))}
          </div>
        </div>
        {view.lines.map((line) => (
          <div key={line.index} className="special-affix-block">
            <div className="special-support-heading">
              <strong>{`Affix ${line.number}`}</strong>
              <span>{line.tierText}</span>
            </div>
            <p>{line.text}</p>
            {line.choice ? (
              <label className="activation-roll-kind activation-affix-choice">
                <span>Affix stat</span>
                <select
                  value={line.index}
                  onChange={(event) => commands().setAffixChoice(line.index, Number(event.target.value))}
                >
                  {line.choice.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className={tierButtonsClass(line.buttons.length)}>
              {line.buttons.map((button) => (
                <button
                  key={String(button.tier)}
                  type="button"
                  className={button.active ? "active" : ""}
                  onClick={() => commands().setAffixLineTier(line.index, button.tier)}
                >
                  {button.label}
                  <small>{button.small}</small>
                </button>
              ))}
            </div>
            {line.rolls.map((roll) => (
              <RollRow
                key={roll.index}
                roll={roll}
                output={String(roll.value)}
                onChange={(value) => commands().setAffixRoll(line.index, roll.index, value)}
              />
            ))}
          </div>
        ))}
      </section>
    );
  return (
    <section className="special-support-config">
      <div className="special-affix-block">
        <div className="special-support-heading">
          <strong>{view.heading}</strong>
          <span>{`Tier ${view.tier}`}</span>
        </div>
        <div className={tierButtonsClass(view.tiers.length)}>
          {view.tiers.map((tier) => (
            <button
              key={tier.tier}
              type="button"
              className={tier.active ? "active" : ""}
              onClick={() => commands().setProgressionTier(tier.tier)}
            >
              {`T${tier.tier}`}
              <small>{tier.small}</small>
            </button>
          ))}
        </div>
        <p>
          {view.text.map((line, index) => (
            <Fragment key={index}>
              {index ? <br /> : null}
              {line}
            </Fragment>
          ))}
        </p>
        {view.rolls.map((roll) => (
          <RollRow
            key={roll.index}
            roll={roll}
            output={String(roll.value)}
            onChange={(value) => commands().setProgressionRoll(roll.index, value)}
          />
        ))}
      </div>
      {view.stars ? <Stars stars={view.stars} /> : null}
    </section>
  );
}

function RollRow({
  roll,
  output,
  onChange,
}: {
  roll: RollControlView;
  output: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <label className="special-roll-label">
        <span>{roll.label}</span>
        <strong>{output}</strong>
      </label>
      <RollInputs roll={roll} output={output} onChange={onChange} />
    </>
  );
}

function Special({ view }: { view: SpecialView }) {
  const value = `${signed(view.roll.value)}%`;
  return (
    <section className="special-support-config">
      <div className="special-affix-block">
        <div className="special-support-heading">
          <strong>Main affix</strong>
          <span>{`Tier ${view.tier}`}</span>
        </div>
        <div className={tierButtonsClass(view.tiers.length)}>
          {view.tiers.map((tier) => (
            <button
              key={tier.tier}
              type="button"
              className={tier.active ? "active" : ""}
              onClick={() => plannerCommands().setSpecialTier(tier.tier)}
            >
              {`T${tier.tier}`}
              <small>{tier.small}</small>
            </button>
          ))}
        </div>
        <label className="special-roll-label">
          <span>{view.effect}</span>
          <strong>{value}</strong>
        </label>
        <RollInputs roll={view.roll} output={value} onChange={(next) => plannerCommands().setSpecialRoll(next)} />
      </div>
      <Stars stars={view.stars} />
    </section>
  );
}

interface DetailProps {
  view: Extract<SkillSelectorDetailView, { kind: "entry" }>;
  levelText: string;
  onLevelText: (text: string) => void;
}

export function SkillSelectorDetail({ view, levelText, onLevelText }: DetailProps) {
  const commit = () => plannerCommands().setSelectorLevel(levelText);
  return (
    <>
      <div className="selector-level">
        <strong>Skill Level:</strong>
        <div>
          <button type="button" onClick={() => plannerCommands().stepSelectorLevel(-1)}>
            −
          </button>
          <input
            type="number"
            min={1}
            max={40}
            value={levelText}
            onChange={(event) => onLevelText(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
            }}
          />
          <button type="button" onClick={() => plannerCommands().stepSelectorLevel(1)}>
            +
          </button>
        </div>
      </div>
      {view.progression ? <Progression view={view.progression} /> : null}
      {view.special ? <Special view={view.special} /> : null}
      <article className={`selector-preview ${view.previewClass}`}>
        <div className="selector-preview-head">
          <Artwork src={view.icon} alt={view.name} className="support-art" />
          <h3>{view.name}</h3>
          <small>{`Lv. ${view.level}`}</small>
          <div className="selector-tags">
            {view.tags.map((tag, index) => (
              <span key={index}>{tag}</span>
            ))}
          </div>
        </div>
        <div className="selector-facts">
          <div className="selector-stat-rows">
            {view.facts.map((fact, index) => (
              <div key={index} className={fact.addedDamage ? "skill-added-damage-stat" : ""}>
                <span>{`${fact.label}:`}</span>
                <strong>{fact.value}</strong>
              </div>
            ))}
          </div>
          {view.reference ? <p className="skill-effect-reference">{view.reference}</p> : null}
          <div className="selector-effect-list">
            <h4>{`${view.name}:`}</h4>
            {view.effects.map((segments, index) => (
              <p key={index}>
                {segments.map((segment, part) =>
                  segment.className ? (
                    <span key={part} className={segment.className}>
                      {segment.text}
                    </span>
                  ) : (
                    segment.text
                  ),
                )}
              </p>
            ))}
          </div>
          <a href={view.source} target="_blank" rel="noreferrer">
            Open TLIDB source
          </a>
          {view.full ? (
            <p className="comparison-warning">
              All five support slots are occupied. Remove a support before confirming another.
            </p>
          ) : null}
        </div>
      </article>
    </>
  );
}

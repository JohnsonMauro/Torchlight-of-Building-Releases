// The skill selector's detail for the highlighted choice: the skill level, a support's tier controls (an Activation
// Medium's affix lines; a progression support's tiers and rolls; a star support's main affix), and the preview with its
// tags, facts, highlighted effects and TLIDB link. A follower skill's detail is the planner's HTML (its tier and affix
// selects are handled by src/app/skills/skill-selector.js). Every control is a planner command.
import { Fragment } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type {
  ProgressionView,
  RollControlView,
  SkillSelectorDetailView,
  SpecialView,
  StarsView,
} from "@legacy/app/bridge/skill-selector-view.ts";
import { Artwork } from "../../ui/Artwork";
import { GearTooltip } from "../gear/GearTooltip";
import { KeywordText } from "../../ui/KeywordText";
import { EffectSegments } from "./EffectSegments";
import { RangeInput } from "../../ui/RangeInput";
import {
  CONFIG_BLOCK,
  CONFIG_HEADING,
  CONFIG_PANEL,
  ROLL_VALUE,
  SKILL_SOURCE,
  SKILL_SOURCE_ART,
  SKILL_SOURCE_ITEM,
  STAR_BUTTON,
  SUPPORT_ART,
  TIER_BUTTON,
  TIER_NOTE,
} from "./skill-selector-classes";

const tierButtonsClass = (count: number) =>
  `special-tier-buttons grid gap-1.5 ${count === 4 ? "grid-cols-4" : "grid-cols-3"}`;
const tierButtonClass = (active: boolean) => `${TIER_BUTTON}${active ? " active" : ""}`;
// A roll's label row: what it rolls, and its value.
const ROLL_LABEL = "flex items-center justify-between gap-4";
const ROLL_LABEL_TEXT = "max-w-3/4 text-sm/snug text-text";
/** The skill level's range (src/app/skills/skill-selector.js clampLevel). */
const MIN_LEVEL = 1;
const MAX_LEVEL = 40;
const signed = (value: number) => `${value >= 0 ? "+" : ""}${value}`;

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
    // A tier change keeps the same slider and only moves its min, max and value; RangeInput sets the fill from them.
    <div className="special-roll-control grid grid-cols-[minmax(0,1fr)_46px] items-center gap-2">
      <RangeInput
        min={roll.min}
        max={roll.max}
        step={roll.step}
        value={roll.value}
        onValue={(value) => onChange(String(value))}
      />
      <output className={`text-right ${ROLL_VALUE}`}>{output}</output>
    </div>
  );
}

function Stars({ stars }: { stars: StarsView }) {
  return (
    <div className="special-stars grid gap-2 border-t border-line pt-3">
      <span className={CONFIG_HEADING}>
        <strong>Star level</strong>
        <small className={`text-xs ${ROLL_VALUE}`}>{`+${stars.bonus}% additional damage`}</small>
      </span>
      <div className="grid grid-cols-5 gap-1.25">
        {[1, 2, 3, 4, 5].map((count) => (
          <button
            key={count}
            type="button"
            className={`${STAR_BUTTON}${count === stars.value ? " active" : ""}`}
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
      <section className={`special-support-config activation-affix-config ${CONFIG_PANEL}`}>
        <div className={`special-affix-block ${CONFIG_BLOCK}`}>
          <div className={`special-support-heading ${CONFIG_HEADING}`}>
            <strong>Set all affixes</strong>
            <span>{`Tier ${view.tier}`}</span>
          </div>
          <div className={tierButtonsClass(view.tiers.length)}>
            {view.tiers.map((tier) => (
              <button
                key={tier.tier}
                type="button"
                className={tierButtonClass(tier.active)}
                onClick={() => commands().setProgressionTier(tier.tier)}
              >
                {`T${tier.tier}`}
              </button>
            ))}
          </div>
        </div>
        {view.lines.map((line) => (
          <div key={line.index} className={`special-affix-block ${CONFIG_BLOCK}`}>
            <div className={`special-support-heading ${CONFIG_HEADING}`}>
              <strong>{`Affix ${line.number}`}</strong>
              <span>{line.tierText}</span>
            </div>
            <p className="text-sm">
              <KeywordText text={line.text} />
            </p>
            {line.choice ? (
              <label className="grid grid-cols-[auto_1fr] items-center gap-3 text-xs text-muted">
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
                  className={tierButtonClass(button.active)}
                  onClick={() => commands().setAffixLineTier(line.index, button.tier)}
                >
                  {button.label}
                  <small className={TIER_NOTE}>{button.small}</small>
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
    <section className={`special-support-config ${CONFIG_PANEL}`}>
      <div className={`special-affix-block ${CONFIG_BLOCK}`}>
        <div className={`special-support-heading ${CONFIG_HEADING}`}>
          <strong>{view.heading}</strong>
          <span>{`Tier ${view.tier}`}</span>
        </div>
        <div className={tierButtonsClass(view.tiers.length)}>
          {view.tiers.map((tier) => (
            <button
              key={tier.tier}
              type="button"
              className={tierButtonClass(tier.active)}
              onClick={() => commands().setProgressionTier(tier.tier)}
            >
              {`T${tier.tier}`}
              <small className={TIER_NOTE}>{tier.small}</small>
            </button>
          ))}
        </div>
        <p className="text-sm/snug text-text">
          {view.text.map((line, index) => (
            <Fragment key={index}>
              {index ? <br /> : null}
              <KeywordText text={line} />
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
      <label className={`special-roll-label ${ROLL_LABEL}`}>
        <span className={ROLL_LABEL_TEXT}>{roll.label}</span>
        <strong className={ROLL_VALUE}>{output}</strong>
      </label>
      <RollInputs roll={roll} output={output} onChange={onChange} />
    </>
  );
}

function Special({ view }: { view: SpecialView }) {
  const value = `${signed(view.roll.value)}%`;
  return (
    <section className={`special-support-config ${CONFIG_PANEL}`}>
      <div className={`special-affix-block ${CONFIG_BLOCK}`}>
        <div className={`special-support-heading ${CONFIG_HEADING}`}>
          <strong>Main affix</strong>
          <span>{`Tier ${view.tier}`}</span>
        </div>
        <div className={tierButtonsClass(view.tiers.length)}>
          {view.tiers.map((tier) => (
            <button
              key={tier.tier}
              type="button"
              className={tierButtonClass(tier.active)}
              onClick={() => plannerCommands().setSpecialTier(tier.tier)}
            >
              {`T${tier.tier}`}
              <small className={TIER_NOTE}>{tier.small}</small>
            </button>
          ))}
        </div>
        <label className={`special-roll-label ${ROLL_LABEL}`}>
          <span className={ROLL_LABEL_TEXT}>
            <KeywordText text={view.effect} />
          </span>
          <strong className={ROLL_VALUE}>{value}</strong>
        </label>
        <RollInputs roll={view.roll} output={value} onChange={(next) => plannerCommands().setSpecialRoll(next)} />
      </div>
      <Stars stars={view.stars} />
    </section>
  );
}

interface DetailProps {
  view: Extract<SkillSelectorDetailView, { kind: "entry" }>;
}

export function SkillSelectorDetail({ view }: DetailProps) {
  return (
    <>
      {/* The level is committed as it is set (the slider moving, the field on Enter or when left), so Confirm reads it. */}
      <div className="selector-level mb-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <strong className="text-xs tracking-wide text-accent uppercase">Skill Level:</strong>
        <RangeInput
          min={MIN_LEVEL}
          max={MAX_LEVEL}
          value={view.level}
          field="commit"
          slider={{ "aria-label": "Skill level" }}
          number={{ "aria-label": "Skill level number" }}
          onValue={(level) => plannerCommands().setSelectorLevel(String(level))}
        />
      </div>
      {view.progression ? <Progression view={view.progression} /> : null}
      {view.special ? <Special view={view.special} /> : null}
      <article className={`selector-preview ${view.previewClass}`}>
        <div className="selector-preview-head">
          <Artwork src={view.icon} alt={view.name} className={SUPPORT_ART} />
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
                <EffectSegments segments={segments} />
              </p>
            ))}
          </div>
          {view.grantedBy ? <SkillSource item={view.grantedBy} skill={view.name} /> : null}
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

/** The item that grants the skill, with the item's tooltip: the game's "Skill Source" on its skill card. */
function SkillSource({ item, skill }: { item: { name: string; icon: string }; skill: string }) {
  return (
    <div className={SKILL_SOURCE}>
      <strong className="tracking-wide uppercase">Skill Source</strong>
      <GearTooltip target={{ legendary: item.name }}>
        <span className={SKILL_SOURCE_ITEM} tabIndex={0}>
          <img className={SKILL_SOURCE_ART} src={item.icon} alt="" />
          {item.name}
        </span>
      </GearTooltip>
      <span>{`${skill} can only be triggered through ${item.name}: equipping it puts the skill in Active slot 1.`}</span>
    </div>
  );
}

// The hero panel's FOLLOWER tab: the follower card and its Tartarus Skill slots. The data is the planner's "follower"
// source (src/app/hero/follower-panel.js followerPanelView); edits are planner commands. The legacy hover tooltip reads
// data-follower-tooltip and data-follower-skill-tooltip, so they stay.
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { FollowerCardView, FollowerSlotView } from "@legacy/app/hero/follower-panel.js";
import { Artwork } from "../../ui/Artwork";
import { useViewSource } from "../../ui/use-view-source";

export function FollowerPanel() {
  const view = useViewSource("follower");
  if (!view) return null;
  const commands = plannerCommands();
  if (!view.card)
    return (
      <>
        <div className="hero-showcase follower-showcase">
          <div className="hero-portrait follower-portrait">
            <span className="hero-avatar-fallback" aria-hidden="true">
              +
            </span>
          </div>
          <div className="hero-identity follower-identity">
            <strong>No follower selected</strong>
            <small className="follower-rarity">Choose a follower</small>
            <button type="button" className="change-hero-button" onClick={() => commands.openFollowerSelector()}>
              Change Follower
            </button>
          </div>
        </div>
        <div className="hero-traits-pending follower-pending">
          <strong>Select a follower</strong>
          <span>Choose a follower to equip its Tartarus Skills.</span>
          <button type="button" className="button" onClick={() => commands.openFollowerSelector()}>
            Choose Follower
          </button>
        </div>
      </>
    );
  return (
    <>
      <FollowerCard card={view.card} />
      <div className="hero-trait-tree follower-skill-slots" aria-label={view.slotsLabel}>
        {view.slots.map((slot) => (
          <SkillSlot key={slot.index} slot={slot} />
        ))}
      </div>
    </>
  );
}

function FollowerCard({ card }: { card: FollowerCardView }) {
  return (
    <div className="hero-showcase follower-showcase">
      <div className={`hero-portrait follower-portrait${card.tintClass}`} data-follower-tooltip={card.id}>
        {card.portrait ? (
          <img src={card.portrait} alt={card.displayName} />
        ) : (
          <span className="hero-avatar-fallback" aria-hidden="true">
            {card.initials}
          </span>
        )}
      </div>
      <div className="hero-identity follower-identity" data-follower-tooltip={card.id}>
        <strong id="selected-follower-name">{card.displayName}</strong>
        <div className="follower-rarity-line">
          <small className={card.rarityClass} id="selected-follower-rarity">
            {card.rarityText}
          </small>
          <SpecialEffect card={card} />
        </div>
        <button type="button" className="change-hero-button" onClick={() => plannerCommands().openFollowerSelector()}>
          Change Follower
        </button>
      </div>
    </div>
  );
}

// The ULT letter's special effect, as on the in-game letter tooltip: a chip on the rarity line; hover or keyboard focus shows
// the follower card's tooltip. A letter with several effects would keep a select (none in the current game data).
function SpecialEffect({ card }: { card: FollowerCardView }) {
  const [first, ...more] = card.specialEffects;
  if (!first) return null;
  if (more.length)
    return (
      <div className="special-affix-block follower-special-effect-choice">
        <label className="activation-roll-kind activation-affix-choice">
          <span>Special effect</span>
          <select data-native-select="" aria-label="Special effect" defaultValue={first}>
            {card.specialEffects.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  return (
    <span
      className="follower-special-effect"
      data-follower-tooltip={card.id}
      tabIndex={0}
      aria-label={`Special effect: ${first}`}
    >
      <svg
        className="follower-special-effect-icon"
        viewBox="0 0 12 12"
        width="12"
        height="12"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M2 8 6 4l4 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{first}</span>
    </span>
  );
}

function SkillSlot({ slot }: { slot: FollowerSlotView }) {
  const commands = plannerCommands();
  const level = (
    <span className="tier-level">
      <small>SLOT</small>
      <strong>{slot.index + 1}</strong>
    </span>
  );
  return (
    <div className="follower-skill-slot-wrap">
      <button
        type="button"
        className={`hero-tier follower-skill-slot ${slot.skillName ? "filled" : "empty"}`}
        data-follower-skill-tooltip={slot.skillName ?? undefined}
        aria-label={slot.label}
        onClick={() => commands.openFollowerSkillSelector(slot.index)}
        onContextMenu={(event) => {
          if (!slot.skillName) return;
          event.preventDefault();
          commands.clearFollowerSkill(slot.index);
        }}
      >
        {level}
        <span className="follower-skill-art">
          {slot.skillName ? (
            <Artwork src={slot.icon} alt={slot.skillName} className="hero-choice-art follower-skill-icon" />
          ) : (
            <b aria-hidden="true">+</b>
          )}
        </span>
        <span className="tier-divider" />
        <span className="follower-skill-info">
          <small>{slot.kind}</small>
          <strong>{slot.title}</strong>
          {slot.summary ? <small className="follower-skill-summary">{slot.summary}</small> : null}
        </span>
      </button>
    </div>
  );
}

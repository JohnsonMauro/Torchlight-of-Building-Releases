// The hero panel's FOLLOWER tab: the follower card and its Tartarus Skill slots. The data is the planner's "follower"
// source (src/app/hero/follower-panel.js followerPanelView); edits are planner commands. The legacy hover tooltip reads
// data-follower-tooltip and data-follower-skill-tooltip, so they stay.
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { FollowerCardView, FollowerSlotView } from "@legacy/app/hero/follower-panel.js";
import { Artwork } from "../../ui/Artwork";
import { useViewSource } from "../../ui/use-view-source";
import {
  bronzeChip,
  changeButton,
  choiceArt,
  chooseButton,
  followerIdentityClass,
  identityTitle,
  pendingClass,
  portraitClass,
  portraitFallback,
  portraitImage,
  rarityText,
  showcaseClass,
  tierDivider,
  tierLevelClass,
  tierRow,
} from "../hero/hero-classes";

// The rarity line under the follower's name.
const rarityLine = "block text-xs font-bold tracking-wide";
/** The rarity id in the view's " follower-tint-<id>" or "follower-rarity follower-rarity-<id>" class. */
const rarityIn = (classes: string, prefix: string) => new RegExp(`\\b${prefix}-(\\S+)`).exec(classes)?.[1] ?? null;

export function FollowerPanel() {
  const view = useViewSource("follower");
  if (!view) return null;
  const commands = plannerCommands();
  if (!view.card)
    return (
      <>
        <div className={showcaseClass}>
          <div className={`${portraitClass} follower-portrait`}>
            <span className={portraitFallback} aria-hidden="true">
              +
            </span>
          </div>
          <div className={followerIdentityClass}>
            <strong className={identityTitle}>No follower selected</strong>
            <small className={`follower-rarity mb-2 text-muted ${rarityLine}`}>Choose a follower</small>
            <button
              type="button"
              className={`change-hero-button ${changeButton}`}
              onClick={() => commands.openFollowerSelector()}
            >
              Change Follower
            </button>
          </div>
        </div>
        <div className={pendingClass}>
          <strong>Select a follower</strong>
          <span>Choose a follower to equip its Tartarus Skills.</span>
          <button type="button" className={chooseButton} onClick={() => commands.openFollowerSelector()}>
            Choose Follower
          </button>
        </div>
      </>
    );
  return (
    <>
      <FollowerCard card={view.card} />
      <div className="@container grid gap-2 border-t border-line p-2.5" aria-label={view.slotsLabel}>
        {view.slots.map((slot) => (
          <SkillSlot key={slot.index} slot={slot} />
        ))}
      </div>
    </>
  );
}

function FollowerCard({ card }: { card: FollowerCardView }) {
  return (
    <div className={showcaseClass}>
      <div className={`${portraitClass} follower-portrait${card.tintClass}`} data-follower-tooltip={card.id}>
        {card.portrait ? (
          <img
            className={portraitImage(rarityIn(card.tintClass, "follower-tint"))}
            src={card.portrait}
            alt={card.displayName}
          />
        ) : (
          <span className={portraitFallback} aria-hidden="true">
            {card.initials}
          </span>
        )}
      </div>
      <div className={followerIdentityClass} data-follower-tooltip={card.id}>
        <strong id="selected-follower-name" className={identityTitle}>
          {card.displayName}
        </strong>
        <div className="follower-rarity-line relative mb-2 flex flex-wrap items-center gap-x-2 gap-y-1.25">
          <small
            className={`${card.rarityClass} ${rarityLine} ${rarityText(rarityIn(card.rarityClass, "follower-rarity"))}`}
            id="selected-follower-rarity"
          >
            {card.rarityText}
          </small>
          <SpecialEffect card={card} />
        </div>
        <button
          type="button"
          className={`change-hero-button ${changeButton}`}
          onClick={() => plannerCommands().openFollowerSelector()}
        >
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
      className={`follower-special-effect ${bronzeChip} max-w-full cursor-default gap-1 px-1.75 py-0.5 text-xs leading-tight font-bold whitespace-nowrap normal-case`}
      data-follower-tooltip={card.id}
      tabIndex={0}
      aria-label={`Special effect: ${first}`}
    >
      <svg
        className="follower-special-effect-icon size-2.5 flex-none"
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

// A skill slot's small caps line (its kind).
const skillCaption = "text-[10px] font-bold tracking-wider text-dim uppercase";

function SkillSlot({ slot }: { slot: FollowerSlotView }) {
  const commands = plannerCommands();
  const level = (
    <span className={tierLevelClass}>
      <small>SLOT</small>
      <strong>{slot.index + 1}</strong>
    </span>
  );
  return (
    <div className="relative min-w-0">
      <button
        type="button"
        className={`follower-skill-slot ${slot.skillName ? "filled" : "empty"} ${tierRow} w-full cursor-pointer text-left text-inherit hover:border-accent focus-visible:border-accent focus-visible:outline-0`}
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
        <span className="grid place-items-center">
          {slot.skillName ? (
            <Artwork src={slot.icon} alt={slot.skillName} className={choiceArt(false)} />
          ) : (
            <b
              className="grid size-[46px] place-items-center rounded-full border-2 border-dashed border-line-strong text-lg text-dim @min-[391px]:size-[52px]"
              aria-hidden="true"
            >
              +
            </b>
          )}
        </span>
        <span className={tierDivider} />
        <span className="grid min-w-0 justify-items-start gap-0.75">
          <small className={skillCaption}>{slot.kind}</small>
          <strong
            className={`wrap-anywhere ${slot.skillName ? "font-display text-sm leading-tight text-text" : "text-xs leading-tight text-muted"}`}
          >
            {slot.title}
          </strong>
          {slot.summary ? (
            <small className="text-[10px] font-semibold wrap-anywhere text-dim">{slot.summary}</small>
          ) : null}
        </span>
      </button>
    </div>
  );
}

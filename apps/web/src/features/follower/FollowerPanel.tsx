// The hero panel's FOLLOWER tab: the follower on the left (its portrait, which is the Change Follower control, its name
// and special effect) and its Tartarus Skill slots on the right; they stack when the panel is narrow. The data is the
// planner's "follower" source (src/app/hero/follower-panel.js followerPanelView); edits are planner commands. The
// portrait and the equipped skills show their tooltips (TraitTooltip).
import type { ReactNode } from "react";
import { FollowerSkillTooltip, FollowerTooltip } from "../hero/TraitTooltip";
import type { TooltipAnchor } from "../../ui/tooltip/Tooltip";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { FollowerCardView, FollowerSlotView } from "@legacy/app/hero/follower-panel.js";
import { Artwork } from "../../ui/Artwork";
import { ChangePortrait } from "../../ui/ChangePortrait";
import { useViewSource } from "../../ui/use-view-source";
import {
  bronzeChip,
  choiceArt,
  chooseButton,
  pendingClass,
  rarityArt,
  tierDivider,
  tierLevelClass,
  tierRow,
} from "../hero/hero-classes";

// The two columns: the follower, then its skills; side by side once the panel has room for both.
const columns = "@container";
const columnsGrid = "grid items-start gap-3 p-3 @min-[560px]:grid-cols-[160px_minmax(0,1fr)]";
// The follower's column: portrait, name and special effect, centred.
const followerColumn = "grid justify-items-center gap-2 text-center";
// The portrait frame (rarity border and art when the follower has a rarity).
const portraitFrame = (rarity: string | null) =>
  `size-40 rounded-md border-2 ${rarityArt(rarity) || "border-line-strong bg-sunken"}`;
const portraitFallback = "grid size-full place-items-center text-4xl font-bold text-accent";
const followerName = "block text-base leading-tight font-bold text-accent";
/** The rarity id in the view's " follower-tint-<id>" class. */
const rarityIn = (classes: string) => /\bfollower-tint-(\S+)/.exec(classes)?.[1] ?? null;

export function FollowerPanel() {
  const view = useViewSource("follower");
  if (!view) return null;
  const commands = plannerCommands();
  const change = () => commands.openFollowerSelector();
  if (!view.card)
    return (
      <Columns>
        <div className={followerColumn}>
          <ChangePortrait
            className={`follower-portrait ${portraitFrame(null)}`}
            label="Change Follower"
            onChange={change}
          >
            <span className={portraitFallback} aria-hidden="true">
              +
            </span>
          </ChangePortrait>
          <strong id="selected-follower-name" className={followerName}>
            No follower selected
          </strong>
        </div>
        <div className={pendingClass}>
          <strong>Select a follower</strong>
          <span>Choose a follower to equip its Tartarus Skills.</span>
          <button type="button" className={chooseButton} onClick={change}>
            Choose Follower
          </button>
        </div>
      </Columns>
    );
  return (
    <Columns>
      <FollowerCard card={view.card} onChange={change} />
      <div className="@container grid gap-2" aria-label={view.slotsLabel}>
        {view.slots.map((slot) => (
          <SkillSlot key={slot.index} slot={slot} />
        ))}
      </div>
    </Columns>
  );
}

function Columns({ children }: { children: ReactNode }) {
  return (
    <div className={columns}>
      <div className={columnsGrid}>{children}</div>
    </div>
  );
}

function FollowerCard({ card, onChange }: { card: FollowerCardView; onChange: () => void }) {
  return (
    <div className={followerColumn}>
      <FollowerTooltip followerId={card.id}>
        <div data-follower-tooltip={card.id}>
          <ChangePortrait
            className={`follower-portrait${card.tintClass} ${portraitFrame(rarityIn(card.tintClass))}`}
            label="Change Follower"
            onChange={onChange}
          >
            {card.portrait ? (
              <img className="size-full object-cover" src={card.portrait} alt={card.displayName} />
            ) : (
              <span className={portraitFallback} aria-hidden="true">
                {card.initials}
              </span>
            )}
          </ChangePortrait>
        </div>
      </FollowerTooltip>
      <strong id="selected-follower-name" className={followerName}>
        {card.displayName}
      </strong>
      <SpecialEffect card={card} />
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
    <FollowerTooltip followerId={card.id}>
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
    </FollowerTooltip>
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
      <FollowerSkillSlotTooltip name={slot.skillName}>
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
              className={`wrap-anywhere ${slot.skillName ? "text-sm leading-tight font-semibold text-text" : "text-xs leading-tight text-muted"}`}
            >
              {slot.title}
            </strong>
            {slot.summary ? (
              <small className="text-[10px] font-semibold wrap-anywhere text-dim">{slot.summary}</small>
            ) : null}
          </span>
        </button>
      </FollowerSkillSlotTooltip>
    </div>
  );
}

/** An equipped skill's card; an empty slot has none. */
function FollowerSkillSlotTooltip({ name, children }: { name: string | null; children: TooltipAnchor }) {
  return name ? <FollowerSkillTooltip name={name}>{children}</FollowerSkillTooltip> : children;
}

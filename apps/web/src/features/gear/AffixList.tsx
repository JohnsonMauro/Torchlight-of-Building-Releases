// A rare's affix lists in the crafter, every option a checkbox row. The base affixes: each with its fixed tier, up to two
// checked. The prefixes or suffixes: the families by category (Basic, Advanced, Ultimate) in tabs, each with the highest
// tier the item level offers, up to three checked; the families the item level offers no tier of (the Ultimate ones
// need Priceless) are disabled, each saying why. A checked row sets its roll with a slider in the row, and a checked
// family picks its tier among the item level's (chips in place of the tier tag).
import { useState, type ReactNode } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type {
  AffixListView,
  AffixOptionView,
  BaseAffixListView,
  RollView,
} from "@legacy/app/bridge/equipment-crafter-view.ts";
import type { CraftChange } from "@legacy/app/gear/equipment-craft.ts";
import { tierBadgeClasses, tierBadgeKey } from "@legacy/app/gear/tier-badge.ts";
import { RollInputs } from "./crafter-parts";

const change = (craftChange: CraftChange) => plannerCommands().changeEquipmentCraft(craftChange);

const OPTION = "grid gap-2 rounded border border-line bg-raised px-2.5 py-2 text-sm text-text";
// Picked in code from the option's state: a utility may not spell a state word the e2e tests read.
const OPTION_OPEN = "hover:border-accent";
const OPTION_BLOCKED = "opacity-50";
const OPTION_CHECKED = "border-accent/60";
const CHIP = "cursor-pointer";
const CHIP_OTHER = "opacity-40 hover:opacity-100";

/** A rare's base affixes, every one its type offers. */
export function BaseAffixList({ list }: { list: BaseAffixListView }) {
  return (
    <div className="grid gap-1.5" data-base-affix-list="">
      {list.options.map((option) => (
        <OptionRow
          key={option.value}
          option={option}
          slotAttribute={{ "data-base-affix-slot": option.config?.slot }}
          optionAttribute={{ "data-craft-base-affix-option": option.value }}
          onToggle={() => change({ kind: "toggleBaseAffix", template: option.value })}
          tiers={option.tier ? <i className={tierBadgeClasses(tierBadgeKey(option.tier))}>{option.tier}</i> : null}
          rolls={option.config?.rolls ?? []}
          rollAttributes={(roll) => ({
            "data-base-affix-roll": option.config?.slot ?? -1,
            "data-range-index": roll.rangeIndex,
          })}
          onRoll={(roll, value, commit) =>
            change({
              kind: "roll",
              group: "base",
              index: option.config?.slot ?? -1,
              rangeIndex: roll.rangeIndex,
              value,
              commit,
            })
          }
        />
      ))}
    </div>
  );
}

/** A rare's prefixes or suffixes, by category in tabs. */
export function AffixList({ list }: { list: AffixListView }) {
  const [tab, setTab] = useState(list.tabs[0]?.id ?? "");
  const open = list.tabs.find((entry) => entry.id === tab) ?? list.tabs[0];
  return (
    <div className="grid gap-2" data-affix-list={list.side}>
      <div className="flex gap-1 border-b border-line" role="tablist" aria-label={`${list.heading} categories`}>
        {list.tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={entry.id === open?.id}
            className="tab px-3 py-2 text-xs font-bold tracking-wide uppercase chosen:border-accent chosen:text-accent"
            onClick={() => setTab(entry.id)}
          >
            {`${entry.label} (${entry.options.filter((option) => option.checked).length})`}
          </button>
        ))}
      </div>
      <div className="grid gap-1.5" role="tabpanel">
        {open?.options.map((option) => (
          <OptionRow
            key={option.value}
            option={option}
            slotAttribute={{ "data-craft-affix-slot": option.config?.slot }}
            optionAttribute={{ "data-craft-affix-option": option.value }}
            onToggle={() => change({ kind: "toggleAffix", side: list.side, familyId: option.value })}
            tiers={<FamilyTiers option={option} />}
            rolls={option.config?.rolls ?? []}
            rollAttributes={(roll) => ({
              "data-craft-affix-roll": option.config?.slot ?? -1,
              "data-range-index": roll.rangeIndex,
            })}
            onRoll={(roll, value, commit) =>
              change({
                kind: "roll",
                group: "affix",
                index: option.config?.slot ?? -1,
                rangeIndex: roll.rangeIndex,
                value,
                commit,
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

/** A family's tier: the chips to pick from once checked, else the highest the item level offers. */
function FamilyTiers({ option }: { option: AffixOptionView }) {
  const config = option.config;
  if (!config)
    return option.highestTier ? (
      <i className={tierBadgeClasses(tierBadgeKey(option.highestTier))}>{option.highestTier}</i>
    ) : null;
  return (
    <span className="flex flex-wrap justify-end gap-1" role="group" aria-label={`${option.label} tier`}>
      {config.tiers.map((tier) => (
        <button
          key={tier.value}
          type="button"
          className={`${tierBadgeClasses(tierBadgeKey(tier.label))} ${CHIP} ${tier.current ? "" : CHIP_OTHER}`}
          title={tier.title}
          aria-pressed={tier.current}
          data-craft-affix-tier-option={tier.value}
          onClick={() => change({ kind: "affixTier", index: config.slot, value: tier.value })}
        >
          {tier.label}
        </button>
      ))}
    </span>
  );
}

type DataAttributes = Record<`data-${string}`, string | number | undefined>;

/** An option: its checkbox and label (why it is blocked under it), its tier, and once checked its rolls. */
function OptionRow({
  option,
  slotAttribute,
  optionAttribute,
  onToggle,
  tiers,
  rolls,
  rollAttributes,
  onRoll,
}: {
  option: { label: string; checked: boolean; blocked: string };
  slotAttribute: DataAttributes;
  optionAttribute: DataAttributes;
  onToggle: () => void;
  tiers: ReactNode;
  rolls: RollView[];
  rollAttributes: (roll: RollView) => Record<`data-${string}`, string | number>;
  onRoll: (roll: RollView, value: number, commit?: boolean) => void;
}) {
  const look = option.checked ? OPTION_CHECKED : option.blocked ? OPTION_BLOCKED : OPTION_OPEN;
  return (
    <div className={`${OPTION} ${look}`} {...slotAttribute}>
      <div className="flex items-center gap-2.5">
        <label
          className={`flex min-w-0 flex-1 items-center gap-2.5 ${option.blocked ? "cursor-not-allowed" : "cursor-pointer"}`}
          title={option.blocked || undefined}
        >
          <input
            type="checkbox"
            className="size-4 shrink-0 accent-accent"
            {...optionAttribute}
            checked={option.checked}
            disabled={Boolean(option.blocked)}
            onChange={onToggle}
          />
          <span className="min-w-0 flex-1 whitespace-pre-line">
            {option.label}
            {option.blocked ? <small className="block text-xs text-muted">{option.blocked}</small> : null}
          </span>
        </label>
        {tiers}
      </div>
      {rolls.map((roll) => (
        <RollInputs
          key={roll.rangeIndex}
          roll={roll}
          bare
          attributes={rollAttributes(roll)}
          onValue={(value, commit) => onRoll(roll, value, commit)}
        />
      ))}
    </div>
  );
}

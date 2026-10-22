// The rare and Vorax affix lists in the crafter, every option a checkbox row. The base affixes: each with its fixed tier,
// up to two checked. The prefixes or suffixes: the families by category (Basic, Advanced, Ultimate) in tabs, each with
// the highest tier the item level offers, up to three checked; the families the item level offers no tier of (a rare's
// Ultimate ones need Priceless) are disabled, each saying why. A Vorax item's Legendary tab lists each donor legendary's
// modifiers (with a search), up to two on the item. A checked row sets its roll with a slider in the row, and a checked
// family picks its tier among the item level's (chips in place of the tier tag).
import { useState, type ReactNode } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { searchMatcher, searchText } from "@legacy/app/bridge/search-match.ts";
import type {
  AffixListView,
  AffixOptionView,
  BaseAffixListView,
  LegendaryAffixesView,
  RollView,
} from "@legacy/app/bridge/equipment-crafter-view.ts";
import type { AffixSide, CraftChange } from "@legacy/app/gear/equipment-craft.ts";
import { tierBadgeClasses, tierBadgeKey } from "@legacy/app/gear/tier-badge.ts";
import { SearchField } from "../../ui/SearchField";
import { RollInputs } from "./crafter-parts";
import {
  AFFIX_ROW,
  AFFIX_ROW_BLOCKED,
  AFFIX_ROW_CHECKED,
  AFFIX_ROW_HEAD,
  AFFIX_ROW_LEGENDARY,
  AFFIX_ROW_OPEN,
  TIER_CHIP,
  TIER_CHIP_OTHER,
  TIER_CHIPS,
} from "./crafter-classes";

const change = (craftChange: CraftChange) => plannerCommands().changeEquipmentCraft(craftChange);

// Picked in code from the option's state: a utility may not spell a state word the e2e tests read.

/** The base affixes, every one the type offers. */
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

const LEGENDARY_TAB = "Legendary";
const checkedCount = (options: AffixOptionView[]) => options.filter((option) => option.checked).length;

/** The prefixes or suffixes, by category in tabs; a Vorax item's Legendary affixes in a last tab. */
export function AffixList({ list }: { list: AffixListView }) {
  const [tab, setTab] = useState(list.tabs[0]?.id ?? "");
  const tabs = [
    ...list.tabs.map((entry) => ({ id: entry.id, label: entry.label, checked: checkedCount(entry.options) })),
    ...(list.legendary
      ? [
          {
            id: LEGENDARY_TAB,
            label: LEGENDARY_TAB,
            checked: list.legendary.donors.reduce((count, donor) => count + checkedCount(donor.options), 0),
          },
        ]
      : []),
  ];
  const openId = tabs.some((entry) => entry.id === tab) ? tab : tabs[0]?.id;
  const open = list.tabs.find((entry) => entry.id === openId);
  return (
    <div className="grid gap-2" data-affix-list={list.side}>
      <div className="flex gap-1 border-b border-line" role="tablist" aria-label={`${list.heading} categories`}>
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={entry.id === openId}
            className="tab px-3 py-2 text-xs font-bold tracking-wide uppercase chosen:border-accent chosen:text-accent"
            onClick={() => setTab(entry.id)}
          >
            {`${entry.label} (${entry.checked})`}
          </button>
        ))}
      </div>
      <div className="grid gap-1.5" role="tabpanel">
        {open ? (
          open.options.map((option) => <AffixRow key={option.value} side={list.side} option={option} />)
        ) : list.legendary ? (
          <LegendaryAffixes side={list.side} legendary={list.legendary} />
        ) : null}
      </div>
    </div>
  );
}

/** A Vorax item's Legendary affixes on a side, under their donor legendary; the search keeps a donor or its modifiers. */
function LegendaryAffixes({ side, legendary }: { side: AffixSide; legendary: LegendaryAffixesView }) {
  const [search, setSearch] = useState("");
  const matcher = searchMatcher(search);
  const donors = search.trim()
    ? legendary.donors
        .map((donor) =>
          matcher.matches(searchText([donor.name]))
            ? donor
            : { ...donor, options: donor.options.filter((option) => matcher.matches(searchText([option.label]))) },
        )
        .filter((donor) => donor.options.length)
    : legendary.donors;
  return (
    <div className="grid gap-2.5">
      <p className="text-xs text-muted">{`A Vorax item inherits up to two Legendary affixes (${legendary.count}).`}</p>
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search legendary or mod…"
        error={matcher.error}
        input={{ "data-vorax-legendary-search": "" }}
      />
      {donors.map((donor) => (
        <section key={donor.id} className="grid gap-1.5" data-vorax-donor={donor.id}>
          <h4 className="flex items-center gap-2 text-xs font-bold text-grade-legendary">
            {donor.icon ? <img src={donor.icon} alt="" className="size-7 object-contain" /> : null}
            <span className="min-w-0 flex-1">{donor.name}</span>
            <small className="font-normal text-muted">{donor.level}</small>
          </h4>
          {donor.options.map((option) => (
            <AffixRow key={option.value} side={side} option={option} legendary />
          ))}
        </section>
      ))}
      {donors.length ? null : <p className="text-xs text-dim">No legendary affix matches the search.</p>}
    </div>
  );
}

/** A family (or a donor's modifier) in a side's list: checked, it takes a slot of the side. */
function AffixRow({
  side,
  option,
  legendary = false,
}: {
  side: AffixSide;
  option: AffixOptionView;
  legendary?: boolean;
}) {
  return (
    <OptionRow
      option={option}
      legendary={legendary}
      slotAttribute={{ "data-craft-affix-slot": option.config?.slot }}
      optionAttribute={{ "data-craft-affix-option": option.value }}
      onToggle={() => change({ kind: "toggleAffix", side, familyId: option.value, legendary })}
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
  );
}

/** A family's tier: the chips to pick from once checked, else the highest the item level offers (a donor's modifier: L). */
function FamilyTiers({ option }: { option: AffixOptionView }) {
  const config = option.config;
  if (!config?.tiers.length)
    return option.highestTier ? (
      <i className={tierBadgeClasses(tierBadgeKey(option.highestTier))}>{option.highestTier}</i>
    ) : null;
  return (
    <span className={TIER_CHIPS} role="group" aria-label={`${option.label} tier`}>
      {config.tiers.map((tier) => (
        <button
          key={tier.value}
          type="button"
          className={`${tierBadgeClasses(tierBadgeKey(tier.label))} ${TIER_CHIP} ${tier.current ? "" : TIER_CHIP_OTHER}`}
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
  legendary = false,
  slotAttribute,
  optionAttribute,
  onToggle,
  tiers,
  rolls,
  rollAttributes,
  onRoll,
}: {
  option: { label: string; checked: boolean; blocked: string };
  /** A Legendary affix: checked, it takes the legendary colours. */
  legendary?: boolean;
  slotAttribute: DataAttributes;
  optionAttribute: DataAttributes;
  onToggle: () => void;
  tiers: ReactNode;
  rolls: RollView[];
  rollAttributes: (roll: RollView) => Record<`data-${string}`, string | number>;
  onRoll: (roll: RollView, value: number, commit?: boolean) => void;
}) {
  const look = option.checked
    ? legendary
      ? AFFIX_ROW_LEGENDARY
      : AFFIX_ROW_CHECKED
    : option.blocked
      ? AFFIX_ROW_BLOCKED
      : AFFIX_ROW_OPEN;
  return (
    <div className={`${AFFIX_ROW} ${look}`} {...slotAttribute}>
      <div className={AFFIX_ROW_HEAD}>
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
          attributes={rollAttributes(roll)}
          onValue={(value, commit) => onRoll(roll, value, commit)}
        />
      ))}
    </div>
  );
}

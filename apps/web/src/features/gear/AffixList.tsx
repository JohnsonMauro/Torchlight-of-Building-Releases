// A rare's prefix or suffix list in the crafter: the families by category (Basic, Advanced, Ultimate) in tabs, each a
// checkbox with the highest tier the item level offers. Up to three are checked; the others are disabled then, as are the
// families the item level offers no tier of (the Ultimate ones need Priceless), each saying why.
import { useState } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { AffixListView } from "@legacy/app/bridge/equipment-crafter-view.ts";
import { tierBadgeClasses, tierBadgeKey } from "@legacy/app/gear/tier-badge.ts";

const OPTION = "flex items-center gap-2.5 rounded border border-line bg-raised px-2.5 py-2 text-sm text-text";
// Picked in code from the option's state: a utility may not spell a state word the e2e tests read.
const OPTION_OPEN = "cursor-pointer hover:border-accent";
const OPTION_BLOCKED = "cursor-not-allowed opacity-50";

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
      <div className="grid max-h-72 gap-1.5 overflow-auto pr-1" role="tabpanel">
        {open?.options.map((option) => (
          <label
            key={option.value}
            className={`${OPTION} ${option.blocked ? OPTION_BLOCKED : OPTION_OPEN}`}
            title={option.blocked || undefined}
          >
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-accent"
              data-craft-affix-option={option.value}
              checked={option.checked}
              disabled={Boolean(option.blocked)}
              onChange={() =>
                plannerCommands().changeEquipmentCraft({ kind: "toggleAffix", side: list.side, familyId: option.value })
              }
            />
            <span className="min-w-0 flex-1 whitespace-pre-line">
              {option.label}
              {option.blocked ? <small className="block text-xs text-muted">{option.blocked}</small> : null}
            </span>
            {option.highestTier ? (
              <i className={tierBadgeClasses(tierBadgeKey(option.highestTier))}>{option.highestTier}</i>
            ) : null}
          </label>
        ))}
      </div>
    </div>
  );
}

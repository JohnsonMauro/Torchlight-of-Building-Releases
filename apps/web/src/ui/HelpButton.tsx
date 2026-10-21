import { HELP_TOPICS } from "./help-topics";
import { HelpTooltip } from "./HelpTooltip";
import { Tooltip } from "./tooltip/Tooltip";

/**
 * The small round "?" beside a section title: hovering or focusing it shows that section's controls; a click, tap or
 * Enter toggles them.
 */
export function HelpButton({ topic, label, className }: { topic: string; label: string; className?: string }) {
  const help = HELP_TOPICS[topic];
  if (!help) return null;
  return (
    <Tooltip content={() => <HelpTooltip topic={help} />} kind="qol-help-tooltip" toggle>
      <button
        type="button"
        className={`ml-2 inline-grid size-4.5 shrink-0 cursor-help place-items-center rounded-full border border-accent-strong/55 bg-sunken p-0 align-middle text-xs leading-none font-bold tracking-normal text-accent-strong normal-case hover:border-accent-strong hover:bg-accent-strong/15 focus-visible:border-accent-strong focus-visible:bg-accent-strong/15 focus-visible:outline-none ${className ?? ""}`}
        aria-label={`${label} controls`}
      >
        ?
      </button>
    </Tooltip>
  );
}

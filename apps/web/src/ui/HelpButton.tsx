import { HELP_TOPICS } from "./help-topics";
import { HelpTooltip } from "./HelpTooltip";
import { Tooltip } from "./tooltip/Tooltip";
import { HINT_BUTTON } from "./hint-button-classes";

/**
 * The small round "?" beside a section title: hovering or focusing it shows that section's controls; a click, tap or
 * Enter toggles them.
 */
export function HelpButton({ topic, label, className }: { topic: string; label: string; className?: string }) {
  const help = HELP_TOPICS[topic];
  if (!help) return null;
  return (
    <Tooltip content={() => ({ body: <HelpTooltip topic={help} />, kind: "qol-help-tooltip" })} toggle>
      <button type="button" className={`ml-2 ${HINT_BUTTON} ${className ?? ""}`} aria-label={`${label} controls`}>
        ?
      </button>
    </Tooltip>
  );
}

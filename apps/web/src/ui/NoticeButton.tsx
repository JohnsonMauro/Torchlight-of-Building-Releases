import { Tooltip } from "./tooltip/Tooltip";
import { WARN_HINT_BUTTON } from "./hint-button-classes";

/**
 * A small round "!" that tells something about what it sits beside (a build tab the game log could not fill): hovering
 * or focusing it shows the text; a click, tap or Enter toggles it.
 */
export function NoticeButton({ text, label, className }: { text: string; label: string; className?: string }) {
  return (
    <Tooltip
      content={() => ({ body: <span className="block text-xs/snug text-text">{text}</span>, kind: "qol-help-tooltip" })}
      toggle
    >
      <button type="button" className={`${WARN_HINT_BUTTON} ${className ?? ""}`} aria-label={`${label} notice`}>
        !
      </button>
    </Tooltip>
  );
}

// A large figure of the Stats page that a click (or Enter / Space) turns from its truncated text ("1.59 Billion") into the
// full integer and back. Which figures are open is kept in memory for the session, by id, so a figure keeps its state
// while the sheet re-renders for another skill or build; nothing is stored.
import { useSyncExternalStore } from "react";
import type { NumberText } from "@legacy/app/stats/number-text.ts";

const SHORT_HINT = "Click to show the full number";
const FULL_HINT = "Click to shorten";

const expanded = new Set<string>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
function flip(id: string) {
  if (expanded.has(id)) expanded.delete(id);
  else expanded.add(id);
  for (const listener of listeners) listener();
}

interface NumberToggleProps {
  /** Names the figure so its state survives re-renders ("recount:averageDps"). */
  id: string;
  text: NumberText;
  className?: string;
  /** Styles the truncated text's trailing unit word ("Billion") apart (a damage path's hero figure). */
  unitClass?: string;
}

const UNIT_WORD = /^(.*) (Thousand|Million|Billion|Trillion|Quadrillion)$/;

export function NumberToggle({ id, text, className, unitClass }: NumberToggleProps) {
  const open = useSyncExternalStore(subscribe, () => expanded.has(id));
  if (text.short === null) return <strong className={className}>{text.full}</strong>;
  const shown = open ? text.full : text.short;
  const hint = open ? FULL_HINT : SHORT_HINT;
  return (
    <strong
      className={className ? `${className} number-toggle` : "number-toggle"}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      title={hint}
      aria-label={`${shown}. ${hint}`}
      onClick={() => flip(id)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        flip(id);
      }}
    >
      {!open && unitClass && UNIT_WORD.test(shown) ? (
        <>
          {`${UNIT_WORD.exec(shown)?.[1]} `}
          <span className={unitClass}>{UNIT_WORD.exec(shown)?.[2]}</span>
        </>
      ) : (
        shown
      )}
    </strong>
  );
}

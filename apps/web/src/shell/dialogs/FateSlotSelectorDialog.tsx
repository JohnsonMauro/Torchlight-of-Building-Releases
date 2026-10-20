// The Fate slot selector (a Pactspirit's Undetermined Fate node): the extra Micro / Medium Fate slot unlocks, the
// Pactspirit's current one marked. The planner opens it for a Pactspirit and announces the "fateSlotSelector" source; a
// choice is the selectFateSlots command, Clear Fate slots the clearFateSlots command for that Pactspirit. The CSS styles the clear button by
// data-clear-fate-slots, so it stays.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useViewSource } from "../../ui/use-view-source";

export function FateSlotSelectorDialog() {
  const view = useViewSource("fateSlotSelector");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <dialog id="fate-slot-selector" ref={dialog} className="fate-slot-dialog" aria-labelledby="fate-slot-title">
      <header>
        <h2 id="fate-slot-title">Unlock Fate Slots</h2>
        <button type="button" aria-label="Close Fate slot selector" onClick={() => dialog.current?.close()}>
          ×
        </button>
      </header>
      <p>Select how to expand this Undetermined Fate slot:</p>
      <div id="fate-slot-options">
        {(view?.choices ?? []).map((choice) => {
          const selected = choice.id === view?.selected;
          return (
            <button
              key={choice.id}
              type="button"
              className={selected ? "selected" : ""}
              onClick={() => plannerCommands().selectFateSlots(choice.id)}
            >
              {choice.label}
              <span aria-hidden="true">{selected ? "✓" : "›"}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="button button-secondary"
        data-clear-fate-slots=""
        onClick={() => {
          if (view) plannerCommands().clearFateSlots(view.spirit);
          dialog.current?.close();
        }}
      >
        Clear Fate slots
      </button>
    </dialog>
  );
}

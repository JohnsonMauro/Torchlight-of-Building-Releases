// The Fate slot selector (a Pactspirit's Undetermined Fate node): the extra Micro / Medium Fate slot unlocks, the
// Pactspirit's current one marked. The planner opens it for a Pactspirit and announces the "fateSlotSelector" source; a
// choice is the selectFateSlots command, Clear Fate slots the clearFateSlots command for that Pactspirit.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useViewSource } from "../../ui/use-view-source";
import { pickCard, pickerDialog } from "../../ui/selector-classes";

const fateOption =
  "flex min-h-14 cursor-pointer items-center justify-between rounded-sm border px-4 py-3 text-left font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function FateSlotSelectorDialog() {
  const view = useViewSource("fateSlotSelector");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <dialog
      id="fate-slot-selector"
      ref={dialog}
      className={`fate-slot-dialog ${pickerDialog} h-180 w-127.5`}
      aria-labelledby="fate-slot-title"
    >
      <header className="dialog-head">
        <h2 id="fate-slot-title" className="dialog-title">
          Unlock Fate Slots
        </h2>
        <button
          type="button"
          className="dialog-close"
          aria-label="Close Fate slot selector"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </header>
      <p className="shrink-0 px-4 pt-4 pb-3 text-sm text-muted">Select how to expand this Undetermined Fate slot:</p>
      <div id="fate-slot-options" className="grid min-h-0 flex-1 auto-rows-max gap-2 overflow-auto px-4 pb-4">
        {(view?.choices ?? []).map((choice) => {
          const selected = choice.id === view?.selected;
          return (
            <button
              key={choice.id}
              type="button"
              className={`${selected ? "selected " : ""}${pickCard(selected)} ${fateOption}`}
              onClick={() => plannerCommands().selectFateSlots(choice.id)}
            >
              {choice.label}
              <span className="text-xl text-accent" aria-hidden="true">
                {selected ? "✓" : "›"}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="btn-danger mx-4 mb-4 h-10 shrink-0 text-xs font-bold tracking-wider uppercase"
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

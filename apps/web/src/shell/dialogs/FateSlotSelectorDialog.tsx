// The Fate slot selector (a Pactspirit's Undetermined Fate node): the extra Micro / Medium Fate slot unlocks, the
// Pactspirit's current one marked. The planner opens it for a Pactspirit and announces the "fateSlotSelector" source; a
// choice is the selectFateSlots command, Clear Fate slots the clearFateSlots command for that Pactspirit.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useViewSource } from "../../ui/use-view-source";
import { pickerDialog } from "./selector-classes";

const fateOption =
  "flex min-h-14.5 cursor-pointer items-center justify-between rounded-[4px] border px-4 py-3 text-left font-bold text-[#f1e5cc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";
const fateIdle =
  "border-[#554a3a] bg-[linear-gradient(145deg,#1d252d,#151b23)] shadow-[inset_0_1px_rgb(255_231_165/0.05)] hover:border-[#e7b35d] hover:bg-[linear-gradient(145deg,#302a23,#1b2229)]";
const fateChosen = "border-[#e7b35d] bg-[linear-gradient(145deg,#302a23,#1b2229)] shadow-[inset_3px_0_#f9ca65]";

export function FateSlotSelectorDialog() {
  const view = useViewSource("fateSlotSelector");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <dialog
      id="fate-slot-selector"
      ref={dialog}
      className={`fate-slot-dialog ${pickerDialog} h-180 w-127.5 text-[#f1e5cc]`}
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
      <p className="shrink-0 px-3.75 pt-4 pb-3 text-[0.82rem] text-[#c5b8a1]">
        Select how to expand this Undetermined Fate slot:
      </p>
      <div id="fate-slot-options" className="grid min-h-0 flex-1 auto-rows-max gap-2.25 overflow-auto px-3.75 pb-4">
        {(view?.choices ?? []).map((choice) => {
          const selected = choice.id === view?.selected;
          return (
            <button
              key={choice.id}
              type="button"
              className={`${selected ? `selected ${fateChosen}` : fateIdle} ${fateOption}`}
              onClick={() => plannerCommands().selectFateSlots(choice.id)}
            >
              {choice.label}
              <span className="text-[1.2rem] text-[#d6b77e]" aria-hidden="true">
                {selected ? "✓" : "›"}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="mx-3.75 mb-3.75 min-h-10 shrink-0 cursor-pointer rounded-[3px] border border-[#906044] bg-[linear-gradient(#493126,#251d1b)] text-[0.7rem] font-extrabold tracking-[0.08em] text-[#f1c2a5] uppercase hover:border-[#d18a65] hover:bg-[linear-gradient(#5a3929,#30221e)] hover:text-[#ffe0c5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
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

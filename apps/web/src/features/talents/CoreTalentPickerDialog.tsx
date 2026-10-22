// The core talent picker (a core talent slot of the open tree): the slot's choices with their effects, the tree's choice
// marked, all disabled while the tree has fewer points than the slot needs. The planner opens it and announces the
// "corePicker" source; picking one is the selectCoreTalent command.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { Artwork } from "../../ui/Artwork";
import { useViewSource } from "../../ui/use-view-source";
import { PICKER_CLOSE, PICKER_HEAD, PICKER_TITLE } from "../../ui/talent-slate-styles";
import { useRegisteredDialog } from "../../ui/dialog-registry";

const OPTION =
  "grid cursor-pointer grid-cols-[64px_1fr] items-center gap-4 rounded-md border p-3.5 text-left text-text enabled:hover:border-accent enabled:hover:bg-accent/10 focus-visible:border-accent focus-visible:outline-none off:cursor-not-allowed off:opacity-50";
const OPTION_IDLE = "border-line bg-raised";
const OPTION_CHOSEN = "border-accent bg-accent/10";
const ART =
  "relative size-14.5 overflow-hidden [&>img]:absolute [&>img]:inset-0 [&>img]:size-full [&>img]:object-cover [&>img+span]:invisible";

export function CoreTalentPickerDialog() {
  const view = useViewSource("corePicker");
  const dialog = useRef<HTMLDialogElement>(null);
  useRegisteredDialog(dialog);
  return (
    <dialog
      id="core-talent-picker"
      ref={dialog}
      className="talent-panel-picker core-talent-picker dialog-panel w-180 leading-[normal]"
      aria-labelledby="core-picker-title"
    >
      <div className={PICKER_HEAD}>
        <h2 id="core-picker-title" className={PICKER_TITLE}>
          Core talent
        </h2>
        <button
          type="button"
          className={PICKER_CLOSE}
          aria-label="Close core talent selector"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </div>
      <div id="core-talent-picker-grid" className="core-talent-picker-grid grid gap-3 p-4.5">
        {(view?.options ?? []).map((option) => (
          <button
            key={option.name}
            type="button"
            className={`core-picker-option ${option.selected ? `selected ${OPTION_CHOSEN}` : OPTION_IDLE} ${OPTION}`}
            disabled={view?.locked}
            onClick={() => plannerCommands().selectCoreTalent(option.name)}
          >
            <Artwork src={option.art} alt={option.name} className={`core-picker-art ${ART}`} />
            <span>
              <strong className="block font-display text-base text-accent">{option.name}</strong>
              <small className="mt-1 block text-sm leading-relaxed text-muted">{option.description}</small>
            </span>
          </button>
        ))}
      </div>
    </dialog>
  );
}

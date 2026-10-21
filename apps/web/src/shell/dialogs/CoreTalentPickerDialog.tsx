// The core talent picker (a core talent slot of the open tree): the slot's choices with their effects, the tree's choice
// marked, all disabled while the tree has fewer points than the slot needs. The planner opens it and announces the
// "corePicker" source; picking one is the selectCoreTalent command.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { Artwork } from "../../ui/Artwork";
import { useViewSource } from "../../ui/use-view-source";
import { PICKER_CLOSE, PICKER_EYEBROW, PICKER_HEAD, PICKER_NOTE, PICKER_TITLE } from "./talent-slate-styles";

const OPTION =
  "grid cursor-pointer grid-cols-[64px_1fr] items-center gap-3.75 border p-3.5 text-left text-[#e4ebf1] enabled:hover:border-[#ff9636] enabled:hover:bg-[#211c18] focus-visible:border-[#ff9636] focus-visible:outline-none off:cursor-not-allowed off:opacity-48";
const OPTION_IDLE = "border-[#3c4652] bg-[#161d26]";
const OPTION_CHOSEN = "border-[#ff9636] bg-[#211c18]";
const ART =
  "relative size-14.5 overflow-hidden [&>img]:absolute [&>img]:inset-0 [&>img]:size-full [&>img]:object-cover [&>img+span]:invisible";

export function CoreTalentPickerDialog() {
  const view = useViewSource("corePicker");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <dialog
      id="core-talent-picker"
      ref={dialog}
      className="talent-panel-picker core-talent-picker dialog-panel w-180 leading-[normal]"
      aria-labelledby="core-picker-title"
    >
      <div className={PICKER_HEAD}>
        <div>
          <p className={PICKER_EYEBROW}>Core talent</p>
          <h2 id="core-picker-title" className={PICKER_TITLE}>
            {view?.title ?? "Select a core talent"}
          </h2>
          <p id="core-picker-status" className={PICKER_NOTE}>
            {view?.status}
          </p>
        </div>
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
              <strong className="block font-serif text-base text-[#ffc04f]">{option.name}</strong>
              <small className="mt-1.25 block text-[0.82rem] leading-[1.45] text-[#bac4cd]">{option.description}</small>
            </span>
          </button>
        ))}
      </div>
    </dialog>
  );
}

// The talent tree picker (an empty tree tab, or Reselect): the trees the open slot can take, each with its points, the
// slot's tree pressed. The planner opens it and announces the "talentPicker" source whenever the talent trees render;
// picking a tree is the selectTalentTree command.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useViewSource } from "../../ui/use-view-source";
import {
  EYEBROW,
  familyTint,
  PICKER_CLOSE,
  PICKER_HEAD,
  PICKER_NOTE,
  PICKER_TITLE,
} from "../../ui/talent-slate-styles";
import { TalentEmblem } from "./TalentEmblem";

const CARD =
  "group flex min-h-39.5 cursor-pointer flex-col items-center justify-center rounded-md border border-t-2 px-2 py-3 text-text hover:border-accent focus-visible:border-accent focus-visible:outline-none";
const CARD_IDLE = "border-line bg-raised";
const CARD_PRESSED = "border-accent bg-accent/10";

export function TalentPanelPickerDialog() {
  const view = useViewSource("talentPicker");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <dialog
      id="talent-panel-picker"
      ref={dialog}
      className="talent-panel-picker dialog-panel w-262.5 leading-[normal]"
      aria-labelledby="talent-picker-title"
    >
      <div className={PICKER_HEAD}>
        <div>
          <p className={EYEBROW}>Talent trees</p>
          <h2 id="talent-picker-title" className={PICKER_TITLE}>
            {view?.title ?? "Select a talent tree"}
          </h2>
          <p className={PICKER_NOTE}>Choose one panel to view and edit.</p>
        </div>
        <button
          type="button"
          className={PICKER_CLOSE}
          aria-label="Close talent tree selector"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </div>
      <div
        id="talent-panel-picker-grid"
        className="talent-panel-picker-grid grid grid-cols-5 gap-2.5 p-4.5 max-[760px]:grid-cols-2"
      >
        {(view?.cards ?? []).map((card) => (
          <button
            key={card.name}
            type="button"
            className={`talent-picker-card ${card.familyClass} ${card.selected ? "selected" : ""} ${view?.god ? "god-tree border-t-accent" : "class-tree border-t-violet"} ${CARD} ${card.selected ? CARD_PRESSED : CARD_IDLE} ${familyTint(card.familyClass)}`}
            aria-pressed={card.selected}
            onClick={() => plannerCommands().selectTalentTree(card.name)}
          >
            <TalentEmblem src={card.art} alt={card.name} className="talent-picker-art size-19.5" />
            <span className="mt-2 text-[10px] tracking-wider text-dim uppercase">
              {view?.god ? "God tree" : "Class tree"}
            </span>
            <strong className="my-1 text-center font-display text-sm">{card.name}</strong>
            <small className="text-xs text-muted">{`${card.points} points`}</small>
          </button>
        ))}
      </div>
    </dialog>
  );
}

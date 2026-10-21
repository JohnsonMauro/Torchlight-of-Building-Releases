// The talent tree picker (an empty tree tab, or Reselect): the trees the open slot can take, each with its points, the
// slot's tree pressed. The planner opens it and announces the "talentPicker" source whenever the talent trees render;
// picking a tree is the selectTalentTree command.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { Artwork } from "../../ui/Artwork";
import { useViewSource } from "../../ui/use-view-source";
import {
  familyTint,
  PICKER_CLOSE,
  PICKER_EYEBROW,
  PICKER_HEAD,
  PICKER_NOTE,
  PICKER_TITLE,
} from "./talent-slate-styles";

const CARD =
  "group flex min-h-39.5 cursor-pointer flex-col items-center justify-center border border-y-2 px-2 py-3 text-[#dce4eb] transition-transform hover:-translate-y-0.5 hover:border-[#ff9636] focus-visible:-translate-y-0.5 focus-visible:border-[#ff9636] focus-visible:outline-none";
const CARD_IDLE = "border-x-[#35404d] border-b-[#52606e] bg-[linear-gradient(180deg,#1a2230,#111720)]";
const CARD_PRESSED = "border-x-[#ff8c2e] border-b-[#ff8c2e] bg-[linear-gradient(180deg,rgb(255_132_39/0.22),#171a20)]";
/** The tree's emblem, painted in its family's tint (familyTint) with a glow that grows on hover and when pressed. */
const EMBLEM =
  "relative grid size-19.5 place-items-center [&>img]:absolute [&>img]:inset-0 [&>img]:size-full [&>img]:object-contain [&>img]:[filter:var(--emblem-tint)_drop-shadow(0_0_8px_color-mix(in_srgb,var(--talent-emblem)_70%,transparent))] [&>img+span]:invisible";
const EMBLEM_HOVER = "group-hover:[&>img]:[filter:var(--emblem-tint)_drop-shadow(0_0_13px_var(--talent-emblem))]";
const EMBLEM_PRESSED = "[&>img]:[filter:var(--emblem-tint)_drop-shadow(0_0_13px_var(--talent-emblem))]";

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
          <p className={PICKER_EYEBROW}>Talent trees</p>
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
            className={`talent-picker-card ${card.familyClass} ${card.selected ? "selected" : ""} ${view?.god ? "god-tree border-t-[#d39737]" : "class-tree border-t-[#675497]"} ${CARD} ${card.selected ? CARD_PRESSED : CARD_IDLE}`}
            style={familyTint(card.familyClass)}
            aria-pressed={card.selected}
            onClick={() => plannerCommands().selectTalentTree(card.name)}
          >
            <Artwork
              src={card.art}
              alt={card.name}
              className={`talent-picker-art ${EMBLEM} ${card.selected ? EMBLEM_PRESSED : EMBLEM_HOVER}`}
            />
            <span className="mt-2 text-[0.58rem] text-[#7f8c9a] uppercase">
              {view?.god ? "God tree" : "Class tree"}
            </span>
            <strong className="my-0.75 text-center font-serif text-[0.85rem]">{card.name}</strong>
            <small className="text-[0.62rem] text-[#9ca8b5]">{`${card.points} points`}</small>
          </button>
        ))}
      </div>
    </dialog>
  );
}

// The talent tree picker (an empty tree tab, or Reselect): the trees the open slot can take, each with its points, the
// slot's tree pressed. The planner opens it and announces the "talentPicker" source whenever the talent trees render;
// picking a tree is the selectTalentTree command.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { Artwork } from "../../ui/Artwork";
import { useViewSource } from "../../ui/use-view-source";

export function TalentPanelPickerDialog() {
  const view = useViewSource("talentPicker");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <dialog id="talent-panel-picker" ref={dialog} className="talent-panel-picker" aria-labelledby="talent-picker-title">
      <div className="talent-picker-heading">
        <div>
          <p className="eyebrow">Talent trees</p>
          <h2 id="talent-picker-title">{view?.title ?? "Select a talent tree"}</h2>
          <p className="muted">Choose one panel to view and edit.</p>
        </div>
        <button
          type="button"
          className="picker-close"
          aria-label="Close talent tree selector"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </div>
      <div id="talent-panel-picker-grid" className="talent-panel-picker-grid">
        {(view?.cards ?? []).map((card) => (
          <button
            key={card.name}
            type="button"
            className={`talent-picker-card ${card.familyClass} ${card.selected ? "selected" : ""} ${view?.god ? "god-tree" : "class-tree"}`}
            aria-pressed={card.selected}
            onClick={() => plannerCommands().selectTalentTree(card.name)}
          >
            <Artwork src={card.art} alt={card.name} className="talent-picker-art" />
            <span>{view?.god ? "God tree" : "Class tree"}</span>
            <strong>{card.name}</strong>
            <small>{`${card.points} points`}</small>
          </button>
        ))}
      </div>
    </dialog>
  );
}

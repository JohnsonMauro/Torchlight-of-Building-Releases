// The core talent picker (a core talent slot of the open tree): the slot's choices with their effects, the tree's choice
// marked, all disabled while the tree has fewer points than the slot needs. The planner opens it and announces the
// "corePicker" source; picking one is the selectCoreTalent command.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { Artwork } from "../../ui/Artwork";
import { useViewSource } from "../../ui/use-view-source";

export function CoreTalentPickerDialog() {
  const view = useViewSource("corePicker");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <dialog
      id="core-talent-picker"
      ref={dialog}
      className="talent-panel-picker core-talent-picker"
      aria-labelledby="core-picker-title"
    >
      <div className="talent-picker-heading">
        <div>
          <p className="eyebrow">Core talent</p>
          <h2 id="core-picker-title">{view?.title ?? "Select a core talent"}</h2>
          <p id="core-picker-status" className="muted">
            {view?.status}
          </p>
        </div>
        <button
          type="button"
          className="picker-close"
          aria-label="Close core talent selector"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </div>
      <div id="core-talent-picker-grid" className="core-talent-picker-grid">
        {(view?.options ?? []).map((option) => (
          <button
            key={option.name}
            type="button"
            className={`core-picker-option ${option.selected ? "selected" : ""}`}
            disabled={view?.locked}
            onClick={() => plannerCommands().selectCoreTalent(option.name)}
          >
            <Artwork src={option.art} alt={option.name} className="core-picker-art" />
            <span>
              <strong>{option.name}</strong>
              <small>{option.description}</small>
            </span>
          </button>
        ))}
      </div>
    </dialog>
  );
}

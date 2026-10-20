// The Kismet crafter (a Kismet node of the Pactspirits section opens it): the slot kind's Kismets with a search over names
// and effects, the chosen one's values (slider and number) and preview; Confirm, Clear Slot, Cancel. The planner opens it
// and announces the "kismetCrafter" source (`session` starts the search over); the controls are planner commands. The
// CSS styles the footer buttons by data-confirm-kismet and data-clear-kismet-slot, so they stay.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { LiveNumberInput } from "../../ui/LiveNumberInput";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";

export function KismetCrafterDialog() {
  const view = useViewSource("kismetCrafter");
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useSessionState(view?.session ?? 0, "");
  const needle = query.trim().toLowerCase();
  const choices = (view?.choices ?? []).filter((choice) => !needle || choice.search.includes(needle));
  const close = () => dialog.current?.close();
  return (
    <dialog
      id="kismet-crafter"
      ref={dialog}
      className="kismet-crafter-dialog"
      aria-labelledby="kismet-crafter-title"
      onClose={() => plannerCommands().closeKismetCrafter()}
    >
      <header>
        <h2 id="kismet-crafter-title">{view?.title ?? "Select Kismet"}</h2>
        <button type="button" aria-label="Close Kismet crafter" onClick={close}>
          ×
        </button>
      </header>
      <div className="kismet-crafter-layout">
        <div className="kismet-choice-pane">
          <input
            id="kismet-search"
            type="search"
            placeholder="Search kismets…"
            aria-label="Search kismets"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div id="kismet-choice-list">
            {!view ? null : choices.length ? (
              choices.map((choice) => (
                <button
                  key={choice.name}
                  type="button"
                  className={`kismet-choice ${choice.name === view.selected ? "selected" : ""}`}
                  onClick={() => plannerCommands().selectKismetChoice(choice.name)}
                >
                  <img src={choice.icon} alt="" />
                  <span>
                    <strong>{choice.label}</strong>
                    <small>{choice.affixes}</small>
                  </span>
                  <em className={choice.rarity.toLowerCase()}>{choice.rarity}</em>
                </button>
              ))
            ) : (
              <p className="kismet-no-results">No matching kismets.</p>
            )}
          </div>
        </div>
        <div className="kismet-detail-pane">
          <div id="kismet-roll-controls">
            {!view ? null : view.rolls.length ? (
              view.rolls.map((roll) => (
                <label key={roll.index} className="kismet-roll-row">
                  <span>
                    {`Value ${roll.index + 1}: `}
                    <strong>{roll.value}</strong>
                  </span>
                  <div>
                    <input
                      type="range"
                      min={roll.min}
                      max={roll.max}
                      step={roll.step}
                      value={roll.value}
                      onChange={(event) => plannerCommands().setKismetRoll(roll.index, Number(event.target.value))}
                    />
                    <LiveNumberInput
                      min={roll.min}
                      max={roll.max}
                      step={roll.step}
                      value={roll.value}
                      aria-label={`Value ${roll.index + 1}`}
                      onValue={(value) => plannerCommands().setKismetRoll(roll.index, value)}
                      onCommit={(text) => plannerCommands().commitKismetRoll(roll.index, text)}
                    />
                  </div>
                  <small>{roll.affix}</small>
                </label>
              ))
            ) : (
              <p className="kismet-fixed-roll">This Kismet has fixed effects.</p>
            )}
          </div>
          <div id="kismet-preview">
            {view?.preview ? (
              <>
                <div className="kismet-preview-head">
                  <img src={view.preview.icon} alt="" />
                  <div>
                    <strong>{view.preview.name}</strong>
                    <small>{view.preview.detail}</small>
                  </div>
                </div>
                <ul>
                  {view.preview.affixes.map((affix, index) => (
                    <li key={index}>
                      {affix.effective === null ? (
                        affix.before
                      ) : (
                        <>
                          {affix.before}
                          <span className="skill-level-bonus" title={affix.title}>
                            {affix.effective}
                          </span>
                          {affix.after}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <p>{view.preview.install}</p>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <footer>
        <button type="button" data-clear-kismet-slot="" onClick={() => plannerCommands().clearKismetCrafterSlot()}>
          Clear Slot
        </button>
        <button type="button" data-confirm-kismet="" onClick={() => plannerCommands().confirmKismet()}>
          Confirm
        </button>
        <button type="button" onClick={close}>
          Cancel
        </button>
      </footer>
    </dialog>
  );
}

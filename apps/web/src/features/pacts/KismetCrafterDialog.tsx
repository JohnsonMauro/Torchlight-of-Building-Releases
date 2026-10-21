// The Kismet crafter (a Kismet node of the Pactspirits section opens it): the slot kind's Kismets with a search over names
// and effects, the chosen one's values (slider and number) and preview; Confirm, Clear Slot, Cancel. The planner opens it
// and announces the "kismetCrafter" source (`session` starts the search over); the controls are planner commands.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { LiveNumberInput } from "../../ui/LiveNumberInput";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";
import { fieldInput, numberField, pickCard, pickerDialog, rangeField } from "../../ui/selector-classes";
import { rarityTone } from "./pact-classes";
import { useRegisteredDialog } from "../../ui/dialog-registry";

/** A Kismet's card: icon, name and effects, its rarity tag (the <em>, whose class is the rarity alone) at the top right,
 * in the rarity's colour (--pact-tone, set by rarityTone). */
const kismetChoice =
  "grid h-20.5 min-w-0 cursor-pointer grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2.5 overflow-hidden rounded-md border p-2 text-left text-text outline-none [&>em]:self-start [&>em]:justify-self-end [&>em]:rounded-sm [&>em]:border [&>em]:border-(--pact-tone)/60 [&>em]:px-1.5 [&>em]:py-0.5 [&>em]:text-[10px] [&>em]:text-(--pact-tone) [&>em]:not-italic";
const footerButton = "h-9 min-w-24 px-4 text-sm font-semibold";

export function KismetCrafterDialog() {
  const view = useViewSource("kismetCrafter");
  const dialog = useRef<HTMLDialogElement>(null);
  useRegisteredDialog(dialog);
  const [query, setQuery] = useSessionState(view?.session ?? 0, "");
  const needle = query.trim().toLowerCase();
  const choices = (view?.choices ?? []).filter((choice) => !needle || choice.search.includes(needle));
  const close = () => dialog.current?.close();
  return (
    <dialog
      id="kismet-crafter"
      ref={dialog}
      className={`kismet-crafter-dialog ${pickerDialog} h-175 w-232.5`}
      aria-labelledby="kismet-crafter-title"
      onClose={() => plannerCommands().closeKismetCrafter()}
    >
      <header className="dialog-head">
        <h2 id="kismet-crafter-title" className="dialog-title">
          {view?.title ?? "Select Kismet"}
        </h2>
        <button type="button" className="dialog-close" aria-label="Close Kismet crafter" onClick={close}>
          ×
        </button>
      </header>
      <div className="kismet-crafter-layout grid min-h-0 flex-1 grid-cols-2 max-[700px]:grid-cols-1 max-[700px]:overflow-auto">
        <div className="kismet-choice-pane grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 border-r border-line p-4 max-[700px]:max-h-[60vh] max-[700px]:border-r-0 max-[700px]:border-b">
          <input
            id="kismet-search"
            type="search"
            placeholder="Search kismets…"
            aria-label="Search kismets"
            className={`${fieldInput} w-full`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div id="kismet-choice-list" className="grid min-h-0 auto-rows-max content-start gap-2 overflow-auto pr-1.5">
            {!view ? null : choices.length ? (
              choices.map((choice) => (
                <button
                  key={choice.name}
                  type="button"
                  className={`kismet-choice ${choice.name === view.selected ? "selected" : ""} ${kismetChoice} ${pickCard(choice.name === view.selected)} ${rarityTone(choice.rarity)}`}
                  onClick={() => plannerCommands().selectKismetChoice(choice.name)}
                >
                  <img src={choice.icon} alt="" className="size-11.5 justify-self-center object-contain" />
                  <span className="min-w-0 overflow-hidden">
                    <strong className="line-clamp-1 text-sm">{choice.label}</strong>
                    <small className="mt-1 line-clamp-2 text-xs leading-snug text-muted">{choice.affixes}</small>
                  </span>
                  <em className={choice.rarity.toLowerCase()}>{choice.rarity}</em>
                </button>
              ))
            ) : (
              <p className="kismet-no-results text-sm text-muted">No matching kismets.</p>
            )}
          </div>
        </div>
        <div className="kismet-detail-pane min-h-0 overflow-auto p-4">
          <div id="kismet-roll-controls">
            {!view ? null : view.rolls.length ? (
              view.rolls.map((roll) => (
                <label
                  key={roll.index}
                  className="kismet-roll-row mb-3.5 grid gap-2 rounded-md border border-line bg-raised px-3 py-2.5 text-xs text-muted"
                >
                  <span className="flex justify-between">
                    {`Value ${roll.index + 1}: `}
                    <strong className="text-accent">{roll.value}</strong>
                  </span>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="range"
                      className={rangeField}
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
                      className={numberField}
                      onValue={(value) => plannerCommands().setKismetRoll(roll.index, value)}
                      onCommit={(text) => plannerCommands().commitKismetRoll(roll.index, text)}
                    />
                  </div>
                  <small className="text-xs text-dim">{roll.affix}</small>
                </label>
              ))
            ) : (
              <p className="kismet-fixed-roll mb-3 text-xs text-muted">This Kismet has fixed effects.</p>
            )}
          </div>
          <div id="kismet-preview" className="rounded-md border border-line bg-raised p-4">
            {view?.preview ? (
              <>
                <div className="kismet-preview-head flex items-center gap-3 border-b border-line pb-3">
                  <img src={view.preview.icon} alt="" className="size-12 object-contain" />
                  <div>
                    <strong className="block text-sm text-accent">{view.preview.name}</strong>
                    <small className="mt-1 block text-xs text-muted">{view.preview.detail}</small>
                  </div>
                </div>
                <ul className="my-3 grid gap-2">
                  {view.preview.affixes.map((affix, index) => (
                    <li key={index} className="text-xs leading-snug text-accent-strong">
                      {affix.effective === null ? (
                        affix.before
                      ) : (
                        <>
                          {affix.before}
                          <span className="skill-level-bonus font-bold text-ok" title={affix.title}>
                            {affix.effective}
                          </span>
                          {affix.after}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-dim italic">{view.preview.install}</p>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <footer className="flex shrink-0 justify-end gap-2.5 border-t border-line px-4 py-3">
        <button
          type="button"
          className={`btn ${footerButton}`}
          onClick={() => plannerCommands().clearKismetCrafterSlot()}
        >
          Clear Slot
        </button>
        <button
          type="button"
          className={`btn-primary ${footerButton} normal-case`}
          onClick={() => plannerCommands().confirmKismet()}
        >
          Confirm
        </button>
        <button type="button" className={`btn ${footerButton}`} onClick={close}>
          Cancel
        </button>
      </footer>
    </dialog>
  );
}

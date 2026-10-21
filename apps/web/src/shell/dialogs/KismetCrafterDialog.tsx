// The Kismet crafter (a Kismet node of the Pactspirits section opens it): the slot kind's Kismets with a search over names
// and effects, the chosen one's values (slider and number) and preview; Confirm, Clear Slot, Cancel. The planner opens it
// and announces the "kismetCrafter" source (`session` starts the search over); the controls are planner commands.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { LiveNumberInput } from "../../ui/LiveNumberInput";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";
import { fieldInput, numberField, pickCard, pickerDialog, rangeField } from "./selector-classes";

/** A Kismet's card: icon, name and effects, its rarity tag (the <em>, whose class is the rarity alone) at the top right. */
const kismetChoice =
  "grid h-20.5 min-w-0 cursor-pointer grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2.5 overflow-hidden rounded-lg border p-2.25 text-left text-[#e8edf2] outline-none [&>em]:self-start [&>em]:justify-self-end [&>em]:rounded-[3px] [&>em]:border [&>em]:border-[#a35abb] [&>em]:px-1.5 [&>em]:py-0.75 [&>em]:text-[0.6rem] [&>em]:text-[#d59deb] [&>em]:not-italic [&>em.legendary]:border-[#b47a35] [&>em.legendary]:text-[#efb56a]";
const footerButton = "min-w-24.5 rounded-[4px] px-4 py-2.5 text-sm font-bold";

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
        <div className="kismet-choice-pane grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2.75 border-r border-[#303a46] p-4 max-[700px]:max-h-[60vh] max-[700px]:border-r-0 max-[700px]:border-b">
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
                  className={`kismet-choice ${choice.name === view.selected ? "selected" : ""} ${kismetChoice} ${pickCard(choice.name === view.selected)}`}
                  onClick={() => plannerCommands().selectKismetChoice(choice.name)}
                >
                  <img src={choice.icon} alt="" className="size-11.5 justify-self-center object-contain" />
                  <span className="min-w-0 overflow-hidden">
                    <strong className="line-clamp-1 text-[0.78rem]">{choice.label}</strong>
                    <small className="mt-1.25 line-clamp-2 text-[0.68rem] leading-[1.3] text-[#a7b3c0]">
                      {choice.affixes}
                    </small>
                  </span>
                  <em className={choice.rarity.toLowerCase()}>{choice.rarity}</em>
                </button>
              ))
            ) : (
              <p className="kismet-no-results text-[0.8rem] text-[#a7b3c0]">No matching kismets.</p>
            )}
          </div>
        </div>
        <div className="kismet-detail-pane min-h-0 overflow-auto p-4.25">
          <div id="kismet-roll-controls">
            {!view ? null : view.rolls.length ? (
              view.rolls.map((roll) => (
                <label
                  key={roll.index}
                  className="kismet-roll-row mb-3.5 grid gap-1.75 rounded-md border border-[#3d3a35] bg-[#141a21] px-2.75 py-2.5 text-[0.75rem] text-[#b9c3cd]"
                >
                  <span className="flex justify-between">
                    {`Value ${roll.index + 1}: `}
                    <strong className="text-gold">{roll.value}</strong>
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
                  <small className="text-[0.66rem] text-[#8592a0]">{roll.affix}</small>
                </label>
              ))
            ) : (
              <p className="kismet-fixed-roll mb-3.25 text-[0.75rem] text-[#9eabb8]">This Kismet has fixed effects.</p>
            )}
          </div>
          <div id="kismet-preview" className="rounded-lg border border-[#3d3a35] bg-[#11171e] p-3.75">
            {view?.preview ? (
              <>
                <div className="kismet-preview-head flex items-center gap-3 border-b border-[#2d3742] pb-3">
                  <img src={view.preview.icon} alt="" className="size-12 object-contain" />
                  <div>
                    <strong className="block text-[0.9rem] text-[#f4bd80]">{view.preview.name}</strong>
                    <small className="mt-1 block text-[0.69rem] text-[#a4afbb]">{view.preview.detail}</small>
                  </div>
                </div>
                <ul className="my-3.25 grid gap-2">
                  {view.preview.affixes.map((affix, index) => (
                    <li key={index} className="text-[0.77rem] leading-[1.35] text-[#edaa62]">
                      {affix.effective === null ? (
                        affix.before
                      ) : (
                        <>
                          {affix.before}
                          <span className="skill-level-bonus font-bold text-[#6ee29b]" title={affix.title}>
                            {affix.effective}
                          </span>
                          {affix.after}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-[0.7rem] text-[#8795a3] italic">{view.preview.install}</p>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <footer className="flex shrink-0 justify-end gap-2.5 border-t border-[#806037] px-4.25 py-3.25">
        <button
          type="button"
          className={`btn-bronze ${footerButton}`}
          onClick={() => plannerCommands().clearKismetCrafterSlot()}
        >
          Clear Slot
        </button>
        <button
          type="button"
          className={`btn-gold ${footerButton} normal-case`}
          onClick={() => plannerCommands().confirmKismet()}
        >
          Confirm
        </button>
        <button type="button" className={`btn-bronze ${footerButton}`} onClick={close}>
          Cancel
        </button>
      </footer>
    </dialog>
  );
}

// The Kismet crafter (a Kismet node of the Pactspirits section opens it): the slot kind's Kismets with a search over names,
// rarity and effects (words in any order, or /regex/), the chosen one's values (slider and number) and preview; Confirm,
// Clear Slot, Cancel. The planner opens it
// and announces the "kismetCrafter" source (`session` starts the search over); the controls are planner commands.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { searchMatcher } from "@legacy/app/bridge/search-match.ts";
import { RangeInput } from "../../ui/RangeInput";
import { SearchField } from "../../ui/SearchField";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";
import { pickCard, pickerDialog } from "../../ui/selector-classes";
import { rarityTone } from "./pact-classes";
import { useRegisteredDialog } from "../../ui/dialog-registry";

/** A Kismet's card: icon, name and effects, its rarity tag (the <em>, whose class is the rarity alone) at the top right,
 * in the rarity's colour (--pact-tone, set by rarityTone). */
const kismetChoice =
  "grid min-w-0 cursor-pointer grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2.5 overflow-hidden rounded-md border px-2 py-1.5 text-left text-text outline-none [&>em]:self-start [&>em]:justify-self-end [&>em]:rounded-sm [&>em]:border [&>em]:border-(--pact-tone)/60 [&>em]:px-1.5 [&>em]:py-0.5 [&>em]:text-[10px] [&>em]:text-(--pact-tone) [&>em]:not-italic";
const footerButton = "h-9 min-w-24 px-4 text-sm font-semibold";

export function KismetCrafterDialog() {
  const view = useViewSource("kismetCrafter");
  const dialog = useRef<HTMLDialogElement>(null);
  useRegisteredDialog(dialog);
  const [query, setQuery] = useSessionState(view?.session ?? 0, "");
  const matcher = searchMatcher(query);
  const choices = (view?.choices ?? []).filter((choice) => matcher.matches(choice.search));
  const close = () => dialog.current?.close();
  return (
    <dialog
      id="kismet-crafter"
      ref={dialog}
      className={`kismet-crafter-dialog ${pickerDialog} h-162.5 w-232.5`}
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
        <div className="kismet-choice-pane grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 border-r border-line p-3 max-[700px]:max-h-[60vh] max-[700px]:border-r-0 max-[700px]:border-b">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search kismets…"
            error={matcher.error}
            input={{ id: "kismet-search", "aria-label": "Search kismets" }}
          />
          <div
            id="kismet-choice-list"
            className="grid min-h-0 auto-rows-max content-start gap-1.5 overflow-auto pr-1.5"
          >
            {!view ? null : choices.length ? (
              choices.map((choice) => (
                <button
                  key={choice.name}
                  type="button"
                  className={`kismet-choice ${choice.name === view.selected ? "selected" : ""} ${kismetChoice} ${pickCard(choice.name === view.selected)} ${rarityTone(choice.rarity)}`}
                  onClick={() => plannerCommands().selectKismetChoice(choice.name)}
                >
                  <img src={choice.icon} alt="" className="size-10 justify-self-center object-contain" />
                  <span className="min-w-0 overflow-hidden">
                    <strong className="line-clamp-1 text-sm">{choice.label}</strong>
                    <small className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted">{choice.affixes}</small>
                  </span>
                  <em className={choice.rarity.toLowerCase()}>{choice.rarity}</em>
                </button>
              ))
            ) : (
              <p className="kismet-no-results text-sm text-muted">No matching kismets.</p>
            )}
          </div>
        </div>
        <div className="kismet-detail-pane grid min-h-0 content-start gap-2 overflow-auto p-3">
          <div id="kismet-roll-controls" className="grid gap-2">
            {!view ? null : view.rolls.length ? (
              view.rolls.map((roll) => (
                <label
                  key={roll.index}
                  className="kismet-roll-row grid gap-1.5 rounded-md border border-line bg-raised px-3 py-2 text-xs text-muted"
                >
                  <span className="kismet-roll-value flex justify-between">
                    {`Value ${roll.index + 1}: `}
                    <strong className="text-accent">{roll.value}</strong>
                  </span>
                  <RangeInput
                    min={roll.min}
                    max={roll.max}
                    step={roll.step}
                    value={roll.value}
                    number={{ "aria-label": `Value ${roll.index + 1}` }}
                    onValue={(value) => plannerCommands().setKismetRoll(roll.index, value)}
                    onCommit={(text) => plannerCommands().commitKismetRoll(roll.index, text)}
                  />
                  <small className="text-xs text-dim">{roll.affix}</small>
                </label>
              ))
            ) : (
              <p className="kismet-fixed-roll text-xs text-muted">This Kismet has fixed effects.</p>
            )}
          </div>
          <div id="kismet-preview" className="rounded-md border border-line bg-raised p-3">
            {view?.preview ? (
              <>
                <div className="kismet-preview-head flex items-center gap-3 border-b border-line pb-2">
                  <img src={view.preview.icon} alt="" className="size-12 object-contain" />
                  <div>
                    <strong className="block text-sm text-accent">{view.preview.name}</strong>
                    <small className="mt-0.5 block text-xs text-muted">{view.preview.detail}</small>
                  </div>
                </div>
                <ul className="my-2 grid gap-1.5">
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

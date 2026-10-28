// The damage summary's Composition button and dialog: the conditions the calculation assumes for the fight, one section
// each. Blessings: how many stacks of each the calculation holds; each input starts at the Blessing's max stacks when the
// build has a gain source for it, else 0; a number typed is stored in the build (combat.<name>BlessingStacks), the
// section's "Reset" clears them. Spell Burst: the build's Max Spell Burst. Barrier Burst (Necklace of Firebird): its
// requirements, the Barrier and the triggers per second (combat.barrierBurstsPerSecond). Data: the "composition" source
// (src/app/bridge/composition-view-model.ts).
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { CommitNumberInput } from "../../ui/CommitNumberInput";
import { StrokeIcon } from "../../ui/StrokeIcon";
import { useRegisteredDialog } from "../../ui/dialog-registry";
import { plainDialogButtonClass, primaryDialogButtonClass } from "../../ui/dialog-classes";
import { useViewSource } from "../../ui/use-view-source";

const OPEN_BUTTON =
  "btn inline-flex min-h-8 w-full items-center justify-center gap-1.5 px-2 text-[11px] font-bold tracking-wider uppercase";
const SECTION_TITLE = "text-xs font-bold tracking-wider text-accent uppercase";
const ROW =
  "grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-x-3 gap-y-1 rounded-md border border-line bg-sunken/60 p-3";
const INPUT = "field w-full p-2 text-right tabular-nums";
const SECTION = "grid gap-3 border-t border-line p-4";
const whole = (value: number) => Math.round(value).toLocaleString("en-US");

/** A dialog window with sliders: this button opens a settings dialog. */
function SettingsDialogIcon() {
  return (
    <StrokeIcon className="size-4">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 8h18" />
      <path d="M7 13h10M7 17h10" />
      <circle cx="10" cy="13" r="1.4" />
      <circle cx="14" cy="17" r="1.4" />
    </StrokeIcon>
  );
}

export function CompositionButton() {
  const view = useViewSource("composition");
  const dialog = useRef<HTMLDialogElement>(null);
  useRegisteredDialog(dialog);
  return (
    <>
      <button
        type="button"
        className={OPEN_BUTTON}
        aria-haspopup="dialog"
        aria-label="Open composition"
        title="The conditions the calculation assumes for the fight"
        onClick={() => dialog.current?.showModal()}
      >
        <SettingsDialogIcon />
        Composition
      </button>
      <dialog
        id="composition"
        ref={dialog}
        className="dialog-panel w-130 max-w-[calc(100vw-2rem)] text-sm text-text"
        aria-labelledby="composition-title"
      >
        <header className="dialog-head">
          <h2 id="composition-title" className="dialog-title">
            Composition
          </h2>
          <button
            type="button"
            className="dialog-close"
            aria-label="Close composition"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </header>
        <section className="grid gap-3 p-4" aria-labelledby="composition-blessings">
          <div className="flex items-center justify-between gap-2">
            <h3 id="composition-blessings" className={SECTION_TITLE}>
              Blessings
            </h3>
            <button
              type="button"
              className={plainDialogButtonClass}
              disabled={!view?.anySetByUser}
              onClick={() => plannerCommands().resetBlessingStacks()}
            >
              Reset
            </button>
          </div>
          <p className="text-xs text-muted">
            Stacks held in the calculation. Each starts at its max when the build has a gain source for it, else at 0;
            set your own for a fight where they differ.
          </p>
          {(view?.rows ?? []).map((row) => (
            <label key={row.name} className={ROW}>
              <span className="grid gap-0.5">
                <strong className="text-sm">{row.name} Blessing</strong>
                <span className="text-xs text-muted">
                  Max {row.maxStacks} · gain sources found:{" "}
                  {row.estimatedStacks ? `${row.estimatedStacks} stacks` : "none verified"}
                  {row.setByUser ? " · set by you" : ""}
                </span>
              </span>
              <CommitNumberInput
                key={`${row.name}-${row.stacks}`}
                className={INPUT}
                aria-label={`${row.name} Blessing stacks`}
                value={row.stacks}
                min={0}
                max={row.maxStacks}
                step={1}
                onCommit={(text) => plannerCommands().setCombatValue(row.field, text)}
              />
              {row.gains.length ? (
                <ul className="col-span-2 grid gap-0.5 text-[11px] text-dim">
                  {row.gains.map((gain, index) => (
                    <li key={index} className={gain.available ? "text-ok" : undefined}>
                      {gain.label} — {gain.condition}
                    </li>
                  ))}
                </ul>
              ) : null}
            </label>
          ))}
        </section>
        {view?.spellBurst ? (
          <section className={SECTION} aria-labelledby="composition-spell-burst">
            <h3 id="composition-spell-burst" className={SECTION_TITLE}>
              Spell Burst
            </h3>
            <div className={ROW}>
              <span className="grid gap-0.5">
                <strong className="text-sm">Max Spell Burst</strong>
                <span className="text-xs text-muted">
                  From the build: each activation casts the skill once more per stack
                </span>
              </span>
              <strong className="text-right text-lg tabular-nums">{view.spellBurst.total}</strong>
              <ul className="col-span-2 grid gap-0.5 text-[11px] text-dim">
                {view.spellBurst.sources.map((item, index) => (
                  <li key={index} className={item.active ? "text-ok" : undefined}>
                    {item.label} ({item.value > 0 ? "+" : ""}
                    {item.value})
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
        {view?.barrierBurst ? (
          <section className={SECTION} aria-labelledby="composition-barrier-burst">
            <h3 id="composition-barrier-burst" className={SECTION_TITLE}>
              Barrier Burst · {view.barrierBurst.active ? "active" : "inactive"}
            </h3>
            <ul className="grid gap-1 text-xs">
              {view.barrierBurst.requirements.map((item) => (
                <li key={item.label} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-1.5">
                  <span className={item.ok ? "text-ok" : "text-danger"} aria-hidden="true">
                    {item.ok ? "✓" : "✗"}
                  </span>
                  <span>
                    <strong>{item.label}</strong>
                    <span className="sr-only">{item.ok ? " (present)" : " (missing)"}</span>
                    {item.detail ? <span className="block text-dim">{item.detail}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">
              Barrier <strong className="text-text tabular-nums">{whole(view.barrierBurst.barrier)}</strong> ={" "}
              {view.barrierBurst.barrierFormula} · one hit's base{" "}
              <strong className="text-text tabular-nums">{whole(view.barrierBurst.hitBase)}</strong> Fire (75%)
            </p>
            <label className={ROW}>
              <span className="grid gap-0.5">
                <strong className="text-sm">Barrier Bursts per second</strong>
                <span className="text-xs text-muted">
                  One per Barrier gained (every 5 m moved).{" "}
                  {view.barrierBurst.rateSetByUser ? "Set by you." : "Assumed 1: count yours in game and set it."}
                </span>
              </span>
              <CommitNumberInput
                key={`barrier-${view.barrierBurst.usesPerSecond}`}
                className={INPUT}
                aria-label="Barrier Bursts per second"
                value={view.barrierBurst.usesPerSecond}
                min={0}
                max={20}
                step={0.1}
                onCommit={(text) => plannerCommands().setCombatValue("barrierBurstsPerSecond", text)}
              />
            </label>
          </section>
        ) : null}
        <div className="flex justify-end px-4 pb-4">
          <button type="button" className={primaryDialogButtonClass} onClick={() => dialog.current?.close()}>
            Done
          </button>
        </div>
      </dialog>
    </>
  );
}

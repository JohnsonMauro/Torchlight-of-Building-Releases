// The slate editor (a board slate's Edit affixes tool): the slate with its orientation tools (Rotate, Flip), its affixes
// as text with Add affix, and Save Changes / Cancel. The planner opens it and announces the "slateEditor" source; every
// drawing (opening, a rotation) starts the affix fields over from the slate. Rotate / Flip and Save are planner commands.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";
import {
  EYEBROW,
  FOOTER,
  PREVIEW_CAPTION,
  SLATE_AFFIX_FIELD,
  SLATE_AFFIX_ROW,
  SLATE_ASIDE,
  SLATE_BUTTON,
  SLATE_CARD,
  SLATE_CARD_LEGENDARY,
  SLATE_CARD_RARITY,
  SLATE_CARD_TITLE,
  SLATE_FIELDSET,
  SLATE_LAYOUT,
  SLATE_LEGEND,
  SLATE_PRIMARY,
  SLATE_SECTION,
  SLATE_TRANSFORM,
} from "../../ui/talent-slate-styles";

export function SlateEditorDialog() {
  const view = useViewSource("slateEditor");
  const dialog = useRef<HTMLDialogElement>(null);
  const [affixes, setAffixes] = useSessionState(view?.session ?? 0, view?.affixes ?? []);
  const close = () => dialog.current?.close();
  const id = view?.id ?? "";
  return (
    <dialog
      id="slate-editor"
      ref={dialog}
      className="slate-inventory slate-editor dialog-panel max-h-[min(710px,calc(100vh-2rem))] w-225 leading-[normal] open:flex open:flex-col"
      aria-labelledby="slate-editor-title"
    >
      <div className="slate-inventory-tabs dialog-head shrink-0 px-4 py-3.25">
        <strong id="slate-editor-title" className="dialog-title">
          {view?.title ?? "Edit Divinity Slate"}
        </strong>
        <button type="button" className="picker-close dialog-close" aria-label="Close slate editor" onClick={close}>
          ×
        </button>
      </div>
      <div id="slate-editor-content" className="flex min-h-0 flex-1 flex-col">
        {view ? (
          <>
            <div className={`slate-editor-layout min-h-0 flex-1 ${SLATE_LAYOUT} max-[760px]:overflow-auto`}>
              <section className={SLATE_SECTION}>
                <p className={`${EYEBROW} w-fit`}>Legendary template</p>
                <h2 className="mt-1 font-display text-lg font-bold text-text">{view.name}</h2>
                <div className="slate-editor-shape my-3.5 flex items-center gap-4">
                  <img
                    src={view.icon || undefined}
                    alt=""
                    className="max-h-28 max-w-28 flex-none rounded-md border border-line bg-sunken object-contain p-1.5"
                  />
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted">
                    {view.rotate ? (
                      <>
                        <button
                          type="button"
                          className={SLATE_TRANSFORM}
                          onClick={() => plannerCommands().transformSlate(id, { rotate: 1 })}
                        >
                          ↻ Rotate
                        </button>
                        <button
                          type="button"
                          className={SLATE_TRANSFORM}
                          onClick={() => plannerCommands().transformSlate(id, { rotate: -1 })}
                        >
                          ↶ Rotate back
                        </button>
                      </>
                    ) : null}
                    {view.flip ? (
                      <>
                        <button
                          type="button"
                          className={SLATE_TRANSFORM}
                          onClick={() => plannerCommands().transformSlate(id, { flip: "x" })}
                        >
                          ↔ Flip H
                        </button>
                        <button
                          type="button"
                          className={SLATE_TRANSFORM}
                          onClick={() => plannerCommands().transformSlate(id, { flip: "y" })}
                        >
                          ↕ Flip V
                        </button>
                      </>
                    ) : null}
                    {!view.rotate && !view.flip ? "Orientation is fixed" : null}
                  </div>
                </div>
                <fieldset className={SLATE_FIELDSET}>
                  <legend className={SLATE_LEGEND}>{`Affixes (${view.affixes.length})`}</legend>
                  {affixes.map((affix, index) => (
                    <label key={index} className={SLATE_AFFIX_ROW}>
                      <span>{`Slot ${index + 1}`}</span>
                      <input
                        type="text"
                        className={SLATE_AFFIX_FIELD}
                        value={affix}
                        onChange={(event) =>
                          setAffixes(affixes.map((text, slot) => (slot === index ? event.target.value : text)))
                        }
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    className={`add-affix ${SLATE_BUTTON} mt-2`}
                    onClick={() => setAffixes([...affixes, ""])}
                  >
                    Add affix
                  </button>
                </fieldset>
              </section>
              <aside className={SLATE_ASIDE}>
                <span className={`${PREVIEW_CAPTION} text-base`}>Preview</span>
                <div className={`slate-craft-card ${SLATE_CARD} grid-cols-1 ${SLATE_CARD_LEGENDARY}`}>
                  <strong className={SLATE_CARD_TITLE}>{view.name}</strong>
                  <small className={SLATE_CARD_RARITY}>{`DIVINITY SLATE · ${view.rarity}`}</small>
                </div>
              </aside>
            </div>
            <div className={`slate-editor-footer ${FOOTER} flex shrink-0 justify-end gap-2.5 p-3.5`}>
              <button type="button" className={`${SLATE_BUTTON} min-h-10 min-w-32.5`} onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className={`${SLATE_PRIMARY} min-h-10 min-w-32.5`}
                onClick={() => plannerCommands().saveSlateEditor(id, affixes)}
              >
                Save Changes
              </button>
            </div>
          </>
        ) : null}
      </div>
    </dialog>
  );
}

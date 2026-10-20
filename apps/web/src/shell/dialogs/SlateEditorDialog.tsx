// The slate editor (a board slate's Edit affixes tool): the slate with its orientation tools (Rotate, Flip), its affixes
// as text with Add affix, and Save Changes / Cancel. The planner opens it and announces the "slateEditor" source; every
// drawing (opening, a rotation) starts the affix fields over from the slate. Rotate / Flip and Save are planner commands.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";

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
      className="slate-inventory slate-editor"
      aria-labelledby="slate-editor-title"
    >
      <div className="slate-inventory-tabs">
        <strong id="slate-editor-title">{view?.title ?? "Edit Divinity Slate"}</strong>
        <button type="button" className="picker-close" aria-label="Close slate editor" onClick={close}>
          ×
        </button>
      </div>
      <div id="slate-editor-content">
        {view ? (
          <>
            <div className="slate-editor-layout">
              <section>
                <p className="eyebrow">Legendary template</p>
                <h2>{view.name}</h2>
                <div className="slate-editor-shape">
                  <img src={view.icon || undefined} alt="" />
                  <div>
                    {view.rotate ? (
                      <>
                        <button type="button" onClick={() => plannerCommands().transformSlate(id, { rotate: 1 })}>
                          ↻ Rotate
                        </button>
                        <button type="button" onClick={() => plannerCommands().transformSlate(id, { rotate: -1 })}>
                          ↶ Rotate back
                        </button>
                      </>
                    ) : null}
                    {view.flip ? (
                      <>
                        <button type="button" onClick={() => plannerCommands().transformSlate(id, { flip: "x" })}>
                          ↔ Flip H
                        </button>
                        <button type="button" onClick={() => plannerCommands().transformSlate(id, { flip: "y" })}>
                          ↕ Flip V
                        </button>
                      </>
                    ) : null}
                    {!view.rotate && !view.flip ? "Orientation is fixed" : null}
                  </div>
                </div>
                <fieldset>
                  <legend>{`Affixes (${view.affixes.length})`}</legend>
                  {affixes.map((affix, index) => (
                    <label key={index} className="slate-affix-row">
                      <span>{`Slot ${index + 1}`}</span>
                      <input
                        type="text"
                        value={affix}
                        onChange={(event) =>
                          setAffixes(affixes.map((text, slot) => (slot === index ? event.target.value : text)))
                        }
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    className="button button-secondary add-affix"
                    onClick={() => setAffixes([...affixes, ""])}
                  >
                    Add affix
                  </button>
                </fieldset>
              </section>
              <aside>
                <span>Preview</span>
                <div className="slate-craft-card">
                  <strong>{view.name}</strong>
                  <small>{`DIVINITY SLATE · ${view.rarity}`}</small>
                </div>
              </aside>
            </div>
            <div className="slate-editor-footer">
              <button type="button" className="button button-secondary" onClick={close}>
                Cancel
              </button>
              <button type="button" className="button" onClick={() => plannerCommands().saveSlateEditor(id, affixes)}>
                Save Changes
              </button>
            </div>
          </>
        ) : null}
      </div>
    </dialog>
  );
}

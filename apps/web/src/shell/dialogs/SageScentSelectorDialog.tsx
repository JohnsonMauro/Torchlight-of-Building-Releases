// Sage's scent selector (the HERO tab's Scent Bottle): the Basic Scent's elixirs with their tags, or one kind of
// ingredient with its effect, searched by name. The planner opens it for a slot (openScentSlot, which also focuses the
// search) and announces the "sageScentSelector" source (src/app/bridge/hero-dialogs-view-model.ts); a pick and Clear Slot
// are the selectSageScent and clearSageScent commands.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";

export function SageScentSelectorDialog() {
  const view = useViewSource("sageScentSelector");
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useSessionState(view?.session ?? 0, "");
  const needle = query.trim().toLowerCase();
  const choices = (view?.choices ?? []).filter((entry) => entry.name.toLowerCase().includes(needle));
  const close = () => dialog.current?.close();
  return (
    <dialog
      id="sage-scent-selector"
      ref={dialog}
      className="sage-scent-dialog"
      aria-labelledby="sage-scent-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <header>
        <h2 id="sage-scent-title">{view?.title ?? "Select Elixir Skill"}</h2>
        <button type="button" aria-label="Close selector" onClick={close}>
          ×
        </button>
      </header>
      <label className="hero-search">
        <span aria-hidden="true">⌕</span>
        <input
          id="sage-scent-search"
          type="search"
          placeholder={view?.placeholder ?? "Search skills..."}
          autoComplete="off"
          aria-label="Search scent choices"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div id="sage-scent-options" className="sage-scent-options">
        {!view ? null : choices.length ? (
          choices.map((entry) => (
            <button
              key={entry.name}
              type="button"
              className="sage-scent-option"
              onClick={() => plannerCommands().selectSageScent(entry.name)}
            >
              <img src={entry.icon} alt="" />
              <span>
                <strong>{entry.name}</strong>
                {entry.tags ? (
                  <small>
                    {entry.tags.map((tag, index) => (
                      <i key={index}>{tag}</i>
                    ))}
                  </small>
                ) : (
                  <small>{entry.description}</small>
                )}
              </span>
            </button>
          ))
        ) : (
          <p className="hero-selector-empty">No matching choices.</p>
        )}
      </div>
      <footer>
        <button type="button" className="button button-secondary" onClick={() => plannerCommands().clearSageScent()}>
          Clear Slot
        </button>
        <button type="button" className="button button-secondary" onClick={close}>
          Cancel
        </button>
      </footer>
    </dialog>
  );
}

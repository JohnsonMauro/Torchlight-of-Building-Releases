// Sage's scent selector (the HERO tab's Scent Bottle): the Basic Scent's elixirs with their tags, or one kind of
// ingredient with its effect, searched by name. The planner opens it for a slot (openScentSlot, which also focuses the
// search) and announces the "sageScentSelector" source (src/app/bridge/hero-dialogs-view-model.ts); a pick and Clear Slot
// are the selectSageScent and clearSageScent commands.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";
import {
  emptyNote,
  footerBar,
  footerButton,
  rowChoice,
  rowDialog,
  rowList,
  rowName,
  rowNote,
  rowTag,
  searchGlyph,
  searchInput,
  searchLabel,
} from "./selector-classes";

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
      className={`sage-scent-dialog ${rowDialog}`}
      aria-labelledby="sage-scent-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <header className="dialog-head">
        <h2 id="sage-scent-title" className="dialog-title">
          {view?.title ?? "Select Elixir Skill"}
        </h2>
        <button type="button" className="dialog-close" aria-label="Close selector" onClick={close}>
          ×
        </button>
      </header>
      <label className={`hero-search ${searchLabel}`}>
        <span className={searchGlyph} aria-hidden="true">
          ⌕
        </span>
        <input
          id="sage-scent-search"
          type="search"
          placeholder={view?.placeholder ?? "Search skills..."}
          autoComplete="off"
          aria-label="Search scent choices"
          className={searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div id="sage-scent-options" className={`sage-scent-options ${rowList}`}>
        {!view ? null : choices.length ? (
          choices.map((entry) => (
            <button
              key={entry.name}
              type="button"
              className={`sage-scent-option ${rowChoice}`}
              onClick={() => plannerCommands().selectSageScent(entry.name)}
            >
              <img src={entry.icon} alt="" className="size-11 object-contain" />
              <span className="block min-w-0">
                <strong className={rowName}>{entry.name}</strong>
                {entry.tags ? (
                  <small className={rowNote}>
                    {entry.tags.map((tag, index) => (
                      <i key={index} className={rowTag}>
                        {tag}
                      </i>
                    ))}
                  </small>
                ) : (
                  <small className={rowNote}>{entry.description}</small>
                )}
              </span>
            </button>
          ))
        ) : (
          <p className={`hero-selector-empty ${emptyNote}`}>No matching choices.</p>
        )}
      </div>
      <footer className={footerBar}>
        <button type="button" className={footerButton} onClick={() => plannerCommands().clearSageScent()}>
          Clear Slot
        </button>
        <button type="button" className={footerButton} onClick={close}>
          Cancel
        </button>
      </footer>
    </dialog>
  );
}

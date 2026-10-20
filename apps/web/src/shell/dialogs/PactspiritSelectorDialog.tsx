// The Pactspirit selector (a pact slot's button): every Pactspirit grouped by category with each group's count, filtered
// by a search over name and description and by category. The planner opens it (openPactspiritSelector, which also
// focuses the search) and announces the "pactspiritSelector" source (src/app/bridge/pacts-view-model.ts); picking one is
// the selectPactspirit command.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { PactspiritChoiceView } from "@legacy/app/bridge/pacts-view-model.ts";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";

export function PactspiritSelectorDialog() {
  const view = useViewSource("pactspiritSelector");
  const dialog = useRef<HTMLDialogElement>(null);
  const session = view?.session ?? 0;
  const [search, setSearch] = useSessionState(session, "");
  const [category, setCategory] = useSessionState(session, "All");
  const needle = search.trim().toLowerCase();
  const entries = (view?.choices ?? []).filter(
    (entry) => (category === "All" || entry.category === category) && (!needle || entry.search.includes(needle)),
  );
  const groups = [...new Set(entries.map((entry) => entry.category))].map((name) => ({
    name,
    entries: entries.filter((entry) => entry.category === name).sort((a, b) => a.rank - b.rank),
  }));
  const choice = (entry: PactspiritChoiceView) => (
    <button
      key={entry.name}
      type="button"
      className={`pactspirit-choice rarity-${entry.rarity.toLowerCase()}`}
      onClick={() => plannerCommands().selectPactspirit(entry.name)}
    >
      <img src={entry.icon} alt="" />
      <span>
        <strong>{entry.name}</strong>
        <small>{`${entry.rarity} · ${entry.category}`}</small>
        <em>{entry.description}</em>
      </span>
    </button>
  );
  return (
    <dialog
      id="pactspirit-selector"
      ref={dialog}
      className="pactspirit-selector-dialog"
      aria-labelledby="pactspirit-selector-title"
    >
      <header>
        <h2 id="pactspirit-selector-title">Select Pactspirit</h2>
        <button type="button" aria-label="Close" onClick={() => dialog.current?.close()}>
          ×
        </button>
      </header>
      <div className="pactspirit-selector-filters">
        <input
          type="search"
          data-pactspirit-search=""
          placeholder="Search pactspirits…"
          aria-label="Search pactspirits"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          data-pactspirit-category=""
          aria-label="Pactspirit category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {view
            ? ["All", ...view.categories].map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))
            : null}
        </select>
      </div>
      <div id="pactspirit-selector-results">
        {!view ? null : groups.length ? (
          groups.map((group) => (
            <section key={group.name} className="pactspirit-selector-group">
              <h3>
                {`${group.name} `}
                <small>{`(${group.entries.length})`}</small>
              </h3>
              <div className="pactspirit-selector-grid">{group.entries.map(choice)}</div>
            </section>
          ))
        ) : (
          <p className="pactspirit-no-results">No Pactspirits match your search.</p>
        )}
      </div>
    </dialog>
  );
}

// The Pactspirit selector (a pact slot's button): every Pactspirit grouped by category with each group's count, filtered
// by a search over name and description and by category. The planner opens it (openPactspiritSelector, which also
// focuses the search) and announces the "pactspiritSelector" source (src/app/bridge/pacts-view-model.ts); picking one is
// the selectPactspirit command.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { PactspiritChoiceView } from "@legacy/app/bridge/pacts-view-model.ts";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";
import { fieldInput, pactChoice, pickerDialog } from "../../ui/selector-classes";
import { rarityTone } from "./pact-classes";

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
      className={`pactspirit-choice rarity-${entry.rarity.toLowerCase()} ${pactChoice(entry.rarity)} ${rarityTone(entry.rarity)}`}
      onClick={() => plannerCommands().selectPactspirit(entry.name)}
    >
      <img src={entry.icon} alt="" className="size-12 flex-none rounded-md bg-sunken object-contain" />
      <span className="block min-w-0">
        <strong className="block text-sm">{entry.name}</strong>
        <small className="my-1 block text-xs text-(--pact-tone)">{`${entry.rarity} · ${entry.category}`}</small>
        <em className="block text-xs leading-snug text-muted not-italic">{entry.description}</em>
      </span>
    </button>
  );
  return (
    <dialog
      id="pactspirit-selector"
      ref={dialog}
      className={`pactspirit-selector-dialog ${pickerDialog} h-205 w-375`}
      aria-labelledby="pactspirit-selector-title"
    >
      <header className="dialog-head px-5.5">
        <h2 id="pactspirit-selector-title" className="dialog-title">
          Select Pactspirit
        </h2>
        <button type="button" className="dialog-close" aria-label="Close" onClick={() => dialog.current?.close()}>
          ×
        </button>
      </header>
      <div className="pactspirit-selector-filters flex shrink-0 gap-3 px-5.5 pt-4.5 pb-2.5">
        <input
          type="search"
          data-pactspirit-search=""
          placeholder="Search pactspirits…"
          aria-label="Search pactspirits"
          className={`${fieldInput} min-w-0 flex-1`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          data-pactspirit-category=""
          aria-label="Pactspirit category"
          className={`${fieldInput} w-45 [&>option]:bg-surface`}
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
      <div id="pactspirit-selector-results" className="min-h-0 flex-1 overflow-auto px-5.5 pb-6">
        {!view ? null : groups.length ? (
          groups.map((group) => (
            <section key={group.name} className="pactspirit-selector-group">
              <h3 className="my-2.5 rounded-md border border-line bg-raised px-3.5 py-2.5 text-sm font-bold text-accent">
                {`${group.name} `}
                <small className="font-normal text-muted">{`(${group.entries.length})`}</small>
              </h3>
              <div className="pactspirit-selector-grid grid grid-cols-5 gap-3 max-[1100px]:grid-cols-3 max-[700px]:grid-cols-1">
                {group.entries.map(choice)}
              </div>
            </section>
          ))
        ) : (
          <p className="pactspirit-no-results p-5 text-muted">No Pactspirits match your search.</p>
        )}
      </div>
    </dialog>
  );
}

// The Pactspirit selector (a pact slot's button): every Pactspirit grouped by category with each group's count, filtered
// by the category column on the left (one category, or All) and a search over name, category and description (words in
// any order, or /regex/). The planner opens it (openPactspiritSelector, which also
// focuses the search) and announces the "pactspiritSelector" source (src/app/bridge/pacts-view-model.ts); picking one is
// the selectPactspirit command.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { searchMatcher } from "@legacy/app/bridge/search-match.ts";
import type { PactspiritChoiceView } from "@legacy/app/bridge/pacts-view-model.ts";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";
import { pactChoice, pickerDialog } from "../../ui/selector-classes";
import { PORTRAIT_STRIP_CARD, rarityTone } from "./pact-classes";
import { PactspiritTooltip } from "./PactTooltip";
import { useRegisteredDialog } from "../../ui/dialog-registry";
import { FilterColumn } from "../../ui/FilterColumn";
import { SearchField } from "../../ui/SearchField";
import { KeywordText } from "../../ui/KeywordText";

export function PactspiritSelectorDialog() {
  const view = useViewSource("pactspiritSelector");
  const dialog = useRef<HTMLDialogElement>(null);
  useRegisteredDialog(dialog);
  const session = view?.session ?? 0;
  const [search, setSearch] = useSessionState(session, "");
  const [category, setCategory] = useSessionState(session, "All");
  const matcher = searchMatcher(search);
  const searched = (view?.choices ?? []).filter((entry) => matcher.matches(entry.search));
  const entries = searched.filter((entry) => category === "All" || entry.category === category);
  const categories = (view?.categories ?? []).map((name) => ({
    key: name,
    label: name,
    count: searched.filter((entry) => entry.category === name).length,
    picked: name === category,
  }));
  const groups = [...new Set(entries.map((entry) => entry.category))].map((name) => ({
    name,
    entries: entries.filter((entry) => entry.category === name).sort((a, b) => a.rank - b.rank),
  }));
  const choice = (entry: PactspiritChoiceView) => (
    <PactspiritTooltip key={entry.name} name={entry.name} place="selector">
      <button
        type="button"
        className={`pactspirit-choice rarity-${entry.rarity.toLowerCase()} ${pactChoice(entry.rarity)} ${rarityTone(entry.rarity)}`}
        onClick={() => plannerCommands().selectPactspirit(entry.name)}
      >
        <img src={entry.icon} alt="" className={PORTRAIT_STRIP_CARD} />
        <span className="block min-w-0 py-3 pr-3">
          <strong className="block text-sm">{entry.name}</strong>
          <small className="my-1 block text-xs text-(--pact-tone)">{entry.rarity}</small>
          <em className="block text-xs leading-snug text-muted not-italic">
            <KeywordText text={entry.description} />
          </em>
        </span>
      </button>
    </PactspiritTooltip>
  );
  return (
    <dialog
      id="pactspirit-selector"
      ref={dialog}
      className={`pactspirit-selector-dialog ${pickerDialog} h-205 w-375`}
      aria-labelledby="pactspirit-selector-title"
    >
      <header className="dialog-head">
        <h2 id="pactspirit-selector-title" className="dialog-title">
          Select Pactspirit
        </h2>
        <button type="button" className="dialog-close" aria-label="Close" onClick={() => dialog.current?.close()}>
          ×
        </button>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[11.5rem_minmax(0,1fr)] max-[900px]:grid-cols-1 max-[900px]:grid-rows-[auto_minmax(0,1fr)]">
        <FilterColumn
          label="Pactspirit category"
          options={categories}
          onPick={(name) => setCategory(name === category ? "All" : name)}
          onAll={() => setCategory("All")}
        />
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
          <SearchField
            className="px-4 pt-3 pb-1"
            value={search}
            onChange={setSearch}
            placeholder="Search pactspirits…"
            error={matcher.error}
            input={{ "data-pactspirit-search": "", "aria-label": "Search pactspirits" }}
          />
          <div id="pactspirit-selector-results" className="min-h-0 overflow-auto px-4 pb-4">
            {!view ? null : groups.length ? (
              groups.map((group) => (
                <section key={group.name} className="pactspirit-selector-group">
                  <h3 className="my-2 rounded-md border border-line bg-raised px-3 py-2 text-sm font-bold text-accent">
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
        </div>
      </div>
    </dialog>
  );
}

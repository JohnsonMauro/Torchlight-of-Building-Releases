// Carino's Special Ammo selector (the HERO tab's Special Ammo slots): the Projectile supports the slot can take, one in
// another slot shown installed and disabled, searched by name, exclusive skill and category. The planner opens it for a
// slot (openCarinoAmmo, which also focuses the search) and announces the "carinoAmmoSelector" source
// (src/app/bridge/hero-dialogs-view-model.ts); a pick and Clear Slot are the selectCarinoAmmo and clearCarinoAmmo
// commands. The hero tests find the choices by data-select-carino-ammo.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { Artwork } from "../../ui/Artwork";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";
import {
  ammoArt,
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

export function CarinoAmmoSelectorDialog() {
  const view = useViewSource("carinoAmmoSelector");
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useSessionState(view?.session ?? 0, "");
  const needle = query.trim().toLowerCase();
  const choices = (view?.choices ?? []).filter((entry) => !needle || entry.search.includes(needle));
  const close = () => dialog.current?.close();
  return (
    <dialog
      id="carino-ammo-selector"
      ref={dialog}
      className={`sage-scent-dialog carino-ammo-dialog ${rowDialog}`}
      aria-labelledby="carino-ammo-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <header className="dialog-head">
        <div>
          <p className="eyebrow mb-1 text-[0.67rem] font-extrabold tracking-[0.12em] text-gold uppercase">
            Ranger of Glory
          </p>
          <h2 id="carino-ammo-title" className="dialog-title">
            {view ? `Select Special Ammo Support · Slot ${view.slot + 1}` : "Select Special Ammo Support"}
          </h2>
        </div>
        <button type="button" className="dialog-close" aria-label="Close selector" onClick={close}>
          ×
        </button>
      </header>
      <label className={`hero-search ${searchLabel}`}>
        <span className={searchGlyph} aria-hidden="true">
          ⌕
        </span>
        <input
          id="carino-ammo-search"
          type="search"
          placeholder="Search projectile supports..."
          autoComplete="off"
          aria-label="Search projectile supports"
          className={searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p className="carino-ammo-help mx-4 -mt-1 mb-3 shrink-0 text-[0.68rem] text-[#acb8c2]">
        {view?.help ?? "Choose a support that can support a Projectile skill and is not installed on the skill panel."}
      </p>
      <div id="carino-ammo-options" className={`sage-scent-options carino-ammo-options ${rowList}`}>
        {!view ? null : choices.length ? (
          choices.map((entry) => (
            <button
              key={entry.name}
              type="button"
              className={`sage-scent-option carino-ammo-option ${entry.installed ? "installed" : ""} ${rowChoice}`}
              data-select-carino-ammo={entry.name}
              disabled={entry.installed}
              onClick={() => plannerCommands().selectCarinoAmmo(entry.name)}
            >
              <Artwork src={entry.icon} alt={entry.name} className={`support-art ${ammoArt}`} />
              <span className="block min-w-0">
                <strong className={rowName}>{entry.label}</strong>
                <small className={rowNote}>
                  <i className={rowTag}>{entry.category}</i>
                  <i className={rowTag}>{entry.exclusive}</i>
                </small>
                <small className={`${rowNote} line-clamp-4`}>{entry.effects}</small>
              </span>
            </button>
          ))
        ) : (
          <p className={`hero-selector-empty ${emptyNote}`}>No matching Projectile supports.</p>
        )}
      </div>
      <footer className={footerBar}>
        <button type="button" className={footerButton} onClick={() => plannerCommands().clearCarinoAmmo()}>
          Clear Slot
        </button>
        <button type="button" className={footerButton} onClick={close}>
          Cancel
        </button>
      </footer>
    </dialog>
  );
}

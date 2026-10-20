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
      className="sage-scent-dialog carino-ammo-dialog"
      aria-labelledby="carino-ammo-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <header>
        <div>
          <p className="eyebrow">Ranger of Glory</p>
          <h2 id="carino-ammo-title">
            {view ? `Select Special Ammo Support · Slot ${view.slot + 1}` : "Select Special Ammo Support"}
          </h2>
        </div>
        <button type="button" aria-label="Close selector" onClick={close}>
          ×
        </button>
      </header>
      <label className="hero-search">
        <span aria-hidden="true">⌕</span>
        <input
          id="carino-ammo-search"
          type="search"
          placeholder="Search projectile supports..."
          autoComplete="off"
          aria-label="Search projectile supports"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p className="carino-ammo-help">
        {view?.help ?? "Choose a support that can support a Projectile skill and is not installed on the skill panel."}
      </p>
      <div id="carino-ammo-options" className="sage-scent-options carino-ammo-options">
        {!view ? null : choices.length ? (
          choices.map((entry) => (
            <button
              key={entry.name}
              type="button"
              className={`sage-scent-option carino-ammo-option ${entry.installed ? "installed" : ""}`}
              data-select-carino-ammo={entry.name}
              disabled={entry.installed}
              onClick={() => plannerCommands().selectCarinoAmmo(entry.name)}
            >
              <Artwork src={entry.icon} alt={entry.name} className="support-art" />
              <span>
                <strong>{entry.label}</strong>
                <small>
                  <i>{entry.category}</i>
                  <i>{entry.exclusive}</i>
                </small>
                <small>{entry.effects}</small>
              </span>
            </button>
          ))
        ) : (
          <p className="hero-selector-empty">No matching Projectile supports.</p>
        )}
      </div>
      <footer>
        <button type="button" className="button button-secondary" onClick={() => plannerCommands().clearCarinoAmmo()}>
          Clear Slot
        </button>
        <button type="button" className="button button-secondary" onClick={close}>
          Cancel
        </button>
      </footer>
    </dialog>
  );
}

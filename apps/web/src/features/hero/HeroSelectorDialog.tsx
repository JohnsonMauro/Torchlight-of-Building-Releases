// The hero selector (the HERO tab's Change Hero): every hero with its portrait and trait, the current one marked, a
// search by name or trait. The planner opens it (src/app/hero/hero-controller.js openHeroSelector) and announces the "heroSelector"
// source; picking a hero is the selectHero command.
import { useRef } from "react";
import { heroCatalogSs13 } from "@legacy/data/heroes/hero-catalog-ss13.js";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";
import {
  emptyNote,
  portraitCaption,
  portraitCard,
  portraitDialog,
  portraitFallback,
  portraitGrid,
  portraitImage,
  portraitName,
  searchGlyph,
  searchInput,
  searchLabel,
} from "../../ui/selector-classes";
import { useRegisteredDialog } from "../../ui/dialog-registry";

export function HeroSelectorDialog() {
  const view = useViewSource("heroSelector");
  const dialog = useRef<HTMLDialogElement>(null);
  useRegisteredDialog(dialog);
  const [query, setQuery] = useSessionState(view?.session ?? 0, "");
  const needle = query.trim().toLowerCase();
  const heroes = heroCatalogSs13.filter((hero) => `${hero.name} ${hero.trait}`.toLowerCase().includes(needle));
  return (
    <dialog
      id="hero-selector"
      ref={dialog}
      className={`hero-selector-dialog ${portraitDialog}`}
      aria-labelledby="hero-selector-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <header className="dialog-head">
        <h2 id="hero-selector-title" className="dialog-title">
          Select Hero
        </h2>
        <button
          type="button"
          className="dialog-close"
          aria-label="Close hero selector"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </header>
      <label className={`hero-search ${searchLabel}`}>
        <span className={searchGlyph} aria-hidden="true">
          ⌕
        </span>
        <input
          id="hero-selector-search"
          type="search"
          placeholder="Search heroes..."
          autoComplete="off"
          aria-label="Search heroes"
          className={searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div id="hero-selector-grid" className={`hero-selector-grid ${portraitGrid}`}>
        {!view ? null : heroes.length ? (
          heroes.map((hero) => (
            <button
              key={hero.id}
              type="button"
              className={`hero-selector-card ${view.selectedHeroId === hero.id ? "selected" : ""} ${portraitCard(view.selectedHeroId === hero.id)}`}
              data-select-hero={hero.id}
              onClick={() => plannerCommands().selectHero(hero.id)}
            >
              {hero.image ? (
                <img src={hero.image} alt="" className={`${portraitImage} border-line-strong`} />
              ) : (
                <span className={`hero-card-fallback ${portraitFallback}`} aria-hidden="true">
                  {hero.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <strong className={portraitName}>{hero.name}</strong>
              <small className={`${portraitCaption} text-accent`}>{hero.trait}</small>
            </button>
          ))
        ) : (
          <p className={`hero-selector-empty ${emptyNote}`}>No heroes match that search.</p>
        )}
      </div>
    </dialog>
  );
}

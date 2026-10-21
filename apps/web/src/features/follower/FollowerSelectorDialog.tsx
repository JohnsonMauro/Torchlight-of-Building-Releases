// The follower selector (the FOLLOWER tab's Change / Choose Follower): one card per follower and rarity, the open build's
// follower pressed, a search over name, species, title, trait and rarity. The planner opens it (openFollowerSelector)
// and announces the "followerSelector" source (src/app/hero/follower-panel.js followerPickerView); picking a card is the
// selectFollower command. The legacy hover tooltip reads data-follower-tooltip and data-follower-tooltip-rarity, and is
// moved into this dialog while it shows a card's tooltip.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";
import { rarityArt, rarityText } from "../hero/hero-classes";
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

export function FollowerSelectorDialog() {
  const view = useViewSource("followerSelector");
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useSessionState(view?.session ?? 0, "");
  const needle = query.trim().toLowerCase();
  const cards = (view?.cards ?? []).filter((card) => !needle || card.search.includes(needle));
  return (
    <dialog
      id="follower-selector"
      ref={dialog}
      className={`hero-selector-dialog follower-selector-dialog ${portraitDialog}`}
      aria-labelledby="follower-selector-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <header className="dialog-head">
        <h2 id="follower-selector-title" className="dialog-title">
          Select Follower
        </h2>
        <button
          type="button"
          className="dialog-close"
          aria-label="Close follower selector"
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
          id="follower-selector-search"
          type="search"
          placeholder="Search followers..."
          autoComplete="off"
          aria-label="Search followers"
          className={searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div id="follower-selector-grid" className={`hero-selector-grid follower-selector-grid ${portraitGrid}`}>
        {!view ? null : cards.length ? (
          cards.map((card) => (
            <button
              key={`${card.followerId}:${card.rarityId}`}
              type="button"
              className={`hero-selector-card follower-selector-card${card.tintClass} ${card.selected ? "selected" : ""} ${portraitCard(card.selected)}`}
              data-follower-tooltip={card.followerId}
              data-follower-tooltip-rarity={card.rarityId}
              aria-pressed={card.selected}
              onClick={() => plannerCommands().selectFollower(card.followerId, card.rarityId)}
            >
              {card.portrait ? (
                <img
                  src={card.portrait}
                  alt=""
                  className={`${portraitImage} ${rarityArt(card.rarityId) || "border-line-strong"}`}
                />
              ) : (
                <span className={`hero-card-fallback ${portraitFallback}`} aria-hidden="true">
                  {card.initials}
                </span>
              )}
              <strong className={portraitName}>{card.name}</strong>
              <small className={`${card.rarityClass} ${portraitCaption} ${rarityText(card.rarityId)}`}>
                {card.slotsText}
              </small>
            </button>
          ))
        ) : (
          <p className={`hero-selector-empty ${emptyNote}`}>No followers match that search.</p>
        )}
      </div>
    </dialog>
  );
}

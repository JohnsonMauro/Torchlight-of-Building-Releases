// The follower selector (the FOLLOWER tab's Change / Choose Follower): one card per follower and rarity, the open build's
// follower pressed, a search over name, species, title, trait and rarity. The planner opens it (openFollowerSelector)
// and announces the "followerSelector" source (src/app/hero/follower-panel.js followerPickerView); picking a card is the
// selectFollower command. A card shows the follower's tooltip at the card's rarity (TraitTooltip), inside this dialog.
import { useRef } from "react";
import { FollowerTooltip } from "../hero/TraitTooltip";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { searchMatcher } from "@legacy/app/bridge/search-match.ts";
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
} from "../../ui/selector-classes";
import { useRegisteredDialog } from "../../ui/dialog-registry";
import { SearchField } from "../../ui/SearchField";

export function FollowerSelectorDialog() {
  const view = useViewSource("followerSelector");
  const dialog = useRef<HTMLDialogElement>(null);
  useRegisteredDialog(dialog);
  const [query, setQuery] = useSessionState(view?.session ?? 0, "");
  const matcher = searchMatcher(query);
  const cards = (view?.cards ?? []).filter((card) => matcher.matches(card.search));
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
      <SearchField
        className="hero-search m-4 shrink-0"
        value={query}
        onChange={setQuery}
        placeholder="Search followers…"
        error={matcher.error}
        input={{ id: "follower-selector-search", "aria-label": "Search followers" }}
      />
      <div id="follower-selector-grid" className={`hero-selector-grid follower-selector-grid ${portraitGrid}`}>
        {!view ? null : cards.length ? (
          cards.map((card) => (
            <FollowerTooltip
              key={`${card.followerId}:${card.rarityId}`}
              followerId={card.followerId}
              rarityId={card.rarityId}
            >
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
            </FollowerTooltip>
          ))
        ) : (
          <p className={`hero-selector-empty ${emptyNote}`}>No followers match that search.</p>
        )}
      </div>
    </dialog>
  );
}

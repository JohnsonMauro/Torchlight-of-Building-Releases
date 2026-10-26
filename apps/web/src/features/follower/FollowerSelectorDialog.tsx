// The follower selector (the FOLLOWER tab's Change / Choose Follower): it opens on one card per character (Lion Queen,
// Lone Wolf…); a character opens its cards, one per follower and rarity (its four ranks, then its ULT followers), with a
// breadcrumb back. The open build's follower is pressed. A search lists the matching cards of every character, over
// name, species, title, trait and rarity. The planner opens it (openFollowerSelector)
// and announces the "followerSelector" source (src/app/hero/follower-panel.js followerPickerView); picking a card is the
// selectFollower command. A card shows the follower's tooltip at the card's rarity (TraitTooltip), inside this dialog.
import { useRef } from "react";
import type { FollowerPickerCard } from "@legacy/app/hero/follower-panel.js";
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
import { Breadcrumb } from "../../ui/Breadcrumb";
import { useRegisteredDialog } from "../../ui/dialog-registry";
import { SearchField } from "../../ui/SearchField";

export function FollowerSelectorDialog() {
  const view = useViewSource("followerSelector");
  const dialog = useRef<HTMLDialogElement>(null);
  useRegisteredDialog(dialog);
  const [query, setQuery] = useSessionState(view?.session ?? 0, "");
  const [species, setSpecies] = useSessionState<string | null>(view?.session ?? 0, null);
  const matcher = searchMatcher(query);
  const all = view?.cards ?? [];
  const searching = query.trim() !== "";
  const cards = searching
    ? all.filter((card) => matcher.matches(card.search))
    : all.filter((card) => card.species === species);
  const characters = new Map<string, FollowerPickerCard[]>();
  for (const card of all) {
    const own = characters.get(card.species);
    if (own) own.push(card);
    else characters.set(card.species, [card]);
  }
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
      {!searching && species ? (
        <div className="-mt-1 shrink-0 px-4 pb-3">
          <Breadcrumb
            label="Follower selector path"
            steps={[{ label: "Characters", onSelect: () => setSpecies(null) }, { label: species }]}
          />
        </div>
      ) : null}
      <div id="follower-selector-grid" className={`hero-selector-grid follower-selector-grid ${portraitGrid}`}>
        {!view ? null : !searching && !species ? (
          [...characters].map(([name, own]) => (
            <CharacterCard key={name} name={name} cards={own} onOpen={() => setSpecies(name)} />
          ))
        ) : cards.length ? (
          cards.map((card) => <FollowerCard key={`${card.followerId}:${card.rarityId}`} card={card} />)
        ) : (
          <p className={`hero-selector-empty ${emptyNote}`}>No followers match that search.</p>
        )}
      </div>
    </dialog>
  );
}

/** A character on the opening screen: its portrait, name and how many followers it holds; a click opens them. */
function CharacterCard({ name, cards, onOpen }: { name: string; cards: FollowerPickerCard[]; onOpen: () => void }) {
  const chosen = cards.some((card) => card.selected);
  const ult = cards.filter((card) => card.rarityId === "ult").length;
  const ranks = cards.length - ult;
  const portrait = cards[0]?.portrait;
  return (
    <button
      type="button"
      className={`follower-character-card ${chosen ? "selected" : ""} ${portraitCard(chosen)}`}
      onClick={onOpen}
    >
      {portrait ? (
        <img src={portrait} alt="" className={`${portraitImage} border-line-strong`} />
      ) : (
        <span className={`hero-card-fallback ${portraitFallback}`} aria-hidden="true">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <strong className={portraitName}>{name}</strong>
      <small className={`${portraitCaption} text-muted`}>
        {`${ranks} rank${ranks === 1 ? "" : "s"}${ult ? ` · ${ult} ULT` : ""}`}
      </small>
    </button>
  );
}

/** A follower at one rarity, with its tooltip; a click makes it the build's follower. */
function FollowerCard({ card }: { card: FollowerPickerCard }) {
  return (
    <FollowerTooltip followerId={card.followerId} rarityId={card.rarityId}>
      <button
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
  );
}

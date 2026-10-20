// The skill selector (the skill board's sockets, Rosa's and Moto's trait support slots, the follower's skill slots): its
// title with the count of choices, the search over names, tags and effects with its clear button, and the list (the
// follower picker's in Tartarus / Origin groups), from the planner's "skillSelector" source; a click is the
// chooseSkillSelectorEntry command. The detail panel and the footer are still the planner's (src/app/app.js
// renderSkillSelector writes the detail and the Confirm button's state; its click handler serves the footer), so React
// leaves the detail's content alone. The skills tests find the list by #skill-selector-results.
import { useRef, type ReactNode } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { Artwork } from "../../ui/Artwork";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";
import { setAutofocusAttribute } from "../autofocus";

// The detail's first content; the planner replaces it at every opening.
const DETAIL_PLACEHOLDER = { __html: "<p>Select a skill to configure</p>" };

export function SkillSelectorDialog() {
  const view = useViewSource("skillSelector");
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useSessionState(view?.session ?? 0, "");
  const needle = query.trim().toLowerCase();
  const groups = (view?.groups ?? []).map((group) => ({
    ...group,
    results: group.results.filter((item) => !needle || item.search.includes(needle)),
  }));
  const any = groups.some((group) => group.results.length);
  return (
    <dialog id="skill-selector" className="skill-selector-dialog" aria-labelledby="skill-selector-title">
      <header>
        <h2 id="skill-selector-title">{view?.title ?? "Select Active Skill"}</h2>
        <button type="button" data-close-skill-selector="" aria-label="Close selector">
          ×
        </button>
      </header>
      <div className="skill-selector-body">
        <section className="skill-selector-list">
          <label>
            <span aria-hidden="true">⌕</span>
            <input
              id="skill-selector-search"
              ref={(element) => {
                search.current = element;
                setAutofocusAttribute(element);
              }}
              type="search"
              placeholder={view?.placeholder ?? "Search skills…"}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                search.current?.focus();
              }}
            >
              ×
            </button>
          </label>
          <div id="skill-selector-results">
            {!view ? null : any ? (
              groups.map((group, groupIndex) =>
                group.results.length ? (
                  <Group key={groupIndex} heading={group.heading}>
                    {group.results.map((item) => (
                      <button
                        key={item.index}
                        type="button"
                        className={`selector-result${item.tintClass} ${item.index === view.selected ? "selected" : ""}`}
                        onClick={() => plannerCommands().chooseSkillSelectorEntry(item.index)}
                      >
                        <Artwork src={item.icon} alt={item.name} className="support-art" />
                        <span>
                          <strong>{item.name}</strong>
                          <small>
                            {item.tags.map((tag, index) => (
                              <em key={index}>{tag}</em>
                            ))}
                          </small>
                        </span>
                      </button>
                    ))}
                  </Group>
                ) : null,
              )
            ) : (
              <p className="muted">No matching entries.</p>
            )}
          </div>
        </section>
        <section
          id="skill-selector-detail"
          className="skill-selector-detail"
          dangerouslySetInnerHTML={DETAIL_PLACEHOLDER}
        />
      </div>
      <footer>
        <button className="button button-secondary" type="button" data-clear-skill-slot="">
          Clear slot
        </button>
        <span />
        <button className="button" type="button" data-confirm-skill-selector="" disabled>
          Confirm
        </button>
        <button className="button button-secondary" type="button" data-close-skill-selector="">
          Cancel
        </button>
      </footer>
    </dialog>
  );
}

function Group({ heading, children }: { heading: string | null; children: ReactNode }) {
  return (
    <>
      {heading ? <h4 className="follower-selector-group">{heading}</h4> : null}
      {children}
    </>
  );
}

// The skill selector (the skill board's sockets, Rosa's and Moto's trait support slots, the follower's skill slots): its
// title with the count of choices, the search over names, tags and effects with its clear button, the list (the
// follower picker's in Tartarus / Origin groups), the highlighted choice's detail (SkillSelectorDetail) and Clear slot /
// Confirm / Cancel, from the planner's "skillSelector" source (src/app/bridge/skill-selector-view.ts); every edit is a
// planner command. The skills tests find the list by #skill-selector-results; the CSS styles the footer buttons by
// data-clear-skill-slot and data-confirm-skill-selector, so they stay.
import { useRef, type ReactNode } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { Artwork } from "../../ui/Artwork";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";
import { setAutofocusAttribute } from "../autofocus";
import { SkillSelectorDetail } from "./SkillSelectorDetail";

export function SkillSelectorDialog() {
  const view = useViewSource("skillSelector");
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useSessionState(view?.session ?? 0, "");
  const detail = view?.detail ?? null;
  const level = detail?.kind === "entry" ? detail.level : null;
  // The level field as typed; it starts over whenever the planner's level changes.
  const [levelText, setLevelText] = useSessionState<string | null>(level ?? -1, null);
  const typedLevel = levelText ?? (level === null ? "" : String(level));
  const needle = query.trim().toLowerCase();
  const groups = (view?.groups ?? []).map((group) => ({
    ...group,
    results: group.results.filter((item) => !needle || item.search.includes(needle)),
  }));
  const any = groups.some((group) => group.results.length);
  const close = () => dialog.current?.close();
  return (
    <dialog id="skill-selector" ref={dialog} className="skill-selector-dialog" aria-labelledby="skill-selector-title">
      <header>
        <h2 id="skill-selector-title">{view?.title ?? "Select Active Skill"}</h2>
        <button type="button" aria-label="Close selector" onClick={close}>
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
        {detail?.kind === "follower" ? (
          // The follower's tier and affix selects in it are handled by src/app/app.js (document change listener).
          <section
            key="follower"
            id="skill-selector-detail"
            className="skill-selector-detail"
            dangerouslySetInnerHTML={{ __html: detail.html }}
          />
        ) : (
          <section key="entry" id="skill-selector-detail" className="skill-selector-detail">
            {detail?.kind === "entry" ? (
              <SkillSelectorDetail view={detail} levelText={typedLevel} onLevelText={setLevelText} />
            ) : (
              <p>{detail?.message ?? "Select a skill to configure"}</p>
            )}
          </section>
        )}
      </div>
      <footer>
        <button
          className="button button-secondary"
          type="button"
          data-clear-skill-slot=""
          onClick={() => plannerCommands().clearSkillSelectorSlot()}
        >
          Clear slot
        </button>
        <span />
        <button
          className="button"
          type="button"
          data-confirm-skill-selector=""
          disabled={view?.confirm.disabled ?? true}
          onClick={() => plannerCommands().confirmSkillSelector(typedLevel)}
        >
          {view?.confirm.label ?? "Confirm"}
        </button>
        <button className="button button-secondary" type="button" onClick={close}>
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

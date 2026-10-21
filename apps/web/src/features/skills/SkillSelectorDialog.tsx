// The skill selector (the skill board's sockets, Rosa's and Moto's trait support slots, the follower's skill slots): its
// title with the count of choices, the search over names, tags and effects with its clear button, the list (the
// follower picker's in Tartarus / Origin groups), the highlighted choice's detail (SkillSelectorDetail) and Clear slot /
// Confirm / Cancel, from the planner's "skillSelector" source (src/app/bridge/skill-selector-view.ts); every edit is a
// planner command. The skills tests find the list by #skill-selector-results. Below 700px only the list shows.
import { useRef, type ReactNode } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { Artwork } from "../../ui/Artwork";
import { useSessionState } from "../../ui/use-session-state";
import { useViewSource } from "../../ui/use-view-source";
import { setAutofocusAttribute } from "../../shell/autofocus";
import { SkillSelectorDetail } from "./SkillSelectorDetail";
import { DETAIL, RESULT, RESULT_SELECTED, resultTint, SUPPORT_ART } from "./skill-selector-classes";

const FOOTER_BUTTON = "px-3.5 py-2 text-xs font-bold tracking-wide uppercase";

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
    <dialog
      id="skill-selector"
      ref={dialog}
      className="dialog-panel h-162.5 w-230 grid-rows-[auto_minmax(0,1fr)_auto] leading-[normal] open:grid"
      aria-labelledby="skill-selector-title"
    >
      <header className="dialog-head">
        <h2 id="skill-selector-title" className="dialog-title">
          {view?.title ?? "Select Active Skill"}
        </h2>
        <button type="button" className="dialog-close" aria-label="Close selector" onClick={close}>
          ×
        </button>
      </header>
      <div className="grid min-h-0 grid-cols-[1fr_1.05fr] max-[700px]:grid-cols-1">
        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] border-r border-line p-4 max-[700px]:border-r-0">
          <label className="field-search">
            <span aria-hidden="true">⌕</span>
            <input
              className="flex-1"
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
              className="cursor-pointer px-1 text-muted hover:text-accent"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                search.current?.focus();
              }}
            >
              ×
            </button>
          </label>
          <div id="skill-selector-results" className="mt-3 grid min-h-0 content-start gap-2 overflow-auto pr-1.5">
            {!view ? null : any ? (
              groups.map((group, groupIndex) =>
                group.results.length ? (
                  <Group key={groupIndex} heading={group.heading}>
                    {group.results.map((item) => (
                      <button
                        key={item.index}
                        type="button"
                        className={`${item.index === view.selected ? `${RESULT_SELECTED} selected` : RESULT}${item.tintClass} ${resultTint(item.tintClass)}`}
                        onClick={() => plannerCommands().chooseSkillSelectorEntry(item.index)}
                      >
                        <Artwork src={item.icon} alt={item.name} className={SUPPORT_ART} />
                        <span className="min-w-0">
                          <strong className="block text-base">{item.name}</strong>
                          <small className="mt-1 flex flex-wrap gap-1 text-xs text-muted">
                            {item.tags.map((tag, index) => (
                              <em key={index} className="rounded-sm bg-sunken px-1.5 py-0.5 not-italic">
                                {tag}
                              </em>
                            ))}
                          </small>
                        </span>
                      </button>
                    ))}
                  </Group>
                ) : null,
              )
            ) : (
              <p className="text-muted">No matching entries.</p>
            )}
          </div>
        </section>
        {detail?.kind === "follower" ? (
          // The follower's tier and affix selects in it are handled by src/app/skills/skill-selector.js (installSkillSelectorEvents).
          <section
            key="follower"
            id="skill-selector-detail"
            className={DETAIL}
            dangerouslySetInnerHTML={{ __html: detail.html }}
          />
        ) : (
          <section key="entry" id="skill-selector-detail" className={DETAIL}>
            {detail?.kind === "entry" ? (
              <SkillSelectorDetail view={detail} levelText={typedLevel} onLevelText={setLevelText} />
            ) : (
              <p>{detail?.message ?? "Select a skill to configure"}</p>
            )}
          </section>
        )}
      </div>
      <footer className="grid grid-cols-[auto_1fr_auto_auto] gap-2.5 border-t border-line bg-raised px-4 py-3">
        <button
          className={`btn-danger ${FOOTER_BUTTON}`}
          type="button"
          onClick={() => plannerCommands().clearSkillSelectorSlot()}
        >
          Clear slot
        </button>
        <span />
        <button
          className={`btn-primary ${FOOTER_BUTTON}`}
          type="button"
          disabled={view?.confirm.disabled ?? true}
          onClick={() => plannerCommands().confirmSkillSelector(typedLevel)}
        >
          {view?.confirm.label ?? "Confirm"}
        </button>
        <button className={`btn ${FOOTER_BUTTON}`} type="button" onClick={close}>
          Cancel
        </button>
      </footer>
    </dialog>
  );
}

function Group({ heading, children }: { heading: string | null; children: ReactNode }) {
  return (
    <>
      {heading ? (
        <h4 className="follower-selector-group mt-1.5 text-[10px] font-bold tracking-wider text-muted uppercase">
          {heading}
        </h4>
      ) : null}
      {children}
    </>
  );
}

import { gameKeyword } from "#engine";
import { KEYWORD_DEFINITION, KEYWORD_NAME, KEYWORD_NOTE, KEYWORD_NOTES } from "./keyword-classes";
import { KeywordText } from "./KeywordText";

/** The keywords a tooltip's text names, explained under it: each its name and definition, after a divider. */
export function KeywordNotes({ ids }: { ids: number[] }) {
  return (
    <section className={KEYWORD_NOTES} aria-label="Keywords">
      {ids.map((id) => {
        const keyword = gameKeyword(id);
        if (!keyword) return null;
        return (
          <div key={id} className={KEYWORD_NOTE}>
            <strong className={KEYWORD_NAME}>{keyword.name}</strong>
            <span className={KEYWORD_DEFINITION}>
              <KeywordText text={keyword.definition} />
            </span>
          </div>
        );
      })}
    </section>
  );
}

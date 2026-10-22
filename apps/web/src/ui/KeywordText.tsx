import { gameKeyword, gameKeywordSegments } from "@legacy/engine/text/game-keywords.js";
import { KEYWORD, KEYWORD_DEFINITION, KEYWORD_NAME } from "./keyword-classes";
import { Tooltip } from "./tooltip/Tooltip";
import type { TooltipBody } from "./tooltip/tooltip-store";
import { useInTooltip } from "./tooltip/in-tooltip";

/**
 * Game text with its keywords underlined, as the game shows them; hovering one shows its definition. Inside a tooltip
 * a keyword is only underlined, and the tooltip explains it under its text (TooltipHost, KeywordNotes): the page shows
 * one tooltip at a time. `data-keyword` (the game's hyperlink id) is what the tooltip reads. Line breaks stay as "\n"
 * for a pre-line parent.
 */
export function KeywordText({ text }: { text: string }) {
  const inTooltip = useInTooltip();
  return gameKeywordSegments(text).map((segment, index) => {
    const id = segment.keyword;
    if (!id) return segment.text;
    const keyword = (
      <span key={index} className={KEYWORD} data-keyword={id}>
        {segment.text}
      </span>
    );
    if (inTooltip) return keyword;
    return (
      <Tooltip key={index} content={() => keywordTooltip(id)}>
        {keyword}
      </Tooltip>
    );
  });
}

// A keyword's own tooltip: its name and definition; `data-keyword-title` keeps it out of the explanations under it.
function keywordTooltip(id: number): TooltipBody | null {
  const keyword = gameKeyword(id);
  if (!keyword) return null;
  return {
    kind: "keyword-tooltip",
    body: (
      <>
        <strong className={KEYWORD_NAME} data-keyword-title={id}>
          {keyword.name}
        </strong>
        <span className={KEYWORD_DEFINITION}>
          <KeywordText text={keyword.definition} />
        </span>
      </>
    ),
  };
}

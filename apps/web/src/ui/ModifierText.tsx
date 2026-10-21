import type { ModifierTextView } from "@legacy/app/bridge/gear-item-view.ts";
import { CoverageBadge } from "./CoverageBadge";
import { useAltHeld } from "./use-alt-held";

// The keyword-roll-* classes are hooks (the e2e tests read the keyword and its effect).
const KEYWORD_NAME = "keyword-roll-name font-bold text-info underline underline-offset-2";
const EFFECT_LINES = "keyword-roll-effect mt-1 grid gap-1 border-l-2 border-info pl-2";
const EFFECT_LINE = "flex items-start justify-between gap-2";

/** A modifier line: plain text, or a keyword roll that shows its keyword, and its effect while Alt is held. */
export function ModifierText({ text }: { text: ModifierTextView }) {
  const altHeld = useAltHeld();
  if (text.kind === "plain") return <>{text.text}</>;
  const effect = !altHeld ? null : text.lines ? (
    <span className={EFFECT_LINES}>
      {text.lines.map((line, index) => (
        <span key={index} className={EFFECT_LINE}>
          <span>{line.text}</span>
          <CoverageBadge coverage={line.coverage} />
        </span>
      ))}
    </span>
  ) : (
    <span className="keyword-roll-effect">{text.effect}</span>
  );
  if (text.inline)
    return (
      <span className="keyword-roll">
        {text.inline.before}
        <span className={KEYWORD_NAME}>{text.keyword}</span>
        {text.inline.after}
        {effect}
      </span>
    );
  return (
    <>
      <span className="keyword-roll">
        <span className={KEYWORD_NAME}>{text.keyword}</span>
        {effect}
      </span>
      {text.rest}
    </>
  );
}

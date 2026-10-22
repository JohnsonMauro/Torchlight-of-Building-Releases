import type { BoostedTextView } from "@legacy/app/bridge/pact-tooltip-view.ts";
import { KeywordText } from "../../ui/KeywordText";
import { BOOSTED } from "./pact-tooltip-classes";

/** A pact effect with its Star Trail boost: the boosted number (its roll and boost in `title`) in `boostedClass`. */
export function BoostedText({ text, boostedClass = BOOSTED }: { text: BoostedTextView; boostedClass?: string }) {
  if (text.effective === null) return <KeywordText text={text.before} />;
  return (
    <>
      <KeywordText text={text.before} />
      <span className={boostedClass} title={text.title}>
        {text.effective}
      </span>
      <KeywordText text={text.after} />
    </>
  );
}

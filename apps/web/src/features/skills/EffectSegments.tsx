import type { TextSegment } from "@legacy/app/bridge/display-text.ts";
import { KeywordText } from "../../ui/KeywordText";

/** An effect line's runs (the skill tooltip, the selector's detail): highlighted values in their class, keywords marked. */
export function EffectSegments({ segments }: { segments: TextSegment[] }) {
  return segments.map((segment, part) =>
    segment.className ? (
      <span key={part} className={segment.className}>
        <KeywordText text={segment.text} />
      </span>
    ) : (
      <KeywordText key={part} text={segment.text} />
    ),
  );
}

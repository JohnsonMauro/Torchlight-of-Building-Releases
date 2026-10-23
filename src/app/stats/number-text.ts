// A large figure of the Stats page as the React views show it (apps/web/src/features/stats/NumberToggle.tsx): the
// truncated text ("1.59 Billion") that a click turns into the full integer ("1,593,002,745"). Pure.
import { formatRecountInteger, formatShortNumber } from "#engine";

export interface NumberText {
  full: string;
  /** The truncated text; null when there is nothing to toggle (the same text, or no number). */
  short: string | null;
}

/** `value`'s two texts; `short` / `full` override them (ranges). */
export function numberText(value: number, { short, full }: { short?: string; full?: string } = {}): NumberText {
  const shortText = short ?? formatShortNumber(value);
  const fullText = full ?? formatRecountInteger(value);
  if (shortText === fullText || (!Number.isFinite(value) && short === undefined))
    return { full: fullText, short: null };
  return { full: fullText, short: shortText };
}

// The legacy markup prints every text through src/app/html.js escapeHtml, which also closes the gap before a percent
// sign ("+26 %" → "+26%", packages/engine/src/text/percentage-text.js). React escapes on its own and skips that step, so a view
// model passes what it shows through displayTexts first. Pure.
import { normalizePercentageText } from "#engine";

/** A copy of `value` (plain objects and arrays) with every string as the legacy markup printed it. */
export function displayTexts<T>(value: T): T {
  if (typeof value === "string") return normalizePercentageText(value) as T;
  if (Array.isArray(value)) return value.map(displayTexts) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype)
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, displayTexts(item)])) as T;
  return value;
}

/** A run of text, highlighted with `className` when it has one. */
export interface TextSegment {
  text: string;
  className: string | null;
}
const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const decode = (html: string) => html.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity]);

/**
 * The runs of an effect line the legacy highlighters (src/app/skills/skill-display-ss14.js, src/app/skills/support-display-ss14.js)
 * return as HTML: escaped text with `<span class="…">value</span>` around the highlighted values, and nothing else.
 */
export function htmlTextSegments(html: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const match of html.matchAll(/<span class="([^"]+)">([^<]*)<\/span>/g)) {
    if (match.index > cursor) segments.push({ text: decode(html.slice(cursor, match.index)), className: null });
    segments.push({ text: decode(match[2]), className: match[1] });
    cursor = match.index + match[0].length;
  }
  if (cursor < html.length) segments.push({ text: decode(html.slice(cursor)), className: null });
  return segments;
}

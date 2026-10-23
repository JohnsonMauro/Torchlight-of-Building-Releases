// Game keywords: the words the game underlines in running text (Spell Burst, Tangle, Frostbitten…) and the definition
// it shows on hover, from packages/engine/data/game/keywords.generated.js (TLIDB's marks of the game's hyperlinks). A text is matched
// by the forms the game writes (case kept, "Tangle(s)", "Locks On"), longest first, never inside a longer word or a
// hyphenated compound. The hero trait keywords (inline-keywords.js heroTraitKeywords) stay per hero: their tooltip lists
// definitions with the trait's own wording and stat lines.
import { GAME_KEYWORD_FORMS, GAME_KEYWORDS } from "../../data/game/keywords.generated.js";

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const forms = Object.keys(GAME_KEYWORD_FORMS).sort((a, b) => b.length - a.length);
const pattern = new RegExp(`(?<![\\w-])(${forms.map(escapeRegExp).join("|")})(?![\\w-])`, "g");
// Texts repeat (every option of a list renders on each change); their segments are computed once.
const segmentsByText = new Map();

/**
 * A keyword by its game hyperlink id, or null.
 * @param {number} id
 * @returns {{ id: number, name: string, definition: string } | null}
 */
export function gameKeyword(id) {
  const entry = GAME_KEYWORDS[id];
  return entry ? { id: Number(id), name: entry.name, definition: entry.definition } : null;
}

/**
 * A text split at its keywords: [{ text }, { text, keyword: id }, …] in order (`text` is the form the text uses). A text
 * without a keyword is one plain segment. The returned array is shared between calls: do not change it.
 * @param {unknown} value
 * @returns {{ text: string, keyword?: number }[]}
 */
export function gameKeywordSegments(value) {
  const text = String(value ?? "");
  const known = segmentsByText.get(text);
  if (known) return known;
  const segments = [];
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > offset) segments.push({ text: text.slice(offset, match.index) });
    segments.push({ text: match[1], keyword: GAME_KEYWORD_FORMS[match[1]] });
    offset = match.index + match[1].length;
  }
  if (offset < text.length || !segments.length) segments.push({ text: text.slice(offset) });
  segmentsByText.set(text, segments);
  return segments;
}

/**
 * The keywords a tooltip explains for these: each of them, then the keywords their definitions name, each once in the
 * order they first appear. One level only: a chain that goes on (Frostbite → Ailment → Freeze → …) would outgrow the
 * tooltip.
 * @param {number[]} ids
 * @returns {number[]}
 */
export function gameKeywordsExplained(ids) {
  const explained = [...new Set(ids)].filter((id) => GAME_KEYWORDS[id]);
  for (const id of [...explained])
    for (const segment of gameKeywordSegments(GAME_KEYWORDS[id].definition))
      if (segment.keyword && !explained.includes(segment.keyword)) explained.push(segment.keyword);
  return explained;
}

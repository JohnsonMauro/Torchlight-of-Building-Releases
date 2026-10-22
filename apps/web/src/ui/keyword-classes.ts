// A game keyword in running text: the game's cyan with a solid underline (KeywordText), and its explanation.
export const KEYWORD = "game-keyword text-info underline underline-offset-2";
export const KEYWORD_NAME = "block font-display text-sm font-bold text-info";
export const KEYWORD_DEFINITION = "mt-1 block text-xs/snug whitespace-pre-line text-text";
// The explanations under a tooltip's text (KeywordNotes), each after a divider. The frames without padding of their own
// (tooltip-classes.ts: gear, skill, memory, scent, pact, prism, talent node, source summary) get the frame's padding.
export const KEYWORD_NOTES = [
  "keyword-notes block text-left",
  "in-[.gear-tooltip,.skill-tooltip,.memory-tooltip,.sage-scent-tooltip,.pact-tooltip,.prism-tooltip,.basic-talent-tooltip,.source-summary-tooltip]:px-4",
  "in-[.gear-tooltip,.skill-tooltip,.memory-tooltip,.sage-scent-tooltip,.pact-tooltip,.prism-tooltip,.basic-talent-tooltip,.source-summary-tooltip]:pb-3",
].join(" ");
export const KEYWORD_NOTE = "mt-2.5 border-t border-line pt-2.5";

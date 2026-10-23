// A list search over long texts (the skill selector: names, tags and whole effect descriptions). The planner builds each
// choice's text once with searchText; the dialog turns what the user typed into a matcher with searchMatcher: plain
// words must each appear somewhere, in any order; /pattern/flags is a regular expression (src/app/gear/safe-regex.ts
// refuses one that could freeze the page). Pure.
import { cleanGameText } from "#engine";
import { searchPattern } from "../gear/safe-regex.ts";

/** What the search runs over: the parts in one line, as the page shows them ("+26 %" → "+26%"), lower case. */
export function searchText(parts: readonly (string | null | undefined)[]): string {
  return cleanGameText(parts.filter(Boolean).join(" ")).toLowerCase();
}

export interface SearchMatcher {
  /** Whether a choice's searchText matches; every text matches an empty search. */
  matches: (text: string) => boolean;
  /** Why a typed /pattern/ cannot run; "" otherwise. */
  error: string;
}

export function searchMatcher(query: string): SearchMatcher {
  const typed = searchPattern(query);
  if (typed) {
    const { pattern, error } = typed;
    return { matches: (text) => pattern !== null && pattern.test(text), error };
  }
  const words = searchText([query]).split(" ").filter(Boolean);
  return { matches: (text) => words.every((word) => text.includes(word)), error: "" };
}

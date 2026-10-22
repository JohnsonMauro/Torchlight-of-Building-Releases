// The skill selector's list filter: the search and the tags picked in the tag column. A choice shows when the search
// matches its text (src/app/bridge/search-match.ts searchMatcher) and it carries every picked tag.

export interface FilterableChoice {
  tags: string[];
  /** Its whole text, as src/app/bridge/search-match.ts searchText builds it. */
  search: string;
}

export interface TagOption {
  tag: string;
  /** How many choices would show with this tag picked too (with the others picked and the search). */
  count: number;
  picked: boolean;
}

/** The search: whether it matches a choice's text. */
export type SearchMatches = (text: string) => boolean;

export function matchesFilter(choice: FilterableChoice, search: SearchMatches, picked: readonly string[]): boolean {
  return search(choice.search) && picked.every((tag) => choice.tags.includes(tag));
}

/** Every tag of the choices, alphabetical, with what picking it would leave. */
export function tagOptions(
  choices: readonly FilterableChoice[],
  search: SearchMatches,
  picked: readonly string[],
): TagOption[] {
  const tags = [...new Set(choices.flatMap((choice) => choice.tags))].sort((a, b) => a.localeCompare(b));
  const shown = choices.filter((choice) => matchesFilter(choice, search, picked));
  return tags.map((tag) => ({
    tag,
    count: shown.filter((choice) => choice.tags.includes(tag)).length,
    picked: picked.includes(tag),
  }));
}

export function toggleTag(picked: readonly string[], tag: string): string[] {
  return picked.includes(tag) ? picked.filter((entry) => entry !== tag) : [...picked, tag];
}

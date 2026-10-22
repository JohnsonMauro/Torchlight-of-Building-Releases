// A regular expression a user types (the legendary list's /regex/ search) runs on the page's thread, and a test() has no
// timeout: a pattern with catastrophic backtracking ("(.*)*z$") freezes the tab. The pattern is refused before it runs
// when it can backtrack that way: a quantified group holding a quantifier or an alternation (at any depth), a
// backreference, more than a few quantifiers in all, or a long pattern. (global-context web-browser-apis, measured on
// V8 in 2026-10: with three quantifiers at most, the worst case stayed near 6 ms.)

export const MAX_PATTERN_LENGTH = 100;
const MAX_QUANTIFIERS = 3;

const isQuantifier = (pattern: string, index: number) => /[*+?{]/.test(pattern[index] ?? "");

/** Why the pattern is refused; "" when it may run. */
export function unsafePattern(pattern: string): string {
  if (pattern.length > MAX_PATTERN_LENGTH) return `The pattern is longer than ${MAX_PATTERN_LENGTH} characters`;
  if (/\\[1-9]|\\k</.test(pattern)) return "Backreferences are not allowed";
  // One pass: a stack of open groups, each marked once it holds a quantifier or an alternation; a marked group that is
  // quantified itself is refused. Escapes and character classes are skipped.
  const groups: boolean[] = [];
  let quantifiers = 0;
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "\\") {
      index += 1;
      continue;
    }
    if (character === "[") {
      for (index += 1; index < pattern.length && pattern[index] !== "]"; index += 1)
        if (pattern[index] === "\\") index += 1;
      continue;
    }
    if (character === "(") groups.push(false);
    else if (character === ")") {
      const marked = groups.pop() ?? false;
      if (marked && isQuantifier(pattern, index + 1)) return "A repeated group may not repeat inside it";
      if (groups.length && (marked || isQuantifier(pattern, index + 1))) groups[groups.length - 1] = true;
    } else if (character === "|") {
      if (groups.length) groups[groups.length - 1] = true;
    } else if (isQuantifier(pattern, index) && !(character === "?" && pattern[index - 1] === "(")) {
      quantifiers += 1;
      if (groups.length) groups[groups.length - 1] = true;
      if (character === "{") while (index < pattern.length && pattern[index] !== "}") index += 1;
    }
  }
  return quantifiers > MAX_QUANTIFIERS ? `At most ${MAX_QUANTIFIERS} repeats (* + ? {…}) in a pattern` : "";
}

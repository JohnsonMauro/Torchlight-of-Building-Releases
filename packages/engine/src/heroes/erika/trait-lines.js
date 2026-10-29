// The line readers Erika's Lightning Shadow and Vendetta's Sting modules share (hero trait audit batch B5, 2026-10-19): the trait and
// revived lines of the build, cleaned of the game text's spacing.

export const cleanErika = (text) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .replace(/(\d) %/g, "$1%")
    .replace(/ ,/g, ",")
    .replace(/ \./g, ".")
    .trim();

export const traitLinesOf = (modifierTexts, heroId) =>
  modifierTexts
    .filter(
      (line) =>
        line && line.origin !== "derived" && !line.lineEffect && (line.origin === "trait" || line.origin === "memory"),
    )
    .map((line) => ({ ...line, clean: cleanErika(line.text) }));
export const matchAll = (lines, pattern) =>
  lines.map((line) => ({ line, match: line.clean.match(pattern) })).filter((item) => item.match);
export const first = (lines, pattern) => matchAll(lines, pattern)[0] || null;
export const sumOf = (lines, pattern, group = 1) =>
  matchAll(lines, pattern).reduce((sum, item) => sum + Number(item.match[group]) * (item.line.multiplier ?? 1), 0);

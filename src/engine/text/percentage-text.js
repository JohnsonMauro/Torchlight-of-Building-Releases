import { readOnce } from "./read-once.js";

// Keep signs, values and line breaks intact; also handle copied non-breaking spaces.
export const normalizePercentageText = readOnce((value) =>
  String(value ?? "").replace(/(\d|\))[ \t\u00a0\u202f]+%/g, "$1%"),
);

// A game line as the readers match it: percentages joined to their number, every run of spaces and line breaks one space, no
// space at either end.
export const cleanGameText = readOnce((value) => normalizePercentageText(value).replace(/\s+/g, " ").trim());

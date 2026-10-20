// The legacy markup prints every text through src/app/html.js escapeHtml, which also closes the gap before a percent
// sign ("+26 %" → "+26%", src/engine/text/percentage-text.js). React escapes on its own and skips that step, so a view
// model passes what it shows through displayTexts first. Pure.
import { normalizePercentageText } from "../../engine/text/percentage-text.js";

/** A copy of `value` (plain objects and arrays) with every string as the legacy markup printed it. */
export function displayTexts<T>(value: T): T {
  if (typeof value === "string") return normalizePercentageText(value) as T;
  if (Array.isArray(value)) return value.map(displayTexts) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype)
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, displayTexts(item)])) as T;
  return value;
}

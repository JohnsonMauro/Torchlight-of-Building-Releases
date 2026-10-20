// Kismet affix markup for the planner's tooltips and the Kismet crafter preview (src/app/app.js). Kept apart from
// src/engine/pacts/kismet-effects.js, which the calculation imports, so the calculation does not load markup.
import { escapeHtml } from "./html.js";
import { starTrailNote } from "../engine/pacts/kismet-effects.js";

/**
 * A kismet affix as tooltips and the crafter preview show it: with a Star Trail boost the effective value replaces the
 * rolled one (`effective`, drawn in the green used for raised skill and support values), with the rolled value and the
 * boost as its `title`; without one, `effective` is null and `before` is the whole text. The stored roll is unchanged.
 */
export function boostedKismetAffixParts(text, boost) {
  const rolled = String(text ?? "");
  if (!boost || !(boost.scale > 0) || boost.scale === 1)
    return { before: rolled, effective: null, title: "", after: "" };
  const match = rolled.match(/(-?)(\d+(?:\.\d+)?)(%?)/);
  if (!match) return { before: rolled, effective: null, title: "", after: "" };
  return {
    before: rolled.slice(0, match.index) + match[1],
    effective: `${Math.round(Number(match[2]) * boost.scale * 10000) / 10000}${match[3]}`,
    title: `Rolled ${match[1] || (/^\+/.test(rolled.slice(0, match.index)) ? "+" : "")}${match[2]}${match[3]}, ${starTrailNote(boost)}`,
    after: rolled.slice(match.index + match[0].length),
  };
}

/** HTML for a kismet affix (boostedKismetAffixParts), e.g. "+<span>7.05%</span> Aura Effect". */
export function boostedKismetAffixHtml(text, boost) {
  const parts = boostedKismetAffixParts(text, boost);
  return parts.effective === null
    ? escapeHtml(parts.before)
    : `${escapeHtml(parts.before)}<span class="skill-level-bonus" title="${escapeHtml(parts.title)}">${escapeHtml(parts.effective)}</span>${escapeHtml(parts.after)}`;
}

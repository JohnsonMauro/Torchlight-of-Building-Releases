// Kismet affix markup for the planner's tooltips and the Kismet crafter preview (src/app/app.js). Kept apart from
// src/engine/pacts/kismet-effects.js, which the calculation imports, so the calculation does not load markup.
import { escapeHtml } from "./html.js";
import { starTrailNote } from "../engine/pacts/kismet-effects.js";

/**
 * HTML for a kismet affix in a tooltip or the crafter preview: with a Star Trail boost the effective value replaces the rolled
 * one and shows in the green used for raised skill and support values (`skill-level-bonus`), e.g. "+<span>7.05%</span> Aura
 * Effect", with the rolled value and the boost in its title. The stored roll is unchanged. Without a boost: the escaped text.
 */
export function boostedKismetAffixHtml(text, boost) {
  const rolled = String(text ?? "");
  if (!boost || !(boost.scale > 0) || boost.scale === 1) return escapeHtml(rolled);
  const match = rolled.match(/(-?)(\d+(?:\.\d+)?)(%?)/);
  if (!match) return escapeHtml(rolled);
  const effective = `${Math.round(Number(match[2]) * boost.scale * 10000) / 10000}${match[3]}`;
  const before = rolled.slice(0, match.index) + match[1];
  const after = rolled.slice(match.index + match[0].length);
  const title = `Rolled ${match[1] || (/^\+/.test(before) ? "+" : "")}${match[2]}${match[3]}, ${starTrailNote(boost)}`;
  return `${escapeHtml(before)}<span class="skill-level-bonus" title="${escapeHtml(title)}">${escapeHtml(effective)}</span>${escapeHtml(after)}`;
}

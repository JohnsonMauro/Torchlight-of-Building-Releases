import { escapeHtml } from "../html.js";
import {
  summarizeRecount,
  windowTotals,
  excludeRecountSources,
  excludedSteadyDps,
} from "../../engine/combat/dummy-recount.js";
import { DASH, formatRecountInteger, formatShortNumber } from "../../engine/text/number-format.js";

// The training dummy recount of the stat sheet's damage banner: the in-game recount fields over a fixed 10 s span of the
// planner's 60 s dummy timeline (planner.dummyRecount), each source's share, and the sources left out of the view. The
// banner is React (apps/web/src/features/stats, data from src/app/bridge/stats-view-model.ts); the click-to-expand
// number markup below still serves the legacy damage path view.

export const RECOUNT_SPAN_SECONDS = 10;
// Click-to-expand numbers: which toggles show the full integer, kept in memory for the session so
// re-renders keep each value's state. No storage.
const expandedNumbers = new Set();
const SHORT_HINT = "Click to show the full number";
const FULL_HINT = "Click to shorten";

const UNIT_WORD = /^(.*) (Thousand|Million|Billion|Trillion|Quadrillion)$/;
/** Short text as HTML; with `unitClass`, a trailing unit word sits in its own span so it keeps that class's styling. */
function shortHtml(short, unitClass) {
  const match = unitClass ? UNIT_WORD.exec(short) : null;
  return match
    ? `${escapeHtml(match[1])} <span class="${escapeHtml(unitClass)}">${match[2]}</span>`
    : escapeHtml(short);
}

/**
 * A large figure that toggles between the truncated form (default) and the full integer on click,
 * Enter or Space. `id` names the toggle so its state survives re-renders; `className` keeps the styling.
 * `short`/`full` override the two texts (ranges); `unitClass` styles the unit word separately (Damage-path hero).
 */
export function toggleNumberMarkup(
  id,
  value,
  { className = "", tag = "strong", unitClass = "", short: shortText, full: fullText } = {},
) {
  const short = shortText ?? formatShortNumber(value);
  const full = fullText ?? formatRecountInteger(value);
  if (short === full || (!Number.isFinite(value) && shortText === undefined))
    return `<${tag}${className ? ` class="${className}"` : ""}>${escapeHtml(full)}</${tag}>`;
  const expanded = expandedNumbers.has(id);
  const text = expanded ? full : short;
  const hint = expanded ? FULL_HINT : SHORT_HINT;
  return `<${tag} class="${className ? `${className} ` : ""}number-toggle" role="button" tabindex="0" data-number-toggle="${escapeHtml(id)}" data-short="${escapeHtml(short)}" data-full="${escapeHtml(full)}"${unitClass ? ` data-unit-class="${escapeHtml(unitClass)}"` : ""} aria-expanded="${expanded}" title="${hint}" aria-label="${escapeHtml(`${text}. ${hint}`)}">${expanded ? escapeHtml(full) : shortHtml(short, unitClass)}</${tag}>`;
}

/** Flip one toggle element in place and remember its state. */
export function flipNumberToggle(element) {
  const id = element?.dataset?.numberToggle;
  if (!id) return;
  const expanded = !expandedNumbers.has(id);
  if (expanded) expandedNumbers.add(id);
  else expandedNumbers.delete(id);
  const text = expanded ? element.dataset.full : element.dataset.short;
  const hint = expanded ? FULL_HINT : SHORT_HINT;
  if (!expanded && element.dataset.unitClass) element.innerHTML = shortHtml(text, element.dataset.unitClass);
  else element.textContent = text;
  element.title = hint;
  element.setAttribute("aria-label", `${text}. ${hint}`);
  element.setAttribute("aria-expanded", String(expanded));
}

if (typeof document !== "undefined" && document.addEventListener) {
  document.addEventListener("click", (event) => {
    const target = event.target?.closest?.("[data-number-toggle]");
    if (target) flipNumberToggle(target);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target?.closest?.("[data-number-toggle]");
    if (!target) return;
    event.preventDefault();
    flipNumberToggle(target);
  });
}

// Click-to-exclude sources on the recount card (view-only what-if): the excluded source keys, in memory for
// the session so re-renders keep them; never saved to the build and never read by the planner's figures.
const excludedSources = new Set();

/** The excluded source keys (a copy). */
export function recountExcludedSources() {
  return [...excludedSources];
}

/** Leave a source out of the recount card (`excluded` true) or include it again (default: flip); null includes all. */
export function setRecountSourceExcluded(key, excluded = !excludedSources.has(key)) {
  if (key === undefined || key === null) {
    excludedSources.clear();
    return;
  }
  if (excluded) excludedSources.add(key);
  else excludedSources.delete(key);
}

/** Recount span as the game meter's duration, hh:mm:ss (10 → "00:00:10"). */
export function formatRecountDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return DASH;
  const total = Math.round(seconds);
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

/**
 * The three recount fields over the fixed 10 s span, labelled as in the in-game panel; null when there is
 * no timeline. `value`/`text` are the planner's model values (no meter cap: user, 2026-10-13).
 * @param {object | null | undefined} recount planner.dummyRecount
 * @param {{ excluded?: Iterable<string> }} [options]
 */
export function recountTiles(recount, { excluded = excludedSources } = {}) {
  if (!recount?.timeline) return null;
  const summary = summarizeRecount(excludeRecountSources(recount.timeline, excluded), { span: RECOUNT_SPAN_SECONDS });
  const tile = (key, label, note) => ({
    key,
    label,
    note,
    value: summary[key],
    text: formatRecountInteger(summary[key]),
  });
  return [
    tile(
      "averageDps",
      "Average DPS in a span of time",
      `Average over the first ${RECOUNT_SPAN_SECONDS} seconds on the level 85 dummy, starting clean.`,
    ),
    tile("highest5sDps", "Highest DPS in 5s", `Best 5-second window in those ${RECOUNT_SPAN_SECONDS} seconds.`),
    tile("last5sDps", "Average DPS in 5s", "The last 5 seconds, like the in-game recount."),
  ];
}

/** Legend/bar colours by share rank (largest first), from the planner's existing accent palette. */
export const MIX_COLORS = ["#e9a362", "#6fb7d2", "#c97c70", "#9c8ac6", "#7fc9a5", "#d9c27a", "#8fa1b0"];

/**
 * Each damage source's DPS and share over the fixed span, largest first. With `excluded` (the recount card's
 * view-only what-if) DPS and shares come from the timeline without those sources; the excluded ones stay in
 * the list (DPS 0, share 0, `excluded: true`) in their full-build order.
 * @param {object | null | undefined} recount planner.dummyRecount
 * @param {{ excluded?: Iterable<string> }} [options]
 */
export function recountSourceShares(recount, { excluded = [] } = {}) {
  if (!recount?.timeline) return [];
  const timeline = recount.timeline;
  const windowOf = (source) => {
    const summary = summarizeRecount(source, { span: RECOUNT_SPAN_SECONDS });
    return windowTotals(source, summary.span, { start: summary.startSeconds });
  };
  const full = windowOf(timeline);
  const view = excludeRecountSources(timeline, excluded);
  const totals = view === timeline ? full : windowOf(view);
  return Object.entries(full.bySource)
    .sort(([, a], [, b]) => b.dps - a.dps)
    .map(([key]) => {
      const label = timeline.labels?.[key] || key;
      const item = totals.bySource[key];
      if (!item) return { key, label, dps: 0, share: 0, excluded: true };
      return { key, label, dps: item.dps, share: totals.totalDamage > 0 ? item.totalDamage / totals.totalDamage : 0 };
    });
}

/**
 * Total modeled DPS less the excluded sources' part (and their Ill Omen part); null stays null. `parts` is the
 * total by recount source key (see excludedSteadyDps); without it the recount's steady state, which is the
 * same per-source sum on the damage-path builds.
 * @param {object | null | undefined} recount planner.dummyRecount
 * @param {number | null} totalDps
 * @param {{ excluded?: Iterable<string>, parts?: Record<string, number> }} [options]
 */
export function recountTotalModeledDps(recount, totalDps, { excluded = excludedSources, parts } = {}) {
  if (!Number.isFinite(totalDps)) return totalDps ?? null;
  return totalDps - excludedSteadyDps(recount, excluded, { parts });
}

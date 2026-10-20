// Markup of the trait-tree rows that need no planner state (2026-10-15; rendered by src/app/app.js renderHeroTraitTree).
// Youga – The Ultimate One's fourth row comes from the revived memory affix "+1 Max Youga Count in the Universe"
// (src/engine/heroes/hero-trait-tree.js): it has no memory of its own, so its memory cell holds a "+1 Youga Count" chip, and its level
// cell reads the fixed maximum level (5) with a "MAX" caption. Hovering the row (outside its trait) shows where it comes
// from; the trait's own tooltip carries the same note.
import { escapeHtml } from "./html.js";
import {
  TREE_ROW_LEVELS,
  EXTRA_PICK_AFFIX,
  EXTRA_PICK_LEVEL,
  treeRowLevelKey,
} from "../engine/heroes/hero-trait-tree.js";

export const EXTRA_ROW_CHIP = "+1 Youga Count";
export const EXTRA_ROW_NOTE = `This fourth trait row comes from the "${EXTRA_PICK_AFFIX}" memory affix. Its trait is at max level (${EXTRA_PICK_LEVEL}) and needs the three memory rows filled first.`;

/** Planner tooltip content (hero-trait style) for the fourth row. */
export function treeExtraRowTooltipHtml() {
  return `<div class="hero-trait-tooltip-head"><strong>${escapeHtml(EXTRA_ROW_CHIP)}</strong><em>Level ${EXTRA_PICK_LEVEL} · Max</em></div><div class="hero-trait-effects"><p>${escapeHtml(EXTRA_ROW_NOTE)}</p></div>`;
}

/**
 * The fourth row: level cell "5" / "MAX", the chip in the memory-socket cell, and the row's pick (draggable like the
 * memory rows' picks). `artwork(src, alt, className)` is the planner's art helper.
 */
export function treeExtraRowMarkup(heroId, traits = [], selections = [], artwork = () => "") {
  const row = TREE_ROW_LEVELS.length,
    pick = selections[row],
    trait = pick ? traits.find((item) => item.name === pick && item.level > 1) : null;
  const head = `<span class="tier-level tier-level-max"><strong>${EXTRA_PICK_LEVEL}</strong><small>MAX</small></span><span class="tree-extra-row-chip">${escapeHtml(EXTRA_ROW_CHIP).replace(" ", "&nbsp;")}</span>`; // "+1 Youga" / "Count"
  const attributes = `data-selena-dance-row="${row}" data-tree-extra-row-tooltip aria-label="Fourth trait row, ${escapeHtml(EXTRA_ROW_CHIP)}, level ${EXTRA_PICK_LEVEL} (max)"`;
  if (!trait) return `<div class="hero-tier hero-memory-only-tier tree-extra-row" ${attributes}>${head}</div>`;
  return `<div class="hero-tier tree-extra-row" ${attributes}>${head}<span class="tier-divider"></span><div class="hero-tier-choices"><button type="button" class="hero-choice selected selena-dance-pick" data-selena-dance-pick="${row}" data-hero-trait-tooltip="${escapeHtml(trait.name)}" data-hero-trait-level-key="${escapeHtml(treeRowLevelKey(heroId, row))}" aria-label="${escapeHtml(trait.name)}" aria-pressed="true">${artwork(trait.icon, trait.name, "hero-choice-art")}</button></div></div>`;
}

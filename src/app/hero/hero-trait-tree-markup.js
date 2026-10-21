// The fourth trait row's texts (2026-10-15): the row itself is drawn by the HERO tab (apps/web/src/features/hero, from
// src/app/bridge/hero-traits-view-model.ts).
// Youga – The Ultimate One's fourth row comes from the revived memory affix "+1 Max Youga Count in the Universe"
// (src/engine/heroes/hero-trait-tree.js): it has no memory of its own, so its memory cell holds a "+1 Youga Count" chip, and its level
// cell reads the fixed maximum level (5) with a "MAX" caption. Hovering the row (outside its trait) shows where it comes
// from; the trait's own tooltip carries the same note.
import { escapeHtml } from "../html.js";
import { EXTRA_PICK_AFFIX, EXTRA_PICK_LEVEL } from "../../engine/heroes/hero-trait-tree.js";

export const EXTRA_ROW_CHIP = "+1 Youga Count";
export const EXTRA_ROW_NOTE = `This fourth trait row comes from the "${EXTRA_PICK_AFFIX}" memory affix. Its trait is at max level (${EXTRA_PICK_LEVEL}) and needs the three memory rows filled first.`;

/** Planner tooltip content (hero-trait style) for the fourth row. */
export function treeExtraRowTooltipHtml() {
  return `<div class="hero-trait-tooltip-head"><strong>${escapeHtml(EXTRA_ROW_CHIP)}</strong><em>Level ${EXTRA_PICK_LEVEL} · Max</em></div><div class="hero-trait-effects"><p>${escapeHtml(EXTRA_ROW_NOTE)}</p></div>`;
}

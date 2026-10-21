// A Stats damage path source's tooltip (DamageSourceTooltip): every kind takes the pointer (it stays a moment so the
// pointer can reach it); a breakdown (a fixed title, a scrolling text, a fixed footer) sits on the slate art.

/** Added to the card's own frame kind. */
export const FRAME = "damage-source-tooltip";
export const SUMMARY_FRAME = "damage-source-tooltip source-summary-tooltip";
export const SUMMARY_TITLE =
  "block flex-none border-b border-line px-3.5 py-3 font-display text-sm/snug font-bold text-accent";
export const SUMMARY_BODY =
  "block min-h-0 overflow-y-auto px-3.5 py-3 text-xs/relaxed whitespace-pre-line text-text [scrollbar-width:thin] [scrollbar-color:var(--color-line-strong)_transparent]";
export const SUMMARY_FOOT = "block flex-none border-t border-line px-3.5 py-2 text-xs text-muted";

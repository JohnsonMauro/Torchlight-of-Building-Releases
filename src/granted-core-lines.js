// Gear lines that grant a core talent's effect read "[Core name] effect" (belt blends, legendary and Vorax donors). Gear-pact
// batch G2 (research/gear-pact-batch-2026-10-12.md §7.1): the intake strips the "[Name] " prefix once, so the body reaches
// the same readers as the plain line ("[Beacon] +2 Max Spell Burst" acts as "+2 Max Spell Burst").
//
// Bracketed lines that a dedicated model already reads from the item text keep their bracket and are NOT stripped, so they
// count exactly once:
//   [Stealth Stab]       — src/blur-effects.js (Blur group: damage taken while Blur is active, damage after Blur ends)
//   [Divine Grace]       — src/blessing-model.js (base effect of all Blessings)
//   [Poisoned Relief]    — src/low-resource-model.js (Injury Buffer at Low Life)
//   [Barrier of Radiance]— no damage effect (Quality of life)
// Open (Q-G5): whether a gear grant of a core stacks with the same core selected in a tree, and whether it counts as a
// core for "core talent" lines. Name-modeled cores (src/core-talent-model.js) do not see gear grants yet.
export const DEDICATED_BRACKET_NAMES = new Set(["Stealth Stab", "Divine Grace", "Poisoned Relief", "Barrier of Radiance"]);
const BRACKET = /^\[([^\]]+)\]\s*(.+)$/;

/** { name, body } for a "[Name] body" line whose prefix the intake strips, else null. */
export function grantedCoreLine(text) {
  const match = String(text ?? "").trim().match(BRACKET);
  if (!match || DEDICATED_BRACKET_NAMES.has(match[1].trim())) return null;
  return { name: match[1].trim(), body: match[2].trim() };
}

/** The line with a strippable "[Name] " prefix removed (dedicated names keep theirs). */
export const stripGrantedCore = (text) => grantedCoreLine(text)?.body ?? text;

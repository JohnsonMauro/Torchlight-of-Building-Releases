// Gear lines that grant a core talent's effect read "[Core name] effect" (belt blends, legendary and Vorax donors). Gear-pact
// batch G2 (research/gear-pact-batch-2026-10-12.md §7.1): the intake strips the "[Name] " prefix once, so the body reaches
// the same readers as the plain line ("[Beacon] +2 Max Spell Burst" acts as "+2 Max Spell Burst").
//
// Bracketed lines that a dedicated model already reads from the item text keep their bracket and are NOT stripped, so they
// count exactly once:
//   [Stealth Stab]       — src/engine/combat/blur-effects.js (Blur group: damage taken while Blur is active, damage after Blur ends)
//   [Divine Grace]       — src/engine/defense/blessing-model.js (base effect of all Blessings)
//   [Poisoned Relief]    — src/engine/defense/low-resource-model.js (Injury Buffer at Low Life)
//   [Barrier of Radiance]— no damage effect (Quality of life)
// Name-read cores (core audit batch B1, research/core-talents-audit-2026-10-18.md §5; Q4, user-confirmed 2026-10-18): the
// clauses src/engine/talents/core-talent-model.js and src/engine/planner.js read by the core's name (Affliction, Subtle Impact, Indifference,
// True Flame, Fueling, Starfire's Ignite limit, Off The Beaten Track's Mana Multiplier) apply from a gear grant ("[Affliction] +30 Affliction inflicted per second")
// or a Pedigree of Gods slate core exactly as from the panel, once per core name: the planner adds the granted name to its
// core-name set (src/engine/planner.js grantedCoreNames) and these clauses keep their bracket, so no text reader counts them a second
// time. Other clauses of a granted core (Starfire's spread) are read as text like any granted line.
// Q-G5 (whether a granted core counts as a core for "core talent" lines) stays open.
export const DEDICATED_BRACKET_NAMES = new Set([
  "Stealth Stab",
  "Divine Grace",
  "Poisoned Relief",
  "Barrier of Radiance",
]);
export const NAME_READ_CORE_CLAUSES = new Map([
  ["Affliction", /^\+30 Affliction inflicted per second$|^\+30% additional Affliction effect$/i],
  ["Subtle Impact", /^\+30% additional Damage Over Time while Blur is active$/i],
  ["Indifference", /^\+1% additional damage and \+1% additional Minion Damage for every 5 remaining Energy/i],
  [
    "True Flame",
    /^When an enemy is Ignited ?, 65 ?% of the additional bonus to Damage Over Time taken from Affliction is also applied to your Fire Hit Damage$/i,
  ],
  ["Fueling", /^The Fire Resistance of enemies within 10 ?m is fixed at 0$/i],
  ["Starfire", /^\+1 Ignite limit$/i],
  // Off The Beaten Track's fixed 95% Support Mana Multiplier (src/engine/planner.js offTheBeatenTrack; its +4 Support Skill Level is text).
  ["Off The Beaten Track", /^Support Skill's Mana Multiplier is fixed at 95 ?%\.?$/i],
]);
const BRACKET = /^\[([^\]]+)\]\s*(.+)$/;

/** True when `body` is a clause that the core `name` applies by name (see NAME_READ_CORE_CLAUSES). */
export function isNameReadCoreClause(name, body) {
  const pattern = NAME_READ_CORE_CLAUSES.get(String(name || "").trim());
  return Boolean(
    pattern &&
    pattern.test(
      String(body ?? "")
        .replace(/\s+/g, " ")
        .trim(),
    ),
  );
}

/** { name, body } for a "[Name] body" line whose clause the core's name model reads (it keeps its bracket), else null. */
export function nameReadCoreGrant(text) {
  const match = String(text ?? "")
    .trim()
    .match(BRACKET);
  if (!match || !isNameReadCoreClause(match[1], match[2])) return null;
  return { name: match[1].trim(), body: match[2].trim() };
}

/** { name, body } for a "[Name] body" line whose prefix the intake strips, else null. */
export function grantedCoreLine(text) {
  const match = String(text ?? "")
    .trim()
    .match(BRACKET);
  if (!match || DEDICATED_BRACKET_NAMES.has(match[1].trim()) || isNameReadCoreClause(match[1], match[2])) return null;
  return { name: match[1].trim(), body: match[2].trim() };
}

/**
 * A gear row's lines with a name-read core's bracket carried onto its continuation lines: "[Affliction] +30 Affliction
 * inflicted per second" + "+30% additional Affliction effect" (one row, two lines) is one grant, so its second line is the core's too.
 */
export function carryNameReadBracket(lines) {
  const first = String(lines[0] ?? "")
    .trim()
    .match(BRACKET);
  if (!first || !NAME_READ_CORE_CLAUSES.has(first[1].trim())) return lines;
  const tag = `[${first[1].trim()}]`;
  return lines.map((line, index) =>
    index === 0 || BRACKET.test(line) || !isNameReadCoreClause(first[1], line) ? line : `${tag} ${line}`,
  );
}

/** The line with a strippable "[Name] " prefix removed (dedicated names keep theirs). */
export const stripGrantedCore = (text) => grantedCoreLine(text)?.body ?? text;

/**
 * Cores applied by name from outside the talent panel (core audit batch B1): Map core name → where it comes from ("<slate>
 * slate" or the gear item's name), from the modifier-text lines src/engine/text/modifier-texts.js tags `nameReadCore`. One entry per
 * name: a second grant of the same core, or the same core on the panel, adds nothing (Q4, user-confirmed 2026-10-18).
 */
export function grantedCoreNames(modifierTexts = []) {
  const names = new Map();
  for (const line of modifierTexts)
    if (line?.nameReadCore && line.grantedCore && !names.has(line.grantedCore))
      names.set(line.grantedCore, line.origin === "slate" ? `${line.source} slate` : String(line.source));
  return names;
}

/**
 * A slate affix with a Pedigree of Gods core's "Name — " lead removed ("Magister: Lv.2 Core Talent: Bunch — +1 to Max Focus
 * Blessing Stacks" → "Magister: Lv.2 Core Talent: +1 to Max Focus Blessing Stacks"), so the models that read slate affixes
 * through their "Class: <Talent type>:" prefix read a core's clauses like any talent's (core audit batch B1: Bunch's +1 Max
 * Focus Blessing Stacks moved from the panel but not from a slate).
 */
export const withoutSlateCoreName = (affix) => String(affix ?? "").replace(/(Core Talent:\s*)[A-Z][^—|·:]*? — /, "$1");

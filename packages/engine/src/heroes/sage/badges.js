// Sage's badge modules (packages/engine/src/heroes/hero-trait-modules.js reads them): the module table row, the trait lines it
// reads and its badge handler (packages/engine/src/heroes/sage/licorice-note.js sageLineRead).
import { sageClauseKey, sageLineRead } from "./licorice-note.js";

// Sage (B8; packages/engine/src/heroes/sage/licorice-note.js sageLineRead): each clause's status and its derived lines; the best-case switches once per call.
export function sageScentBadge(line, module, ctx) {
  const { heroId, state, entries, timedEffects, entry, derive, sage } = ctx;
  if (!sage.switched) {
    sage.switched = true;
    for (const item of state.sage?.switches || [])
      timedEffects.push({
        ...item,
        source: module.label,
        target: "self",
        toggle: true,
        provisional: true,
        parts: [],
      });
  }
  const read = sageLineRead(heroId, line.clean, state.sage || null, { revived: line.origin === "memory" });
  if (!read) {
    entry(line, { ...module, status: "Not modeled" }, false, "this clause is not read");
    return;
  }
  const active = read.status === "In calc";
  entries.push({
    source: line.source,
    origin: line.origin || "trait",
    text: line.clean,
    active,
    conditionText: `${module.label}: ${read.reason}`,
    status: read.status,
    provisional: true,
    bodies: read.bodies.map((body) => ({ body, derivedText: active ? body : null, readers: ["hero"] })),
    condition: "heroModule",
    group: null,
    module: module.key,
  });
  if (active) for (const body of read.bodies) derive(body, line.source, read.reason);
}

export const SAGE_MODULES = Object.freeze([
  // Sage – Licorice Note (hero trait audit B8, 2026-10-19; packages/engine/src/heroes/sage/licorice-note.js settles the state, packages/engine/src/combat-states.js runs the Basic
  // Scent Bottle's Elixir through the Elixir engine; this entry carries the badges and the Ingredient / prepared-skill / Elixir of
  // Immortality derived lines).
  {
    key: "sageScent",
    heroes: /^sage-licorice-note$/,
    label: "Sage: Scent Bottles",
    status: "Provisional",
    rule: "Hero trait audit B8 (provisional): the Basic Scent Bottle's Elixir (Hero → Scent) is an Elixir setup on the core-audit Elixir engine (uptime from Charging Progress: the build's lines plus the Functional Ingredient; the bottle-only +12% Artificial Moon line); its Damage Ingredients (scaled by its Elixir Skill Effect and Ingredient Effect: Razor Leaf while Critical Strikes land and Twinspine Flower at its uptime, Scattered Spore per cast), Pungent Stimulant Salt's prepared Empower / Curse bonus, Elixir of Immortality's Temporary Life from excess restoration, Scent of Ambition and Everlasting Nectar on Elixir Skill Effect, Omni-Elixir Side Effect and Basic Pharmacology Manuscript. The Special Scent Bottle has no selection in the planner (not modeled).",
    // Sage (B8): the trait clauses and the revived Omni-Elixir Side Effect / Basic Pharmacology Manuscript lines.
    lines: { test: (text) => Boolean(sageClauseKey(text) || sageClauseKey(text, { revived: true })) },
    badge: sageScentBadge,
  },
]);

// Bing's badge modules (packages/engine/src/heroes/hero-trait-modules.js reads them): each row of the module table, the trait
// lines it reads and its badge handler, for Blast Nova (Firepower Coverage) and Creative Genius (Whimsy).
import { bingClauseKey, bingLineRead, bingSwitches } from "./creative-genius.js";

// Bing – Blast Nova's Firepower Coverage (Q-H15): "Cannot use Main Skills" (applied in packages/engine/src/planner.js) and its switch.
export function firepowerBadge(line, module, ctx) {
  const { state, entries, timedEffects, carino } = ctx;
  const fire = state.firepowerCoverage || null;
  const on = state.requestedConditions?.bingFirepowerNoMain !== false;
  if (!carino.firepower) {
    carino.firepower = true;
    timedEffects.push({
      id: "bingFirepowerNoMain",
      label: "Firepower Coverage: Cannot use Main Skills (applied)",
      source: module.label,
      target: "self",
      toggle: true,
      provisional: true,
      enabled: on,
      active: Boolean(fire?.applied),
      summary: `${fire?.mainName || "the Main Skill"} deals no damage of its own; the bombs that replace it are not modeled (B12)`,
      reason: fire?.applied
        ? "the penalty is applied so the build does not read stronger than it is (Q-H15, provisional)"
        : on
          ? "no Main Skill"
          : "switched off: the Main Skill keeps its damage",
      parts: [],
    });
  }
  entries.push({
    source: line.source,
    origin: line.origin || "trait",
    text: line.clean,
    active: Boolean(fire?.applied),
    conditionText: `${module.label}: ${fire?.applied ? `applied (Q-H15, provisional): ${fire.mainName} deals no damage of its own; the bombs that replace it are not modeled (hero trait audit B12)` : !on ? "switched off (best-case assumptions): the Main Skill keeps its damage" : "no Main Skill in the build"}`,
    status: fire?.applied ? "In calc" : "Inactive",
    provisional: true,
    bodies: [],
    condition: "heroModule",
    group: null,
    module: module.key,
  });
}

// Bing – Creative Genius (B12; packages/engine/src/heroes/bing/creative-genius.js bingLineRead): each clause's status and its derived lines.
export function bingWhimsyBadge(line, module, ctx) {
  const { heroId, state, entries, timedEffects, entry, derive, bing } = ctx;
  if (!bing.switched) {
    bing.switched = true;
    for (const item of bingSwitches(state.bing))
      timedEffects.push({
        ...item,
        source: module.label,
        target: "self",
        toggle: true,
        provisional: true,
        parts: [],
      });
  }
  const read = bingLineRead(heroId, line.clean, state.bing || null, { revived: line.origin === "memory" });
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

export const BING_MODULES = Object.freeze([
  // Bing – Blast Nova's Firepower Coverage (open question Q-H15, recommended reading; the bombs are batch B12).
  {
    key: "firepower",
    heroes: /^bing-blast-nova$/,
    label: "Bing: Firepower Coverage",
    status: "Provisional",
    rule: 'Q-H15 recommended reading (provisional): "Cannot use Main Skills" is applied, so the Main Skill deals no damage of its own; the bombs that replace it are not modeled (hero trait audit B12). Best-case switch: off keeps the Main Skill\'s damage.',
    lines: /^Cannot use Main Skills$/i,
    badge: firepowerBadge,
  },
  // Bing – Creative Genius's Whimsy side (hero trait audit B12, first part; packages/engine/src/heroes/bing/creative-genius.js settles the state).
  {
    key: "bingWhimsy",
    heroes: /^bing-creative-genius$/,
    label: "Bing: Whimsy",
    status: "Provisional",
    rule: "Whimsy Explosions each time Whimsy Essence reaches 100 (20 per second × (1 + Whimsy Essence Recovery Speed)) while a skill deals Spell Damage, plus Flash of Brilliance's procs (1 ÷ (interval + 1 ÷ (chance × Main Skill uses))). Whimsy Signal on the dummy (20%, Trouble Maker's value, × (1 + Whimsy Signal Effect)) up min(1, 5 s × explosions per second); Whimsy (Mind Domain) held at max standing in the energy field (best-case switch) while a field comes within 10 s, each stack 5% × (1 + Whimsy Effect), multiplying. Ingenuity Overload is not modeled yet.",
    // Bing – Creative Genius (B12, first part): every clause packages/engine/src/heroes/bing/creative-genius.js reads, Genius Idea Generator's first line
    // included; the Spell Burst hit line and Multi-Coupling Equation's Max Spell Burst stay with the generic readers.
    lines: { test: (text) => Boolean(bingClauseKey(text) || bingClauseKey(text, { revived: true })) },
    badge: bingWhimsyBadge,
  },
]);

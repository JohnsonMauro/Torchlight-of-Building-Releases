// Thea's badge modules (packages/engine/src/heroes/hero-trait-modules.js reads them): each row of the module table, the trait
// lines it reads and the badge handler they share (packages/engine/src/heroes/thea/traits.js theaLineRead).
import { WISDOM, INCARNATION, BLASPHEMER, theaClauseKey } from "./trait-lines.js";
import { theaLineRead, theaSwitches } from "./traits.js";

// Thea (B7; packages/engine/src/heroes/thea/traits.js theaLineRead): each clause's status, its derived lines and its clocked parts.
export function theaBadge(line, module, ctx) {
  const { heroId, entries, timedEffects, entry, derive, thea } = ctx;
  if (!thea.switched) {
    thea.switched = true;
    for (const item of theaSwitches(thea.state))
      timedEffects.push({
        ...item,
        source: module.label,
        target: "self",
        toggle: true,
        provisional: true,
        parts: [],
      });
  }
  const read = theaLineRead(heroId, line.clean, thea.state);
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
    group: read.group || null,
    module: module.key,
  });
  if (active) {
    for (const body of read.bodies) derive(body, line.source, read.reason);
    for (const effect of read.timed || [])
      if (!timedEffects.some((item) => item.id === effect.id))
        timedEffects.push({ source: line.source, provisional: true, ...effect });
  }
}

export const THEA_MODULES = Object.freeze([
  // Thea (hero trait audit B7, 2026-10-19; packages/engine/src/heroes/thea/traits.js settles the states, packages/engine/src/defense/blessing-model.js applies the Blessing rules,
  // packages/engine/src/planner.js the Focus God's Boon consumes and the Divine Realm position; these entries carry the badges, the derived lines and
  // the clocked parts).
  {
    key: "theaWisdom",
    heroes: /^thea-wisdom-of-the-gods$/,
    label: "Thea: God's Boon",
    status: "Provisional",
    rule: "Q-H3 recommended reading (provisional): a Divine Blessing every 2 s (Focus → Agility → Tenacity, a stack of each every 6 s), held at max stacks; God's Boon cast at max Focus every max(15 s ÷ (1 + its Cooldown Recovery Speed), Max Focus × 6 s), consuming every Focus stack (Focus refills one stack per 6 s: its time average; another Focus gain source refills it at once); its buffs (game data buff 82115: 10 s) at uptime min(1, 10 s ÷ that interval): Wisdom's +52%, Predicted Reincarnation's and Farewell Prophecy's per-Focus stacks (+1 stack limit with Prophecy of Purity), The Place of Oracle's +2% per Tenacity / Agility stack; Prophecy of Revelation and Punishment for the share of the cycle their Focus condition holds. The 5 s / 20 s windows cast God's Boon at t = 0 (own buffs built).",
    // Divine Spirit's "… for every 3% Missing Life when outside the Divine Realm" lines are plain Missing Life readers (packages/engine/src/text/line-conditions.js
    // perLifeLost; hero trait audit B2), not the Realm cycle.
    lines: { test: (text) => Boolean(theaClauseKey(WISDOM, text)) },
    badge: theaBadge,
  },
  {
    key: "theaIncarnation",
    heroes: /^thea-incarnation-of-the-gods$/,
    label: "Thea: Divine Realm",
    status: "Provisional",
    rule: 'Divine Realm (8 s, 8 s cooldown) pressed on cooldown (Trait Skill switch) or Prepared by a trait, cast on the dummy: uptime 1 from t = 0. Standing inside or outside it is the "Divine Realm position" choice (default outside, compared by damage): outside, Tenacity converts to Agility and Tenacity\'s max-stack change applies to Agility; within, the reverse. The Blessings are held at max (Q-H3). Q-H9 recommended reading: the dummy never loses Life, but Incarnation deems it at Low Life 6.5 s of every 10 s ("enemies at Low Life" lines at that share). Provisional.',
    lines: { test: (text) => Boolean(theaClauseKey(INCARNATION, text)) },
    badge: theaBadge,
  },
  {
    key: "theaBlasphemer",
    heroes: /^thea-blasphemer$/,
    label: "Thea: Desecration",
    status: "Provisional",
    rule: "Desecration (TLIDB keyword: +15% additional Erosion Damage taken per stack, multiplies; initial max 3; 5 s) inflicted on the dummy on every Blessing gain (every 2 s; the Trait Skill ignores its cooldown) or on its 5 s cooldown when pressed, ⌈max ÷ 3⌉ stacks each, refreshing the shared duration: max stacks held from the 3rd application (the dummy starts clean). Increases to Max Blessing Stacks become decreases and Max Desecration Stacks (up to 4 per type; Extreme Desecration: the rest once every max is 0, up to 25). Sacrificial Pawn (+10% Erosion Damage taken, a crowd control type), Mountain of Sins (-20% Erosion Resistance, read as Penetration), Tarnished Sage's speed and Inverted Shrine's +50% held while the dummy is Desecrated. Provisional.",
    lines: { test: (text) => Boolean(theaClauseKey(BLASPHEMER, text)) },
    badge: theaBadge,
  },
]);

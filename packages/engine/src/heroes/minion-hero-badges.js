// Moto's and Iris's badge modules (packages/engine/src/heroes/hero-trait-modules.js reads them): each row of the module table, the
// trait lines it reads and the badge handler they share (packages/engine/src/heroes/minion-heroes.js b6LineStatus).
import { b6ClauseKey, b6LineStatus, b6Switches } from "./minion-heroes.js";
import { ORDER_CALLING } from "./moto/order-calling.js";
import { CHARGE_CALLING } from "./moto/charge-calling.js";
import { GROWING_BREEZE } from "./iris/growing-breeze.js";
import { VIGILANT_BREEZE } from "./iris/vigilant-breeze.js";

// Moto / Iris (B6; packages/engine/src/heroes/minion-heroes.js b6LineStatus): each clause's status from state.motoIris (settled after the Minions).
export function minionHeroBadge(line, module, ctx) {
  const { heroId, state, entries, timedEffects, entry, b6 } = ctx;
  if (!b6.switched) {
    b6.switched = true;
    for (const item of b6Switches(state.motoIris))
      timedEffects.push({
        ...item,
        source: module.label,
        target: "self",
        toggle: true,
        provisional: true,
        parts: [],
      });
  }
  const read = b6LineStatus(heroId, line.clean, state.motoIris);
  if (!read) {
    entry(line, { ...module, status: "Not modeled" }, false, "this clause is not read");
    return;
  }
  entries.push({
    source: line.source,
    origin: line.origin || "trait",
    text: line.clean,
    active: read.status === "In calc",
    conditionText: `${module.label}: ${read.reason}`,
    status: read.status,
    provisional: true,
    bodies: [],
    condition: "heroModule",
    group: null,
    module: module.key,
  });
}

export const MINION_HERO_MODULES = Object.freeze([
  // Moto and Iris (hero trait audit B6, 2026-10-19; packages/engine/src/heroes/minion-heroes.js settles the states, packages/engine/src/minions/minion-damage-model.js applies
  // them to the Minions; these entries carry the badges, from state.motoIris, settled after the Minion pass in packages/engine/src/planner.js).
  {
    key: "overload",
    heroes: /^moto-order-calling$/,
    label: "Moto: Overload",
    status: "Provisional",
    rule: "Q-H8 recommended reading (provisional): Overload held at uptime 1 on every Minion while a Summon Skill is recast within every 12 s (best-case switch); +60% additional damage × Overload Effect (Charge Forward's Command share, All In's first-gain bonus held, Overload Program's, Machine's Joy's stacks, and the player's Empower Skill Effect bonuses: keyword Overload), the Overloaded Minion lines (+22%, Self-Reconstruct, Veteran's speed); duration lines change no dummy figure.",
    // Moto / Iris (B6): the clauses packages/engine/src/heroes/minion-heroes.js reads for each loadout.
    lines: { test: (text) => Boolean(b6ClauseKey(ORDER_CALLING, text)) },
    badge: minionHeroBadge,
  },
  {
    key: "chargeCalling",
    heroes: /^moto-charge-calling$/,
    label: "Moto: Charge Calling",
    status: "Provisional",
    rule: 'Charge Calling pressed on cooldown (6 s / 6 s, the Trait Skill switch): every summon cast creates 1 + 1 Synthetic Troop Minions that self-destruct 1 s later (keyword Self-Destruct Protocol: 115% of Base Damage, Physical Attack), at most the quantity + 1 alive; Fuel War with War triggers the Main Summon Skill; Mechanical Parts (drop chance × explosions, "recently" 4 s), Heroic Sacrifice (troop Life = 5 × Base Damage + Peril of Synthetic Troops), Guerilla Tactics, Essential Speed. The explosion loop replaces the troops\' own attacks where it deals more (best case; provisional).',
    lines: { test: (text) => Boolean(b6ClauseKey(CHARGE_CALLING, text)) },
    badge: minionHeroBadge,
  },
  {
    key: "irisGrowing",
    heroes: /^iris-growing-breeze$/,
    label: "Iris: Growing Breeze",
    status: "Provisional",
    rule: "Nourishment's shares (100% of your Empower Skill Effect bonus, Grow With Them's Origin share), Socialite's extra Magus, Full Bloom at every 10 stacks granted with the Ultimate in the cycle (8 s initial cooldown, keyword Full Bloom), Windrider's channel (keyword Windrider), and the revived Nourishing Spring Rain / Nature's Party (provisional).",
    lines: { test: (text) => Boolean(b6ClauseKey(GROWING_BREEZE, text)) },
    badge: minionHeroBadge,
  },
  {
    key: "irisVigilant",
    heroes: /^iris-vigilant-breeze$/,
    label: "Iris: Vigilant Breeze",
    status: "Provisional",
    rule: "Q-H13 recommended reading (provisional): the Vigilant state held (best-case switch), Breeze at its max on the Merged Magus (+16% additional damage per stack, keyword Breeze), Growth +6 per Breeze with the moon, the Merged Magus's Ultimate unlocked (8 s; none with Whirlwind Tango), Happiest Reunion, Merging Stream's Origins on the Magi, Soft Storm and Blowing Breeze; Reconjuring breaks ignored.",
    lines: { test: (text) => Boolean(b6ClauseKey(VIGILANT_BREEZE, text)) },
    badge: minionHeroBadge,
  },
]);

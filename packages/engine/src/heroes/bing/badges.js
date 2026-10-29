// Bing's badge modules (packages/engine/src/heroes/hero-trait-modules.js reads them): each row of the module table, the trait
// lines it reads and its badge handler, for Blast Nova (Firepower Coverage) and Creative Genius (Whimsy).
import { bingClauseKey, bingLineRead, bingSwitches } from "./creative-genius.js";
import { blastNovaClauseKey } from "./blast-nova.js";

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
      summary: fire?.bombs
        ? `${fire.mainName} throws the bombs (Blast Nova's bomb model): nothing is removed`
        : `${fire?.mainName || "the Main Skill"} deals no damage of its own; it throws no bombs (not an Attack Projectile skill)`,
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
    conditionText: `${module.label}: ${fire?.bombs ? `${fire.mainName} throws bombs automatically: its uses are the bombs (Blast Nova's bomb model, provisional)` : fire?.applied ? `applied (Q-H15, provisional): ${fire.mainName} deals no damage of its own and throws no bombs (not a Non-channeling, Non-Sentry Attack Projectile skill)` : !on ? "switched off (best-case assumptions): the Main Skill keeps its damage" : "no Main Skill in the build"}`,
    status: fire?.applied || fire?.bombs ? "In calc" : "Inactive",
    provisional: true,
    bodies: [],
    condition: "heroModule",
    group: null,
    module: module.key,
  });
}

// Bing – Blast Nova's bombs (packages/engine/src/heroes/bing/blast-nova.js; the hit model applies them to the Main Skill): each bomb
// clause's status, and Bing's Big Bang Pack's Spare Bombs.
const BOMB_READING = {
  bombs: "the Main Skill's uses are bombs",
  detonate: "each bomb is one use of the Main Skill's projectiles on the dummy (the bomb lands at it)",
  limit: "the bomb limit sets Phantom Delivery's count",
  throwBase: "the throws per second from this base",
  attackSpeedShare: "the throws follow the Main Skill's Attack Speed bonus",
  bombDamage: "additional damage on every bomb",
  runaway: "held at its cap: bombs are thrown without pause",
  barrage: "the expected extra bombs per throw",
  throwSpeedMoving: "the Moving condition sets it",
  throwSpeed: "additional throws per second",
  phantom: "at the bomb limit: the bombs wait for it",
  hound: "the bomb lands at the dummy",
  spare: "Spare Bombs from the bomb's crit chance, one generation",
};
export function blastNovaBadge(line, module, ctx) {
  const { state, entry } = ctx;
  const bombs = state.blastNova || null;
  const key = blastNovaClauseKey(line.clean);
  const active = Boolean(bombs?.mainThrowsBombs);
  entry(
    line,
    module,
    active,
    active
      ? `${bombs.mainName}: ${BOMB_READING[key] || "read by the bomb model"} (${bombs.bombsPerThrow} bombs per throw; provisional, the written text)`
      : `${bombs?.mainName || "the Main Skill"} is not a Non-channeling, Non-Sentry Attack Projectile skill: it throws no bombs`,
  );
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
  {
    key: "blastNova",
    heroes: /^bing-blast-nova$/,
    label: "Bing: Blast Nova bombs",
    status: "Provisional",
    rule: "Blast Nova (the written text, provisional): a Non-channeling, Non-Sentry Attack Projectile Main Skill throws 2 bombs per throw (Blast Barrage's chance of +2) at 1 throw per second × its Attack Speed bonus × the additional Bomb Throwing Speed lines (Firepower Coverage's while moving, Radiation Effect's); each bomb is one use of the skill's projectiles on the dummy, at the additional Bomb Damage, Dangerous Runaway's cap, Phantom Delivery at the 10-bomb limit and Frenzy Hound. Bing's Big Bang Pack: 3 Spare Bombs per bomb with 35% of its crit chance each, at -60% additional damage, one generation.",
    lines: { test: (text) => Boolean(blastNovaClauseKey(text)) },
    badge: blastNovaBadge,
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

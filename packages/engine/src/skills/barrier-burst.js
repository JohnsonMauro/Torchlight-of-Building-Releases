// Necklace of Firebird's Barrier Burst (owner's Bing build, 2026-10-27; provisional, every reading below from the item and
// keyword texts, not measured in game):
// - "Replaces the Main Skill with Lv. N Barrier Burst" and "When you have a Barrier, triggers the Main Skill upon taking
//   damage, then removes Barrier": one Barrier Burst per Barrier, fired as soon as damage is taken while it is up.
// - Requirements read from the build: a Barrier source (the planner's list, packages/engine/src/defense/barrier-sources.js:
//   Guard, "for every X m you move") and damage the character deals itself ("Takes N True Damage every …" /
//   "when casting a skill").
// - Barrier (keyword "Barrier"): "Gains a Shield equal to 20% of the sum of Max Life and Max Energy Shield"; "+X% Barrier
//   Shield" lines add (increased), "+X% additional Barrier Shield" lines multiply (the game's attribute screen shows the
//   two totals: 112% and 20% on the owner's build, matching the lines). A movement Barrier is gained while moving, so
//   "+X% additional Max Energy Shield while moving" lines multiply the Energy Shield it reads.
// - Barrier Burst: "Deals Spell Fire Damage equal to 75% of Barrier Rating to nearby enemies"; "can activate Spell Burst when
//   triggered" (so the trigger does not block Spell Burst; owner, 2026-10-27: each activation consumes a full Spell Burst).
// - Uses per second: one per Barrier gained. A movement Barrier ("for every X m you move") gains them at the character's
//   Movement Speed (the build moves to gain it, owner 2026-10-29); without one, 1 per second (an assumption, said in the
//   notes). The Composition dialog's input (combat.barrierBurstsPerSecond) replaces either.
import { normalizePercentageText } from "../text/percentage-text.js";
import { buildSkillHitProfile } from "./skill-hit-profiles.js";
import { BASE_MOVEMENT_METERS_PER_SECOND, movementBarriersPerSecond } from "../defense/barrier-sources.js";

export const BARRIER_BURST_DEFAULT_PER_SECOND = 1;
const BARRIER_OF_POOLS = 0.2;
const BURST_OF_BARRIER = 0.75;

const TRIGGER = /^When you have a Barrier ?, triggers the Main Skill upon taking damage, then removes Barrier$/i;
const GRANT = /^Replaces the Main Skill with Lv\. (\d+) Barrier Burst$/i;
const SELF_DAMAGE = /^Takes [\d.]+ True Damage (?:every [\d.]+ ?s|when casting a skill)/i;
const BARRIER_INCREASED = /^([+-][\d.]+)% Barrier Shield$/i;
const BARRIER_ADDITIONAL = /^([+-][\d.]+)% additional Barrier Shield$/i;
const ES_WHILE_MOVING = /^([+-][\d.]+)% additional Max Energy Shield while moving$/i;

const clean = (text) =>
  normalizePercentageText(String(text || ""))
    .replace(/^\[[^\]]+\]\s*/, "")
    .trim();
/** Every clause of the build's lines, with its source and its multiplier. */
const clauses = (modifierTexts) =>
  modifierTexts.flatMap((line) =>
    String(line.text || "")
      .split(/\r?\n/)
      .map((text) => ({
        text: clean(text),
        source: line.source,
        multiplier: line.multiplier ?? 1,
        original: line.text,
      })),
  );

/**
 * The Barrier Burst trigger of the build, or null without Necklace of Firebird's lines: its requirements (each with the
 * sources found), the Barrier, the damage of one Burst and its uses per second.
 */
export function barrierBurstState({
  modifierTexts = [],
  maxLife = 0,
  maxEnergyShield = 0,
  barrierSources = [],
  usesPerSecond = null,
  movementSpeedPercent = 0,
} = {}) {
  const lines = clauses(modifierTexts);
  const trigger = lines.find((line) => TRIGGER.test(line.text));
  const grant = lines.map((line) => line.text.match(GRANT)).find(Boolean);
  if (!trigger || !grant) return null;
  const selfDamage = lines.filter((line) => SELF_DAMAGE.test(line.text));
  const requirements = [
    {
      label: "A Barrier source",
      ok: barrierSources.some((source) => source.available),
      sources: barrierSources.map((source) => `${source.source}: ${source.text || source.trigger}`),
      missing: barrierSources.some((source) => source.available)
        ? ""
        : "no Barrier source (Guard on a channeled skill, a movement Barrier)",
    },
    {
      label: "Damage taken while the Barrier is up",
      ok: selfDamage.length > 0,
      sources: selfDamage.map((line) => `${line.source}: ${line.text}`),
      missing: selfDamage.length ? "" : "no line deals damage to the character (the dummy never attacks)",
    },
  ];
  const sum = (pattern) =>
    lines.reduce((total, line) => {
      const match = line.text.match(pattern);
      return total + (match ? Number(match[1]) * line.multiplier : 0);
    }, 0);
  const increasedPercent = sum(BARRIER_INCREASED);
  const additionalFactor = lines.reduce((product, line) => {
    const match = line.text.match(BARRIER_ADDITIONAL);
    return match ? product * (1 + (Number(match[1]) * line.multiplier) / 100) : product;
  }, 1);
  // A movement Barrier is gained while moving: its Shield reads the Max Energy Shield the character has while moving.
  const movesForBarrier = barrierSources.some((source) => source.movement && source.available);
  const movingShieldLines = movesForBarrier ? lines.filter((line) => ES_WHILE_MOVING.test(line.text)) : [];
  const movingShieldFactor = movingShieldLines.reduce(
    (product, line) => product * (1 + (Number(line.text.match(ES_WHILE_MOVING)[1]) * line.multiplier) / 100),
    1,
  );
  const pools = Math.max(0, maxLife) + Math.max(0, maxEnergyShield) * movingShieldFactor;
  const barrier = BARRIER_OF_POOLS * pools * Math.max(0, 1 + increasedPercent / 100) * additionalFactor;
  const moving = movementBarriersPerSecond(barrierSources, movementSpeedPercent);
  /** @type {"user" | "movement" | "assumed"} */
  const rateFrom = Number.isFinite(usesPerSecond) ? "user" : moving > 0 ? "movement" : "assumed";
  const rate =
    rateFrom === "user"
      ? Math.max(0, usesPerSecond)
      : rateFrom === "movement"
        ? moving
        : BARRIER_BURST_DEFAULT_PER_SECOND;
  // The build's lines this reads (their coverage badges: packages/engine/src/planner.js mechanics.recognized).
  const used = [
    trigger,
    ...lines.filter((line) => GRANT.test(line.text)),
    ...selfDamage,
    ...lines.filter((line) => BARRIER_INCREASED.test(line.text) || BARRIER_ADDITIONAL.test(line.text)),
    ...movingShieldLines,
  ];
  return {
    lines: [
      ...new Set([
        ...used.map((line) => line.original),
        ...barrierSources.filter((source) => source.text).map((source) => source.text),
      ]),
    ],
    active: requirements.every((item) => item.ok),
    requirements,
    level: Number(grant[1]),
    source: trigger.source,
    barrier: { pools, increasedPercent, additionalFactor, movingShieldFactor, value: barrier },
    damage: BURST_OF_BARRIER * barrier,
    usesPerSecond: rate,
    rateFrom,
    movementSpeed: {
      percent: movementSpeedPercent,
      metersPerSecond: BASE_MOVEMENT_METERS_PER_SECOND * Math.max(0, 1 + movementSpeedPercent / 100),
    },
  };
}

const levels = (row) => Object.fromEntries(Array.from({ length: 20 }, (_, index) => [String(index + 1), row]));

const rateNote = (state) =>
  state.rateFrom === "user"
    ? "set in Composition"
    : state.rateFrom === "movement"
      ? `moving at ${Math.round(state.movementSpeed.metersPerSecond * 100) / 100} m/s = ${BASE_MOVEMENT_METERS_PER_SECOND} m/s × (1 + ${state.movementSpeed.percent}% Movement Speed), the movement Barrier's distance; set yours in Composition`
      : "assumed; set yours in Composition";

/** Barrier Burst's hit profile at the build's Barrier: one Fire Spell hit of 75% of it per trigger. */
export function barrierBurstProfile(state, catalogEntry = {}) {
  const damage = Math.round(state.damage * 1e6) / 1e6;
  const profile = buildSkillHitProfile({
    name: "Barrier Burst",
    delivery: "spell-area",
    components: [
      {
        key: "barrier-burst",
        label: "Barrier Burst",
        groupId: "barrier-burst",
        group: {
          id: "barrier-burst",
          synthetic: "75% of Barrier",
          levels: levels({ kind: "hit", effectiveness: 100, entries: [{ type: "Fire", min: damage, max: damage }] }),
        },
        perUse: 1,
        basis: "text",
        note: "one area hit per trigger (the dummy nearby: best case)",
      },
    ],
    notes: [
      `Barrier Burst (Necklace of Firebird, provisional): 75% of the Barrier = 75% × 20% × (Max Life + Max Energy Shield ${Math.round(state.barrier.pools)}) × (1 + ${state.barrier.increasedPercent}% Barrier Shield) × ${Math.round(state.barrier.additionalFactor * 1000) / 1000} additional = ${Math.round(state.damage)} Fire per hit.`,
    ],
  });
  const tags = catalogEntry.tags || ["Spell", "Area", "Fire", "Strength", "Intelligence"];
  return Object.freeze({
    ...profile,
    tags,
    spell: true,
    mainStats: tags.filter((tag) => ["Strength", "Dexterity", "Intelligence"].includes(tag)),
    useModel: {
      kind: "rate",
      usesPerSecond: state.usesPerSecond,
      firstUseSeconds: state.usesPerSecond > 0 ? 1 / state.usesPerSecond : null,
      note: `one per Barrier gained: ${Math.round(state.usesPerSecond * 1000) / 1000}/s (${rateNote(state)})`,
    },
    // "This skill can activate Spell Burst when triggered" (its own text).
    spellBurstAllowed: true,
  });
}

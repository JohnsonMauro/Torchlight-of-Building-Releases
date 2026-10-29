// Bing – Blast Nova's bombs (hero trait audit B12; owner 2026-10-29: model what is written, provisional). Pure: reads the build's
// trait lines and Bing's Big Bang Pack revived line, and returns what the hit model applies to the Main Skill
// (packages/engine/src/skills/skill-hit-model.js heroEffects.blastNova) and the badges read (packages/engine/src/heroes/bing/badges.js).
// - "When using a Non-channeling or Non-Sentry Main Attack Projectile Skill, throw 2 bombs instead"; "Base Bomb Throwing Speed is 1
//   time per second"; "100% of the bonus and additional bonus to Attack Speed is also applied to Bomb Throwing Speed": the throws
//   follow the skill's own Attack Speed factor from a 1 s base, 2 bombs each (Blast Barrage: a chance of +2 Bomb Quantity).
// - "The bomb automatically detonates 1s after landing, firing Projectiles in all directions": each bomb is read as one use of the
//   Main Skill's projectiles on the dummy (the bomb lands at it; how many projectiles reach it is not written).
// - Bomb damage: "+X% additional Bomb Damage"; Dangerous Runaway's per-bomb stacks held at their cap (bombs are thrown without
//   pause); Phantom Delivery's per-bomb bonus at the 10-bomb limit (the bombs wait for it); Frenzy Hound with the dummy within 10 m
//   of the bomb (it lands at the dummy).
// - Firepower Coverage's "-X% additional Bomb Throwing Speed while moving" follows the Moving condition; Radiation Effect's
//   "+X% additional Bomb Throwing Speed" always.
// - Bing's Big Bang Pack (revived): "When bombs deal damage, they can generate 3 additional Spare Bomb(s), with a chance equal to 35%
//   of the bomb's Critical Strike Chance. -60% additional Spare Bomb Damage": one generation of Spare Bombs per bomb.
import { cleanBing } from "./creative-genius.js";

export const BLAST_NOVA = "bing-blast-nova";
const N = "([+-]?\\d+(?:\\.\\d+)?)";
export const BLAST_NOVA_PATTERNS = Object.freeze({
  bombs: /^When using a Non-channeling or Non-Sentry Main Attack Projectile Skill, throw (\d+) bombs instead$/i,
  detonate: /^The bomb automatically detonates [\d.]+ ?s after landing, firing Projectiles in all directions$/i,
  limit: /^There can be up to (\d+) undetonated bombs at the same time/i,
  throwBase: /^Base Bomb Throwing Speed is ([\d.]+) times? per second\.?$/i,
  attackSpeedShare:
    /^(\d+(?:\.\d+)?)% of the bonus and additional bonus to Attack Speed is also applied to Bomb Throwing Speed$/i,
  bombDamage: new RegExp(`^${N}% additional Bomb Damage$`, "i"),
  runaway: new RegExp(`^${N}% additional Bomb Damage for each bomb recently thrown, up to ${N}%$`, "i"),
  barrage: new RegExp(`^${N}% chance to \\+(\\d+) Bomb Quantity when throwing Bombs$`, "i"),
  throwSpeedMoving: new RegExp(`^${N}% additional Bomb Throwing Speed while moving$`, "i"),
  throwSpeed: new RegExp(`^${N}% additional Bomb Throwing Speed$`, "i"),
  phantom: new RegExp(
    `^${N}% additional damage for every bomb on the battlefield when the bombs detonate, up to ${N}% additional damage\\.?$`,
    "i",
  ),
  hound: new RegExp(`^${N}% additional damage to enemies within [\\d.]+ ?m around a bomb when it detonates$`, "i"),
  spare: new RegExp(
    `^When bombs deal damage, they can generate (\\d+) additional Spare Bomb\\(s\\), with a chance equal to ${N}% of the bomb's Critical Strike Chance\\. ${N}% additional Spare Bomb Damage$`,
    "i",
  ),
});
const BOMB_LIMIT_DEFAULT = 10;

const num = (text) => Number(String(text).replace("−", "-"));
const round = (value) => Math.round(value * 10000) / 10000;

/** The bomb clause key of a Blast Nova line (trait or Big Bang Pack), or null. */
export function blastNovaClauseKey(text) {
  const clean = cleanBing(text);
  return Object.keys(BLAST_NOVA_PATTERNS).find((key) => BLAST_NOVA_PATTERNS[key].test(clean)) || null;
}
/** Whether a revived (memory) line is Bing's Big Bang Pack's, read by the bomb model. */
export const blastNovaRevivedLine = (heroId, text) => heroId === BLAST_NOVA && blastNovaClauseKey(text) === "spare";

/** True when the setup throws bombs instead of attacking: a Non-channeling, Non-Sentry Attack Projectile skill. */
export function throwsBombs(tags = []) {
  const set = new Set(tags || []);
  return set.has("Attack") && set.has("Projectile") && !set.has("Channeled") && !set.has("Sentry");
}

/**
 * @param {object} p
 * @param {string} p.heroId the selected loadout
 * @param {object[]} p.modifierTexts the build's lines (trait lines origin "trait", the revived line origin "memory")
 * @param {boolean} p.moving the Moving condition (Firepower Coverage's throwing penalty)
 * @returns the bomb state, or null without Blast Nova's bomb line
 */
export function blastNovaBombState({ heroId = "", modifierTexts = [], moving = true } = {}) {
  if (heroId !== BLAST_NOVA) return null;
  const lines = modifierTexts
    .filter((line) => line && (line.origin === "trait" || line.origin === "memory") && !line.lineEffect)
    .map((line) => ({ source: line.source, text: cleanBing(line.text) }));
  const find = (key) =>
    lines.map((line) => ({ ...line, match: line.text.match(BLAST_NOVA_PATTERNS[key]) })).filter((line) => line.match);
  const base = find("bombs")[0];
  if (!base) return null;
  const limit = num(find("limit")[0]?.match[1] ?? BOMB_LIMIT_DEFAULT);
  const barrage = find("barrage")[0];
  const bombsPerThrow =
    num(base.match[1]) + (barrage ? (Math.min(100, num(barrage.match[1])) / 100) * num(barrage.match[2]) : 0);
  const throwsPerSecondBase = num(find("throwBase")[0]?.match[1] ?? 1);
  const speedLines = [
    ...find("throwSpeed").map((line) => ({ ...line, value: num(line.match[1]) })),
    ...(moving ? find("throwSpeedMoving").map((line) => ({ ...line, value: num(line.match[1]) })) : []),
  ];
  const throwFactor = speedLines.reduce((factor, line) => factor * Math.max(0, 1 + line.value / 100), 1);
  const additional = [
    ...find("bombDamage").map((line) => ({ source: line.source, text: line.text, value: num(line.match[1]) })),
    ...find("runaway").map((line) => ({
      source: line.source,
      text: `${line.text} (bombs thrown without pause: the cap)`,
      value: num(line.match[2]),
    })),
    ...find("phantom").map((line) => ({
      source: line.source,
      text: `${line.text} (${limit} bombs on the battlefield at the limit)`,
      value: Math.min(num(line.match[2]), num(line.match[1]) * limit),
    })),
    ...find("hound").map((line) => ({
      source: line.source,
      text: `${line.text} (the bomb lands at the dummy)`,
      value: num(line.match[1]),
    })),
  ].filter((line) => line.value);
  const spare = find("spare")[0];
  return {
    bombsPerThrow: round(bombsPerThrow),
    throwsPerSecondBase,
    throwFactor: round(throwFactor),
    limit,
    additional,
    spare: spare
      ? {
          source: spare.source,
          count: num(spare.match[1]),
          critSharePercent: num(spare.match[2]),
          additionalPercent: num(spare.match[3]),
        }
      : null,
  };
}

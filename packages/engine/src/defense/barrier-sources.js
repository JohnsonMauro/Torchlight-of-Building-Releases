import { cleanGameText } from "../text/percentage-text.js";

// Guard on a channeled skill grants Barrier. User-confirmed 2026-10-10: in the SS21 Selena build the
// Barrier from Guard is permanent, so it is treated as always available (no uptime factor). The planner
// lists it as an automatic condition in dummyRecount.assumptions (planner.js barrierAssumption).
export function guardBarrierSources(setups = []) {
  return setups
    .filter(
      (setup) =>
        setup.enabled !== false &&
        setup.tags?.includes("Channeled") &&
        setup.supports?.some((support) => support.name === "Guard" && support.enabled !== false),
    )
    .map((setup) => ({
      source: `Guard support · ${setup.name}`,
      trigger: "Every 5 uses of the supported skill",
      available: true,
    }));
}

// A line's game text without its "[Affix kind]" tag and "Talent: " labels (the shape effective-hp.js reads).
const labelFree = (text) =>
  cleanGameText(String(text || ""))
    .replace(/^\[[^\]]+\]\s*/, "")
    .replace(/^(?:[A-Z][\w' ]+: )+(?=\d)/, "");

// The character's base Movement Speed (game manual, as packages/engine/src/skills/max-spell-burst.js reads it; not checked in
// game): the speed is this × (1 + Movement Speed bonus).
export const BASE_MOVEMENT_METERS_PER_SECOND = 6.5;

/** Barriers per second a moving character gains from the movement sources, at a Movement Speed bonus in percent. */
export function movementBarriersPerSecond(sources, movementSpeedPercent) {
  const speed = BASE_MOVEMENT_METERS_PER_SECOND * Math.max(0, 1 + movementSpeedPercent / 100);
  return sources
    .filter((source) => source.movement && source.available && source.meters > 0)
    .reduce((sum, source) => sum + ((source.chancePercent / 100) * speed) / source.meters, 0);
}

// Barrier from movement: "100% chance to gain a Barrier for every 5 m you move" (Perishing Inferno Flame Ring). Owner,
// 2026-10-29: a build that carries it moves to gain it, so the line alone holds the Barrier (not the Moving condition).
export function movementBarrierSources(modifierTexts) {
  const sources = [];
  for (const line of modifierTexts) {
    if (line.origin === "derived") continue;
    const match = labelFree(line.text).match(
      /^(\d+(?:\.\d+)?)% chance to gain a Barrier for every ([\d.]+) ?m you move$/i,
    );
    if (match)
      sources.push({
        source: line.source,
        text: line.text,
        trigger: `${match[1]}% chance per ${match[2]} m moved (the build moves to gain it)`,
        available: true,
        movement: true,
        chancePercent: Number(match[1]),
        meters: Number(match[2]),
      });
  }
  return sources;
}

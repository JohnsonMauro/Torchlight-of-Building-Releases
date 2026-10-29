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
      });
  }
  return sources;
}

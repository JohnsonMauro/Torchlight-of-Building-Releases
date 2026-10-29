// World Within (Iris – Growing Breeze, Lv60; game affix 9009957 [1, 500, 1, 60]; hero trait audit B2, 2026-10-19): "For every 1%
// Fire, Cold, Lightning Resistance, or Erosion Resistance, or every 500 Armor, +1% chance for the corresponding Spirit Magi to use
// an Enhanced Skill, up to +60%". Each Magus reads its own element: Fire Magus ← Fire Resistance, Frost Magus ← Cold, Thunder Magus
// ← Lightning, Erosion Magus ← Erosion, Rock Magus ← Armor (the one non-elemental Magus). Provisional (open question
// iris-world-within-resistance): the resistance read is the effective one (capped at its maximum, negative read as 0), the Armor
// the stat-sheet pool without Aura buffs; steps are rounded down. The chance joins the Magus's Enhanced-skill chance
// (packages/engine/src/minions/minion-damage-model.js spiritMagusState) as a "+X% chance for Spirit Magi to use an Enhanced Skill" line for that Magus.

export const WORLD_WITHIN_LINE =
  /^For every (\d+(?:\.\d+)?) ?% Fire, Cold, Lightning Resistance, or Erosion Resistance, or every (\d+) Armor, \+?(\d+(?:\.\d+)?) ?% chance for the corresponding Spirit Magi to use an Enhanced Skill ?, up to \+?(\d+(?:\.\d+)?) ?%$/i;
export const WORLD_WITHIN_MAGUS_STAT = Object.freeze({
  "Fire Magus": "Fire",
  "Frost Magus": "Cold",
  "Thunder Magus": "Lightning",
  "Erosion Magus": "Erosion",
  "Rock Magus": "Armor",
});
const round = (value) => Math.round(value * 10000) / 10000;

/** The line's numbers ({ every, armorEvery, per, cap }) or null. */
export function parseWorldWithin(text) {
  const match = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .match(WORLD_WITHIN_LINE);
  return match
    ? { every: Number(match[1]), armorEvery: Number(match[2]), per: Number(match[3]), cap: Number(match[4]) }
    : null;
}

/** The chance each Magus gains: { [magus]: { stat, value, chance } } from { resistances: { Fire, Cold, … }, armor }. */
export function worldWithinChances(params, { resistances = {}, armor = 0 } = {}) {
  const out = {};
  for (const [magus, stat] of Object.entries(WORLD_WITHIN_MAGUS_STAT)) {
    const value = Math.max(0, stat === "Armor" ? Number(armor) || 0 : Number(resistances[stat]) || 0);
    const steps = Math.floor(value / (stat === "Armor" ? params.armorEvery : params.every) + 1e-9);
    out[magus] = { stat, value: round(value), chance: Math.min(params.cap, steps * params.per) };
  }
  return out;
}

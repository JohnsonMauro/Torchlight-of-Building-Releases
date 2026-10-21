// What a piece of gear can carry by its slot and type: Equipment Energy (and its cap by item level) and TOWER Sequences.
// Pure; used by the crafter (src/app/gear/equipment-craft.ts) and the planner (src/app/gear/gear-controller.js).
import { towerSequencesSs13 } from "../../data/gear/tower-sequences-ss13.generated.js";

export function equipmentEnergyAllowed(slot) {
  return !["necklace", "belt", "leftRing", "rightRing"].includes(slot);
}
export function maxEquipmentEnergy(itemLevel, slot, base = "") {
  if (!equipmentEnergyAllowed(slot)) return 0;
  const level = Number(itemLevel);
  const singleHandCaps = [0, 9, 12, 15, 18, 21, 34, 48, 61];
  const band = Number.isFinite(level) && level >= 45 ? Math.min(8, Math.floor((level - 45) / 5) + 1) : 0;
  const twoHanded =
    slot === "chest" ||
    [
      "Two-Handed Sword",
      "Two-Handed Hammer",
      "Two-Handed Axe",
      "Tin Staff",
      "Cudgel",
      "Bow",
      "Crossbow",
      "Musket",
      "Fire Cannon",
    ].includes(base);
  return singleHandCaps[band] * (twoHanded ? 2 : 1);
}
export function towerSequencesForType(type) {
  return towerSequencesSs13.filter((entry) => entry.weaponType === type);
}
export function towerSequenceById(id) {
  return towerSequencesSs13.find((entry) => entry.id === id);
}

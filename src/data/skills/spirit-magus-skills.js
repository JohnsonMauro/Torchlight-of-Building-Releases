// The skills each Spirit Magus uses (TLIDB, the Summon <element> Magus pages' "Minion Skill" line and each skill's own page,
// fetched 2026-10-22, SS14): their tags, and how they deal damage: a hit (the game's Hit tag) or Persistent damage over
// time (Blazing Spin's Fire Domain: the game's Damage Over Time tag); Thundercloud Surge, Gold Rush and Withering Payback
// only grant a buff. Not generated: upstream's eligibility data (support-eligibility-ss13.generated.js)
// has no stone record for them. src/engine/supports/support-compatibility.js reads them for the supports a summon takes.
export const spiritMagusSkills = {
  "Summon Fire Magus": [
    { name: "Blazing Dance", tags: ["Spell", "Fire", "Area"], hit: true },
    { name: "Blazing Spin", tags: ["Spell", "Fire", "Area", "Persistent"], hit: false, damageOverTime: true },
    { name: "Blazing Incineration", tags: ["Spell", "Fire", "Area"], hit: true },
    { name: "Molten Rising", tags: ["Spell", "Fire", "Area"], hit: true },
  ],
  "Summon Frost Magus": [
    { name: "Glacier Ripples", tags: ["Spell", "Cold", "Area"], hit: true },
    { name: "Frost Release", tags: ["Spell", "Cold", "Area", "Persistent"], hit: true },
    { name: "Permafrost Cast", tags: ["Spell", "Cold", "Area"], hit: true },
    { name: "Ice Earthshaker", tags: ["Spell", "Cold", "Area"], hit: true },
  ],
  "Summon Thunder Magus": [
    { name: "Lightning Star", tags: ["Attack", "Lightning", "Projectile", "Ranged", "Horizontal"], hit: true },
    { name: "Thundercloud Surge", tags: ["Attack", "Lightning", "Persistent"], hit: false },
    { name: "Thunderlight Arrow", tags: ["Attack", "Lightning", "Projectile", "Ranged", "Horizontal"], hit: true },
    { name: "Lightning Surge", tags: ["Attack", "Lightning", "Projectile", "Ranged", "Chain", "Horizontal"], hit: true },
  ],
  "Summon Rock Magus": [
    { name: "Shattered Stone", tags: ["Attack", "Melee", "Physical", "Area"], hit: true },
    { name: "Gold Rush", tags: ["Attack", "Physical", "Area", "Persistent"], hit: false },
    { name: "Rock Blast", tags: ["Attack", "Melee", "Physical", "Area"], hit: true },
    { name: "Towering Mountains", tags: ["Attack", "Melee", "Physical", "Area"], hit: true },
  ],
  "Summon Erosion Magus": [
    { name: "Scattered Mud", tags: ["Spell", "Erosion", "Area"], hit: true },
    { name: "Withering Payback", tags: ["Spell", "Erosion", "Area", "Persistent"], hit: false },
    { name: "Bleak Grass", tags: ["Spell", "Erosion", "Area"], hit: true },
    { name: "World of Thorns", tags: ["Spell", "Erosion", "Area"], hit: true },
  ],
};

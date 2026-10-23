// The game's gear groups, as the crafters browse them: a group (Helmet, Trinket, One-Handed…) holds entries, each an item
// type of crafting-catalog-ss14.js craftItemTypes. Source: the owner's tli-builds gear index (src/data/gear/index.js,
// legendary/<group>/<entry>), user-supplied 2026-10-21. Its "special" entry of the armour groups and Shield (legendary
// items without an attribute) belongs to the Legendary crafter, not here; its separate "tin" and "staff" folders (both
// empty) are this catalogue's Tin Staff.
const attributes = (kind) => ["STR", "DEX", "INT"].map((attribute) => ({ label: attribute, type: `${attribute} ${kind}` }));
const named = (types) => types.map((type) => ({ label: type, type }));

export const gearGroupsSs14 = [
  { id: "helmet", label: "Helmet", entries: attributes("Helmet") },
  { id: "chest-armor", label: "Chest Armor", entries: attributes("Chest Armor") },
  { id: "gloves", label: "Gloves", entries: attributes("Gloves") },
  { id: "boots", label: "Boots", entries: attributes("Boots") },
  { id: "shield", label: "Shield", entries: attributes("Shield") },
  { id: "trinket", label: "Trinket", entries: named(["Necklace", "Ring", "Belt", "Spirit Ring"]) },
  {
    id: "one-handed",
    label: "One-Handed",
    entries: named([
      "Claw", "Dagger", "One-Handed Sword", "One-Handed Hammer", "One-Handed Axe", "Wand", "Rod", "Scepter", "Cane",
      "Pistol",
    ]),
  },
  {
    id: "two-handed",
    label: "Two-Handed",
    entries: named([
      "Two-Handed Sword", "Two-Handed Hammer", "Two-Handed Axe", "Tin Staff", "Cudgel", "Bow", "Crossbow", "Musket",
      "Fire Cannon",
    ]),
  },
];

/** The group an item type belongs to, and its entry there; undefined for a type no group holds. */
export function gearGroupOfType(type) {
  for (const group of gearGroupsSs14) {
    const entry = group.entries.find((item) => item.type === type);
    if (entry) return { group, entry };
  }
  return undefined;
}

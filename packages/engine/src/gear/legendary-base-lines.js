// A Legendary item's base-item line (the stat printed under "Require lv" on its TLIDB page, from the "Base:" item).
// The planner's Legendary catalog (packages/engine/data/gear/legendary-gear.generated.js) is built from TLIDB's list page, which
// leaves this line out, so saved Legendary items carry only their affixes.
//
// Sources: the individual TLIDB item pages saved in research/tlidb-legendary-placeholders/ (2026-10-13) and
// https://tlidb.com/en/Crimson_Gash (read 2026-10-13: "Base: Obsidian Necklace", "+3 Intelligence").
// Game evidence (research/frost-terra-defense-compare-2026-10-13.md, UE_game.log ViewPlayer snapshot of the Frost Terra v2
// character): Total Life 2202.334 = (1337 + 110 Pantheon's Elegy) × 1.522 and Total Evasion 2356.9 = (198 + 1615 Lone
// Walker's Boots) × 1.3, both exact; Total Energy Shield 10952.598504 = 4023.732 × 2.722 needs Crimson Gash's +3 Intelligence
// (Magister "+2 Max Energy Shield per 5 Intelligence": 494 × 1.12 = 553.28 Intelligence).
//
// The armour pieces' base defence stays on a corroded item (Lone Walker's Boots carries the corrosion line "+16% Max Energy
// Shield" and still shows its +1615 gear Evasion). Whether a corrosion line replaces a jewellery base line (Max Life,
// attributes, resistance) is not sourced; packages/engine/src/engine.js drops a rare item's implicit when it has corrosion lines, and the
// same rule is kept here for those lines (provisional).
export const LEGENDARY_BASE_LINES = Object.freeze({
  "Bodhi Girdle": { base: "Wind Blade Waistguard", line: "+15 Max Life" },
  "Broken Sun Ring": { base: "Ripple Pendant", line: "+8 Dexterity" },
  "Chaotic Ending": { base: "Abyss Darkness Ring", line: "+3% Erosion Resistance" },
  "Crimson Gash": { base: "Obsidian Necklace", line: "+3 Intelligence" },
  "Dawn Break": { base: "Dragon Scale Waistguard", line: "+35 Max Life" },
  "Death's Touch": { base: "Ranger's Rusted Gauntlets", line: "+1920 gear Armor" },
  Enamor: { base: "God's Grace Girdle", line: "+18 Max Energy Shield" },
  "Evil Heart Armor": { base: "Eternal Night Stalker's Chestguard", line: "+1571 gear Evasion" },
  "False God's Skin": { base: "Flare Amulet", line: "+8 Strength" },
  "Futile Tradeoff": { base: "Footman's Chestguard", line: "+274 gear Armor" },
  "Imperial Iron Sentry": { base: "Long Night Sorcerer's Mask", line: "+146 gear Energy Shield" },
  "Lone Walker's Boots": { base: "Boots of Calamity", line: "+1615 gear Evasion" },
  "Pantheon's Elegy": { base: "Wayfarer Waistguard", line: "+110 Max Life" },
  "Pentagram Astrolabe": { base: "Sunlight Pendant", line: "+5 Dexterity" },
  Phantom: { base: "Obsidian Necklace", line: "+3 Intelligence" },
  "Providential Grace": { base: "All Magic Grip", line: "+120 gear Energy Shield" },
  "Verdant Steps": { base: "Long Night Sorcerer's Boots", line: "+146 gear Energy Shield" },
  "Warden's Breastpin": { base: "Lunar Corona Necklace", line: "+8 Intelligence" },
  "Wings of Light": { base: "Hands of Calamity", line: "+1615 gear Evasion" },
  // Weapon bases (Supreme Throne: Deception Scepter, Throat-Slasher: Scarlet River Claw) carry weapon base damage and stats that
  // the weapon model reads from its own base data; they are not listed here.
});

// Defence-pool base lines (Max Life, Max Energy Shield, gear Armor / Evasion / Energy Shield). These have no damage effect
// in the planner, so the defence view applies them. Attribute and resistance base lines would move damage or resistance
// figures and wait for the user's confirmation (see the defence compare note).
const DEFENSE_POOL = /^\+\d+(?:\.\d+)? (?:Max (?:Life|Energy Shield)|gear (?:Armou?r|Evasion|Energy Shield))$/i;
const ARMOUR_PIECE_DEFENSE = /^\+\d+(?:\.\d+)? gear (?:Armou?r|Evasion|Energy Shield)$/i;

/** The base line of a Legendary item ({ base, line } or null) when the item does not already carry it. */
export function legendaryBaseLine(item) {
  if (!item || item.rarity !== "legendary") return null;
  const entry = LEGENDARY_BASE_LINES[item.name];
  if (!entry) return null;
  const carried = [
    ...(item.modifiers || []),
    ...(item.legendaryModifiers || []),
    ...(item.implicitModifiers || []),
  ].map((text) => String(text).replace(/\s+/g, " ").trim().toLowerCase());
  if (carried.includes(entry.line.toLowerCase())) return null;
  const corroded = (item.corrosionModifiers || []).length > 0;
  if (corroded && !ARMOUR_PIECE_DEFENSE.test(entry.line)) return null;
  return entry;
}

/** Modifier-list lines (origin "gear") for the equipped Legendary items' defence-pool base lines. */
export function legendaryBaseDefenseLines(items = []) {
  const lines = [];
  for (const item of items) {
    const entry = legendaryBaseLine(item);
    if (entry && DEFENSE_POOL.test(entry.line))
      lines.push({
        text: entry.line,
        source: `${item.name} · base ${entry.base}`,
        origin: "gear",
        multiplier: 1,
        legendaryBase: true,
      });
  }
  return lines;
}

/** Every known base line of the equipped Legendary items that the defence view does not apply (attributes, resistances). */
export function legendaryBaseLinesNotApplied(items = []) {
  return items
    .map((item) => ({ item, entry: legendaryBaseLine(item) }))
    .filter(({ entry }) => entry && !DEFENSE_POOL.test(entry.line))
    .map(({ item, entry }) => ({ source: `${item.name} · base ${entry.base}`, text: entry.line }));
}

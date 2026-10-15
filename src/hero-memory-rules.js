export function traitLevelBonusForEnhancement(level) {
  const enhancement = Math.max(1, Math.min(50, Number(level) || 1));
  return enhancement >= 50 ? 3 : enhancement >= 30 ? 2 : 1;
}

// A memory's own "+N to Hero Trait Level" lines. The line is a Fixed Affix (tier 1, or the T0 "+2 to Hero Trait Level ·
// +3% additional damage"); fixed affixes are not reduced in the base trait slot (only the base stat and random affixes are,
// src/hero-memory-model.js), so the value counts in full.
// User-observed 2026-10-13 (Frost Terra character: base trait LV.3, The Cycle I Resist LV.5 "because the Memory of Progress
// is applied to it, which has the +2 hero trait levels"): a memory's "+N to Hero Trait Level" raises only the trait in the
// slot that memory sits in, never the other traits. `nonBase` (a 45 / 60 / 75 slot) also counts the memory's own
// "+N to Non-Base Hero Trait Level" (none on memories in the catalogs).
export function memoryOwnHeroTraitLevel(memory, { nonBase = false } = {}) {
  const pattern = nonBase ? /^\+(\d+) to (?:Non-Base )?Hero Trait Level$/i : /^\+(\d+) to Hero Trait Level$/i;
  return (memory?.fixedAffixes || []).flatMap((text) => String(text || "").split(/\s*·\s*|\n/))
    .reduce((sum, text) => sum + Number(text.replace(/\s+/g, " ").trim().match(pattern)?.[1] || 0), 0);
}

// A memory's trait level (user-approved rule 2026-10-13; research/google-ai-mode-answers-2026-10-13.md §1, from TLIDB
// Hero_Memories / Memory Upgrade and a Reddit thread; in-game: three Ultimate 50 memories in the 45 / 60 / 75 slots show
// LV.3 / LV.3 / LV.3): installing any memory gives level 1; enhancement 30 or higher gives 2; enhancement 50 gives 3. It goes
// by enhancement, not rarity (an Ultimate at 30–49 gives 2); rarity only caps the enhancement (Normal 10, Magic 20, Epic 30,
// Legendary 40, Ultimate 50), so only an Ultimate reaches 3. Not read from a stored traitLevelBonus.
export function memoryTraitLevel(memory) {
  if (!memory) return 0;
  const enhancement = clampMemoryEnhancement(memory.enhancementLevel, memory.rarity);
  return enhancement >= 50 ? 3 : enhancement >= 30 ? 2 : 1;
}

// Level of a 45 / 60 / 75 trait (user-stated rule 2026-10-13): it starts at 0 and stays inactive (level 0, no effect) until a
// hero memory is installed in its slot; then it is memoryTraitLevel + that same memory's own "+N to (Non-Base) Hero Trait
// Level" + `buildWide` (non-memory "+N to Hero Trait Level" / "+N to Non-Base Hero Trait Level" lines), max 5. Legacy states
// that carry only a memory name or a stored `memoryTraitLevels` value (no crafted item) count as installed at
// max(1, stored). `keys` are the slot keys to read, first match wins ("<heroId>:level45", then the bare "level45").
export function slotTraitLevel(hero = {}, keys = [], buildWide = 0) {
  const id = keys.map((key) => hero?.equippedMemoryIds?.[key]).find(Boolean);
  const memory = id ? (hero?.memoryInventory || []).find((item) => item.id === id) : null;
  let level;
  if (memory) level = memoryTraitLevel(memory);
  else {
    const stored = Number(keys.map((key) => hero?.memoryTraitLevels?.[key]).find((value) => value !== undefined && value !== null) || 0) || 0;
    const named = keys.some((key) => String(hero?.memories?.[key] || "").trim());
    if (!id && !named && stored <= 0) return 0;
    level = Math.max(1, stored);
  }
  return Math.max(1, Math.min(5, level + slotMemoryOwnTraitLevel(hero, ...keys) + (Number(buildWide) || 0)));
}

/** The own "+N to (Non-Base) Hero Trait Level" of the memory equipped in a 45 / 60 / 75 slot (first key that holds one). */
export function slotMemoryOwnTraitLevel(hero = {}, ...keys) {
  const id = keys.map((key) => hero?.equippedMemoryIds?.[key]).find(Boolean);
  const memory = id ? (hero?.memoryInventory || []).find((item) => item.id === id) : null;
  return memoryOwnHeroTraitLevel(memory, { nonBase: true });
}

// Base trait level (user-confirmed 2026-10-13): the base trait starts at 0; the base-slot memory gives memoryTraitLevel
// (1 / 2 / 3) plus that same memory's own "+N to Hero Trait Level" lines, max 5 (an Ultimate 50 with "+2 to Hero Trait Level"
// in the base slot: LV.5). "+N to Hero Trait Level" lines on memories in other slots or on gear do not raise it, nor does
// "+N to Non-Base Hero Trait Level" (Frost Terra build: +2 on the Lv75 memory, base trait LV.3).
// Without a base-slot memory it reads level 1 (user-approved rule 2026-10-13; research/google-ai-mode-answers-2026-10-13.md §1).
export function baseTraitLevelForMemory(memory) {
  if (!memory) return 1;
  return Math.max(1, Math.min(5, memoryTraitLevel(memory) + memoryOwnHeroTraitLevel(memory)));
}

export function baseTraitDescriptionForLevel(heroId, description) {
  return baseHeroTraitProgressionsSs13[heroId] || description;
}

export function memoryMaxEnhancementForRarity(rarity) {
  return { normal:10, common:10, magic:20, epic:30, legendary:40, ultimate:50 }[String(rarity || "").toLowerCase()] || 50;
}

export function clampMemoryEnhancement(level, rarity) {
  return Math.max(1, Math.min(memoryMaxEnhancementForRarity(rarity), Math.round(Number(level) || 1)));
}

export function memoryTierNumericValue(effect) {
  const match = String(effect || "").match(/[-+]?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function closestMemoryTier(tiers, value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return tiers.filter((entry) => memoryTierNumericValue(entry.effect) !== null)
    .sort((a,b) => Math.abs(memoryTierNumericValue(a.effect)-numeric)-Math.abs(memoryTierNumericValue(b.effect)-numeric))[0] || null;
}

export function memoryImplicitText(baseStat, waxAndWane = false) {
  if (!waxAndWane) return baseStat;
  const match = String(baseStat || "").match(/^([+-]?)(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return baseStat;
  const scaled = Math.round(Number(match[2]) * 130) / 100;
  return `${match[1]}${scaled}${match[3]}`;
}

export function reduceBaseTraitMemoryStat(text, reduction) {
  const factor=1+reduction/100;
  return String(text||"").replace(/([+-])(\d+(?:\.\d+)?)/g,(_,sign,value)=>`${sign}${Math.round(Number(value)*factor*100)/100}`);
}

// TLIDB (Memory_of_Origin / _Discipline / _Progress base-stat tables, checked
// 2026-10-09) lists forty tiers per base stat, tier 1 = highest. Enhancement
// level L (1-40) is tier 41 - L: all 600 tier values (15 stats x 40 levels)
// match these formulas, including the irregular level 1-4 values. TLIDB stops
// at tier 1 (level 40); levels 41-50 continue the same linear formulas, as the
// user's in-game checks (2026-10-10) show: 50/50 ultimate Memory of Origin =
// +110 Intelligence (2 x 50 + 10) and 50/50 Memory of Discipline =
// +642 Max Energy Shield ((35 x 50 + 175) / 3). Rarity caps the level
// (memoryMaxEnhancementForRarity); only Ultimate reaches 50.
const memoryBaseStatMaxLevel = { "Memory of Origin": 50, "Memory of Discipline": 50, "Memory of Progress": 50 };
const memoryBaseStatProgression = {
  "Memory of Origin": { early: [10, 13, 15, 18], later: (level) => 2 * level + 10 },
  "Memory of Discipline": {
    "Max Life": { early: [37, 46, 55, 64], later: (level) => Math.round((22 * level + 110) / 3) },
    "Max Mana": { early: [20, 25, 30, 35], later: (level) => 4 * level + 20 },
    Armor: { early: [480, 600, 720, 840], later: (level) => 96 * level + 480 },
    Evasion: { early: [480, 600, 720, 840], later: (level) => 96 * level + 480 },
    "Max Energy Shield": { early: [58, 73, 88, 102], later: (level) => Math.round((35 * level + 175) / 3) },
  },
  "Memory of Progress": {
    // Movement Speed stops at level 40 (+30%): user's in-game 50/50 Memory of Progress shows
    // +30% Movement Speed (2026-10-10). Its other stats continue to level 50.
    "Movement Speed": { maxLevel: 40, early: [3.3, 4.2, 5, 5.8], later: (level) => Math.round(((2 * level + 10) / 3) * 10) / 10 },
    speed: { early: [4, 5, 6, 7], later: (level) => Math.round((0.8 * level + 4) * 10) / 10 },
  },
};

export function memoryBaseStatLabel(baseStat) {
  return String(baseStat || "").replace(/^([+-]?)\d+(?:\.\d+)?/, "$1#");
}

export function memoryScaledBaseStat(baseStat, memoryType, enhancementLevel, waxAndWane = false) {
  const match = String(baseStat || "").match(/^([+-]?)(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return baseStat;
  const level = Math.max(1, Math.min(memoryBaseStatMaxLevel[memoryType] ?? 50, Math.round(Number(enhancementLevel) || 1)));
  const typeProgression = memoryBaseStatProgression[memoryType];
  const statName = match[3].replace(/^%\s*/, "").trim();
  const progression = memoryType === "Memory of Origin"
    ? typeProgression
    : memoryType === "Memory of Progress"
      ? statName === "Movement Speed" ? typeProgression["Movement Speed"] : typeProgression.speed
      : typeProgression?.[statName];
  if (!progression) return memoryImplicitText(baseStat, waxAndWane);
  const statLevel = Math.min(level, progression.maxLevel ?? level);
  const value = statLevel <= 4 ? progression.early[statLevel - 1] : progression.later(statLevel);
  const scaled = `${match[1]}${value}${match[3]}`;
  return memoryImplicitText(scaled, waxAndWane);
}
import { baseHeroTraitProgressionsSs13 } from "./data/heroes/base-hero-trait-progressions-ss13.generated.js";

// Artificial Moon (user-corrected 2026-10-13; replaces the "any equipped Artificial Moon memory, any level" reading): the
// Artificial Moon revived affix on an equipped memory opens the base trait slot (src/data/heroes/memory-revival-ss13.js
// baseTraitSlotFromMemory), and the base trait's "Artificial Moon:" lines are active only once the base trait reaches
// level 5. User-corrected 2026-10-13 (in-game screenshot: base trait LV.3 with an Ultimate memory in the base slot): the
// base trait starts at level 0, so its level here is 0 + the slot memory's trait-level bonus (traitLevelBonusForEnhancement:
// +3 at enhancement 50, +2 at 30–49 of any rarity, +1 below; user-approved 2026-10-13) + that same memory's own "+N to Hero Trait Level" lines
// (user-confirmed 2026-10-13; memoryOwnHeroTraitLevel), capped at 5. Lines on other memories or gear do not count (Frost
// Terra build: +2 on the Lv75 memory, base trait LV.3, gate shut). The rest of the planner reads the same level
// (baseTraitLevelForMemory). Every hero follows it. The result names what is missing when the gate is shut.
import { equippedBaseTraitSlot, memoryFitsBaseTraitSlot, normalizeRevivedAffix } from "./data/heroes/memory-revival-ss13.js";
export const ARTIFICIAL_MOON_TRAIT_LEVEL = 5;
export function artificialMoonGate(hero = {}) {
  const inventory = hero?.memoryInventory || [];
  const equippedIds = Object.values(hero?.equippedMemoryIds || {}).filter(Boolean);
  const moonMemory = inventory.find((memory) => equippedIds.includes(memory.id) && /^Artificial Moon/.test(normalizeRevivedAffix(memory.revivedAffix || ""))) || null;
  const slot = equippedBaseTraitSlot(hero);
  const base = inventory.find((memory) => memory.id === hero?.baseTraitMemoryId);
  const baseMemory = memoryFitsBaseTraitSlot(base, slot, equippedIds) ? base : null;
  const baseTraitLevel = baseMemory ? Math.max(0, Math.min(5, memoryTraitLevel(baseMemory) + memoryOwnHeroTraitLevel(baseMemory))) : 0;
  const reason = !moonMemory ? "No equipped memory with the Artificial Moon revived affix"
    : !baseMemory ? "No memory in the base trait slot (opened by the Artificial Moon memory)"
    : baseTraitLevel < ARTIFICIAL_MOON_TRAIT_LEVEL ? `Base trait level ${baseTraitLevel} < ${ARTIFICIAL_MOON_TRAIT_LEVEL}` : "";
  return { active: !reason, reason, moonMemoryId: moonMemory?.id ?? null, baseMemoryId: baseMemory?.id ?? null, baseTraitLevel };
}

// The trait tooltip leaves the base trait's Artificial Moon section out of its effect lines (the badge reason names it): the
// "Artificial Moon:" header and the lines after it that the base trait's Level 1 text lacks (TLIDB per-level texts, compared
// by shape). One line for most heroes; Youga – The Ultimate One has two (SS14, 2026-10-15). Lines every level has stay
// (Vendetta's Sting prints "Replace the skill in the third slot with Vendetta" after its moon line). Without per-level data
// the header and the one line after it are left out, as before.
import { baseHeroTraitLevelsSs13 } from "./data/heroes/base-hero-trait-levels-ss13.generated.js";
const traitLineShape = (line) => String(line || "").replace(/[+-]?\d+(?:\.\d+)?/g, "#").replace(/\s+/g, " ").trim();
export function withoutArtificialMoonLines(heroId, lines = []) {
  const header = lines.findIndex((line) => String(line).trim() === "Artificial Moon:");
  if (header < 0) return lines;
  const levelOne = baseHeroTraitLevelsSs13[heroId]?.[1];
  if (!levelOne) return lines.filter((_, index) => index !== header && index !== header + 1);
  const shapes = new Set(levelOne.split("\n").map(traitLineShape));
  return lines.filter((line, index) => index < header || (index > header && shapes.has(traitLineShape(line.replace(/\(\s*([^()]*\/[^()]*)\)/g, (_, list) => list.split("/").at(-1).trim())))));
}

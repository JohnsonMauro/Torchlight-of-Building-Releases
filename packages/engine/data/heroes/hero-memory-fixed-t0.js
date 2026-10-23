import { heroMemoryTierAffixes } from "./hero-memory-tiers.js";

// Hero Memory fixed affixes, T0 (ids ending in 00). The same effects occur for all three memory types. The
// additional-damage line belongs to the T0 variant. Values: game config_modifier, 2026-10-15
// (research/patch-ss14/game-diff.md "Hero Memory T0 fixed affixes"). The "+2 to Hero Trait Level" and Ignite rows'
// additional damage could not be read there and keep +3%.
const originT0Effects = [
  "+2 to Hero Trait Level · +3% additional damage",
  "+(31–36)% Movement Speed",
  "+(5–6)% Max Fire Resistance",
  "+(5–6)% Max Cold Resistance",
  "+(5–6)% Max Lightning Resistance",
  "+(5–6)% Max Erosion Resistance",
  "+52% Skill Area",
  "+(60–68)% Critical Strike Damage",
  "+48% Projectile Speed",
  "+128% Critical Strike Rating",
  "+26% Attack Speed",
  "+26% Cast Speed",
  "+(32–48)% Affliction Effect",
  "+(42–52)% Reaping Recovery Speed",
  "+(70–84)% damage",
  "+(20–22)% Max Life",
  "+(20–22)% Max Energy Shield",
  "+(44–52)% Armor",
  "+(44–52)% Evasion",
  "+(44–49)% Minion Critical Strike Damage",
  "+128% Minion Critical Strike Rating",
  "+26% Minion Attack Speed",
  "+26% Minion Cast Speed",
  "+(70–84)% Minion Damage",
  "+(30–33)% Attack Block Chance",
  "+(30–33)% Spell Block Chance",
  "+(42–48)% chance to avoid Elemental Ailments",
  "Immune to Slow · +6% additional damage",
  "Immune to Blinding · +6% additional damage",
  "Immune to Weaken · +6% additional damage",
  "Immune to Paralysis · +6% additional damage",
  "(-96–-64)% Curse effect against you",
  "+16% Cooldown Recovery Speed",
  "Immune to Ignite Damage · -100% Ignite Effect received · +3% additional damage",
  "Immune to Wilt Damage · +6% additional damage",
  "Immune to Trauma Damage · +6% additional damage",
  // T0 only (402177700 / 402177800 / 402177900): no tier 1–3 row, so it is its own base effect.
  "+16% Skill Effect Duration",
];
const T0_ONLY = new Set(["+16% Skill Effect Duration"]);

const affixKey = (effect) => effect.replace(/ · \+\d+% additional damage$/, "").replace(/[-+%()–\d.]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const originT1 = heroMemoryTierAffixes.filter((entry) => entry.type === "Memory of Origin" && entry.kind === "Fixed Affix" && entry.tier === 1);

export const heroMemoryFixedT0Affixes = ["Memory of Origin", "Memory of Discipline", "Memory of Progress"].flatMap((type) =>
  originT0Effects.map((effect) => {
    const baseEffect = T0_ONLY.has(effect) ? effect : originT1.find((entry) => affixKey(entry.effect) === affixKey(effect))?.effect;
    if (!baseEffect) throw new Error(`Missing T1 Hero Memory fixed affix for ${effect}`);
    return { type, kind: "Fixed Affix", tier: 0, baseEffect, effect };
  }),
);

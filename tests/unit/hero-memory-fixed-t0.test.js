// Hero Memory T0 fixed affixes with an additional-damage line: the game's own Help Manual affix cache (client cache
// HelpManualV2AffixData, version 16_en_89_1_v7, read 2026-10-26) gives +6% on every one of them, for the three memories
// (Memory of Origin 402151200 / 402176500, Memory of Discipline 402153100 / 402176800, Memory of Progress 402155000 /
// 402177100). The "+2 to Hero Trait Level" and "Immune to Ignite Damage" rows kept +3% when config_modifier could not be read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { heroMemoryFixedT0Affixes } from "../../packages/engine/data/heroes/hero-memory-fixed-t0.js";

test("every T0 fixed affix that carries additional damage gives +6%", () => {
  const withDamage = heroMemoryFixedT0Affixes.filter((affix) => /additional damage$/.test(affix.effect));
  assert.ok(withDamage.length >= 24);
  for (const affix of withDamage)
    assert.match(affix.effect, / · \+6% additional damage$/, `${affix.type}: ${affix.effect}`);
});

test("the Hero Trait Level and Ignite immunity rows are among them", () => {
  for (const type of ["Memory of Origin", "Memory of Discipline", "Memory of Progress"]) {
    const effects = heroMemoryFixedT0Affixes.filter((affix) => affix.type === type).map((affix) => affix.effect);
    assert.ok(effects.includes("+2 to Hero Trait Level · +6% additional damage"), type);
    assert.ok(effects.includes("Immune to Ignite Damage · -100% Ignite Effect received · +6% additional damage"), type);
  }
});

// The hero panel's item tooltips (src/app/bridge/memory-tooltip-view.ts): a hero memory's sections in the game's order,
// and a Sage's scent ingredient or elixir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryTooltipView, scentTooltipView } from "../../src/app/bridge/memory-tooltip-view.ts";

const coverage = { state: "modeled", label: "Modeled", reason: "" };
const line = (text, tier = null) => ({ text, tier, coverage });
const memory = (overrides = {}) =>
  memoryTooltipView({
    memory: { type: "Memory of Discipline", rarity: "legendary", enhancementLevel: 12 },
    icon: "./src/assets/memory.webp",
    revived: false,
    maxEnhancement: 40,
    traitBonus: 1,
    reduction: null,
    implicit: { text: "+525 Max Energy Shield", coverage, wax: false },
    revival: [],
    revivedAffix: null,
    fixed: [line("+12 % Max Life")],
    random: [line("+8% Movement Speed", 2)],
    inventory: false,
    ...overrides,
  });

test("a memory's head and its sections in the game's order, empty ones left out", () => {
  const view = memory();
  assert.deepEqual(
    [view.name, view.kicker, view.enhancement, view.rarity],
    ["Memory of Discipline", "LEGENDARY · HERO MEMORY", "12/40", "legendary"],
  );
  assert.deepEqual(
    view.sections.map((section) => section.heading),
    ["Implicit", "Fixed Affixes", "Random Affixes"],
  );
  // The game's "N %" gap closes, and a tier stays on its line.
  assert.equal(view.sections[1].lines[0].text, "+12% Max Life");
  assert.equal(view.sections[2].lines[0].tier, 2);
  assert.equal(view.footer, "Right-click to unequip");
});

test("revival lines and a revived affix (Lunar Phase) sit between the implicit and the fixed affixes", () => {
  const view = memory({
    revived: true,
    implicit: { text: "+525 Max Energy Shield", coverage, wax: true },
    revival: [{ text: "Wax and Wane", coverage }],
    revivedAffix: { lunar: true, effect: { parts: [] }, note: "Rolls with the moon", coverage },
    inventory: true,
  });
  assert.deepEqual(
    view.sections.map((section) => [section.kind, section.heading]),
    [
      ["lines", "Implicit"],
      ["lines", "Memory Revival"],
      ["revived", "Revived Affix · Lunar Phase"],
      ["lines", "Fixed Affixes"],
      ["lines", "Random Affixes"],
    ],
  );
  assert.equal(view.sections[0].wax, true);
  assert.equal(view.sections[1].lines[0].tier, null);
  assert.equal(view.sections[2].note, "Rolls with the moon");
  assert.equal(view.footer, "Right-click to equip or unequip");
  assert.equal(memory({ memory: { type: "X", enhancementLevel: 0 } }).rarity, "normal");
});

test("a scent elixir keeps its tags; an ingredient names its kind and has none", () => {
  const entry = { name: "Elixir", icon: "e.webp", description: " +10 % Damage \n\nLasts 4 s ", tags: ["Buff"] };
  assert.deepEqual(scentTooltipView({ kind: "elixir", entry }), {
    kicker: "Elixir Skill",
    title: "Elixir",
    icon: "e.webp",
    tags: ["Buff"],
    lines: ["+10% Damage", "Lasts 4 s"],
  });
  const ingredient = scentTooltipView({ kind: "aromaBlend", entry });
  assert.deepEqual([ingredient.kicker, ingredient.tags], ["Aroma Blend Ingredient", []]);
});

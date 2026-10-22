// The Pactspirits section's tooltips (src/app/bridge/pact-tooltip-view.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { coverageView } from "../../src/app/bridge/gear-item-view.ts";
import {
  kismetTooltipView,
  pactNodeTooltipView,
  pactspiritTooltipView,
} from "../../src/app/bridge/pact-tooltip-view.ts";

const node = (overrides = {}) => ({
  name: "Elemental Mastery",
  effect: "+10 % Elemental Damage",
  ring: "inner",
  icon: "node.webp",
  spirit: { name: "Dreamweaver", level: 3, rarity: "Legendary" },
  rewards: [{ text: "+5% damage", coverage: coverageView("In calc") }],
  effectCoverage: coverageView("In calc"),
  slotMode: false,
  allocated: false,
  holdsKismet: true,
  ...overrides,
});

test("a node shows its effect, its ring and what a click does", () => {
  const view = pactNodeTooltipView(node());
  assert.equal(view.kicker, "Micro node");
  assert.equal(view.rarity, "legendary");
  assert.deepEqual(view.blocks, [{ kind: "text", text: "+10% Elemental Damage", coverage: coverageView("In calc") }]);
  assert.equal(view.footer, "Click to craft a Kismet · Right-click to remove");
});

test("the outer node lists the spirit's level bonuses; slot mode says allocate or refund", () => {
  const view = pactNodeTooltipView(node({ ring: "outer", holdsKismet: false, slotMode: true, allocated: true }));
  assert.equal(view.kicker, "Outer node");
  assert.deepEqual(view.blocks[0], { kind: "heading", text: "Level 3 bonuses" });
  assert.equal(view.blocks[1].items[0].text.before, "+5% damage");
  assert.equal(view.footer, "Left-click to refund");
  assert.equal(pactNodeTooltipView(node({ ring: "destiny", holdsKismet: false })).kicker, "Fate slot");
});

test("a Kismet names its kind and boost, lists its affixes and the node it replaces", () => {
  const view = kismetTooltipView({
    kismet: { name: "Star Kismet", icon: "k.webp", rarity: "Rare", kind: "Micro" },
    affixes: [
      {
        text: { before: "+", effective: "7.5%", title: "Rolled +5%", after: " Aura Effect" },
        coverage: coverageView("In calc"),
      },
    ],
    boostNote: "Star Trail ×1.5",
    nodeName: "Elemental Mastery",
    slotMode: false,
    extra: false,
  });
  assert.equal(view.kicker, "Rare · Micro Kismet · Star Trail ×1.5");
  assert.equal(view.blocks[0].items[0].text.effective, "7.5%");
  assert.equal(view.footer, "Click to edit · Right-click to remove · Replaces Elemental Mastery");
});

test("a Pactspirit's tooltip groups its overview, its effect at its level and what each level adds", () => {
  const view = pactspiritTooltipView({
    spirit: { name: "Dreamweaver", icon: "d.webp", category: "Spell", rarity: "Legendary", description: "Weaves." },
    level: 2,
    effectsByLevel: [
      ["+14% Spell damage"],
      ["+14% Spell damage", "+2% additional damage"],
      ["+14% Spell damage", "+1.5% Penetration", "+2% additional damage"],
      ["+14% Spell damage", "+1.5% Penetration", "+4% additional damage"],
    ],
    outer: { icon: "o.webp", name: "Dream Gate" },
    place: "selector",
  });
  assert.deepEqual(
    view.blocks.map((block) => (block.kind === "heading" ? block.text : block.kind)),
    ["Pactspirit Overview", "text", "text", "feature", "Pactspirit Effect", "list", "Upgrade Reward", "list"],
  );
  assert.equal(view.blocks[2].text, "Unlock 2 Pact Nodes in advance");
  assert.deepEqual(
    view.blocks[5].items.map((item) => item.text.before),
    ["+14% Spell damage", "+2% additional damage"],
  );
  // Each level from the second lists the lines it adds or changes; levels above the Pactspirit's are dimmed.
  assert.deepEqual(
    view.blocks[7].items.map((item) => [item.text.before, item.dimmed]),
    [
      ["Lv.2 · +2% additional damage", false],
      ["Lv.3 · +1.5% Penetration", true],
      ["Lv.4 · +4% additional damage", true],
    ],
  );
  assert.equal(view.footer, "Click to choose");
  assert.equal(view.kicker, "Spell · Legendary · Level 2");
  // Its art is a tall portrait, shown down the head's left edge (a node's or Kismet's icon is not).
  assert.equal(view.portrait, true);
});

test("a Pactspirit without level data says so, and a slot's tooltip keeps the slot's controls", () => {
  const view = pactspiritTooltipView({
    spirit: { name: "Plain", icon: "p.webp", category: "Attack", rarity: "Magic", description: "Hits." },
    level: 1,
    effectsByLevel: [],
    outer: null,
    place: "slot",
  });
  assert.deepEqual(
    view.blocks.map((block) => (block.kind === "heading" ? block.text : block.kind)),
    ["Pactspirit Overview", "text", "Pactspirit Effect", "text"],
  );
  assert.equal(view.blocks[3].text, "No effect listed.");
  assert.equal(view.footer, "Click to change · Right-click to remove");
});

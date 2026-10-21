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

test("a Pactspirit shows its overview, its outer node and its level bonuses", () => {
  const view = pactspiritTooltipView({
    spirit: { name: "Dreamweaver", icon: "d.webp", category: "Spell", rarity: "Legendary", description: "Weaves." },
    level: 2,
    rewards: [],
    outer: { icon: "o.webp", name: "Dream Gate" },
  });
  assert.deepEqual(
    view.blocks.map((block) => block.kind),
    ["heading", "text", "text", "feature", "heading", "text"],
  );
  assert.equal(view.blocks[2].text, "Unlock 2 Pact Nodes in advance");
  assert.equal(view.blocks[5].text, "No level bonus listed.");
});

// A Divinity Slate's tooltip (src/app/bridge/slate-tooltip-view.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { coverageView } from "../../src/app/bridge/gear-item-view.ts";
import { slateTooltipView } from "../../src/app/bridge/slate-tooltip-view.ts";

const input = (overrides = {}) => ({
  slate: { name: "Fallen Starlight", rarity: "legendary", icon: "s.webp" },
  pose: { rotation: -90, flipX: -1 },
  family: "talent-family-god-of-war",
  judgment: false,
  groups: [
    {
      title: "Fixed Affixes",
      affixes: ["Lich: Lv.1 Core Talent: Frostbite — the core's full text", "Lich: +10 % cold damage", ""],
    },
    { title: "Random Affixes", affixes: [] },
  ],
  display: (affix) => affix,
  limited: (affix) => affix.includes("cold"),
  coverage: () => coverageView("In calc"),
  familyOf: (tree) => (tree === "Lich" ? "talent-family-goddess-of-knowledge" : ""),
  copy: null,
  copiedCoverage: () => coverageView("In calc"),
  ...overrides,
});

test("a slate lists its affixes by group; a core affix has a short form, a single-copy one says so", () => {
  const view = slateTooltipView(input());
  assert.equal(view.kicker, "DIVINITY SLATE · LEGENDARY");
  assert.deepEqual(view.pose, { rotation: 270, flipX: -1, flipY: 1 });
  assert.equal(view.groups.length, 1);
  const [core, cold] = view.groups[0].affixes;
  assert.deepEqual(core.core, { tree: "Lich", family: "talent-family-goddess-of-knowledge", rest: ": Frostbite" });
  assert.equal(core.text.rest, ": Lv.1 Core Talent: Frostbite — the core's full text");
  assert.equal(cold.core, null);
  assert.equal(cold.limited, true);
  assert.equal(cold.text.rest, ": +10% cold damage");
});

test("an affix of no god's tree stays plain; a slate without affixes says so", () => {
  const view = slateTooltipView(input({ groups: [{ title: "Fixed Affixes", affixes: ["Copies an adjacent affix"] }] }));
  assert.deepEqual(view.groups[0].affixes[0].text, { tree: "", family: "", rest: "Copies an adjacent affix" });
  assert.equal(slateTooltipView(input({ groups: [] })).empty, "No affixes selected.");
});

test("a copy slate lists what it copies, or why nothing is copied", () => {
  const copied = slateTooltipView(
    input({ copy: { placed: true, copied: [{ source: "Fallen Starlight", affix: "Lich: +5% damage" }] } }),
  ).copied;
  assert.equal(copied.affixes[0].source, "Fallen Starlight");
  assert.equal(copied.affixes[0].text.tree, "Lich");
  assert.equal(
    slateTooltipView(input({ copy: { placed: false, copied: [] } })).copied.empty,
    "Place on the grid to see copied affixes.",
  );
});

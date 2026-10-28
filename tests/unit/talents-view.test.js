// What the talent trees show (src/app/bridge/talents-view-model.ts), on a small hand-made tree: three nodes in a row,
// two core slots, and an Ethereal Prism (Haze) that sits beside the cores.
import { test } from "node:test";
import assert from "node:assert/strict";
import { talentFamilyClass, talentsView } from "../../src/app/bridge/talents-view-model.ts";

const layout = {
  nodes: [
    { coordinate: [0, 0], type: "micro", maxRank: 3 },
    { coordinate: [1, 0], type: "medium", maxRank: 3 },
    { coordinate: [2, 0], type: "legendary", maxRank: 1 },
  ],
  edges: [
    [0, 0, 1, 0],
    [1, 0, 2, 0],
  ],
};
const panel = {
  name: "Lich",
  coreTalents: [
    { name: "Off The Beaten Track", unlockPoints: 24 },
    { name: "Other", unlockPoints: 12 },
  ],
  allocatedNodes: [],
};
const haze = { id: "p1", type: "ethereal", base: "Haze" };

function view(overrides = {}) {
  return talentsView({
    panel,
    baseLayouts: { Lich: layout },
    layouts: { Lich: layout },
    ranks: { "Lich:0,0": 3 },
    talents: {
      selectedTrees: ["Goddess of Knowledge", "Prophet", "", "Lich"],
      coreSelections: { "Lich:24": "Off The Beaten Track" },
      prismInventory: [haze],
      installedPrisms: {},
      installedPrismNodes: {},
    },
    slateMode: false,
    pendingPrism: null,
    budget: { fromLevel: 100, treasureTroves: 6, pathOfProgression: 9, total: 115 },
    ...overrides,
  });
}

test("the tabs show each slot's tree, the open one active, a slot after an empty one disabled", () => {
  const { tabs, totalPoints, maxPoints } = view();
  assert.deepEqual(
    tabs.map((tab) => [tab.label, tab.name, tab.active, tab.disabled]),
    [
      ["God tree", "Goddess of Knowledge", false, false],
      ["Class tree", "Prophet", false, false],
      ["Tree 3", null, false, false],
      ["Tree 4", "Lich", true, true],
    ],
  );
  assert.equal(totalPoints, 3);
  assert.equal(maxPoints, 115);
  // Level 97 with the Treasure Troves and the Path of Progression done: 112, and the points the tree lacks show as unused.
  const level97 = view({ budget: { fromLevel: 97, treasureTroves: 6, pathOfProgression: 9, total: 112 } });
  assert.deepEqual([level97.maxPoints, level97.unusedPoints], [112, 109]);
  // The Slates tab takes the active mark off the tree tabs.
  assert.equal(
    view({ slateMode: true }).tabs.some((tab) => tab.active),
    false,
  );
});

test("the open tree's points and whether it takes a prism; a tab carries its tree's family", () => {
  const { panelPoints, canInstallPrism, tabs, familyClass, thresholds } = view();
  assert.equal(panelPoints, 3);
  assert.equal(familyClass, "talent-family-goddess-of-deception");
  // 3 points open the columns that need 0 and 3.
  assert.deepEqual(
    thresholds.map((threshold) => [threshold.points, threshold.reached]),
    [
      [0, true],
      [3, true],
      [6, false],
      [9, false],
      [12, false],
      [15, false],
      [18, false],
    ],
  );
  // Points in another tree count in the total only.
  const twoTrees = view({ layouts: { Lich: layout, Prophet: layout }, ranks: { "Lich:0,0": 3, "Prophet:0,0": 2 } });
  assert.deepEqual([twoTrees.panelPoints, twoTrees.totalPoints], [3, 5]);
  assert.equal(canInstallPrism, true);
  // The God tree takes no prism.
  const god = { ...panel, name: "Goddess of Knowledge" };
  assert.equal(
    view({ panel: god, baseLayouts: { [god.name]: layout }, layouts: { [god.name]: layout } }).canInstallPrism,
    false,
  );
  assert.equal(tabs[3].familyClass, "talent-family-goddess-of-deception");
  assert.equal(talentFamilyClass("Goddess of Knowledge"), "talent-family-goddess-of-knowledge");
  assert.equal(talentFamilyClass(""), "");
});

test("core slots in threshold order, locked under their points; a Haze prism adds its own effect", () => {
  const cores = view({
    talents: {
      selectedTrees: ["Goddess of Knowledge", "Prophet", "Marksman", "Lich"],
      coreSelections: { "Lich:24": "Off The Beaten Track" },
      prismInventory: [haze],
      installedPrisms: { Lich: "p1" },
      installedPrismNodes: { Lich: "2,0" },
    },
  }).cores;
  assert.deepEqual(
    cores.map((core) =>
      core.kind === "slot" ? [core.threshold, core.name, core.selected, core.locked] : [core.caption, core.name],
    ),
    [
      [12, null, false, true],
      [24, "Off The Beaten Track", true, true],
      ["Separate prism effect", "Haze"],
    ],
  );
});

test("nodes carry rank, availability and connections; the installed prism covers its node", () => {
  const result = view({
    talents: {
      selectedTrees: ["Goddess of Knowledge", "Prophet", "Marksman", "Lich"],
      coreSelections: {},
      prismInventory: [haze],
      installedPrisms: { Lich: "p1" },
      installedPrismNodes: { Lich: "2,0" },
    },
  });
  assert.deepEqual(
    result.nodes.map((node) => [node.coordinate, node.classes, node.label, node.prism?.label ?? null]),
    [
      ["0,0", "allocated", "Unallocated micro talent, rank 3 of 3, Maximum rank reached", null],
      ["1,0", "available", "Unallocated medium talent, rank 0 of 3", null],
      [
        "2,0",
        "available locked legendary-node prism-covered-node",
        "Unallocated legendary talent, rank 0 of 1, Prism replaces this talent node",
        "Ethereal Prism: Haze installed here",
      ],
    ],
  );
  assert.deepEqual(
    result.connections.map((line) => line.state),
    ["reachable", "locked"],
  );
  assert.equal(result.areas.length, 1);
});

test("a prism waiting for its node marks the tree's nodes as targets and names itself", () => {
  const result = view({ pendingPrism: { id: "p1", panel: "Lich" } });
  assert.equal(result.placingPrism, "Ethereal Prism: Haze");
  assert.ok(result.nodes.every((node) => node.classes.includes("prism-placement-target")));
  assert.equal(view({ pendingPrism: { id: "p1", panel: "Prophet" } }).placingPrism, null);
});

test("an Inverse Image mirrors its area: the reflected nodes join the tree, inside a second area", () => {
  const inverse = { id: "p2", type: "inverse", base: "Inverse Image" };
  const result = view({
    talents: {
      selectedTrees: ["Goddess of Knowledge", "Prophet", "Marksman", "Lich"],
      coreSelections: {},
      prismInventory: [inverse],
      installedPrisms: { Lich: "p2" },
      installedPrismNodes: { Lich: "1,0" },
    },
  });
  assert.deepEqual(
    result.areas.map((area) => [area.left, area.top, area.width, area.height, area.reflected]),
    [
      [0, 0, 3, 2, false],
      [4, 3, 3, 2, true],
    ],
  );
  const reflected = result.nodes.filter((node) => node.classes.includes("inverse-reflected-node"));
  assert.deepEqual(
    reflected.map((node) => [node.coordinate, node.classes.includes("prism-affected-node")]),
    [
      ["6,4", true],
      ["5,4", true],
      ["4,4", true],
    ],
  );
  assert.match(reflected[0].label, /, within Inverse Image reflected area$/);
  assert.equal(result.nodes.filter((node) => node.prism).length, 1);
});

// An Ethereal Prism's area is its own, not an Inverse Image's reflection: its nodes were named as reflected (2026-10-26).
test("the nodes in an Ethereal Prism's area are named as within the prism area", () => {
  const result = view({
    talents: {
      selectedTrees: ["Goddess of Knowledge", "Prophet", "", "Lich"],
      coreSelections: {},
      prismInventory: [{ ...haze, radiusAffix: "The Effect Area expands to 3x3 Rectangle" }],
      installedPrisms: { Lich: "p1" },
      installedPrismNodes: { Lich: "1,0" },
    },
  });
  const affected = result.nodes.filter((node) => node.classes.includes("prism-affected-node"));
  assert.ok(affected.length > 0);
  for (const node of affected) assert.match(node.label, /, within prism area$/);
});

test("the talent point budget: 1 per level from level 3, up to 6 Treasure Trove and 9 Path of Progression points", async () => {
  const { talentPointBudget } = await import("../../packages/engine/src/talents/talent-rules.js");
  assert.equal(talentPointBudget({ hero: { characterLevel: 97 }, talents: {} }).total, 112);
  assert.equal(talentPointBudget({ hero: { characterLevel: 100 }, talents: {} }).total, 115);
  assert.equal(
    talentPointBudget({ hero: { characterLevel: 97 }, talents: { treasureTrovePoints: 2, pathOfProgressionPoints: 3 } })
      .total,
    102,
  );
  assert.equal(talentPointBudget({ hero: { characterLevel: 2 }, talents: {} }).fromLevel, 0);
});

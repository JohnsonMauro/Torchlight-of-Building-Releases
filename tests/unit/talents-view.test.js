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
    { name: "Off The Beaten Track", unlockPoints: 24, description: "+4 Support Skill Level" },
    { name: "Other", unlockPoints: 12, description: "Something" },
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
    activeSlot: 3,
    slateMode: false,
    pendingPrism: null,
    ...overrides,
  });
}

test("the tabs show each slot's tree, the open one active, a slot after an empty one disabled", () => {
  const { tabs, totalPoints, maxPoints } = view();
  assert.deepEqual(
    tabs.map((tab) => [tab.label, tab.name, tab.active, tab.disabled, tab.points]),
    [
      // Trees without a layout here count no points.
      ["God tree", "Goddess of Knowledge", false, false, 0],
      ["Class tree", "Prophet", false, false, 0],
      ["Tree 3", null, false, false, null],
      ["Tree 4", "Lich", true, true, 3],
    ],
  );
  assert.equal(totalPoints, 3);
  assert.equal(maxPoints, 115);
  // The Slates tab takes the active mark off the tree tabs.
  assert.equal(
    view({ slateMode: true }).tabs.some((tab) => tab.active),
    false,
  );
});

test("the heading names the open tree and its family; an empty slot clicked leaves it blank", () => {
  const { heading } = view();
  assert.deepEqual(heading, {
    familyClass: "talent-family-goddess-of-deception",
    kind: "Talent panel",
    name: "Lich",
    points: "3 panel · 3/115 total",
    canInstallPrism: true,
  });
  assert.equal(view({ activeSlot: 2 }).heading.name, "");
  assert.equal(view({ activeSlot: 2 }).heading.familyClass, "");
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
  assert.equal(result.heading.kind, "Advanced panel · Prism override");
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

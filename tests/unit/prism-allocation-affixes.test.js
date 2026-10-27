// Ethereal Prism legendary affixes that change allocation (TLIDB Ethereal Prism, Prism Gauge - Legendary, read 2026-10-26):
// "Points can be allocated to all Micro|Medium Talent within the area N additional time(s)" and "All Legendary Medium Talent
// within the area can ignore prerequisite point requirements" (alone, or with "All Medium Talent …"). Magister, prism on
// the Medium at (2,1) with a 3x3 area: columns 1-3, rows 0-2 hold Micro (2,0) (1,1) (3,1) (2,2), Medium (1,0) (3,0) (1,2)
// and the Legendary Medium (3,2) (game talent catalogue).
import { test } from "node:test";
import assert from "node:assert/strict";
import { activeTalentTreeLayouts } from "../../packages/engine/src/talents/talent-layouts.js";
import { canAllocateTalent } from "../../packages/engine/src/talents/talent-rules.js";
import { removeIncompatible } from "../../packages/engine/src/state/season-compatibility.js";
import {
  inverseImageReflectedCoordinates,
  prismPrerequisiteFreeCoordinates,
} from "../../packages/engine/src/talents/prism-crafting.js";

const AREA = "The Effect Area expands to 3x3 Rectangle";
const talentsWith = (legendaryAffix) => ({
  selectedTrees: ["Magister", "", "", ""],
  prismInventory: [
    {
      id: "p",
      type: "ethereal",
      base: "Phantasmagoria",
      radiusAffix: AREA,
      rareAffix: "",
      legendaryAffix,
      baseAffix: "",
    },
  ],
  installedPrisms: { Magister: "p" },
  installedPrismNodes: { Magister: "2,1" },
});
const maxRanks = (talents) =>
  Object.fromEntries(
    activeTalentTreeLayouts(talents).Magister.nodes.map((node) => [node.coordinate.join(","), node.maxRank]),
  );

test("extra allocations raise the max rank of that talent size inside the area only", () => {
  const ranks = maxRanks(
    talentsWith("Points can be allocated to all Micro Talent within the area 2 additional time(s)"),
  );
  for (const micro of ["2,0", "1,1", "3,1", "2,2"]) assert.equal(ranks[micro], 5, micro);
  for (const medium of ["1,0", "3,0", "1,2"]) assert.equal(ranks[medium], 3, medium);
  assert.equal(ranks["3,2"], 1);
  assert.equal(ranks["4,2"], 3, "a Micro outside the area");
  const medium = maxRanks(
    talentsWith("Points can be allocated to all Medium Talent within the area 1 additional time(s)"),
  );
  assert.equal(medium["1,0"], 4);
  assert.equal(medium["2,0"], 3);
});

test("a Micro raised by the prism takes points past its printed max", () => {
  const talents = talentsWith("Points can be allocated to all Micro Talent within the area 2 additional time(s)");
  const layouts = activeTalentTreeLayouts(talents);
  const node = layouts.Magister.nodes.find((item) => item.coordinate.join(",") === "1,1");
  const ranks = { "Magister:0,0": 3, "Magister:1,1": 3 };
  const args = { panel: "Magister", node, graph: layouts.Magister, layouts, ranks, prismCoordinate: "2,1" };
  assert.equal(canAllocateTalent(args).allowed, true);
  assert.equal(canAllocateTalent({ ...args, ranks: { ...ranks, "Magister:1,1": 5 } }).allowed, false);
});

test("ignoring prerequisites frees the Legendary Medium in the area, and the Medium too with the combined affix", () => {
  const nodes = activeTalentTreeLayouts(talentsWith("")).Magister.nodes;
  const free = (affix) =>
    [...prismPrerequisiteFreeCoordinates(talentsWith(affix).prismInventory[0], "2,1", nodes)].sort();
  const legendaryOnly = "All Legendary Medium Talent within the area can ignore prerequisite point requirements";
  assert.deepEqual(free(legendaryOnly), ["3,2"]);
  assert.deepEqual(
    free(`${legendaryOnly}; All Medium Talent within the area can ignore prerequisite point requirements`),
    ["1,0", "1,2", "3,0", "3,2"],
  );
  assert.deepEqual(free("Points can be allocated to all Micro Talent within the area 1 additional time(s)"), []);
});

test("an Inverse Image's prerequisite-free area is still its reflected area", () => {
  const inverse = { type: "inverse", inverseRolls: { micro: 0, medium: 0, legendary: 0 } };
  const nodes = activeTalentTreeLayouts(talentsWith("")).Magister.nodes;
  assert.deepEqual(
    [...prismPrerequisiteFreeCoordinates(inverse, "2,1", nodes)].sort(),
    [...inverseImageReflectedCoordinates(inverse, "2,1")].sort(),
  );
});

test("carrying a build to a new season keeps the ranks a prism's extra allocations allow", () => {
  const talents = talentsWith("Points can be allocated to all Micro Talent within the area 2 additional time(s)");
  const ranks = { "Magister:0,0": 3, "Magister:1,1": 5, "Magister:0,2": 5 };
  const { state, removed } = removeIncompatible({ talents, talentRanks: ranks });
  assert.equal(state.talentRanks["Magister:1,1"], 5);
  assert.equal(state.talentRanks["Magister:0,2"], 3, "outside the area the printed max holds");
  assert.deepEqual(removed, ["Talent Magister 0,2: 2 ranks"]);
});

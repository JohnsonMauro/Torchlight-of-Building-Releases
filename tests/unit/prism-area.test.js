// Where an Ethereal Prism's area lies on a 7 x 5 talent panel (packages/engine/src/talents/prism-crafting.js prismAreaBounds): the
// prism in the area's 2nd column and row, and the part past the panel's edge cut off, as the game lights it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { prismAreaBounds } from "../../packages/engine/src/talents/prism-crafting.js";

const area = (radiusAffix) => ({ type: "ethereal", radiusAffix });
const FOUR_BY_THREE = area("The Effect Area expands to 4x3 Rectangle");

test("a 4x3 prism in the top row covers that row and the next only (the game's Lich panel, 2026-10-22)", () => {
  // Column 4 is the 12-point column: the area spans 9, 12, 15 and 18; the row above the panel is cut, not moved down.
  assert.deepEqual(prismAreaBounds(FOUR_BY_THREE, "4,0"), { left: 3, top: 0, width: 4, height: 2 });
});

test("a 4x3 prism inside the panel keeps its whole area around it", () => {
  assert.deepEqual(prismAreaBounds(FOUR_BY_THREE, "3,2"), { left: 2, top: 1, width: 4, height: 3 });
});

test("a prism in the last column and row keeps only the cells on the panel", () => {
  assert.deepEqual(prismAreaBounds(FOUR_BY_THREE, "6,4"), { left: 5, top: 3, width: 2, height: 2 });
});

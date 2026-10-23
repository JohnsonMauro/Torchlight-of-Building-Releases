// The Divinity Slates board's pure parts: what it shows (src/app/bridge/slates-view-model.ts) and where a released slate
// lands (apps/web/src/features/slates/slate-drop.ts), on small hand-made boards.
import { test } from "node:test";
import assert from "node:assert/strict";
import { slatesView, slateTiles } from "../../src/app/bridge/slates-view-model.ts";
import { dragDrop, pendingDrop } from "../../apps/web/src/features/slates/slate-drop.ts";
import { canPlaceSlate } from "../../packages/engine/src/talents/slate-board.js";

const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
// A 432 px grid (72 px cells) at (300, 100) inside a 1000 x 600 stage at (0, 0).
const board = rect(300, 100, 432, 432);
const stage = rect(0, 0, 1000, 600);
const pose = { rotation: 0, flipX: 1, flipY: 1 };

test("an L-shaped slate's tiles know which of their sides are on its outline", () => {
  const tiles = slateTiles(
    {
      shape: [
        [0, 0],
        [0, 1],
        [1, 1],
      ],
    },
    pose,
  );
  assert.deepEqual(
    tiles.map(({ column, row, outline }) => [column, row, Object.keys(outline).filter((side) => outline[side])]),
    [
      [0, 0, ["top", "right", "left"]],
      [0, 1, ["bottom", "left"]],
      [1, 1, ["top", "right", "bottom"]],
    ],
  );
});

test("the view lists equipped slates in board order, parked slates apart, and the selected slate's tools", () => {
  const slates = [
    { id: "a", name: "Fallen Starlight", size: [2, 1] },
    { id: "b", name: "Pedigree of Gods", size: [1, 1], copyRule: "copies adjacent" },
    { id: "c", name: "A Corner of Divinity", size: [1, 1] },
  ];
  const view = slatesView({
    slates,
    placements: { a: { column: 3, row: 1, rotation: 90 }, b: { column: 4, row: 2 } },
    parked: { c: { x: 4.5, y: 30, flipX: -1 } },
    equipped: new Set(["a", "b"]),
    ui: { selectedId: "b", toolsPosition: null, editMode: true, pendingId: null },
  });
  assert.equal(view.cells.length, 24);
  assert.deepEqual(
    view.pieces.map((piece) => [piece.id, piece.number, piece.at, piece.width, piece.height, piece.selected]),
    [
      ["a", 1, { column: 3, row: 1 }, 1, 2, false],
      ["b", 2, { column: 4, row: 2 }, 1, 1, true],
    ],
  );
  assert.equal(view.pieces[1].adjacentCount, 1);
  assert.deepEqual(
    view.parked.map((piece) => [piece.id, piece.number, piece.at, piece.pose.flipX, piece.label]),
    [["c", null, { x: 4.5, y: 30 }, -1, "A Corner of Divinity: parked outside the grid; drag onto the grid to equip"]],
  );
  assert.deepEqual(view.tools, {
    id: "b",
    name: "Pedigree of Gods",
    x: 8,
    y: 8,
    rules: { rotate: false, flip: true },
  });
  assert.equal(view.editMode, true);
});

test("a slate dropped over the grid goes to the cell under its top-left", () => {
  // Picked up with its top-left at (444, 172) = cell (3, 2), moved 72 px left and 72 px down.
  const drop = dragDrop(
    { x: 500 - 72, y: 200 + 72, startX: 500, startY: 200, originLeft: 444, originTop: 172 },
    pose,
    [2, 1],
    board,
    stage,
  );
  assert.deepEqual(drop, { placement: { column: 2, row: 3, ...pose }, parked: null });
});

test("a slate dropped beside the grid is parked, pushed off the grid's rectangle, kept inside the stage", () => {
  // Let go just left of the grid: the 2-cell-wide slate would overlap it, so it moves to the nearest free side.
  const drop = dragDrop(
    { x: 290, y: 300, startX: 500, startY: 300, originLeft: 444, originTop: 280 },
    pose,
    [2, 1],
    board,
    stage,
  );
  assert.deepEqual(drop.placement, null);
  assert.deepEqual(drop.parked, { x: 15.6, y: 46.67, ...pose });
  // Let go off the stage: nothing.
  assert.deepEqual(
    dragDrop(
      { x: 1200, y: 300, startX: 500, startY: 300, originLeft: 444, originTop: 280 },
      pose,
      [2, 1],
      board,
      stage,
    ),
    { placement: null, parked: null },
  );
});

test("a waiting slate is centred on the click", () => {
  const turned = { rotation: 90, flipX: 1, flipY: 1 };
  assert.deepEqual(pendingDrop(300 + 108, 100 + 216, turned, [1, 2], board, stage), {
    placement: { column: 2, row: 3, ...turned },
    parked: null,
  });
  assert.deepEqual(pendingDrop(100, 50, turned, [1, 2], board, stage), {
    placement: null,
    parked: { x: 6.4, y: 0, ...turned },
  });
});

test("a Judgment lies over the slates under its corners, as in the game: its placement and theirs stay valid", () => {
  // As the crafter and the game-log import store it: no board flag, the kind is in the name.
  const judgment = {
    id: "judgment",
    name: "Nether King's Divinity: Judgment",
    god: "Nether King",
    shape: [
      [0, 0],
      [3, 0],
      [3, 3],
    ],
  };
  const corner = {
    id: "corner",
    name: "A Corner of Divinity",
    template: "A Corner of Divinity",
    shape: [
      [0, 0],
      [0, 1],
      [1, 1],
    ],
  };
  const slates = [judgment, corner];
  const placements = { judgment: { column: 2, row: 2, rotation: 0 }, corner: { column: 2, row: 2, rotation: 0 } };
  assert.equal(canPlaceSlate(judgment, placements.judgment, placements, slates), true);
  assert.equal(canPlaceSlate(corner, placements.corner, placements, slates), true);
  const view = slatesView({
    slates,
    placements,
    parked: {},
    equipped: new Set(["judgment", "corner"]),
    ui: { selectedId: null, toolsPosition: null, editMode: false, pendingId: null },
  });
  assert.equal(view.pieces.find((piece) => piece.id === "judgment").overlay, true);
  assert.equal(view.pieces.find((piece) => piece.id === "corner").overlay, false);
});

// Crafted Divinity Slate shapes for "Import from game" (research/slate-shape-import-2026-10-19.md).
//
// A god's crafted slate logs ShapeId 10XY. X is the shape in the order TLIDB lists each god's six slates, by their item
// icons UI_TalantNG_<code>_0_Icon: Z1, Z2, L1, L2, O1, T1; Y differs by god (1 on Goddess of Deception's, 2 on Goddess
// of Knowledge's) and leaves the shape as it is. The game only rotates a slate (Direction = quarter turns,
// clockwise on screen); it never mirrors one, so Z2 and L2 are shapes of their own, the mirror images of Z1 and L1.
// Direction 0 is the item icon's orientation. A missing Direction is read as 0.
//
// Each entry holds the shape at Direction 2 (the icon turned half way round), which is the orientation the importer
// treats as unrotated since the 2026-10-12 legendary calibration: game Direction d turns it by ((d + 2) mod 4) x 90
// degrees clockwise. The cells are listed in reading order, so the importer's anchor rule (the first cell with the most
// neighbours) picks the cell the game's Index names.
//
// Confirmed on the user's board (2026-10-19 log: four crafted Goddess of Deception slates and Pedigree of Gods cover 23
// of the 24 cells in exactly one legal way): 1011 Z1, 1041 L2, 1061 T1. 1021 Z2, 1031 L1 and 1051 O1 follow TLIDB's
// order and the same anchor rule (provisional). Goddess of Knowledge (2026-10-22 log: two crafted slates, three A Corner
// of Divinity and Pedigree of Gods; of the 36 readings of 1012 and 1042 only one places every slate): 1012 Z1, 1042 L2.
//
// plannerIndex is the planner's crafted shape key <god>-<index> (Z1, L1, O1, T1 in slateShapeCodes). The planner has no
// Z2 / L2 keys: they use the Z / L key, flipped.
export const CRAFTED_SLATE_SHAPES = {
  1011: {
    code: "Z1",
    plannerIndex: 0,
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
    confirmed: true,
  },
  1021: {
    code: "Z2",
    plannerIndex: 0,
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
    confirmed: false,
  },
  1031: {
    code: "L1",
    plannerIndex: 1,
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
    ],
    confirmed: false,
  },
  1041: {
    code: "L2",
    plannerIndex: 1,
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
    ],
    confirmed: true,
  },
  1051: {
    code: "O1",
    plannerIndex: 2,
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    confirmed: false,
  },
  1061: {
    code: "T1",
    plannerIndex: 3,
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    confirmed: true,
  },
  1012: {
    code: "Z1",
    plannerIndex: 0,
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
    confirmed: true,
  },
  1042: {
    code: "L2",
    plannerIndex: 1,
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
    ],
    confirmed: true,
  },
};

/** The Direction a slate takes when the dump leaves it out (the game's default turn). */
export const DEFAULT_GAME_DIRECTION = 0;

/** The crafted shape for a logged ShapeId, or null when the id is not in the table. */
export const craftedSlateShapeForId = (shapeId) => CRAFTED_SLATE_SHAPES[Number(shapeId)] || null;

/** Clockwise turn (degrees) from the Direction-2 orientation for a logged Direction (missing: DEFAULT_GAME_DIRECTION). */
export const gameDirectionTurn = (direction) => {
  const value = direction == null || direction === "" ? DEFAULT_GAME_DIRECTION : Number(direction);
  return Number.isInteger(value) ? ((((value + 2) % 4) + 4) % 4) * 90 : null;
};

/** God names of the crafted slate bases ("Goddess of Deception's Divinity", "God of Machines' Divinity"). */
export const craftedSlateGod = (baseName) => String(baseName || "").replace(/'s? Divinity$/, "") || null;

/** The planner's god key for a god name (the keys of the crafted shape catalog). */
export const plannerGodKey = (god) =>
  ({
    "Goddess of Deception": "deception",
    "Goddess of Hunting": "hunting",
    "Goddess of Knowledge": "knowledge",
    "God of Machines": "machines",
    "God of Might": "might",
    "God of War": "war",
  })[god] || null;

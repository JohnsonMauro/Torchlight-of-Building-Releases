// importSnapshot (src/game-log/game-log-import.js) and src/game-log/slate-shape-ids.js: where a logged slate lands.
import { test } from "node:test";
import assert from "node:assert/strict";
import { importSnapshot, loadGameIdMap } from "../../src/game-log/game-log-import.js";
import { craftedSlateShapeForId } from "../../src/game-log/slate-shape-ids.js";
import { slateCells } from "../../packages/engine/src/talents/slate-board.js";
import { legendarySlateShapes } from "../../packages/engine/src/talents/slate-judgment.js";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { normalizePlannerState } from "../../packages/engine/src/state/planner-state.ts";

/** One dump whose board holds A Corner of Divinity (unique 1005) anchored at game cell 42, turned `direction`. */
const cornerAt42 = (direction) => ({
  dumps: [
    {
      id: "d1",
      stamp: "2026-10-22T21:43:34.525Z",
      character: 1,
      accountGroup: 1,
      tree: {
        player: { Level: "90", HeroId: "1001", HeroPurchaseId: "1001" },
        bag: {
          dressingTalentBlocks: {
            1: {
              Index: "42",
              PageId: "-4",
              Item: {
                BaseId: "261005",
                UniqueItmId: "1005",
                Level: "89",
                Id: "261005_a",
                BaseTalentList: { 1: "31060300", 2: "20060500" },
                ShapeId: "2030",
                ...(direction == null ? {} : { Direction: direction }),
              },
            },
          },
        },
      },
    },
  ],
});
const placed = async (direction) =>
  importSnapshot(cornerAt42(direction), "d1", await loadGameIdMap()).report.sections.slates.imported.map(
    (entry) => entry.item,
  );

test("a legendary slate with no logged Direction is turned as Direction 0, which the log never writes", async () => {
  assert.deepEqual(await placed(null), ["A Corner of Divinity at column 4, row 1, rotated 180°: 2 talents"]);
  assert.deepEqual(await placed(null), await placed("0"));
  assert.notDeepEqual(await placed(null), await placed("2"));
});

test("Goddess of Knowledge's crafted shape ids read as the same shapes as Goddess of Deception's", () => {
  assert.equal(craftedSlateShapeForId("1012")?.code, "Z1");
  assert.deepEqual(craftedSlateShapeForId("1012").cells, craftedSlateShapeForId("1011").cells);
  assert.equal(craftedSlateShapeForId("1042")?.code, "L2");
  assert.deepEqual(craftedSlateShapeForId("1042").cells, craftedSlateShapeForId("1041").cells);
});

/** The SS14 board of a Bing login (2026-10-23 log): two legendaries and two god-crafted Z slates, as the game logs them. */
const bingBoard = () => ({
  dumps: [
    {
      id: "d1",
      stamp: "2026-10-23T21:56:59.041Z",
      character: 1,
      accountGroup: 1,
      tree: {
        player: { Level: "82", HeroId: "810", HeroPurchaseId: "4002" },
        bag: {
          dressingTalentBlocks: {
            1: {
              Index: "54",
              PageId: "-4",
              Item: {
                BaseId: "261005",
                UniqueItmId: "1005",
                Direction: "2",
                ShapeId: "2030",
                BaseTalentList: { 1: "32070100", 2: "21070300" },
                Id: "261005_a",
              },
            },
            2: {
              Index: "34",
              PageId: "-4",
              Item: {
                BaseId: "260102",
                UniqueItmId: "0",
                Direction: "1",
                ShapeId: "1021",
                BaseTalentList: { 1: "50010300", 2: "53020500" },
                InfluenceId: "-1",
                Id: "260102_b",
              },
            },
            3: {
              Index: "43",
              PageId: "-4",
              Item: {
                BaseId: "261003",
                UniqueItmId: "1003",
                Direction: "1",
                ShapeId: "2020",
                BaseTalentList: { 1: "62050400", 2: "32030300", 3: "51030100", 4: "22070300" },
                Id: "261003_c",
              },
            },
            4: {
              Index: "33",
              PageId: "-4",
              Item: {
                BaseId: "260001",
                UniqueItmId: "0",
                Direction: "1",
                ShapeId: "1010",
                BaseTalentList: { 1: "24030500", 2: "24020500" },
                InfluenceId: "-1",
                Id: "260001_d",
              },
            },
          },
        },
      },
    },
  ],
});

test("every slate of a logged board lands on the cells the game shows (Goddess of Hunting's Z1, Goddess of Deception's Z2)", async () => {
  const { state } = importSnapshot(bingBoard(), "d1", await loadGameIdMap());
  // The planner's own reading of the board (a crafted slate's shape is a key in the state, its cells there).
  const slates = calculatePlanner(normalizePlannerState(state)).resolvedSlates;
  const cellsOf = (name) => {
    const slate = slates.find((item) => item.name === name);
    const placement = slate && state.slates.placements[slate.id];
    return placement
      ? slateCells(slate, placement)
          .map((cell) => `${cell.column},${cell.row}`)
          .sort()
      : null;
  };
  // Read off the game's board (planner columns and rows, 1-based).
  assert.deepEqual(cellsOf("Goddess of Hunting"), ["2,3", "3,2", "3,3", "4,2"]);
  assert.deepEqual(cellsOf("Goddess of Deception"), ["2,4", "3,4", "3,5", "4,5"]);
  assert.deepEqual(cellsOf("A Corner of Divinity"), ["4,4", "5,4", "5,5"]);
  assert.deepEqual(cellsOf("Fallen Starlight"), ["4,3", "5,3"]);
  assert.deepEqual(state.slates.parked, {});
});

test("Nether King's Divinity: Judgment logs no Direction and lies unrotated on its cell (the game's board, 2026-10-26)", async () => {
  const scan = {
    dumps: [
      {
        id: "d1",
        stamp: "2026-10-26T11:17:13.232Z",
        character: 1,
        accountGroup: 1,
        tree: {
          player: { Level: "97", HeroId: "810", HeroPurchaseId: "4002" },
          bag: {
            dressingTalentBlocks: {
              1: { Index: "22", PageId: "-4", Item: { BaseId: "394004", UniqueItmId: "0", Id: "394004_j" } },
            },
          },
        },
      },
    ],
  };
  const { state } = importSnapshot(scan, "d1", await loadGameIdMap());
  const slate = state.slates.inventory.find((item) => item.name === "Nether King's Divinity: Judgment");
  const placement = state.slates.placements[slate.id];
  assert.ok(placement, "placed on the board");
  const cells = slateCells({ ...slate, shape: legendarySlateShapes[slate.name] }, placement)
    .map((cell) => `${cell.column},${cell.row}`)
    .sort();
  assert.deepEqual(cells, ["2,2", "5,2", "5,5"]);
});

// importSnapshot (src/game-log/game-log-import.js) and src/game-log/slate-shape-ids.js: where a logged slate lands.
import { test } from "node:test";
import assert from "node:assert/strict";
import { importSnapshot, loadGameIdMap } from "../../src/game-log/game-log-import.js";
import { craftedSlateShapeForId } from "../../src/game-log/slate-shape-ids.js";

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

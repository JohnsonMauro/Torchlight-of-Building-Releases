// importSnapshot (src/game-log/game-log-import.js) on a scanned log: a trait-tree hero's picks as SS14 logs them
// (heroCharacterv3OverView.treeActivatedNodes, beside an empty skillOverView), each in its memory row.
import { test } from "node:test";
import assert from "node:assert/strict";
import { importSnapshot, loadGameIdMap, scanGameLog } from "../../src/game-log/game-log-import.js";
import { login } from "../e2e/fixtures/game-log.js";

const STAMP = "2026.10.22-21.43.34:525";
/** One Youga – The Ultimate One (purchase 8003) login whose hero section holds `heroLines` (the printer's tree lines). */
function youga(heroLines) {
  return [
    "Log file open, 10/22/26 18:00:00",
    ...login({ stamp: STAMP, player: "p-youga", hero: "8003", level: "94" }),
    ...heroLines,
    `[${STAMP}][  1]LogTemp: Display: after login`,
    "[2026.10.22-23.59.00:000][  1]LogTemp: Display: end",
    "",
  ].join("\n");
}
// As the 2026-10-22 log printed it: the base node, then three picks with their memory rows.
const PICKS = [
  "+heroCharacterv3OverView+skillOverView",
  "|                       +treeActivatedNodes+1+node_id [1320001]",
  "|                       |                  +2+matched_slot [1]",
  "|                       |                  | +node_id [1320011]",
  "|                       |                  +3+matched_slot [2]",
  "|                       |                  | +node_id [1320021]",
  "|                       |                  +4+matched_slot [3]",
  "|                       |                  | +node_id [1320032]",
  "|                       +heroPurchaseId [8003]",
];

async function imported(text) {
  const scan = scanGameLog(text);
  assert.equal(scan.dumps.length, 1);
  return importSnapshot(scan, scan.dumps[0].id, await loadGameIdMap());
}

test("a tree hero's activated nodes become its picks, each in the memory row the log names", async () => {
  const { state, report } = await imported(youga(PICKS));
  assert.deepEqual(state.hero.treeTraits["youga-the-ultimate-one"], [
    "I Hold All in My Grasp",
    "I Will Hunt You Down",
    "I Come to Claim My Due",
  ]);
  assert.deepEqual(
    report.sections.hero.imported.map((entry) => entry.item).filter((item) => item.startsWith("Trait path")),
    [
      "Trait path: I Hold All in My Grasp (row 1)",
      "Trait path: I Will Hunt You Down (row 2)",
      "Trait path: I Come to Claim My Due (row 3)",
    ],
  );
  assert.deepEqual(report.sections.hero.missing, []);
});

test("a hero section with no trait picks in either form says so", async () => {
  const { state, report } = await imported(
    youga(["+heroCharacterv3OverView+skillOverView", "|                       +heroPurchaseId [8003]"]),
  );
  assert.deepEqual(state.hero.treeTraits["youga-the-ultimate-one"], []);
  assert.deepEqual(
    report.sections.hero.missing.map((entry) => entry.item),
    ["Hero trait picks"],
  );
});

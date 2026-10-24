// Skill changes logged after a login (src/game-log/game-log-import.js): the game dumps the build at login only and cuts each
// table at 30 entries, but it logs every skill equipped or removed afterwards ("ItemChange@ Add Id=<base>_<uuid> BagNum=1 in
// PageId=-6 SlotId=<socket>", "ItemChange@ Delete Id=… in PageId=-6 SlotId=<socket>"; 2026-10-24 log). The import applies them
// over the login, in order.
import { test } from "node:test";
import assert from "node:assert/strict";
import { importSnapshot, loadGameIdMap, scanGameLog } from "../../src/game-log/game-log-import.js";
import { login } from "../e2e/fixtures/game-log.js";

const STAMP = "2026.10.24-02.45.56:123";
const id = (base, n) => `${base}_00000000-0000-0000-0000-00000000000${n}`;
// Barrier Burst (7085) in Active slot 1 and Control Spell (7434) in its second socket; Psychic Burst (7529) is in the skill list.
const LOGIN = [
  ...login({ stamp: STAMP, player: "p-bing", hero: "4002", level: "87" }),
  `+skillLayout+slots+1+key [1]`,
  `|           |     | +value+skillId [${id(7085, 1)}]`,
  `|           |     +2+key [102]`,
  `|           |     | +value+skillId [${id(7434, 2)}]`,
  `+skills+skills+1+Id [${id(7529, 3)}]`,
  `|      |      | +Level [17]`,
];
const event = (time, line) => `[2026.10.24-${time}:000][  1]TLLua: Display: [Game] ItemChange@ ${line}`;

function scan(after) {
  return scanGameLog(
    [
      "Log file open, 10/24/26 00:00:00",
      ...LOGIN,
      `[${STAMP}][  1]LogTemp: Display: after login`,
      ...after,
      "[2026.10.24-03.59.00:000][  1]LogTemp: Display: end",
      "",
    ].join("\n"),
  );
}

test("a support equipped after the login fills its socket, with its level from the login's skill list", async () => {
  const log = scan([event("03.00.00", `Add Id=${id(7529, 3)} BagNum=1 in PageId=-6 SlotId=101`)]);
  const { state, report } = importSnapshot(log, log.dumps[0].id, await loadGameIdMap());
  assert.deepEqual(state.skills.supportOrder["trait:Barrier Burst"].slice(0, 2), ["Psychic Burst", "Control Spell"]);
  assert.ok(
    report.sections.skills.imported.some((entry) =>
      /^Barrier Burst support 1: Psychic Burst Lv 17 \(equipped after the login, at 2026-10-24 03:00:00 UTC\)$/.test(
        entry.item,
      ),
    ),
  );
});

test("a support removed after the login leaves its socket empty, even where an older login had one", async () => {
  // An older login shows Control Spell in socket 102; the newer one's table was cut before it; then it is taken out.
  const older = login({ stamp: "2026.10.24-01.00.00:000", player: "p-bing", hero: "4002", level: "87" });
  const log = scanGameLog(
    [
      "Log file open, 10/24/26 00:00:00",
      ...older,
      ...LOGIN.slice(older.length),
      "[2026.10.24-01.00.00:000][  1]LogTemp: Display: after login",
      ...LOGIN.slice(0, -4),
      // The login lists every skill socket in use (as the game does), 102 among them.
      "+SkillSlot+costSlot+1 [1]",
      "|         |        +2 [102]",
      `[${STAMP}][  1]LogTemp: Display: after login`,
      event("03.00.00", `Delete Id=${id(7434, 2)} in PageId=-6 SlotId=102`),
      "[2026.10.24-03.59.00:000][  1]LogTemp: Display: end",
      "",
    ].join("\n"),
  );
  const newest = log.dumps.find((dump) => dump.stamp.startsWith("2026-10-24T02:45"));
  const { state } = importSnapshot(log, newest.id, await loadGameIdMap());
  assert.ok(!(state.skills.supportOrder["trait:Barrier Burst"] || []).includes("Control Spell"));
});

test("changes in another page (the bag) are not skill changes", async () => {
  const log = scan([event("03.00.00", `Add Id=${id(7529, 3)} BagNum=1 in PageId=101 SlotId=61`)]);
  assert.deepEqual(log.dumps[0].skillChanges, []);
});

// "Delete old game logs" in the Import from game dialog: how the game's old logs the local reader saw are shown
// (src/app/bridge/game-log-import-view.ts gameLogBackups).
import { test } from "node:test";
import assert from "node:assert/strict";
import { gameLogBackups } from "../../src/app/bridge/game-log-import-view.ts";

test("old game logs show their count and size in whole MB", () => {
  assert.deepEqual(gameLogBackups({ count: 2, bytes: 359.4 * 1024 * 1024 }), { count: 2, size: "359 MB" });
  assert.deepEqual(gameLogBackups({ count: 1, bytes: 300 * 1024 }), { count: 1, size: "under 1 MB" });
});

test("no old game logs (or no local reader) shows nothing", () => {
  assert.equal(gameLogBackups({ count: 0, bytes: 0 }), null);
  assert.equal(gameLogBackups(undefined), null);
});

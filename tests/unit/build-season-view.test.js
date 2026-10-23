// What the build strip says about the open build's season (src/app/bridge/build-season-view.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSeasonView } from "../../src/app/bridge/build-season-view.ts";

test("a build of the current season says nothing; one without season fields neither", () => {
  assert.equal(buildSeasonView({ season: "ss14", seasonOrigin: "ss14", seasonChange: null }), null);
  assert.equal(buildSeasonView({}), null);
  assert.equal(buildSeasonView(null), null);
});

test("a build made in an earlier season names it, with the change until it is dismissed", () => {
  const change = { from: "ss13", to: "ss14", removed: ["Lost Ring (inventory)"], talentPointsReturned: 0 };
  assert.deepEqual(buildSeasonView({ seasonOrigin: "ss13", seasonChange: change }), {
    text: "SS13 build",
    detail: "Made in SS13, read with SS14 rules",
    change: {
      summary: "Moved from SS13 to SS14: 1 incompatible part removed",
      removed: ["Lost Ring (inventory)"],
    },
  });
  assert.equal(buildSeasonView({ seasonOrigin: "ss13", seasonChange: null })?.change, null);
});

// The build tabs' order (src/app/bridge/build-tab-order.ts): what a stored order becomes, and where a dragged tab lands.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTabOrder, moveBuildTab } from "../../src/app/bridge/build-tab-order.ts";

const views = ["hero", "follower", "skills", "equipment", "pacts", "talents"];

test("a stored order keeps its known views in its order and adds the missing ones in the default order", () => {
  assert.deepEqual(buildTabOrder(["talents", "skills"], views), [
    "talents",
    "skills",
    "hero",
    "follower",
    "equipment",
    "pacts",
  ]);
  assert.deepEqual(buildTabOrder(["skills", "gone", "skills", 3], views), [
    "skills",
    "hero",
    "follower",
    "equipment",
    "pacts",
    "talents",
  ]);
  for (const broken of [null, undefined, "skills", { 0: "skills" }])
    assert.deepEqual(buildTabOrder(broken, views), views);
});

test("a tab dropped on another takes its place: before a later tab's neighbours, after an earlier one's", () => {
  assert.deepEqual(moveBuildTab(views, "talents", "follower"), [
    "hero",
    "talents",
    "follower",
    "skills",
    "equipment",
    "pacts",
  ]);
  assert.deepEqual(moveBuildTab(views, "hero", "skills"), [
    "follower",
    "skills",
    "hero",
    "equipment",
    "pacts",
    "talents",
  ]);
  assert.deepEqual(moveBuildTab(views, "skills", "skills"), views);
  assert.deepEqual(moveBuildTab(views, "skills", "unknown"), views);
});

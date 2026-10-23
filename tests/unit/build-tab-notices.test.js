// The build tabs' notices (src/app/bridge/build-tab-notices.ts) and the library's record of a build's origin
// (src/app/storage/build-library.ts): a game-log build without its follower warns on the Follower tab.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTabNotices, FOLLOWER_NOT_IN_LOG } from "../../src/app/bridge/build-tab-notices.ts";
import { normalizeBuildLibrary } from "../../src/app/storage/build-library.ts";

const state = (followerId) => ({ followers: { followerId, rarity: null, skills: [] } });

test("a game-log build warns on the Follower tab until it has a follower", () => {
  assert.deepEqual(buildTabNotices({ origin: "game-log", state: state(null) }), { follower: FOLLOWER_NOT_IN_LOG });
  assert.deepEqual(buildTabNotices({ origin: "game-log", state: state("lion-queen") }), {});
});

test("a build made by hand, or no open build, has no notices", () => {
  assert.deepEqual(buildTabNotices({ state: state(null) }), {});
  assert.deepEqual(buildTabNotices(null), {});
});

test("the library keeps a build's game-log origin and drops any other value", () => {
  const library = normalizeBuildLibrary({
    builds: [
      { id: "a", name: "A", origin: "game-log" },
      { id: "b", name: "B", origin: "somewhere" },
      { id: "c", name: "C" },
    ],
  });
  assert.deepEqual(
    library.builds.map((build) => build.origin),
    ["game-log", undefined, undefined],
  );
  assert.equal("origin" in library.builds[2], false);
});

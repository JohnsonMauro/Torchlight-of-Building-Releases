// The follower model (packages/engine/src/followers/follower-model.js) on the owner's Lion Queen (2026-10-30): Tartarus:
// Speed Phantom III (Disarm, Periodic Burst), Black Hole III (Increased Area, Catalyst), Blazing Meteor III (Jump, Coercion).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  followerCadence,
  followerSelection,
  resolveFollowerEffects,
} from "../../packages/engine/src/followers/follower-model.js";

const LION_QUEEN = {
  followerId: "lion-queen",
  rarity: "legendary",
  rarityScheme: "letter",
  skills: [
    { name: "Tartarus: Speed Phantom", tier: "III", affixes: [{ id: 773000034 }, { id: 773000024 }, null] },
    { name: "Tartarus: Black Hole", tier: "III", affixes: [{ id: 773000002 }, { id: 773000013 }, null] },
    { name: "Tartarus: Blazing Meteor", tier: "III", affixes: [{ id: 773000004 }, { id: 773000049 }, null] },
  ],
};
const selection = (followers = LION_QUEEN) => followerSelection({ followers });
const line = (result, start) => result.lines.find((item) => item.text.startsWith(start));

// Owner, 2026-10-30: the debuff names no duration, like Blazing Meteor's Fire Infiltration, so it is read the same way: held
// while the follower keeps hitting the dummy.
test("Speed Phantom's +12% additional Spell Damage taken is held on the dummy while the follower hits it", () => {
  const result = resolveFollowerEffects(selection());
  assert.equal(line(result, "Enemies take +12% additional Spell Damage when this skill hits").status, "In calc");
  assert.ok(result.derived.some((item) => item.text === "+12% additional Spell Damage taken"));
});

// Disarmed stops Attacks only: a follower whose skills are all Spells keeps casting, at +50% Cast Speed while Disarmed.
test("Disarm stops none of an all-Spell follower's skills and speeds their casts", () => {
  const withDisarm = followerCadence(selection());
  const without = structuredClone(LION_QUEEN);
  without.skills[0].affixes[0] = null;
  const plain = followerCadence(selection(without));
  for (const name of ["Tartarus: Black Hole", "Tartarus: Blazing Meteor"])
    assert.ok(withDisarm.get(name).castSeconds < plain.get(name).castSeconds, name);
  assert.ok(
    withDisarm.get("Tartarus: Blazing Meteor").castsPerSecond > plain.get("Tartarus: Blazing Meteor").castsPerSecond,
  );
  const result = resolveFollowerEffects(selection());
  assert.equal(line(result, "Disarms this unit for 6s after casting this skill").status, "In calc");
});

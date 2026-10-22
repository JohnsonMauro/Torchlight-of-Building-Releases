import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesFilter, tagOptions, toggleTag } from "../../apps/web/src/features/skills/skill-selector-filter.ts";
import { searchMatcher } from "../../src/app/bridge/search-match.ts";

const leap = { tags: ["Mobility", "Attack", "Melee"], search: "leap attack mobility attack melee" };
const iceShot = { tags: ["Cold", "Projectile", "Attack"], search: "ice shot cold projectile attack" };
const frostNova = { tags: ["Cold", "Spell", "Area"], search: "frost nova cold spell area" };
const choices = [leap, iceShot, frostNova];
const search = (query) => searchMatcher(query).matches;

test("a choice shows when it holds the search text and every picked tag", () => {
  assert.equal(matchesFilter(iceShot, search(""), []), true);
  assert.equal(matchesFilter(iceShot, search("ice"), ["Cold", "Attack"]), true);
  assert.equal(matchesFilter(frostNova, search(""), ["Cold", "Attack"]), false);
  assert.equal(matchesFilter(leap, search("ice"), []), false);
});

test("the tag column lists every tag alphabetically with what picking it would leave", () => {
  const options = tagOptions(choices, search(""), ["Cold"]);
  assert.deepEqual(
    options.map((option) => option.tag),
    ["Area", "Attack", "Cold", "Melee", "Mobility", "Projectile", "Spell"],
  );
  const byTag = Object.fromEntries(options.map((option) => [option.tag, option]));
  assert.deepEqual(byTag.Cold, { tag: "Cold", count: 2, picked: true });
  assert.deepEqual(byTag.Attack, { tag: "Attack", count: 1, picked: false });
  assert.equal(byTag.Melee.count, 0);
});

test("the counts follow the search text", () => {
  const byTag = Object.fromEntries(tagOptions(choices, search("nova"), []).map((option) => [option.tag, option.count]));
  assert.equal(byTag.Cold, 1);
  assert.equal(byTag.Attack, 0);
});

test("toggling a tag picks it, toggling it again drops it", () => {
  assert.deepEqual(toggleTag(["Cold"], "Attack"), ["Cold", "Attack"]);
  assert.deepEqual(toggleTag(["Cold", "Attack"], "Cold"), ["Attack"]);
});

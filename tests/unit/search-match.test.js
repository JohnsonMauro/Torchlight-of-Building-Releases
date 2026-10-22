import { test } from "node:test";
import assert from "node:assert/strict";
import { searchMatcher, searchText } from "../../src/app/bridge/search-match.ts";
import { searchPattern } from "../../src/app/gear/safe-regex.ts";

const whirlwind = searchText([
  "Whirlwind",
  "Attack",
  "Melee",
  "Steep Strike:\nDeals 398% Weapon Attack Damage.",
  "+101 % chance to trigger Multistrike",
]);

test("the search text is one lower-case line, with the percent gap closed as the page shows it", () => {
  assert.equal(
    whirlwind,
    "whirlwind attack melee steep strike: deals 398% weapon attack damage. +101% chance to trigger multistrike",
  );
  assert.equal(searchText(["A", null, undefined, "", "B"]), "a b");
});

test("plain words each match somewhere in the text, in any order and any case", () => {
  assert.equal(searchMatcher("").matches(whirlwind), true);
  assert.equal(searchMatcher("damage WEAPON steep").matches(whirlwind), true);
  assert.equal(searchMatcher("strike: deals").matches(whirlwind), true, "a line break reads as a space");
  assert.equal(searchMatcher("101 %").matches(whirlwind), true, "the typed percent gap closes too");
  assert.equal(searchMatcher("damage cold").matches(whirlwind), false);
});

test("/pattern/flags is a regular expression over the whole text, always ignoring case", () => {
  assert.equal(searchMatcher("/deals \\d+% weapon/").matches(whirlwind), true);
  assert.equal(searchMatcher("/^WHIRL/").matches(whirlwind), true);
  assert.equal(searchMatcher("/cold|fire/").matches(whirlwind), false);
  assert.equal(searchMatcher("/deals/").error, "");
});

test("a /pattern/ that does not read, or could freeze the page, matches nothing and says why", () => {
  const broken = searchMatcher("/(deals/");
  assert.equal(broken.matches(whirlwind), false);
  assert.notEqual(broken.error, "");
  const explosive = searchMatcher("/(.*)*z$/");
  assert.equal(explosive.matches(whirlwind), false);
  assert.match(explosive.error, /repeat/);
});

test("searchPattern reads /pattern/flags, drops g and y, and leaves plain text alone", () => {
  assert.equal(searchPattern("ice shot"), null);
  assert.equal(searchPattern("/ice/gy").pattern.flags, "i");
  assert.equal(searchPattern("/ice/m").pattern.flags, "im");
});

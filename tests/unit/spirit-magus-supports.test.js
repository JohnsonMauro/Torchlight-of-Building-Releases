// Supports on a Spirit Magus summon (src/engine/supports/support-compatibility.js with src/data/skills/spirit-magus-skills.js):
// the game reads the summon's tags together with each of the Magus's own skills.
import { test } from "node:test";
import assert from "node:assert/strict";
import { supportCanSupportSkill } from "../../src/engine/supports/support-compatibility.js";
import { tlidbSkillCatalogSs13, tlidbSupportCatalogSs13 } from "../../src/data/catalogs/tlidb-ss13.js";

const skill = (name) => tlidbSkillCatalogSs13.find((entry) => entry.name === name);
const support = (name) => tlidbSupportCatalogSs13.find((entry) => entry.name === name);
const accepts = (supportName, skillName) => supportCanSupportSkill(support(supportName), skill(skillName));

test("Summon Thunder Magus takes Grudge and Target Projection, as the game equips them (2026-10-22 log)", () => {
  // Grudge: Spell (the summon's) + Hit (Lightning Star's); Target Projection: Projectile (Lightning Star's).
  assert.equal(accepts("Grudge", "Summon Thunder Magus"), true);
  assert.equal(accepts("Target Projection", "Summon Thunder Magus"), true);
  assert.equal(accepts("Seal Conversion", "Summon Thunder Magus"), true);
  assert.equal(accepts("Weakness Infiltration", "Summon Thunder Magus"), true);
});

test("a Magus whose skills have no projectile still refuses a projectile support", () => {
  assert.equal(accepts("Target Projection", "Summon Fire Magus"), false);
  assert.equal(accepts("Target Projection", "Summon Frost Magus"), false);
});

test("a skill that is not a Spirit Magus summon is judged on its own tags only", () => {
  assert.equal(accepts("Target Projection", "Precise: Frigid Domain"), false);
});

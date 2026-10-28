// A belt's blending affix read from the game log by its affix id (src/game-log/game-log-import.js): the generated game id
// map's blend table, plus the ids it lacks (packages/engine/data/belt-blend-affix-ids.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGameIdMap, resolveLoggedGearItem } from "../../src/game-log/game-log-import.js";

// A Light Hunter Belt with Rotted Taboo as a 2026-10-27 log prints it (Bing, waist slot 8).
const lightHunterBelt = {
  EnchantAffixs: { 1: { Id: "3704002", Version: "89", source: "13" } },
  Id: "4728_item8",
  Prefix: {
    1: { Id: "51531811", Version: "89", DynArgs: { 1: "376.0" } },
    2: { Id: "51531821", Version: "89", DynArgs: { 1: "39.0" } },
    3: { Id: "51531831", Version: "89" },
    4: { Id: "51531841", Version: "89", DynArgs: { 1: "5.0", 2: "-6.0" } },
  },
  Suffix: { 1: { Id: "51531851", Version: "89", DynArgs: { 1: "-25.0" } } },
  Level: "90",
  UniqueItmId: "113318",
  BaseId: "4728",
  AffixNum: "5",
  FixedBaseAffix: { 1: { Id: "670002", Version: "89", DynArgs: { 1: "50.0" } } },
  EnchantSlots: { 1: { affixId: "3704002" } },
};

test("a belt's Rotted Taboo blend is read from its affix id 3704002", async () => {
  const { item, report } = resolveLoggedGearItem(lightHunterBelt, await loadGameIdMap(), 8);
  assert.equal(item.beltBlendId, "belt-blend-094");
  assert.ok(
    item.modifiers.includes(
      "[Rotted Taboo] Takes 100 True Damage when casting a skill. Interval: 0.1 s\n+3 to All Skill Levels",
    ),
  );
  assert.deepEqual(report.sections.gear.unresolved, []);
});

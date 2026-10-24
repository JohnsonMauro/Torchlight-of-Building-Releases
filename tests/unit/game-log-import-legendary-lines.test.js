// A legendary's lines read from the game log by their affix id (src/game-log/game-log-import.js): the ids the current
// season's TLIDB pages print (packages/engine/data/gear/legendary-affix-ids.generated.js,
// scripts/fetch-tlidb-legendary-affix-ids.js), which the older game id map lacks for items the season added or rewrote.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGameIdMap, resolveLoggedGearItem } from "../../src/game-log/game-log-import.js";
import { parseLegendaryAffixes } from "../../scripts/fetch-tlidb-legendary-affix-ids.js";

// An On the Sublime wand as a 2026-10-23 log prints it (Bing's off hand, item level 85).
const onTheSublime = {
  AffixNum: "4",
  BaseAttrAffix: { 1: { DynArgs: { 1: "500.0" }, Id: "750000" }, 2: { DynArgs: { 1: "1.2" }, Id: "750001" } },
  Level: "85",
  Prefix: {
    1: { DynArgs: { 1: "1.0" }, Id: "51341311" },
    2: { DynArgs: { 1: "26.0" }, Id: "51341321" },
    3: { DynArgs: { 1: "10.0" }, Id: "51341331" },
    4: { DynArgs: { 1: "2.0" }, Id: "51341341" },
  },
  UniqueItmId: "111413",
  FixedBaseAffix: { 1: { DynArgs: { 1: "7.0", 2: "7.0" }, Id: "520006" } },
  BaseId: "2005",
  Id: "2005_item7",
};

test("an SS14 legendary's lines are read by the ids its TLIDB page prints (On the Sublime)", async () => {
  const { item, report } = resolveLoggedGearItem(onTheSublime, await loadGameIdMap(), 3);
  assert.deepEqual(item.legendaryModifiers, [
    "+1 Spell Projectile Skill Level",
    "+26 % Cast Speed",
    "+10 % additional Projectile Speed",
    "+2 % additional Spell Projectile Damage for each Spell Projectile generated recently. Stacks up to 10 times",
  ]);
  assert.deepEqual(report.sections.gear.unresolved, []);
});

test("an item page's legendary lines: each tier-marked modifier span, its tier and its text", () => {
  const html = `<span data-modifier-id="520006">Adds <span class="text-mod">7</span> - <span class="text-mod">7</span> Lightning Damage to Spells</span>
    <div><span data-modifier-id="51341321"><span class="tier tier1"></span><span class="text-mod">+(20&ndash;30)</span>% Cast Speed</span></div>
    <div><span data-modifier-id="51521520"><span class="tier tier0"></span><span class="text-mod">(-25&ndash;-5)</span>% Elemental Resistance<br/>-30% Movement Speed</span></div>`;
  assert.deepEqual(parseLegendaryAffixes(html), [
    { id: "51341321", tier: 1, text: "+(20–30)% Cast Speed" },
    { id: "51521520", tier: 0, text: "(-25–-5)% Elemental Resistance\n-30% Movement Speed" },
  ]);
});

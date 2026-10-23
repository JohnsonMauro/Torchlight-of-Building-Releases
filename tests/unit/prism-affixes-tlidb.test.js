// TLIDB's Ethereal Prism affixes (scripts/fetch-tlidb-prism-affixes.js → packages/engine/data/talents/prism-affixes-tlidb.generated.js):
// the page parser, and the lower-tier ids a dropped prism logs that the upstream id map lacks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrismAffixes } from "../../scripts/fetch-tlidb-prism-affixes.js";
import { TLIDB_PRISM_AFFIXES } from "../../packages/engine/data/talents/prism-affixes-tlidb.generated.js";

const PAGE = [
  '<div class="card-header">Ethereal Prism Affix /2 </div><table>',
  '<tr><td><span data-modifier-id="1214308031"><span class="tier tier1"></span>The area of effect expands to <span class="text-mod"><e id=12000017 class="Hyperlink" data-hover="/x" href="4x3_Rectangle">4x3 Rectangle</e></span></span></td><td>Ethereal Prism</td><td>Random Affix</td></tr>',
  '<tr><td><span data-modifier-id="1214300061"><span class="tier tier1"></span>All <span class="text-mod">Micro Talent</span> within the area also gain: <span class="text-mod"><span data-modifier-id="1204400061"><span class="tier tier1"></span><span class="text-mod">+10</span>% Critical Strike Rating<br/><span class="text-mod">+10</span>% Minion Critical Strike Rating</span></span></span></td><td>Ethereal Prism</td><td><a data-hover="?s=ItemBase%2F370101" href="Prism_Gauge_-_Rare">Prism Gauge - Rare</a></td></tr>',
  "</table>",
].join("\n");

test("the page's rows become the id map's entry shape, nested modifier ids and links read as text", () => {
  assert.deepEqual(parsePrismAffixes(PAGE), {
    1214300061: [
      "prism",
      "All Micro Talent within the area also gain: +10% Critical Strike Rating\n+10% Minion Critical Strike Rating",
      "Prism Gauge - Rare",
    ],
    1214308031: ["prism", "The area of effect expands to 4x3 Rectangle", "Random Affix"],
  });
});

test("a page whose row count differs from its header is refused", () => {
  assert.throws(() => parsePrismAffixes(PAGE.replace("/2 ", "/3 ")), /Expected 3 prism affix rows, parsed 2/);
});

test("the generated table holds the lower-tier ids a dropped prism logs (2026-10-22 Haze prism)", () => {
  assert.equal(TLIDB_PRISM_AFFIXES["1214308031"]?.[1], "The area of effect expands to 4x3 Rectangle");
  assert.match(TLIDB_PRISM_AFFIXES["1214300061"]?.[1] ?? "", /^All Micro Talent within the area also gain: \+10%/);
});

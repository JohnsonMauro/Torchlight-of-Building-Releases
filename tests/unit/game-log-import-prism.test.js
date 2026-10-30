// importSnapshot (src/game-log/game-log-import.js): what the report says about an installed prism's lines.
import { test } from "node:test";
import assert from "node:assert/strict";
import { importSnapshot, loadGameIdMap } from "../../src/game-log/game-log-import.js";

/** One dump whose 4th tree is the Lich with a Haze on its node at game position (1, 5), holding `attributes`. */
const hazeOnLich = (lichCareer, attributes) => ({
  dumps: [
    {
      id: "d1",
      stamp: "2026-10-22T21:43:34.525Z",
      character: 1,
      accountGroup: 1,
      tree: {
        player: { Level: "94", HeroId: "1001", HeroPurchaseId: "1001" },
        geniusInfos: {
          info: {
            4: {
              geniusCareerId: lichCareer,
              geniusList: { 1: { geniusId: "77", point: "0", position: { x: "1", y: "5" } } },
              prismInfo: {
                geniusId: "77",
                item: {
                  BaseId: "360502",
                  BaseAttrAffix: Object.fromEntries(attributes.map((id, index) => [index + 1, { Id: id }])),
                },
              },
            },
          },
        },
      },
    },
  ],
});
const talentReport = async (attributes) => {
  const idMap = await loadGameIdMap();
  const lich = Object.entries(idMap.professions).find(([, name]) => name === "Lich")[0];
  return importSnapshot(hazeOnLich(lich, attributes), "d1", idMap).report.sections.talents;
};

test("a prism's base attribute with no text in the game data is a note, not an unresolved line", async () => {
  const report = await talentReport(["1204509011"]);
  assert.deepEqual(
    report.unresolved.filter((entry) => entry.item.includes("1204509011")),
    [],
  );
  assert.deepEqual(
    report.notes.filter((entry) => entry.item.includes("1204509011")),
    [
      {
        item: "Lich: prism base attribute 1204509011",
        reason: "the game data has no text for it; the planner does not read it",
      },
    ],
  );
});

// 2026-10-30 (owner's Phantasmagoria prism): the id map writes the rare affix as "+10.5% Aura Effect" while the planner's
// option (TLIDB's tier) reads "10.5% Aura Effect"; a "+" before a number must not keep them apart.
test("a prism's random affixes import whatever sign the id map gives their numbers", async () => {
  const idMap = await loadGameIdMap();
  const lich = Object.entries(idMap.professions).find(([, name]) => name === "Lich")[0];
  const snapshot = hazeOnLich(lich, []);
  snapshot.dumps[0].tree.geniusInfos.info[4].prismInfo.item.Prefix = {
    1: { Id: "1224308011" },
    2: { Id: "1224300521" },
    3: { Id: "1224310071" },
  };
  const { state, report } = importSnapshot(snapshot, "d1", idMap);
  const prism = state.talents.prismInventory[0];
  assert.equal(prism.radiusAffix, "The Effect Area expands to 3x3 Rectangle");
  assert.equal(prism.rareAffix, "All Legendary Medium Talent within the area also gain: 10.5% Aura Effect");
  assert.match(
    prism.legendaryAffix,
    /^When activating 2 Legendary Medium Talent within the area, Gains Spell Aggression/,
  );
  assert.deepEqual(
    report.sections.talents.unresolved.filter((entry) => /prism affix/.test(entry.item)),
    [],
  );
});

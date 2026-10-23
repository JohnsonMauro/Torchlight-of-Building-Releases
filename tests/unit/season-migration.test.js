// A build from an earlier season is carried into the current one (packages/engine/src/state/season-migration.js): it keeps what is
// still compatible, loses what the current season no longer has (talent points go back) and keeps the season it was made
// in and the list of what changed until the user dismisses it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { allProfessionTalentCatalogueSs14 } from "../../packages/engine/data/talents/all-profession-trees-ss14.generated.js";
import { legendaryGearSs14 } from "../../packages/engine/data/gear/legendary-gear-ss14.generated.js";
import {
  migrateBuildSeason,
  removeIncompatible,
  seasonChangeSummary,
} from "../../packages/engine/src/state/season-migration.js";
import { currentSeason } from "../../packages/engine/src/state/season.ts";
import { normalizePlannerState } from "../../packages/engine/src/state/planner-state.ts";

const lich = allProfessionTalentCatalogueSs14.Lich;
const node = lich.nodes.find((entry) => entry.maxRank === 1);
const at = node.coordinate.join(",");
const legendary = legendaryGearSs14[0];

// An SS13 build: a node the tree has (two ranks too many), a node it does not have, a core it offers and one it does not,
// a legendary the catalog has and one it does not (equipped and in the inventory).
const ss13Build = () => ({
  season: "ss13",
  talentRanks: { [`Lich:${at}`]: 3, "Lich:9,9": 2, "Old Tree:0,0": 3 },
  talents: {
    selectedTrees: ["Goddess of Knowledge", "Prophet", "Marksman", "Lich"],
    coreSelections: { "Lich:24": lich.coreTalents.at(-1).name, "Lich:12": "Gone Core" },
  },
  equipmentOverrides: {
    helmet: { name: "Vanished Crown", rarity: "legendary", sourceInventoryId: "gear-1" },
    belt: { name: legendary.name, rarity: "legendary" },
  },
  equipmentInventory: [
    { id: "gear-1", name: "Vanished Crown", rarity: "legendary", slot: "helmet" },
    { id: "gear-2", name: "Lost Ring", rarity: "legendary", slot: "ring1" },
    { id: "gear-3", name: legendary.name, rarity: "legendary", slot: "belt" },
  ],
});

test("a build without a season follows the current one and changes nothing", () => {
  const state = migrateBuildSeason({ talentRanks: { "Lich:9,9": 2 } });
  assert.deepEqual(state, {
    talentRanks: { "Lich:9,9": 2 },
    season: currentSeason.id,
    seasonOrigin: currentSeason.id,
  });
});

test("an earlier season's build loses what the current one lacks, gets the points back and lists it", () => {
  const state = migrateBuildSeason(ss13Build());
  assert.equal(state.season, currentSeason.id);
  assert.equal(state.seasonOrigin, "ss13");
  assert.deepEqual(state.talentRanks, { [`Lich:${at}`]: 1 });
  assert.deepEqual(state.talents.coreSelections, { "Lich:24": lich.coreTalents.at(-1).name });
  assert.deepEqual(Object.keys(state.equipmentOverrides), ["belt"]);
  assert.deepEqual(state.disabledEquipmentSlots, ["helmet"]);
  assert.deepEqual(
    state.equipmentInventory.map((item) => item.id),
    ["gear-3"],
  );
  assert.deepEqual(state.seasonChange, {
    from: "ss13",
    to: currentSeason.id,
    removed: [
      `Talent Lich ${at}: 2 ranks`,
      "Talent Lich 9,9",
      "Talent Old Tree 0,0",
      "Core talent Gone Core (Lich)",
      "Vanished Crown (helmet)",
      "Lost Ring (inventory)",
    ],
    talentPointsReturned: 7,
  });
  assert.equal(
    seasonChangeSummary(state.seasonChange),
    "Moved from SS13 to SS14: 6 incompatible parts removed, 7 talent points returned",
  );
});

test("a build is carried once: reading it again changes nothing more", () => {
  const once = normalizePlannerState(ss13Build());
  assert.equal(once.season, currentSeason.id);
  assert.equal(once.seasonOrigin, "ss13");
  assert.deepEqual(normalizePlannerState(once), once);
});

test("a build from a season the planner does not know is refused", () => {
  assert.throws(() => migrateBuildSeason({ season: "ss99" }), /made for SS99, a season this planner does not know yet/);
  assert.throws(() => normalizePlannerState({ season: "ss99" }), TypeError);
});

test("the steps run in season order, then the compatibility pass, and a pending change keeps its first season", () => {
  const known = [
    { id: "s1", label: "S1", name: "" },
    { id: "s2", label: "S2", name: "" },
    { id: "s3", label: "S3", name: "" },
  ];
  const ran = [];
  const steps = {
    s1: (state) => (ran.push("s1"), { ...state, step1: true }),
    s2: (state) => (ran.push("s2"), { ...state, step2: true }),
  };
  const compatible = (state) => (ran.push("compatible"), { state, removed: ["x"], talentPointsReturned: 2 });
  const state = migrateBuildSeason(
    { season: "s1", seasonChange: { from: "s0", to: "s1", removed: ["old"], talentPointsReturned: 1 } },
    { known, steps, compatible },
  );
  assert.deepEqual(ran, ["s1", "s2", "compatible"]);
  assert.equal(state.step1 && state.step2, true);
  assert.deepEqual(state.seasonChange, { from: "s0", to: "s3", removed: ["old", "x"], talentPointsReturned: 3 });
});

test("an installed Inverse Image keeps the ranks on its tree's mirrored positions; an Ethereal Prism does not", () => {
  const withPrism = (type) =>
    removeIncompatible({
      talentRanks: { "Lich:9,9": 1 },
      talents: {
        prismInventory: [{ id: "p1", type }],
        installedPrisms: { Lich: "p1" },
        installedPrismNodes: { Lich: at },
      },
    });
  assert.deepEqual(withPrism("inverse").state.talentRanks, { "Lich:9,9": 1 });
  assert.deepEqual(withPrism("inverse").removed, []);
  assert.deepEqual(withPrism("ethereal").state.talentRanks, {});
  assert.deepEqual(withPrism("ethereal").removed, ["Talent Lich 9,9"]);
});

// A build from an earlier season is carried into the current one (packages/engine/src/state/season-migration.js): it keeps what is
// still compatible, loses what the current season no longer has (talent points go back) and keeps the season it was made
// in and the list of what changed until the user dismisses it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { allProfessionTalentCatalogue } from "../../packages/engine/data/talents/all-profession-trees.generated.js";
import { legendaryGear } from "../../packages/engine/data/gear/legendary-gear.generated.js";
import { migrateBuildSeason, seasonChangeSummary } from "../../packages/engine/src/state/season-migration.js";
import { removeIncompatible } from "../../packages/engine/src/state/season-compatibility.js";
import { currentSeason } from "../../packages/engine/src/state/season.ts";
import { normalizePlannerState } from "../../packages/engine/src/state/planner-state.ts";
import { goldenInputs } from "../golden/cases.js";
import { readFileSync } from "node:fs";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);

const lich = allProfessionTalentCatalogue.Lich;
const node = lich.nodes.find((entry) => entry.maxRank === 1);
const at = node.coordinate.join(",");
const legendary = legendaryGear[0];

// An SS13 build: a node the tree has (two ranks too many, and its prerequisites unallocated), a node it does not have, a
// core it offers and one it does not,
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
  // The node keeps one rank, then goes: nothing before it on its path is allocated.
  assert.deepEqual(state.talentRanks, {});
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
      `Talent Lich ${at} (its prerequisites are gone)`,
      "Vanished Crown (helmet)",
      "Lost Ring (inventory)",
    ],
    talentPointsReturned: 8,
  });
  assert.equal(
    seasonChangeSummary(state.seasonChange),
    "Moved from SS13 to SS14: 7 incompatible parts removed, 8 talent points returned",
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

test("every golden build, all of the current season, goes through the compatibility pass untouched", () => {
  for (const { id, state } of goldenInputs()) {
    const result = removeIncompatible(structuredClone(state));
    assert.deepEqual([result.removed, result.talentPointsReturned], [[], 0], id);
    assert.deepEqual(normalizePlannerState(result.state), normalizePlannerState(state), id);
  }
});

test("a hero the game no longer has gives way to the default hero; gone traits and loadouts go", () => {
  const gone = removeIncompatible({
    hero: { selectedHeroId: "vanished-hero", selectedTraits: { level45: "Old Trait" }, heroLoadouts: {} },
  });
  assert.deepEqual(gone.state.hero, { heroLoadouts: {} });
  assert.deepEqual(gone.removed, ["Hero vanished-hero (the default hero takes its place)"]);
  const kept = removeIncompatible({
    hero: {
      selectedHeroId: youga.hero.selectedHeroId,
      selectedTraits: { level45: "Old Trait", level60: "" },
      heroLoadouts: { [youga.hero.selectedHeroId]: {}, "vanished-hero": {} },
    },
  });
  assert.deepEqual(kept.state.hero.selectedTraits, { level60: "" });
  assert.deepEqual(Object.keys(kept.state.hero.heroLoadouts), [youga.hero.selectedHeroId]);
  assert.deepEqual(kept.removed, ["Hero trait Old Trait", "Loadout of hero vanished-hero"]);
});

test("a skill the game no longer has leaves its board slot empty and takes its supports; a gone support empties its slot", () => {
  const skills = structuredClone(youga.skills);
  const [first, second] = skills.customSetups;
  first.name = "Vanished Skill";
  skills.supportOrder[second.instanceId] = ["Vanished Support", ...skills.supportOrder[second.instanceId].slice(1)];
  const { state, removed } = removeIncompatible({ skills });
  assert.equal(
    state.skills.customSetups.some((setup) => setup.instanceId === first.instanceId),
    false,
  );
  assert.equal(state.skills.boardSlots.skills[skills.boardSlots.skills.indexOf(first.instanceId)], "");
  assert.equal(state.skills.boardSlots.skills.length, skills.boardSlots.skills.length);
  assert.equal(first.instanceId in state.skills.supportOrder, false);
  assert.equal(state.skills.supportOrder[second.instanceId][0], "");
  assert.deepEqual(removed, ["Skill Vanished Skill", `Support Vanished Support (${second.name})`]);
});

test("a Pactspirit the game no longer has leaves its slot empty with its levels and nodes; a gone Kismet goes", () => {
  const { state, removed } = removeIncompatible({
    pacts: {
      selectedSpirits: ["Old Spirit", youga.pacts.selectedSpirits[1], ""],
      activeSpirits: { "Old Spirit": true, [youga.pacts.selectedSpirits[1]]: true },
      spiritLevels: { "Old Spirit": 6 },
      nativeNodeQuantities: { "Old Spirit:0": 1, [`${youga.pacts.selectedSpirits[1]}:0`]: 1 },
      kismetSlots: { a: { name: "Old Kismet", rolls: [] } },
    },
  });
  assert.deepEqual(state.pacts.selectedSpirits, ["", youga.pacts.selectedSpirits[1], ""]);
  assert.deepEqual(Object.keys(state.pacts.activeSpirits), [youga.pacts.selectedSpirits[1]]);
  assert.deepEqual(state.pacts.spiritLevels, {});
  assert.deepEqual(Object.keys(state.pacts.nativeNodeQuantities), [`${youga.pacts.selectedSpirits[1]}:0`]);
  assert.deepEqual(state.pacts.kismetSlots, {});
  assert.deepEqual(removed, ["Pactspirit Old Spirit", "Kismet Old Kismet"]);
});

test("ranks whose prerequisites went with a removed node go too, and their points come back", () => {
  // The Youga build without Goddess of Knowledge 1,1, as if the season had removed it: 2,1 comes only after it.
  const gone = "Goddess of Knowledge:1,1";
  const talentRanks = { ...youga.talentRanks };
  delete talentRanks[gone];
  const { state, removed, talentPointsReturned } = removeIncompatible({ ...structuredClone(youga), talentRanks });
  assert.deepEqual(removed, ["Talent Goddess of Knowledge 2,1 (its prerequisites are gone)"]);
  const returned = Object.keys(talentRanks)
    .filter((key) => !(key in state.talentRanks))
    .reduce((sum, key) => sum + talentRanks[key], 0);
  assert.equal(talentPointsReturned, returned);
  assert.equal(returned, youga.talentRanks["Goddess of Knowledge:2,1"]);
  assert.deepEqual(removeIncompatible(state).removed, []);
});

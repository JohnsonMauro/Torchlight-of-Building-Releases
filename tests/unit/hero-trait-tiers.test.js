// A by-tier hero's 45 / 60 / 75 picks (packages/engine/src/heroes/trait-choice-groups.js): one trait per choice group, read
// from the group's key by the calculation and the Hero Trait tab alike; older keys ("level45", Bing's group-less
// "<heroId>:level45") move into their group when a build is loaded.
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultPlannerState, normalizePlannerState } from "../../packages/engine/src/state/planner-state.ts";
import { heroTraitStatLines } from "../../packages/engine/src/character-stats.js";
import { heroTraitsView } from "../../src/app/bridge/hero-traits-view-model.ts";
import { importSnapshot, loadGameIdMap } from "../../src/game-log/game-log-import.js";

const BING = "bing-creative-genius";
const withHero = (hero) => {
  const state = structuredClone(defaultPlannerState);
  state.hero = { ...state.hero, memories: { level45: "M", level60: "M", level75: "M" }, ...hero };
  return normalizePlannerState(state);
};
const traitSources = (state) => [
  ...new Set(heroTraitStatLines(state).map((line) => line.source.replace(/ \(Lv.*$/, ""))),
];

// A Bing build as the game-log import left it ("level45" …) after the owner picked both groups on the Hero Trait tab
// (2026-10-23): the imported Hyper-Resonance Hypothesis is a lower choice of 75, where Multi-Coupling Equation is picked.
const bingSelections = {
  level45: "Inspiration Overflow",
  level60: "Auto-Ingenuity Program",
  level75: "Hyper-Resonance Hypothesis",
  [`${BING}:level45:upper`]: "Inspiration Overflow",
  [`${BING}:level45:lower`]: "Super Sonic Protocol",
  [`${BING}:level60:upper`]: "Mind Domain",
  [`${BING}:level60:lower`]: "Auto-Ingenuity Program",
  [`${BING}:level75:upper`]: "Flash of Brilliance",
  [`${BING}:level75:lower`]: "Multi-Coupling Equation",
};

test("Bing: a pick under an older key and its group's key counts once, and a group's own pick wins", () => {
  const state = withHero({ selectedHeroId: BING, selectedTraits: bingSelections });
  const spellBurstLines = heroTraitStatLines(state).filter((line) =>
    /additional Hit Damage for skills cast by Spell Burst/.test(line.text),
  );
  assert.equal(spellBurstLines.length, 1, "Inspiration Overflow's Spell Burst line once");
  assert.deepEqual(traitSources(state).sort(), [
    "Hero trait: Auto-Ingenuity Program",
    "Hero trait: Creative Genius",
    "Hero trait: Flash of Brilliance",
    "Hero trait: Inspiration Overflow",
    "Hero trait: Mind Domain",
    "Hero trait: Multi-Coupling Equation",
    "Hero trait: Super Sonic Protocol",
  ]);
});

test("loading a build moves older trait keys into their group's key", () => {
  const bing = withHero({ selectedHeroId: BING, selectedTraits: bingSelections });
  assert.deepEqual(bing.hero.selectedTraits, {
    [`${BING}:level45:upper`]: "Inspiration Overflow",
    [`${BING}:level45:lower`]: "Super Sonic Protocol",
    [`${BING}:level60:upper`]: "Mind Domain",
    [`${BING}:level60:lower`]: "Auto-Ingenuity Program",
    [`${BING}:level75:upper`]: "Flash of Brilliance",
    [`${BING}:level75:lower`]: "Multi-Coupling Equation",
  });
  // Bing before the two groups: one pick per tier under "<heroId>:level45".
  const older = withHero({
    selectedHeroId: BING,
    selectedTraits: { [`${BING}:level45`]: "Super Sonic Protocol", level60: "Mind Domain" },
  });
  assert.deepEqual(older.hero.selectedTraits, {
    [`${BING}:level45:lower`]: "Super Sonic Protocol",
    [`${BING}:level60:upper`]: "Mind Domain",
  });
  // Another hero: the import's "level45" is the hero's own key.
  const rehan = withHero({ selectedHeroId: "rehan-anger", selectedTraits: { level45: "Righteous Fury" } });
  assert.deepEqual(rehan.hero.selectedTraits, { "rehan-anger:level45": "Righteous Fury" });
});

test("the Hero Trait tab shows the picks the calculation reads", () => {
  const state = withHero({ selectedHeroId: BING, selectedTraits: bingSelections });
  const view = heroTraitsView(state.hero, "traits");
  const picked = view.content.tiers.flatMap((tier) =>
    tier.groups.flatMap((group) => group.choices.filter((choice) => choice.selected).map((choice) => choice.name)),
  );
  const counted = traitSources(state)
    .map((source) => source.slice("Hero trait: ".length))
    .filter((name) => name !== "Creative Genius");
  assert.deepEqual(picked.sort(), counted.sort());
});

test("the game-log import keeps both of Bing's picks of a tier, each in its group", async () => {
  // A Bing login (HeroId 810, purchase 4002) with one trait of each group active at 45 and 60 (ids from the game id map).
  const scan = {
    dumps: [
      {
        id: "d1",
        stamp: "2026-10-23T21:56:59.041Z",
        character: 1,
        accountGroup: 1,
        tree: {
          player: { Level: "82", HeroId: "810", HeroPurchaseId: "4002" },
          heroCharacterv3OverView: {
            pointOverView: { activeId: { 1: "820011", 2: "820041", 3: "820021", 4: "820051" } },
          },
        },
      },
    ],
  };
  const { state } = importSnapshot(scan, "d1", await loadGameIdMap());
  assert.deepEqual(state.hero.selectedTraits, {
    [`${BING}:level45:upper`]: "Inspiration Overflow",
    [`${BING}:level45:lower`]: "Super Sonic Protocol",
    [`${BING}:level60:upper`]: "Mind Domain",
    [`${BING}:level60:lower`]: "Law of Ingenuity",
  });
});

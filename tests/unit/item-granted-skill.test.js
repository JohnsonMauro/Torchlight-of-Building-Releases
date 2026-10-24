// A skill an item grants (Necklace of Firebird's Barrier Burst; packages/engine/src/heroes/trait-board-grants.js): while the
// item is equipped the skill holds Active slot 1 over the user's own skill, which stays saved; the game-log import keeps the
// item's line and the skill's supports.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { normalizePlannerState } from "../../packages/engine/src/state/planner-state.ts";
import { fillTemplate, importSnapshot, loadGameIdMap } from "../../src/game-log/game-log-import.js";
import { legendaryGear } from "../../packages/engine/data/gear/legendary-gear.generated.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const FIREBIRD_LINE =
  "When you have a Barrier, triggers the Main Skill upon taking damage, then removes Barrier\nReplaces the Main Skill with Lv. 20 Barrier Burst";
const firebird = {
  name: "Necklace of Firebird",
  base: "Necklace",
  rarity: "legendary",
  legendaryModifiers: [
    "+12 % Max Life and Max Energy Shield",
    FIREBIRD_LINE,
    "+20 % additional Barrier Shield -100 % additional Armor",
  ],
  modifiers: [
    "+12 % Max Life and Max Energy Shield",
    FIREBIRD_LINE,
    "+20 % additional Barrier Shield -100 % additional Armor",
  ],
  implicitModifiers: [],
};

test("a logged line keeps its text when the log also carries values the text does not show", () => {
  // The game logs 1750, 20, 1 for Necklace of Firebird's line; only the 20 (the skill level) is printed.
  assert.deepEqual(fillTemplate(FIREBIRD_LINE, [1750, 20, 1]), {
    ok: true,
    text: FIREBIRD_LINE,
    note: "the log also carries values the text does not show",
  });
  // A shown number the log does not carry still means another text.
  assert.equal(fillTemplate(FIREBIRD_LINE, [1750, 25, 1]).ok, false);
});

test("Necklace of Firebird puts its Lv. 20 Barrier Burst in Active slot 1 over the user's skill, which stays saved", () => {
  const state = structuredClone(youga);
  state.equipmentOverrides = { ...state.equipmentOverrides, necklace: firebird };
  const before = calculatePlanner(normalizePlannerState(structuredClone(youga)));
  const userMain = before.activation.setups.find(
    (setup) => setup.setupKey === normalizePlannerState(youga).skills.boardSlots.skills[0],
  );
  const { activation } = calculatePlanner(normalizePlannerState(state));
  const burst = activation.setups.find((setup) => setup.name === "Barrier Burst");
  assert.equal(burst.traitGranted.row, 0);
  assert.equal(burst.traitGranted.trait, "Necklace of Firebird");
  assert.equal(burst.traitGranted.item, true);
  assert.equal(burst.effectiveLevel, 20);
  assert.deepEqual(burst.tags, ["Spell", "Area", "Fire", "Strength", "Intelligence"]);
  assert.equal(burst.traitGranted.replaces, userMain.name);
  const replaced = activation.setups.find((setup) => setup.setupKey === userMain.setupKey);
  assert.equal(replaced.enabled, false);
  assert.equal(replaced.traitReplaced.by, "Barrier Burst");
});

test("the import keeps Necklace of Firebird's line and Barrier Burst's supports on the granted skill", async () => {
  const scan = {
    dumps: [
      {
        id: "d1",
        stamp: "2026-10-23T23:25:52.852Z",
        character: 1,
        accountGroup: 1,
        tree: {
          player: { Level: "82", HeroId: "810", HeroPurchaseId: "4002" },
          bag: {
            wearItems: {
              1: {
                Index: "5",
                Item: {
                  BaseId: "4528",
                  UniqueItmId: "113215",
                  Prefix: {
                    1: { DynArgs: { 1: "16.0" }, Id: "51521510" },
                    2: { DynArgs: { 1: "1750.0", 2: "20.0", 3: "1.0" }, Id: "51521541" },
                  },
                  Id: "4528_item107",
                },
              },
            },
          },
          skillLayout: {
            slots: {
              a: { key: "1", value: { skillId: "7085_a" } },
              b: { key: "102", value: { skillId: "7434_b" } },
            },
          },
          skills: { skills: { a: { Id: "7085_a", Level: "20" }, b: { Id: "7434_b", Level: "18" } } },
        },
      },
    ],
  };
  const { state, report } = importSnapshot(scan, "d1", await loadGameIdMap());
  const necklace = state.equipmentOverrides.necklace;
  const catalogLine = legendaryGear
    .find((item) => item.name === "Necklace of Firebird")
    .modifiers.find((text) => text.startsWith("When you have a Barrier"));
  assert.ok(necklace.legendaryModifiers.includes(catalogLine), "the Barrier Burst line is kept");
  assert.equal(state.skills.boardSlots.skills[0], "");
  assert.equal(state.skills.supportOrder["trait:Barrier Burst"][1], "Control Spell");
  assert.deepEqual(report.sections.skills.unresolved, []);
  assert.deepEqual(report.sections.gear.unresolved, []);
});

// src/app/bridge/skills-view-model.ts on real calculations (the golden-master Youga build, an empty board and a hero whose trait
// takes a board row), with the parts of a result the golden cases never reach (a curse past the limit, a skill set aside
// by a board rule, auras asking for 100% or more) put into a copy of a real result.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { defaultPlannerState } from "../../packages/engine/src/state/planner-state.ts";
import { switchHeroLoadout } from "../../packages/engine/src/heroes/hero-loadouts.js";
import { skillsView } from "../../src/app/bridge/skills-view-model.ts";
import { selenaCompleteSkillLoadout } from "../../packages/engine/data/skills/selena-complete-skill-loadout.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const yougaResult = calculatePlanner(structuredClone(youga));
const view = (result, tab = "skills") => skillsView(result, result.state.skills, tab);

test("a built build: five skill rows with their supports, levels and Energy", () => {
  const skills = view(yougaResult);
  assert.equal(skills.tab, "skills");
  assert.deepEqual(skills.energy, {
    used: 450,
    available: 455,
    gear: [
      { slot: "Weapon 1", item: "Headless Cleric Wand", value: 55 },
      { slot: "Weapon 2", item: "Headless Cleric Wand", value: 50 },
      { slot: "Helmet", item: "Blind Vision", value: 59 },
      { slot: "Chest Armor", item: "Long Night Sorcerer's Robe", value: 110 },
      { slot: "Gloves", item: "Ice Pulse", value: 34 },
      { slot: "Boots", item: "Blade-dancer's Steps", value: 49 },
    ],
    fromLevel: 98,
  });
  assert.deepEqual(
    skills.rows.map((row) => row.label),
    [
      "Replace Homing Frost Bolt",
      "Replace Ice Bond",
      "Replace Speed Phantom",
      "Replace Selves of All Realms",
      "Replace Timid",
    ],
  );
  const [bolt, iceBond] = skills.rows;
  assert.deepEqual(
    { ...bolt.skill, art: typeof bolt.skill.art },
    {
      name: "Homing Frost Bolt",
      setupKey: "game-log-skill-1",
      art: "string",
      baseLevel: 20,
      addedLevels: 6,
      grantNote: "",
      grantedBy: null,
      draggable: true,
      inactiveReason: null,
      curseOffReason: null,
      energy: 175,
    },
  );
  assert.deepEqual(iceBond.supports[4], {
    slot: 4,
    name: null,
    art: null,
    grantedBy: null,
    draggable: false,
    label: "Add support 5 to Ice Bond",
    title: "Add support",
  });
  assert.equal(iceBond.supports[2].label, "Replace Mass Effect");
  assert.equal(iceBond.supports[2].title, "Drag to move · right-click while dragging to duplicate");
  assert.equal(iceBond.supports[2].draggable, true);
  assert.match(iceBond.supports[2].art, /\.webp$/);
});

test("the Auras tab: four rows and the Mana and Life the auras leave free, of the build's own pools", () => {
  const auras = view(yougaResult, "auras");
  assert.equal(auras.rows.length, 4);
  assert.equal(auras.rows[2].label, "Replace Frigid Domain");
  assert.deepEqual(auras.reservation, {
    mana: {
      percent: "11.29%",
      sealed: "65.58 / 580.75",
      detail: "515.17 sealed",
      meterPercent: 11.2926,
      overCapacity: false,
    },
    life: {
      percent: "3.58%",
      sealed: "79.9 / 2,232.44",
      detail: "2,152.54 sealed",
      meterPercent: 3.5791,
      overCapacity: false,
    },
    problems: [],
  });
});

test("the Energy sources leave out a gear slot that is switched off", () => {
  const state = structuredClone(youga);
  state.disabledEquipmentSlots = ["gloves", "boots"];
  const { energy } = view(calculatePlanner(state));
  assert.deepEqual(
    energy.gear.map((piece) => piece.slot),
    ["Weapon 1", "Weapon 2", "Helmet", "Chest Armor"],
  );
  assert.equal(energy.available, 455 - 34 - 49);
});

test("empty rows are named by tab and row, and their sockets wait for a skill", () => {
  const state = structuredClone(defaultPlannerState);
  // What "Reset Skills" leaves (src/app/planner/session.js emptyPlannerState does the same): every captured setup off.
  state.skills.setupEnabled = Object.fromEntries(selenaCompleteSkillLoadout.setups.map((setup) => [setup.name, false]));
  const result = calculatePlanner(state);
  const skills = view(result);
  assert.deepEqual(
    skills.rows.map((row) => [row.skill, row.emptyName, row.label]),
    [1, 2, 3, 4, 5].map((row) => [null, `Active ${row}`, `Select Active ${row}`]),
  );
  assert.equal(skills.rows[0].supports[2].label, "Add support 3 to empty skill");
  assert.deepEqual(
    view(result, "auras").rows.map((row) => row.label),
    ["Select Aura 1", "Select Aura 2", "Select Aura 3", "Select Aura 4"],
  );
});

test("a support and a skill granted by the hero trait: shown with the trait, never draggable", () => {
  const yougaSkills = view(calculatePlanner(structuredClone(youga)));
  const core = yougaSkills.rows[0].supports[1];
  assert.equal(core.name, "Clockwork Core");
  assert.equal(core.grantedBy, "I Am the Ultimate One");
  assert.equal(core.title, "Granted by I Am the Ultimate One");
  assert.equal(core.draggable, false);

  const state = structuredClone(youga);
  state.hero = switchHeroLoadout(state.hero, "erika-vendettas-sting");
  const erika = view(calculatePlanner(state));
  const vendetta = erika.rows[2];
  assert.equal(vendetta.label, "Vendetta, granted by Vendetta's Sting");
  assert.equal(vendetta.skill.grantedBy, "Vendetta's Sting");
  assert.equal(vendetta.skill.grantNote, " · replaces Speed Phantom");
  assert.equal(vendetta.skill.draggable, false);
});

test("Skills tab: a curse past the curse limit says why it is off; the Auras tab shows no curse note", () => {
  const result = {
    ...yougaResult,
    curseLimit: { maximum: 1, active: ["Selves of All Realms"], excluded: ["Timid", "Frigid Domain"] },
  };
  const timid = view(result).rows[4].skill;
  assert.equal(timid.curseOffReason, "curse limit reached (1/1 slots used by Selves of All Realms)");
  assert.equal(view(result).rows[3].skill.curseOffReason, null);
  // The Auras tab never shows the note, even for a name the limit lists.
  assert.equal(view(result, "auras").rows[2].skill.name, "Frigid Domain");
  assert.ok(view(result, "auras").rows.every((row) => row.skill?.curseOffReason === null));
});

test("a skill a board rule set aside keeps its row and says why", () => {
  const reason = "Spirit Magus in an active slot needs Iris";
  const activation = {
    ...yougaResult.activation,
    setups: yougaResult.activation.setups.map((setup) =>
      setup.name === "Ice Bond" ? { ...setup, enabled: false, slotInactive: reason } : setup,
    ),
  };
  const skills = view({ ...yougaResult, activation });
  assert.equal(skills.rows[1].skill.name, "Ice Bond");
  assert.equal(skills.rows[1].skill.inactiveReason, reason);
  assert.equal(skills.energy.used, 450 - skills.rows[1].skill.energy);
});

test("auras asking for 100% or more: the request before the cap, and what stops the setup", () => {
  const planned = { ...yougaResult.aura.planned, manaReservedPercent: 99.99, manaDemandPercent: 104.5 };
  const { reservation } = view({ ...yougaResult, aura: { ...yougaResult.aura, planned } }, "auras");
  assert.deepEqual(reservation.mana, {
    percent: "0.01%",
    sealed: "0.06 / 580.75",
    detail: "104.5% requested before cap",
    meterPercent: 0.01,
    overCapacity: true,
  });
  assert.equal(reservation.life.overCapacity, false);
  assert.deepEqual(reservation.problems, ["Mana reservation reaches 100%"]);
});

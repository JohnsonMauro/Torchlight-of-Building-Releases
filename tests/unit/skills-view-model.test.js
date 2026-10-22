// src/app/bridge/skills-view-model.ts on real calculations (the default build, the golden-master Youga build and a hero whose trait
// takes a board row), with the parts of a result the golden cases never reach (a curse past the limit, a skill set aside
// by a board rule, auras asking for 100% or more) put into a copy of a real result.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculatePlanner } from "../../src/engine/planner.js";
import { defaultPlannerState } from "../../src/engine/state/planner-state.ts";
import { switchHeroLoadout } from "../../src/engine/heroes/hero-loadouts.js";
import { skillsView } from "../../src/app/bridge/skills-view-model.ts";
import { selenaCompleteSkillLoadoutSs13 } from "../../src/data/skills/selena-complete-skill-loadout-ss13.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const defaultResult = calculatePlanner(structuredClone(defaultPlannerState));
const view = (result, tab = "skills") => skillsView(result, result.state.skills, tab);

test("the default build: five skill rows with their supports, levels and Energy", () => {
  const skills = view(defaultResult);
  assert.equal(skills.tab, "skills");
  assert.deepEqual(skills.energy, { used: 515, available: 518 });
  assert.deepEqual(
    skills.rows.map((row) => row.label),
    ["Replace Scorching Beam", "Replace Aim", "Replace Swiftness Dew", "Replace Entangled Pain", "Replace Scorch"],
  );
  const [beam, aim] = skills.rows;
  assert.deepEqual(
    { ...beam.skill, art: typeof beam.skill.art },
    {
      name: "Scorching Beam",
      setupKey: "Scorching Beam",
      art: "string",
      baseLevel: 20,
      addedLevels: 11,
      grantNote: "",
      grantedBy: null,
      draggable: true,
      inactiveReason: null,
      curseOffReason: null,
      energy: 175,
    },
  );
  assert.deepEqual(aim.supports[4], {
    slot: 4,
    name: null,
    art: null,
    grantedBy: null,
    draggable: false,
    label: "Add support 5 to Aim",
    title: "Add support",
  });
  assert.equal(aim.supports[1].label, "Replace Mass Effect");
  assert.equal(aim.supports[1].title, "Drag to move · right-click while dragging to duplicate");
  assert.equal(aim.supports[1].draggable, true);
  assert.match(aim.supports[1].art, /\.webp$/);
});

test("the Auras tab: four rows and the Mana and Life the auras seal", () => {
  const auras = view(defaultResult, "auras");
  assert.equal(auras.rows.length, 4);
  assert.equal(auras.rows[2].label, "Replace Precise: Deep Pain");
  assert.deepEqual(auras.reservation, {
    mana: {
      sealed: "494.64 / 525",
      detail: "94.22% sealed · 30.36 usable",
      meterPercent: 94.2171,
      overCapacity: false,
    },
    life: {
      sealed: "1,920.54 / 2,150",
      detail: "89.33% sealed · 229.46 usable",
      meterPercent: 89.3275,
      overCapacity: false,
    },
    problems: [],
  });
});

test("empty rows are named by tab and row, and their sockets wait for a skill", () => {
  const state = structuredClone(defaultPlannerState);
  // What "Reset Skills" leaves (src/app/planner/session.js emptyPlannerState does the same): every captured setup off.
  state.skills.setupEnabled = Object.fromEntries(
    selenaCompleteSkillLoadoutSs13.setups.map((setup) => [setup.name, false]),
  );
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
    ...defaultResult,
    curseLimit: { maximum: 1, active: ["Entangled Pain"], excluded: ["Scorch", "Precise: Deep Pain"] },
  };
  const scorch = view(result).rows[4].skill;
  assert.equal(scorch.curseOffReason, "curse limit reached (1/1 slots used by Entangled Pain)");
  assert.equal(view(result).rows[3].skill.curseOffReason, null);
  // The Auras tab never shows the note, even for a name the limit lists.
  assert.equal(view(result, "auras").rows[2].skill.name, "Precise: Deep Pain");
  assert.ok(view(result, "auras").rows.every((row) => row.skill?.curseOffReason === null));
});

test("a skill a board rule set aside keeps its row and says why", () => {
  const reason = "Spirit Magus in an active slot needs Iris";
  const activation = {
    ...defaultResult.activation,
    setups: defaultResult.activation.setups.map((setup) =>
      setup.name === "Aim" ? { ...setup, enabled: false, slotInactive: reason } : setup,
    ),
  };
  const skills = view({ ...defaultResult, activation });
  assert.equal(skills.rows[1].skill.name, "Aim");
  assert.equal(skills.rows[1].skill.inactiveReason, reason);
  assert.equal(skills.energy.used, 515 - 25);
});

test("auras asking for 100% or more: the request before the cap, and what stops the setup", () => {
  const planned = { ...defaultResult.aura.planned, manaReservedPercent: 99.99, manaDemandPercent: 104.5 };
  const { reservation } = view({ ...defaultResult, aura: { ...defaultResult.aura, planned } }, "auras");
  assert.deepEqual(reservation.mana, {
    sealed: "524.95 / 525",
    detail: "99.99% sealed · 104.5% requested before cap",
    meterPercent: 99.99,
    overCapacity: true,
  });
  assert.equal(reservation.life.overCapacity, false);
  assert.deepEqual(reservation.problems, ["Mana reservation reaches 100%"]);
});

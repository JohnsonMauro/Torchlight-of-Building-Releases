// What the HERO tab shows (src/app/bridge/hero-traits-view-model.ts), read from the game data for a few heroes: an empty
// hero, Selena's tiers and memories, Youga's tree rows, Trait Path and drag targets, Bing's paired choices, Carino's
// ammo slots and Sage's Scent Bottle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { heroTraitsView } from "../../src/app/bridge/hero-traits-view-model.ts";

const YOUGA = "youga-the-ultimate-one";
const hero = (overrides = {}) => ({
  selectedHeroId: YOUGA,
  selectedTraits: {},
  memories: {},
  memoryInventory: [],
  equippedMemoryIds: {},
  baseTraitMemoryId: "",
  sageScent: {},
  carinoSpecialAmmoSupports: [],
  heroTraitSupports: {},
  treeTraits: {},
  ...overrides,
});

test("no hero: no tabs, no content", () => {
  const view = heroTraitsView(hero({ selectedHeroId: "" }), "traits");
  assert.equal(view.hero, null);
  assert.equal(view.tabs, null);
  assert.equal(view.content, null);
  assert.equal(view.label, "No hero selected");
});

test("Selena, Sing with the Tide: one choice group per level, the picked one selected, memories by level key", () => {
  const view = heroTraitsView(
    hero({
      selectedHeroId: "selena-sing-with-the-tide",
      selectedTraits: { level45: "Wave Aria" },
      memories: { level60: "Memory of Discipline" },
    }),
    "traits",
  );
  assert.equal(view.tabs, null);
  const { base, tiers } = view.content;
  assert.equal(base.trait.name, "Sing with the Tide");
  assert.deepEqual(
    tiers[0].groups[0].choices.map((choice) => [choice.name, choice.selected]),
    [
      ["Undersea Ballad", false],
      ["Wave Aria", true],
    ],
  );
  assert.equal(tiers[1].memory.tier, "level60");
  assert.equal(tiers[1].memory.label, "Manage Memory of Discipline");
  assert.equal(tiers[0].memory.label, "Add level 45 hero memory");
});

test("another hero's memory socket reads its own key, then the level alone", () => {
  const view = heroTraitsView(
    hero({
      memories: { level45: "Memory of Origin", [`${YOUGA}:level60`]: "Memory of Discipline" },
      equippedMemoryIds: { level45: "m1" },
      memoryInventory: [{ id: "m1", name: "Memory of Origin", type: "Memory of Origin", rarity: "legendary" }],
    }),
    "traits",
  );
  const [lv45, lv60, lv75] = view.content.tiers;
  assert.equal(lv45.memory.tier, "level45");
  assert.equal(lv45.memory.memory.rarity, "legendary");
  assert.equal(lv60.memory.tier, `${YOUGA}:level60`);
  assert.equal(lv75.memory.tier, `${YOUGA}:level75`);
  assert.equal(lv75.memory.memory, null);
});

test("Youga's rows hold its tree picks; a pick can be dragged to the rows the placement rule allows", () => {
  const view = heroTraitsView(
    hero({ treeTraits: { [YOUGA]: ["I Arrive Alongside Destiny", "I Meet the Selves", ""] } }),
    "traits",
  );
  assert.deepEqual(view.tabs, [
    { id: "traits", label: "Hero Trait" },
    { id: "path", label: "Trait Path" },
  ]);
  const { tiers, rowMoves, extraRow } = view.content;
  assert.deepEqual(
    tiers.map((tier) => [tier.row, tier.pick?.name ?? null]),
    [
      [0, "I Arrive Alongside Destiny"],
      [1, "I Meet the Selves"],
      [2, null],
    ],
  );
  assert.equal(tiers[0].pick.levelKey, `${YOUGA}:level45`);
  assert.deepEqual(rowMoves, { 0: [1, 2], 1: [0, 2] });
  assert.equal(extraRow, undefined);
});

test("Trait Path: picked nodes selected, children of unpicked nodes locked, a layout at the board's width", () => {
  const view = heroTraitsView(hero({ treeTraits: { [YOUGA]: ["I Hold All in My Grasp"] } }), "path");
  const path = view.content;
  assert.equal(path.kind, "path");
  assert.equal(path.picked, 1);
  assert.equal(path.capacity, 3);
  const node = (name) => path.nodes.find((entry) => entry.name === name);
  assert.deepEqual([node("I Am the Ultimate One").caption, node("I Am the Ultimate One").selected], ["Base", true]);
  assert.equal(node("I Hold All in My Grasp").selected, true);
  assert.equal(node("I Hold All in My Grasp").levelKey, `${YOUGA}:level45`);
  assert.equal(node("I Will Hunt You Down").locked, false);
  assert.equal(node("I Gather the Threads of Causality").locked, true);
  const layout = path.layoutAt(400);
  assert.equal(layout.nodes.length, path.nodes.length);
  assert.ok(layout.height > 0);
  assert.equal(layout.lines.filter((line) => line.active).length, 1);
});

test("Bing, Creative Genius: an upper and a lower group per level", () => {
  const view = heroTraitsView(hero({ selectedHeroId: "bing-creative-genius" }), "traits");
  const groups = view.content.tiers[0].groups;
  assert.equal(view.content.dual, true);
  assert.deepEqual(
    groups.map((group) => [group.label, group.selectionKey, group.choices.length]),
    [
      ["Level 45 upper trait choice", "bing-creative-genius:level45:upper", 1],
      ["Level 45 lower trait choice", "bing-creative-genius:level45:lower", 2],
    ],
  );
});

test("Carino's third Special Ammo slot opens with Well Prepared", () => {
  const slots = (traits) =>
    heroTraitsView(hero({ selectedHeroId: "carino-ranger-of-glory", selectedTraits: traits }), "traits").content.base
      .supports.slots;
  assert.deepEqual(
    slots({}).map((slot) => slot.locked),
    [false, false, true],
  );
  assert.deepEqual(
    slots({ "carino-ranger-of-glory:level75": "Well Prepared" }).map((slot) => slot.locked),
    [false, false, false],
  );
});

test("Sage's Scent Bottle: an elixir and three ingredient slots", () => {
  const view = heroTraitsView(
    hero({ selectedHeroId: "sage-licorice-note", sageScent: { damage: "missing" } }),
    "scent",
  );
  assert.equal(view.content.kind, "scent");
  assert.equal(view.content.elixir, null);
  assert.deepEqual(
    view.content.ingredients.map((slot) => [slot.kind, slot.filled, slot.ingredient]),
    [
      ["damage", true, null],
      ["defense", false, null],
      ["functional", false, null],
    ],
  );
});

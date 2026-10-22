// What the talent tree picker shows (src/app/bridge/talent-picker-view.ts): the game's six god columns, each its God
// tree then its four class trees, the open slot's choices on and the others off with the reason.
import { test } from "node:test";
import assert from "node:assert/strict";
import { talentPickerView } from "../../src/app/bridge/talent-picker-view.ts";

const build = ["Goddess of Knowledge", "Prophet", "Marksman", "Lich"];
const view = (slot, selectedTrees = build) => talentPickerView({ slot, selectedTrees, points: { Prophet: 24 } });
const find = (result, name) =>
  result.columns.flatMap((column) => column.trees).find((tree) => tree.name === name) ?? assert.fail(name);

test("six god columns in the game's order, each with its portrait, its God tree and four class trees", () => {
  const { columns } = view(0);
  assert.deepEqual(
    columns.map((column) => column.god),
    [
      "God of Might",
      "Goddess of Hunting",
      "Goddess of Knowledge",
      "God of War",
      "Goddess of Deception",
      "God of Machines",
    ],
  );
  for (const column of columns) {
    assert.equal(column.trees.length, 5);
    assert.deepEqual(
      column.trees.map((tree) => tree.kind),
      ["God tree", "Class tree", "Class tree", "Class tree", "Class tree"],
    );
    assert.match(column.portrait, /^\.\/src\/assets\/tli\/gods\/.+\.webp$/);
  }
  assert.equal(columns[2].familyClass, "talent-family-goddess-of-knowledge");
  assert.deepEqual(
    columns[2].trees.map((tree) => tree.name),
    ["Goddess of Knowledge", "Magister", "Arcanist", "Elementalist", "Prophet"],
  );
});

test("tree 1 takes a God tree: class trees are off, the slot's God tree is pressed", () => {
  const result = view(0);
  assert.equal(result.title, "Select a God tree");
  assert.deepEqual([find(result, "God of War").available, find(result, "Goddess of Knowledge").current], [true, true]);
  assert.deepEqual([find(result, "Marksman").available, find(result, "Marksman").note], [false, "Already in tree 3"]);
  assert.deepEqual([find(result, "Ronin").available, find(result, "Ronin").note], [false, "Tree 1 takes a God tree"]);
});

test("tree 2 takes a class tree of the God tree's god only", () => {
  const result = view(1);
  assert.equal(result.title, "Select a Goddess of Knowledge class tree");
  assert.equal(find(result, "Arcanist").available, true);
  assert.equal(find(result, "Prophet").current, true);
  assert.deepEqual(
    [find(result, "Ronin").available, find(result, "Ronin").note],
    [false, "Tree 2 takes a Goddess of Knowledge class tree"],
  );
  assert.equal(find(result, "God of War").available, false);
});

test("trees 3 and 4 take any class tree the build does not hold; the build's trees are checked with their points", () => {
  const result = view(3);
  assert.equal(result.title, "Select talent tree 4");
  assert.equal(find(result, "Ronin").available, true);
  assert.equal(find(result, "Lich").available, true);
  assert.deepEqual([find(result, "Prophet").available, find(result, "Prophet").note], [false, "Already in tree 2"]);
  assert.deepEqual(
    [find(result, "God of War").available, find(result, "God of War").note],
    [false, "Tree 4 takes a class tree"],
  );
  assert.deepEqual(
    result.columns.flatMap((column) => column.trees.filter((tree) => tree.inBuild).map((tree) => tree.name)),
    ["Marksman", "Goddess of Knowledge", "Prophet", "Lich"],
  );
  assert.equal(find(result, "Prophet").points, 24);
  assert.equal(find(result, "Ronin").points, 0);
});

test("tree 2 before a God tree is picked asks for one first", () => {
  assert.equal(find(view(1, ["", "", "", ""]), "Arcanist").note, "Pick a God tree first");
});

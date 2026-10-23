// What the HERO tab's Sage scent and Carino Special Ammo selectors list (src/app/bridge/hero-dialogs-view-model.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { carinoAmmoSelectorView, sageScentSelectorView } from "../../src/app/bridge/hero-dialogs-view-model.ts";
import { sageElixirs } from "../../packages/engine/data/heroes/sage-scent.generated.js";
import { sageScentIngredients } from "../../packages/engine/data/heroes/sage-scent-options.js";

test("the scent selector lists elixirs with their tags, or one kind of ingredient with its effect", () => {
  const elixirs = sageScentSelectorView("elixir");
  assert.equal(elixirs.title, "Select Elixir Skill");
  assert.equal(elixirs.placeholder, "Search skills…");
  assert.equal(elixirs.choices.length, sageElixirs.length);
  assert.deepEqual(elixirs.choices[0].tags, sageElixirs[0].tags);
  // The search covers an elixir's tags and an ingredient's effect, not only the name.
  assert.ok(elixirs.choices[0].search.includes(sageElixirs[0].tags[0].toLowerCase()));
  const damage = sageScentSelectorView("damage");
  assert.equal(damage.title, "Select Damage Ingredient");
  assert.equal(damage.placeholder, "Search ingredients…");
  assert.equal(damage.choices.length, sageScentIngredients.damage.length);
  assert.equal(damage.choices[0].tags, null);
  assert.doesNotMatch(JSON.stringify(damage.choices), /\d %/);
  assert.ok(damage.choices[0].search.includes(damage.choices[0].description.split(" ")[0].toLowerCase()));
});

test("the Special Ammo selector marks supports in a slot, strips the tier suffix and says what Well Prepared unlocks", () => {
  const options = [
    { name: "Pierce", category: "regular", effects: ["+1 Pierce", "x"] },
    { name: "Chain (Noble)", category: "noble", exclusiveFor: "Bolt", icon: "chain.png" },
  ];
  const view = carinoAmmoSelectorView(1, options, ["Pierce"], false);
  assert.equal(view.slot, 1);
  assert.match(view.help, /Well Prepared unlocks Magnificent and Noble supports/);
  assert.deepEqual(
    view.choices.map((entry) => [entry.label, entry.category, entry.exclusive, entry.installed]),
    [
      ["Pierce", "Regular", "Projectile compatible", true],
      ["Chain", "Noble", "Bolt", false],
    ],
  );
  assert.equal(view.choices[0].effects, "+1 Pierce x");
  assert.equal(view.choices[1].search, "chain (noble) bolt noble");
  assert.match(carinoAmmoSelectorView(0, [], [], true).help, /not installed on the skill panel/);
});

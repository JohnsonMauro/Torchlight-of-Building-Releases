// src/app/bridge/pacts-view-model.ts pactspiritSelectorView: what the Pactspirit selector lists.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pactspiritSelectorView } from "../../src/app/bridge/pacts-view-model.ts";
import { pactspiritCatalogSs14 } from "../../src/data/pacts/pactspirit-catalog-ss14.js";

test("the selector leaves out the Drop Pactspirits (they add nothing to damage or defence) and keeps every other", () => {
  const view = pactspiritSelectorView();
  const kept = pactspiritCatalogSs14.filter((entry) => entry.category !== "Drop");
  assert.ok(kept.length < pactspiritCatalogSs14.length, "the catalog has Drop Pactspirits");
  assert.equal(view.categories.includes("Drop"), false);
  assert.deepEqual(
    view.choices.map((choice) => choice.name),
    kept.map((entry) => entry.name),
  );
});

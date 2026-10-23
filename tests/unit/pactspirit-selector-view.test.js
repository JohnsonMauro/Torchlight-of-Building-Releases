// src/app/bridge/pacts-view-model.ts pactspiritSelectorView: what the Pactspirit selector lists.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pactspiritSelectorView } from "../../src/app/bridge/pacts-view-model.ts";
import { pactspiritCatalog } from "../../packages/engine/data/pacts/pactspirit-catalog.js";

test("the selector leaves out the Drop Pactspirits (they add nothing to damage or defence) and keeps every other", () => {
  const view = pactspiritSelectorView();
  const kept = pactspiritCatalog.filter((entry) => entry.category !== "Drop");
  assert.ok(kept.length < pactspiritCatalog.length, "the catalog has Drop Pactspirits");
  assert.equal(view.categories.includes("Drop"), false);
  assert.deepEqual(
    view.choices.map((choice) => choice.name),
    kept.map((entry) => entry.name),
  );
});

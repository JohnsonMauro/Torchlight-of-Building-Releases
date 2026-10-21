// A skill's, a support's or an aura's tooltip (src/app/bridge/skill-tooltip-view.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { tlidbSkillCatalogSs13, tlidbSupportCatalogSs13 } from "../../src/data/catalogs/tlidb-ss13.js";
import { coverageView } from "../../src/app/bridge/gear-item-view.ts";
import { skillTooltipView, traitGrantNote } from "../../src/app/bridge/skill-tooltip-view.ts";

const skill = (name) => tlidbSkillCatalogSs13.find((entry) => entry.name === name);
const support = (name) => tlidbSupportCatalogSs13.find((entry) => entry.name === name);
const input = (overrides = {}) => ({
  name: "Scorching Beam",
  support: false,
  catalog: skill("Scorching Beam"),
  installed: null,
  setup: null,
  roleLabel: "Main damage",
  coverage: coverageView("In calc"),
  lineCoverage: () => null,
  curseNote: "",
  editable: false,
  ...overrides,
});
const plain = (effect) => effect.lines.map((line) => line.segments.map((segment) => segment.text).join("")).join("\n");

test("a skill on the board shows its level with the added levels, its tags, facts and highlighted effects", () => {
  const setup = { name: "Scorching Beam", role: "main", baseLevel: 20, addedLevels: 3, source: "tlidb" };
  const view = skillTooltipView(input({ installed: setup, setup }));
  assert.equal(view.look, "skill");
  assert.deepEqual(view.level, { text: "Lv.20", added: 3 });
  assert.equal(view.stars, null);
  assert.deepEqual(view.tags, skill("Scorching Beam").tags);
  assert.ok(view.facts.some((fact) => fact.addedDamage));
  assert.ok(view.effects.length > 0);
  assert.ok(
    view.effects.some((effect) =>
      effect.lines.some((line) => line.segments.some((segment) => segment.className === "skill-damage-value")),
    ),
  );
  assert.equal(view.source, "TLIDB · hover details");
  assert.equal(view.curseNote, "");
  assert.equal(view.grantNote, "");
});

test("a support's lines each carry their coverage; a hero panel slot says how to edit it", () => {
  const seen = [];
  const view = skillTooltipView(
    input({
      name: "Guard",
      support: true,
      catalog: support("Guard"),
      lineCoverage: (line) => (seen.push(line), coverageView("In calc")),
      editable: true,
    }),
  );
  assert.equal(view.look, "support");
  assert.deepEqual(view.level, { text: "Lv. 20", added: 0 });
  assert.deepEqual(view.facts[0], { label: "Mana Multiplier", value: "110%", addedDamage: false });
  const lines = view.effects.flatMap((effect) => effect.lines);
  assert.equal(lines.length, seen.length);
  assert.ok(lines.every((line) => line.coverage?.status === "In calc"));
  assert.ok(lines.some((line) => line.segments.some((segment) => segment.className === "support-effect-value")));
  assert.equal(view.source, "Click to edit · Right-click to remove");
});

test("a star support shows its stars, its main affix at its tier and the star bonus", () => {
  const name = "Scorching Beam: Supercharge (Magnificent)";
  const view = skillTooltipView(
    input({
      name,
      support: true,
      catalog: support(name),
      installed: { name, level: 20, specialConfig: { tier: 1, roll: 6.2, stars: 3 } },
    }),
  );
  assert.equal(view.stars, 3);
  assert.deepEqual(view.level, { text: "Lv. 20", added: 0 });
  assert.deepEqual(view.effects.map(plain), [
    "Main affix · T1 · +6.2% additional damage for every channeled stack",
    "Star bonus · 3 ★ · +10% additional damage",
  ]);
});

test("an aura takes the aura look; a left-out curse and a trait grant add their notes", () => {
  const aura = skillTooltipView(input({ name: "Fearless", catalog: skill("Fearless") }));
  assert.equal(aura.look, "aura");
  const granted = {
    name: "Scorching Beam",
    effectiveLevel: 21,
    traitGranted: { trait: "Tide", keyword: "Sing", row: 0 },
  };
  const view = skillTooltipView(input({ installed: granted, curseNote: "curse limit reached" }));
  assert.equal(view.curseNote, "curse limit reached");
  assert.equal(
    view.grantNote,
    "Granted by Tide (Sing) · Lv. 21 trait skill in Active slot 1, the skill takes no energy (its supports do)",
  );
});

test("a granted support's note says it costs energy and what it replaces", () => {
  assert.equal(
    traitGrantNote({ traitGranted: { trait: "I Am the Ultimate One", replaces: "Guard" } }),
    "Granted by I Am the Ultimate One · second support slot, costs energy like any support · Replaces Guard: it stays in your build and is left out of the calculation",
  );
  assert.equal(traitGrantNote({ name: "Guard" }), "");
});

test("an entry with no effects anywhere points to TLIDB", () => {
  const view = skillTooltipView(input({ name: "Nothing", catalog: { name: "Nothing" } }));
  assert.deepEqual(view.effects.map(plain), ["See TLIDB for complete level scaling."]);
  assert.deepEqual(view.tags, ["Main damage"]);
});

test("an Activation Medium shows its tier beside its level and its chosen affix lines", () => {
  const name = "Activation Medium: Preparation";
  const view = skillTooltipView(input({ name, support: true, catalog: support(name) }));
  assert.equal(view.stars, null);
  assert.deepEqual(view.level, { text: "Tier 1 · Lv. 20", added: 0 });
  assert.ok(view.effects.length >= 1);
  assert.ok(view.effects.map(plain).every((line) => line.startsWith("T1 · ")));
});

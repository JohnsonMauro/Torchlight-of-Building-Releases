// What the Stats view shows (src/app/bridge/stats-view-model.ts and the helpers it uses), on the golden-master Youga
// build: the status, the skill picker, the recount with sources left out of the view, a skill whose damage is not
// modeled, the Effective HP banner, the Character stats tabs, and texts printed as the legacy markup printed them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateGoldenCase, goldenInputs } from "../golden/cases.js";
import { prepareStatSheet, statsView } from "../../src/app/bridge/stats-view-model.ts";
import { displayTexts } from "../../src/app/bridge/display-text.ts";
import { numberText } from "../../src/app/stats/number-text.ts";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const format = (value) => number.format(value);
const state = (id) => goldenInputs().find((input) => input.id === id).state;
const youga = calculateGoldenCase(state("youga-l94"));
const view = (planner, skill, excluded = []) =>
  statsView(prepareStatSheet(planner, skill, format), { panel: "sheet", excluded });

test("a figure toggles between its short and full texts unless they are the same", () => {
  assert.deepEqual(numberText(1593002745.4), { full: "1,593,002,745", short: "1.59 Billion" });
  assert.deepEqual(numberText(512), { full: "512", short: null });
  assert.deepEqual(numberText(Number.NaN), { full: "—", short: null });
  assert.deepEqual(numberText(5, { short: "1–5", full: "1–5" }), { full: "1–5", short: null });
});

test("texts close the gap before a percent sign, as the legacy markup did; other values stay", () => {
  assert.deepEqual(displayTexts({ a: "+26 % Movement Speed", b: [1, "x 5 %"], c: null, d: true }), {
    a: "+26% Movement Speed",
    b: [1, "x 5%"],
    c: null,
    d: true,
  });
});

test("the status, the skill picker and the recount of the build's main skill", () => {
  const { status, panel, sheet } = view(youga, "Scorching Beam");
  assert.deepEqual(status, { text: "9 active", detail: "", warning: false });
  assert.equal(panel, "sheet");
  assert.deepEqual(
    sheet.options.map((option) => option.name),
    ["Homing Frost Bolt", "Ice Bond", "Speed Phantom", "Selves of All Realms", "Timid"],
  );
  assert.equal(sheet.selected, "game-log-skill-1");
  assert.equal(sheet.skillName, "Homing Frost Bolt");
  assert.equal(sheet.skillLevel, "26");
  assert.equal(sheet.damage.kind, "recount");
  const { recount, totalModeled } = sheet.damage;
  assert.deepEqual(
    recount.fields.map((field) => field.key),
    ["averageDps", "highest5sDps", "last5sDps"],
  );
  assert.deepEqual(recount.fields[0].value, { full: "1,593,002,745", short: "1.59 Billion" });
  assert.deepEqual(totalModeled, { full: "1,633,717,331", short: "1.63 Billion" });
  assert.equal(recount.duration, "00:00:10");
  assert.equal(recount.sources.length, 4);
  assert.equal(recount.shown, 4);
  assert.equal(recount.sources[0].label, "Homing Frost Bolt hits");
  assert.equal(recount.sources[0].color, "#e9a362");
});

test("a source left out of the view drops out of the fields and the total, and keeps its colour", () => {
  const full = view(youga, "game-log-skill-1").sheet.damage;
  const { recount, totalModeled } = view(youga, "game-log-skill-1", ["hit:game-log-skill-1"]).sheet.damage;
  assert.equal(recount.shown, 3);
  const left = recount.sources.find((item) => item.key === "hit:game-log-skill-1");
  assert.deepEqual([left.excluded, left.share, left.dps, left.color], [true, "off", "off", "#e9a362"]);
  assert.ok(recount.fields[0].value.full !== full.recount.fields[0].value.full);
  assert.ok(totalModeled.full !== full.totalModeled.full);
  assert.match(recount.summary, /^Homing Frost Bolt hits off, /);
});

test("a skill whose damage is not modeled has no damage figures", () => {
  const { sheet } = view(youga, "game-log-skill-5");
  assert.equal(sheet.skillName, "Timid");
  assert.equal(sheet.active, true);
  assert.deepEqual(sheet.damage, { kind: "not-modeled" });
});

test("the Effective HP banner and the Character stats tabs", () => {
  const { ehp, tabs } = view(youga, "").sheet;
  assert.equal(ehp.characterLevel, 100);
  assert.equal(ehp.weakest.label, "Effective HP · weakest: Physical");
  assert.deepEqual(
    ehp.pair.map((figure) => figure.key),
    ["pool", "expected", "dot"],
  );
  assert.deepEqual(
    ehp.types.map((item) => item.type),
    ["Physical", "Fire", "Cold", "Lightning", "Erosion"],
  );
  assert.deepEqual(ehp.types[1].ailment, { name: "Ignite", text: "3,269" });
  assert.equal(ehp.checklist.length, 14);
  assert.equal(ehp.checklist.find((item) => item.label === "Blinding").statusText, "Immune");
  // No Ailments & Reaping rows on this build: the tab is left out.
  assert.deepEqual(
    tabs.map((tab) => tab.key),
    ["offense", "defense", "utility", "target"],
  );
  for (const tab of tabs)
    assert.equal(
      tab.rowCount,
      tab.sections.reduce((sum, section) => sum + section.rows.length, 0),
    );
});

test("hero trait lines with a spaced percent sign print it closed", () => {
  const erika = calculateGoldenCase(state("hero/erika-wind-stalker/first"));
  const text = JSON.stringify(view(erika, "").sheet);
  assert.match(text, /Hero trait: Wind Stalker \(Lv 1\): \+26% Movement Speed/);
  assert.doesNotMatch(text, /\d %/);
});

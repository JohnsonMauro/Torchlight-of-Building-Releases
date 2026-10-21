// What the Stats view shows (src/app/bridge/stats-view-model.ts, damage-path-view-model.ts and the helpers they use), on
// the golden-master Youga build: the status, the skill picker, the recount with sources left out of the view, a skill
// whose damage is not modeled, the Effective HP banner, the Character stats tabs, the damage path tabs, sections and
// open questions, and texts printed as the legacy markup printed them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateGoldenCase, goldenInputs } from "../golden/cases.js";
import { prepareStatSheet, statsView } from "../../src/app/bridge/stats-view-model.ts";
import { prepareDamagePath } from "../../src/app/bridge/damage-path-view-model.ts";
import { displayTexts } from "../../src/app/bridge/display-text.ts";
import { numberText } from "../../src/app/stats/number-text.ts";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const format = (value) => number.format(value);
const state = (id) => goldenInputs().find((input) => input.id === id).state;
// The damage path also reads the build at 30% target Fire Resistance (src/app/stats/stats-controller.js statsSource).
const calculated = (id) => {
  const input = state(id);
  const theoretical = calculateGoldenCase({
    ...input,
    combat: { ...input.combat, targetFireResistancePercent: 30 },
  }).theoretical;
  return { planner: calculateGoldenCase(input), theoretical };
};
const yougaBuild = calculated("youga-l94");
const youga = yougaBuild.planner;
const view = (planner, skill, excluded = [], { theoretical = yougaBuild.theoretical, path = "hit" } = {}) =>
  statsView(
    { sheet: prepareStatSheet(planner, skill, format), damagePath: prepareDamagePath(theoretical, planner, format) },
    { panel: "sheet", path, excluded },
  );

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
  const erika = calculated("hero/erika-wind-stalker/first");
  const text = JSON.stringify(view(erika.planner, "", [], { theoretical: erika.theoretical }));
  assert.match(text, /Hero trait: Wind Stalker \(Lv 1\): \+26% Movement Speed/);
  assert.doesNotMatch(text, /\d %/);
});

test("the damage path tabs, grouped by skill, and the path a stale pick falls back to", () => {
  const { damagePath } = view(youga, "");
  assert.equal(damagePath.grouped, true);
  assert.deepEqual(
    damagePath.tabs.map((tab) => [tab.value, tab.figure]),
    [
      ["hit:game-log-skill-1", "1.63 B"],
      ["hit:game-log-skill-2", "554 K"],
      ["hit:game-log-skill-3", "50.8 K"],
      ["minion:thunder-magus", "10.0 K"],
      ["combined", "1.62 B"],
    ],
  );
  assert.equal(damagePath.active, "hit:game-log-skill-1");
  assert.equal(view(youga, "", [], { path: "combined" }).damagePath.active, "combined");
});

test("a path's summary, stages and sections", () => {
  const { paths, openQuestions } = view(youga, "").damagePath;
  const frostBolt = paths[0].section;
  assert.equal(frostBolt.empty, false);
  assert.equal(frostBolt.hero.value.short, "1.63 Billion");
  assert.match(frostBolt.hero.value.full, /^1,6\d\d,\d{3},\d{3}$/);
  assert.equal(frostBolt.hero.unit, "DPS");
  assert.deepEqual(frostBolt.chain.at(-1), {
    kind: "result",
    op: "=",
    label: "Hit DPS",
    value: "1.63 B",
    unit: "DPS",
    result: true,
  });
  assert.equal(frostBolt.chain[0].op, null);
  const [base, flat] = frostBolt.stages;
  assert.deepEqual(
    [base.step, base.title, base.connector, base.open],
    ["01", "Homing Frost Bolt · base hit", "", true],
  );
  assert.equal(flat.connector, "× added, then multiplied");
  assert.equal(flat.running.label, "Running value");
  assert.equal(base.feeders[0].source, "Homing Frost Bolt · Frost Bolt Lv.20");
  const combined = paths.find((path) => path.value === "combined").section;
  assert.equal(combined.sections[0].title, "Share by source over 10 s (recount)");
  assert.equal(combined.illOmen, null);
  assert.equal(openQuestions.length, 5);
  assert.ok(openQuestions.every((entry) => entry.id && entry.title && entry.alternatives.length));
});

test("an effect line's highlighted HTML becomes runs of text", async () => {
  const { htmlTextSegments } = await import("../../src/app/bridge/display-text.ts");
  assert.deepEqual(htmlTextSegments('Deals <span class="skill-damage-value">+12%</span> more &amp; &#39;x&#39;'), [
    { text: "Deals ", className: null },
    { text: "+12%", className: "skill-damage-value" },
    { text: " more & 'x'", className: null },
  ]);
  assert.deepEqual(htmlTextSegments(""), []);
});

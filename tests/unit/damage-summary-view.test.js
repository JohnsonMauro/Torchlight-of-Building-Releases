// The character column's damage summary (src/app/bridge/damage-summary-view-model.ts) on the golden-master Youga build:
// it reads the same figures as the Stats page's recount card, with the same sources left out, and names the main skill.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateGoldenCase, goldenInputs } from "../golden/cases.js";
import { damageSummaryView, EMPTY_DAMAGE_SUMMARY } from "../../src/app/bridge/damage-summary-view-model.ts";
import { prepareStatSheet, statsView } from "../../src/app/bridge/stats-view-model.ts";
import { prepareDamagePath } from "../../src/app/bridge/damage-path-view-model.ts";

const format = (value) => String(value);
const input = goldenInputs().find((entry) => entry.id === "youga-l94").state;
const youga = calculateGoldenCase(input);
const card = (excluded) =>
  statsView(
    { sheet: prepareStatSheet(youga, "game-log-skill-1", format), damagePath: prepareDamagePath(youga, youga, format) },
    { panel: "sheet", path: "hit", excluded },
  ).sheet.damage.recount;

test("the summary's average DPS and shares are the recount card's", () => {
  const summary = damageSummaryView(youga, []);
  const recount = card([]);
  assert.equal(summary.modeled, true);
  assert.equal(summary.spanSeconds, recount.spanSeconds);
  assert.deepEqual(summary.averageDps, recount.fields.find((field) => field.key === "averageDps").value);
  const shown = recount.sources.filter((source) => source.share !== "0.0%");
  assert.deepEqual(
    summary.sources.map((source) => [source.label, source.share, source.color]),
    shown.map((source) => [source.label, source.share, source.color]),
  );
  assert.equal(summary.mainSkill?.name, youga.mainSkill.name);
});

test("a source left out on the Stats page leaves the summary too, and the figure follows", () => {
  const key = "hit:game-log-skill-1";
  const summary = damageSummaryView(youga, [key]);
  assert.ok(!summary.sources.some((source) => source.key === key));
  assert.deepEqual(summary.averageDps, card([key]).fields.find((field) => field.key === "averageDps").value);
  assert.notDeepEqual(summary.averageDps, damageSummaryView(youga, []).averageDps);
});

test("without a modeled damage source there are no figures", () => {
  assert.deepEqual(
    damageSummaryView({ mainSkill: null, damageSources: [], dummyRecount: null }, []),
    EMPTY_DAMAGE_SUMMARY,
  );
});

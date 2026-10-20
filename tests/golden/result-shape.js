// Run-time check of src/planner-api.ts PlannerResult on a real result: the top-level keys are exactly
// plannerResultKeys, and the typed parts have the types the interface claims. golden.test.js runs it on every case.
// When a part of the result gets its real type, check it here too.
import { plannerResultKeys } from "../../src/planner-api.ts";

const NULLABLE = new Set([
  "dummyRecount",
  "afflictionRating",
  "bardDelivery",
  "beamDelivery",
  "combatProjection",
  "cycleResist",
  "damagePaths",
  "damageTypeRestriction",
  "hitRateFacts",
  "igniteIllOmen",
  "illOmen",
  "miraculousGain",
  "nativeHitCycle",
  "pureHeart",
  "recountFiveSeconds",
  "recountOpening",
  "recountVariation",
  "windStalker",
  "yougaUltimateOne",
]);
const NUMBERS = [
  "igniteAttemptsPerSecond",
  "skillLevelFactor",
  "effectiveTargetFireResistancePercent",
  "murmursTideEffectPercent",
  "tideEffectFactor",
  "igniteLimit",
  "sourceDamageMultiplier",
];
const LISTS = [
  "warnings",
  "assumptions",
  "bestCaseAssumptions",
  "barrierSources",
  "blurSources",
  "damageSources",
  "igniteAppliers",
  "minions",
  "modifierTexts",
  "resolvedSlates",
  "skillDots",
  "skillHits",
  "timedDotLayers",
  "triggerSkills",
];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/** Paths in `result` that do not match PlannerResult (empty when it matches). */
export function resultShapeProblems(result) {
  const problems = [];
  const expect = (ok, path) => {
    if (!ok) problems.push(path);
  };
  const types = (object, path, fields) => {
    expect(isObject(object), path);
    if (isObject(object))
      for (const [key, type] of Object.entries(fields)) expect(typeof object[key] === type, `${path}.${key}`);
  };
  const values = (object, path, check) => {
    expect(isObject(object), path);
    if (isObject(object)) for (const [key, value] of Object.entries(object)) expect(check(value), `${path}.${key}`);
  };

  const keys = Object.keys(result).sort();
  const listed = [...plannerResultKeys].sort();
  for (const key of keys) expect(listed.includes(key), `unlisted key ${key}`);
  for (const key of listed) expect(keys.includes(key), `missing key ${key}`);

  for (const key of plannerResultKeys) {
    const value = result[key];
    if (NUMBERS.includes(key)) expect(typeof value === "number", key);
    else if (LISTS.includes(key)) expect(Array.isArray(value), key);
    else expect(isObject(value) || (NULLABLE.has(key) && value === null), key);
  }

  result.warnings.forEach((warning, index) => expect(typeof warning === "string", `warnings[${index}]`));
  types(result.mainSkill, "mainSkill", {
    name: "string",
    role: "string",
    icon: "string",
    setupKey: "string",
    effectiveLevel: "number",
    enabled: "boolean",
  });
  expect(
    Array.isArray(result.mainSkill.tags) && result.mainSkill.tags.every((tag) => typeof tag === "string"),
    "mainSkill.tags",
  );
  result.assumptions.forEach((choice, index) => {
    const path = `assumptions[${index}]`;
    types(choice, path, { group: "string", chosen: "string", best: "string" });
    expect(choice.pinned === undefined || typeof choice.pinned === "boolean", `${path}.pinned`);
    choice.compared.forEach((option, at) => {
      types(option, `${path}.compared[${at}]`, { label: "string", twentySecondDps: "number" });
      values(option.overrides, `${path}.compared[${at}].overrides`, (value) => typeof value === "boolean");
    });
  });
  result.bestCaseAssumptions.forEach((assumption, index) =>
    types(assumption, `bestCaseAssumptions[${index}]`, {
      id: "string",
      toggle: "string",
      label: "string",
      on: "boolean",
      note: "string",
      text: "string",
    }),
  );

  const recount = result.dummyRecount;
  if (recount !== null) {
    const options = (object, path) =>
      types(object, path, {
        afflictionModel: "string",
        afflictionAccrual: "string",
        reapTiming: "string",
        retention: "string",
        recountStart: "string",
      });
    const assumptions = (list, path) => {
      expect(Array.isArray(list), path);
      list?.forEach((item, index) => types(item, `${path}[${index}]`, { id: "string", text: "string" }));
    };
    const { timeline } = recount;
    types(timeline, "dummyRecount.timeline", {
      stepSeconds: "number",
      seconds: "number",
      firstDamageSeconds: "number",
    });
    expect(timeline.total instanceof Float64Array, "dummyRecount.timeline.total");
    values(timeline.bySource, "dummyRecount.timeline.bySource", (value) => value instanceof Float64Array);
    values(timeline.labels, "dummyRecount.timeline.labels", (value) => typeof value === "string");
    options(timeline.options, "dummyRecount.timeline.options");
    assumptions(timeline.assumptions, "dummyRecount.timeline.assumptions");
    for (const name of ["fiveSeconds", "twentySeconds"]) {
      const path = `dummyRecount.${name}`;
      types(recount[name], path, { start: "number", seconds: "number", totalDamage: "number", dps: "number" });
      values(
        recount[name].bySource,
        `${path}.bySource`,
        (value) => typeof value?.totalDamage === "number" && typeof value?.dps === "number",
      );
    }
    types(recount.steady, "dummyRecount.steady", { dps: "number", approximate: "boolean" });
    values(recount.steady.bySource, "dummyRecount.steady.bySource", (value) => typeof value === "number");
    types(recount.recount20, "dummyRecount.recount20", {
      span: "number",
      truncated: "boolean",
      start: "string",
      startSeconds: "number",
      windowSeconds: "number",
      totalDamage: "number",
      averageDps: "number",
      highest5sDps: "number",
      last5sDps: "number",
      highest5sDpsContinuous: "number",
      first5sDps: "number",
      meanRolling5sDps: "number",
    });
    options(recount.options, "dummyRecount.options");
    assumptions(recount.assumptions, "dummyRecount.assumptions");
  }
  return problems;
}

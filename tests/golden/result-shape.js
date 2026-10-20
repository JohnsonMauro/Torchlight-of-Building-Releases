// Run-time check of src/engine/planner-api.ts PlannerResult on a real result: the top-level keys are exactly
// plannerResultKeys, and the typed parts have the types the interface claims. golden.test.js runs it on every case.
// When a part of the result gets its real type, check it here too.
import { plannerResultKeys } from "../../src/engine/planner-api.ts";

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

  values(result.conditions, "conditions", (value) => typeof value === "boolean");
  types(result.lowResources, "lowResources", {
    lowLife: "boolean",
    lowMana: "boolean",
    lifePercent: "number",
    manaPercent: "number",
    damageTakenFactor: "number",
    injuryBufferPercent: "number",
  });
  types(result.firesAllure, "firesAllure", {
    active: "boolean",
    nearby: "boolean",
    activeStacks: "number",
    resistanceReductionPercent: "number",
    effectiveResistancePercent: "number",
    allureFireResistanceReductionPercent: "number",
    scorchBaseResistanceReductionPercent: "number",
    durationAssumption: "string",
    stackAssumption: "string",
  });
  types(result.aim, "aim", {
    active: "boolean",
    charges: "number",
    maxCharges: "number",
    uptimePercent: "number",
    uptimeLabel: "string",
    uptimeSource: "string",
    damagePercent: "number",
    ailmentDamagePercent: "number",
    castSpeedPercent: "number",
    averageDamagePercent: "number",
    averageAilmentDamagePercent: "number",
    averageCastSpeedPercent: "number",
    durationSeconds: "number",
  });
  expect(
    result.aim.derivedUptimePercent === undefined || typeof result.aim.derivedUptimePercent === "number",
    "aim.derivedUptimePercent",
  );
  (result.aim.chargeSources || []).forEach((entry, index) =>
    types(entry, `aim.chargeSources[${index}]`, { source: "string", value: "number" }),
  );
  const activation = result.activation;
  expect(activation.activeNames instanceof Set, "activation.activeNames");
  types(activation.energy, "activation.energy", {
    available: "number",
    capturedMaximum: "number",
    equipmentEnergy: "number",
    nonEquipmentEnergy: "number",
  });
  for (const key of ["activeSlotCosts", "passiveSlotCosts"])
    expect(
      Array.isArray(activation.profile[key]) && activation.profile[key].every((cost) => typeof cost === "number"),
      `activation.profile.${key}`,
    );
  const grant = (value, path, place) =>
    expect(
      value === undefined ||
        (typeof value?.[place] === "number" &&
          typeof value.trait === "string" &&
          typeof value.source === "string" &&
          (value.replaces === null || typeof value.replaces === "string")),
      path,
    );
  activation.setups.forEach((setup, index) => {
    const path = `activation.setups[${index}]`;
    types(setup, path, {
      setupKey: "string",
      name: "string",
      role: "string",
      icon: "string",
      enabled: "boolean",
      baseLevel: "number",
      addedLevels: "number",
      effectiveLevel: "number",
      energyCost: "number",
    });
    expect(Array.isArray(setup.tags) && setup.tags.every((tag) => typeof tag === "string"), `${path}.tags`);
    expect(
      Array.isArray(setup.occupiedSupportSlots) &&
        setup.occupiedSupportSlots.every((occupied) => typeof occupied === "boolean"),
      `${path}.occupiedSupportSlots`,
    );
    expect(setup.instanceId === undefined || typeof setup.instanceId === "string", `${path}.instanceId`);
    expect(setup.slotInactive === undefined || typeof setup.slotInactive === "string", `${path}.slotInactive`);
    grant(setup.traitGranted, `${path}.traitGranted`, "row");
    setup.supports.forEach((support, at) => {
      types(support, `${path}.supports[${at}]`, {
        name: "string",
        enabled: "boolean",
        level: "number",
        baseLevel: "number",
        addedLevels: "number",
        effectiveLevel: "number",
      });
      expect(Array.isArray(support.effects), `${path}.supports[${at}].effects`);
      grant(support.traitGranted, `${path}.supports[${at}].traitGranted`, "slot");
    });
  });
  const reservation = {
    manaReservedPercent: "number",
    lifeReservedPercent: "number",
    manaDemandPercent: "number",
    lifeDemandPercent: "number",
    manaRemainingPercent: "number",
    lifeRemainingPercent: "number",
  };
  types(result.aura, "aura", reservation);
  types(result.aura.planned, "aura.planned", reservation);

  types(result.seaFoamNocturne, "seaFoamNocturne", {
    selected: "boolean",
    applied: "boolean",
    tideEffectPercent: "number",
    stacks: "number",
    buildStacks: "number",
    perStackPercent: "number",
    factor: "number",
  });

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

// Typed entry point of the calculation: calculate(state) → PlannerResult. The engine (src/planner.js and the models it
// imports) stays JavaScript for now; this module is its contract. Every top-level key of the result is listed with the
// nullability measured on the golden cases (tests/golden), which check the list and the typed parts on every case.
// Parts no TypeScript code reads yet are ResultSection / ResultList: give a part its real type when a view that reads it
// moves to TypeScript, and extend tests/golden/result-shape.js with it.
// The result is structured-cloneable (Map, Set, Float64Array, RegExp, Infinity; no functions), so it can cross a worker.
import { calculatePlanner } from "./planner.js";
import type { PlannerState } from "./planner-state.ts";

/** A part of the result not typed yet (some engine JSDoc already says `object`). */
export type ResultSection = object;
/** A list in the result not typed yet. */
export type ResultList = readonly unknown[];

// ---- Dummy recount (the 60 s timeline against the training dummy and its windows) -------------------------------

/** How the recount models afflictions, reaping and its start; each option is a short id. */
export interface RecountOptions {
  afflictionModel: string;
  afflictionAccrual: string;
  reapTiming: string;
  retention: string;
  recountStart: string;
}
export interface RecountAssumption {
  id: string;
  value: unknown;
  text: string;
}
/** A window of the timeline. Sources are keyed like "hit:<setup>", "minion:<id>", "ignite", "beam", "reap:<n>". */
export interface RecountWindow {
  start: number;
  seconds: number;
  totalDamage: number;
  dps: number;
  bySource: Record<string, { totalDamage: number; dps: number }>;
}
export interface DummyRecount {
  timeline: {
    stepSeconds: number;
    seconds: number;
    /** Damage per step. */
    total: Float64Array;
    bySource: Record<string, Float64Array>;
    firstDamageSeconds: number;
    options: RecountOptions;
    /** Display name per source key. */
    labels: Record<string, string>;
    assumptions: RecountAssumption[];
  };
  fiveSeconds: RecountWindow;
  twentySeconds: RecountWindow;
  steady: { dps: number; bySource: Record<string, number>; approximate: boolean };
  /** The in-game 20 s recount readout. */
  recount20: {
    span: number;
    truncated: boolean;
    start: string;
    startSeconds: number;
    windowSeconds: number;
    totalDamage: number;
    averageDps: number;
    highest5sDps: number;
    last5sDps: number;
    highest5sDpsContinuous: number;
    first5sDps: number;
    meanRolling5sDps: number;
  };
  options: RecountOptions;
  assumptions: RecountAssumption[];
}

// ---- Assumptions --------------------------------------------------------------------------------------------------

/** Automatic condition mode: which option of a group that cannot hold together was chosen (the best 20 s figure). */
export interface ExclusiveChoice {
  group: string;
  chosen: string;
  best: string;
  /** The user pinned the chosen option on the Config tab. */
  pinned?: boolean;
  compared: { label: string; twentySecondDps: number; overrides: Record<string, boolean> }[];
}
/** A condition the figures take in its best case, and why. */
export interface BestCaseAssumption {
  id: string;
  toggle: string;
  label: string;
  on: boolean;
  value: unknown;
  note: string;
  text: string;
}

// ---- Combat conditions and the Config tab -------------------------------------------------------------------------

/** Every combat condition the calculation used, on or off (ids as in combat.conditions). */
export type PlannerConditions = Record<string, boolean>;
export interface LowResources {
  lowLife: boolean;
  lowMana: boolean;
  lifePercent: number;
  manaPercent: number;
  damageTakenFactor: number;
  injuryBufferPercent: number;
  sources: ResultList;
  unsupported: ResultList;
}
/** Fire's Allure (Scorch stacks lowering the enemy's Fire Resistance). */
export interface FiresAllure {
  active: boolean;
  nearby: boolean;
  activeStacks: number;
  resistanceReductionPercent: number;
  effectiveResistancePercent: number;
  allureFireResistanceReductionPercent: number;
  scorchBaseResistanceReductionPercent: number;
  durationAssumption: string;
  stackAssumption: string;
}
/** Aim: charges, uptime and what it adds. Fields present only while Aim is in the build are optional. */
export interface AimSummary {
  active: boolean;
  charges: number;
  maxCharges: number;
  uptimePercent: number;
  /** The uptime the build gives (before a manual override). */
  derivedUptimePercent?: number;
  uptimeLabel: string;
  uptimeSource: string;
  chargeSources?: { source: string; value: number }[];
  damagePercent: number;
  ailmentDamagePercent: number;
  castSpeedPercent: number;
  averageDamagePercent: number;
  averageAilmentDamagePercent: number;
  averageCastSpeedPercent: number;
  durationSeconds: number;
  sources: ResultList;
}
/** Sea Foam Nocturne: extra Channeled Stacks raising the Tide effect. */
export interface SeaFoamNocturne {
  selected: boolean;
  applied: boolean;
  tideEffectPercent: number;
  stacks: number;
  buildStacks: number;
  perStackPercent: number;
  factor: number;
}

// ---- The result ---------------------------------------------------------------------------------------------------

/** The skill the headline figures are for (the first enabled damage setup). Other fields are not typed yet. */
export interface MainSkill {
  name: string;
  role: string;
  icon: string;
  tags: readonly string[];
  setupKey: string;
  effectiveLevel: number;
  enabled: boolean;
}

export interface PlannerResult {
  /** The normalized input. */
  state: PlannerState;
  mainSkill: MainSkill;
  dummyRecount: DummyRecount | null;
  assumptions: ExclusiveChoice[];
  bestCaseAssumptions: BestCaseAssumption[];
  /** What the calculation could not model or settle, as text for the user. */
  warnings: string[];

  igniteAttemptsPerSecond: number;
  skillLevelFactor: number;
  effectiveTargetFireResistancePercent: number;
  murmursTideEffectPercent: number;
  tideEffectFactor: number;
  igniteLimit: number;
  sourceDamageMultiplier: number;

  activation: ResultSection;
  activationMediumTerra: ResultSection;
  afflictionRating: ResultSection | null;
  ailments: ResultSection;
  aim: AimSummary;
  aura: ResultSection;
  bardDelivery: ResultSection | null;
  beamAddedDamage: ResultSection;
  beamCastRate: ResultSection;
  beamCritical: ResultSection;
  beamDelivery: ResultSection | null;
  blessings: ResultSection;
  block: ResultSection;
  blurEffects: ResultSection;
  combatProjection: ResultSection | null;
  conditions: PlannerConditions;
  configured: ResultSection;
  coreTalents: ResultSection;
  critNumbedBuffs: ResultSection;
  curseLimit: ResultSection;
  cycleResist: ResultSection | null;
  damagePaths: ResultSection | null;
  damageTypeRestriction: ResultSection | null;
  danceOfTheDeep: ResultSection;
  directHit: ResultSection;
  dotTriggers: ResultSection;
  empowerEffects: ResultSection;
  enemyDebuffCores: ResultSection;
  equipment: ResultSection;
  firesAllure: FiresAllure;
  follower: ResultSection;
  fullLife: ResultSection;
  heroMemories: ResultSection;
  hitRateFacts: ResultSection | null;
  igniteIllOmen: ResultSection | null;
  illOmen: ResultSection | null;
  lineEffects: ResultSection;
  lowResources: LowResources;
  mark: ResultSection;
  mechanics: ResultSection;
  minionCores: ResultSection;
  miraculousGain: ResultSection | null;
  nativeHitCycle: ResultSection | null;
  pact: ResultSection;
  periodicBurst: ResultSection;
  pureHeart: ResultSection | null;
  recountFiveSeconds: ResultSection | null;
  recountOpening: ResultSection | null;
  recountVariation: ResultSection | null;
  resistances: ResultSection;
  seaFoamNocturne: SeaFoamNocturne;
  singWithTheTide: ResultSection;
  support: ResultSection;
  supportEffects: ResultSection;
  talentSlate: ResultSection;
  tangles: ResultSection;
  theoretical: ResultSection;
  townSupportPrediction: ResultSection;
  weaponAttack: ResultSection;
  weaponToSpells: ResultSection;
  windRhythmTerra: ResultSection;
  windStalker: ResultSection | null;
  yougaUltimateOne: ResultSection | null;

  barrierSources: ResultList;
  blurSources: ResultList;
  damageSources: ResultList;
  igniteAppliers: ResultList;
  minions: ResultList;
  modifierTexts: ResultList;
  resolvedSlates: ResultList;
  skillDots: ResultList;
  skillHits: ResultList;
  timedDotLayers: ResultList;
  triggerSkills: ResultList;
}

/**
 * Every top-level key of PlannerResult, in a fixed order (tests/types checks it lists them all; tests/golden checks the
 * engine returns exactly these).
 */
export const plannerResultKeys = [
  "state",
  "mainSkill",
  "dummyRecount",
  "assumptions",
  "bestCaseAssumptions",
  "warnings",
  "igniteAttemptsPerSecond",
  "skillLevelFactor",
  "effectiveTargetFireResistancePercent",
  "murmursTideEffectPercent",
  "tideEffectFactor",
  "igniteLimit",
  "sourceDamageMultiplier",
  "activation",
  "activationMediumTerra",
  "afflictionRating",
  "ailments",
  "aim",
  "aura",
  "bardDelivery",
  "beamAddedDamage",
  "beamCastRate",
  "beamCritical",
  "beamDelivery",
  "blessings",
  "block",
  "blurEffects",
  "combatProjection",
  "conditions",
  "configured",
  "coreTalents",
  "critNumbedBuffs",
  "curseLimit",
  "cycleResist",
  "damagePaths",
  "damageTypeRestriction",
  "danceOfTheDeep",
  "directHit",
  "dotTriggers",
  "empowerEffects",
  "enemyDebuffCores",
  "equipment",
  "firesAllure",
  "follower",
  "fullLife",
  "heroMemories",
  "hitRateFacts",
  "igniteIllOmen",
  "illOmen",
  "lineEffects",
  "lowResources",
  "mark",
  "mechanics",
  "minionCores",
  "miraculousGain",
  "nativeHitCycle",
  "pact",
  "periodicBurst",
  "pureHeart",
  "recountFiveSeconds",
  "recountOpening",
  "recountVariation",
  "resistances",
  "seaFoamNocturne",
  "singWithTheTide",
  "support",
  "supportEffects",
  "talentSlate",
  "tangles",
  "theoretical",
  "townSupportPrediction",
  "weaponAttack",
  "weaponToSpells",
  "windRhythmTerra",
  "windStalker",
  "yougaUltimateOne",
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
] as const satisfies readonly (keyof PlannerResult)[];

/** Calculates a build. `input` is validated and normalized first (throws a TypeError naming an invalid field). */
export function calculate(input: unknown): PlannerResult {
  return calculatePlanner(input);
}

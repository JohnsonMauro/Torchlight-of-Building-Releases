import { cleanGameText } from "../text/percentage-text.js";
import { b6RevivedLine } from "./minion-heroes.js";
import { ORDER_CALLING } from "./moto/order-calling.js";
import { CHARGE_CALLING } from "./moto/charge-calling.js";
import { GROWING_BREEZE } from "./iris/growing-breeze.js";
import { VIGILANT_BREEZE } from "./iris/vigilant-breeze.js";
import { THEA_HEROES, theaRevivedLine } from "./thea/trait-lines.js";
import { settleTheaCrowdControl } from "./thea/blasphemer.js";
import { SAGE, sageRevivedLine } from "./sage/licorice-note.js";
import { CARINO_HEROES, carinoRevivedLine } from "./carino/trait-lines.js";
import { REHAN_HEROES, rehanRevivedLine } from "./rehan/trait-lines.js";
import { BING_CREATIVE, bingRevivedLine } from "./bing/creative-genius.js";
import { BLAST_NOVA, blastNovaRevivedLine } from "./bing/blast-nova.js";
import { CARINO_MODULES } from "./carino/badges.js";
import { BING_MODULES } from "./bing/badges.js";
import { YOUGA_MODULES, yougaRevivedLine } from "./youga/badges.js";
import { GEMMA_MODULES } from "./gemma/badges.js";
import { SELENA_MODULES, selenaRevivedLine } from "./selena/badges.js";
import { REHAN_MODULES } from "./rehan/badges.js";
import { ERIKA_MODULES, erikaRevivedLine } from "./erika/badges.js";
import { THEA_MODULES } from "./thea/badges.js";
import { SAGE_MODULES } from "./sage/badges.js";
import { ROSA_MODULES, rosaRevivedLine } from "./rosa/badges.js";
import { MINION_HERO_MODULES } from "./minion-hero-badges.js";

// Per-hero trait mechanics (research/talent-batch-2026-10-12.md §6.2, chunk 4). Trait lines join planner.modifierTexts
// (origin "trait"), so plain clauses already reach every engine; this module reads the hero-specific states the plain
// readers cannot. There is no in-game reference run for any of them yet, so every module is Provisional, with its
// assumptions listed, and §9 names the run that would check it. A module is implemented only where the trait text and the
// keyword tooltips define it; where the cycle is left undefined it stays Not modeled with the reason (no guessed cadence).

// The module table: each hero's records (its rows, the lines each reads and its badge handler), a hero's rows in its file's order.
export const HERO_MODULES = Object.freeze([
  ...CARINO_MODULES,
  ...BING_MODULES,
  ...YOUGA_MODULES,
  ...GEMMA_MODULES,
  ...SELENA_MODULES,
  ...REHAN_MODULES,
  ...ERIKA_MODULES,
  ...THEA_MODULES,
  ...SAGE_MODULES,
  ...ROSA_MODULES,
  ...MINION_HERO_MODULES,
]);

/** A hero's exclusive revived lines its modules read (packages/engine/src/heroes/hero-exclusive-revivals.js MODULE_LINES). */
export function heroModuleRevivedLine(heroId, text) {
  const clean = cleanGameText(String(text ?? ""));
  // Youga (B4): Telepathy Expert; To Myself in Another Spacetime and its Turbulence Duration.
  if (heroId === "youga-spacetime-illusion" || heroId === "youga-spacetime-elapse")
    return yougaRevivedLine(heroId, clean);
  // Erika (B5): Charging Tail and Vengeful Night Wraith.
  if (heroId === "erika-lightning-shadow" || heroId === "erika-vendettas-sting") return erikaRevivedLine(heroId, clean);
  // Moto / Iris (B6): Machine's Joy, Peril of Synthetic Troops, Nourishing Spring Rain, Nature's Party, Soft Storm, Blowing Breeze.
  if ([ORDER_CALLING, CHARGE_CALLING, GROWING_BREEZE, VIGILANT_BREEZE].includes(heroId))
    return b6RevivedLine(heroId, clean);
  // Thea (B7): The Place of Oracle (and its Blessing variants), Crossing the Divine Threshold's Blessing line, Inverted Shrine.
  if (THEA_HEROES.has(heroId)) return theaRevivedLine(heroId, clean);
  // Sage (B8): Omni-Elixir Side Effect, Basic Pharmacology Manuscript.
  if (heroId === SAGE) return sageRevivedLine(heroId, clean);
  // Carino (B9): Royal Arsenal's Noble line, Into the Night, Self-Imposed Shackles' Heat Up line.
  if (CARINO_HEROES.has(heroId)) return carinoRevivedLine(heroId, clean);
  // Rehan (B10): Hero's Resourcefulness, Furious Roar, Ancestral Hate's Life cost, Starfall Wasteland.
  if (REHAN_HEROES.has(heroId)) return rehanRevivedLine(heroId, clean);
  // Rosa (B11): Mercury Purged's Baptism lines, Between the Holy Land and Hell's Repent to the Light.
  if (heroId === "rosa-unsullied-blade" || heroId === "rosa-high-court-chariot") return rosaRevivedLine(heroId, clean);
  // Selena – Dance of the Deep (B13): Red Shoes of Cruelty.
  if (heroId === "selena-dance-of-the-deep") return selenaRevivedLine(heroId, clean);
  // Bing – Creative Genius (B12): Genius Idea Generator's Whimsy line.
  if (heroId === BING_CREATIVE) return bingRevivedLine(heroId, clean);
  // Bing – Blast Nova: Bing's Big Bang Pack (the bomb model).
  if (heroId === BLAST_NOVA) return blastNovaRevivedLine(heroId, clean);
  return false;
}

/** The module a trait line belongs to for this hero, or null. */
export function heroModuleFor(heroId, text) {
  for (const module of HERO_MODULES) if (module.heroes.test(heroId || "") && module.lines.test(text)) return module;
  return null;
}

/**
 * @param {object[]} modifierTexts planner.modifierTexts (trait lines have origin "trait")
 * @param {object} state packages/engine/src/planner.js lineConditionState (heroId, activeTags, mainIsTerra)
 * @returns {{ entries, derived, illusion }}
 */
export function resolveHeroModules(modifierTexts = [], state = {}) {
  const heroId = state.heroId || "";
  const traits = modifierTexts
    .filter((line) => line.origin === "trait" || (line.origin === "memory" && heroModuleRevivedLine(heroId, line.text)))
    .map((line) => ({
      ...line,
      clean: cleanGameText(String(line.text ?? "")),
    }));
  const entries = [],
    derived = [];
  // Clocked effects for the windows and the recount (packages/engine/src/combat/timed-effects.js; Purgatory's casts).
  const timedEffects = [];
  // Youga (B4): per-call caches of the Illusion / Twisted Spacetime readings.
  const youga = {};
  // Gemma (B3): per-call caches of the Frostfire / Cold Pulse readings, and Dress Licker's taken-side conversion for skill hits.
  const gemma = {};
  // Moto / Iris (B6): the best-case switches are listed once per call.
  const b6 = { switched: false };
  // Thea (B7): the settled state (Mountain of Sins reads the dummy's crowd control from the combat states) and its switches; Rosa's
  // Holy Domain switch (Q-H7).
  const thea = { switched: false, state: settleTheaCrowdControl(state.thea || null, state.enemyCrowdControl || null) };
  const rosa = { switched: false };
  // Sage (B8): the best-case switches are listed once per call.
  const sage = { switched: false };
  // Carino (B9) and Bing's Firepower Coverage (Q-H15): the best-case switches are listed once per call.
  const carino = { switched: false, returning: false, firepower: false };
  // Rehan (B10): the best-case switches are listed once per call.
  const rehan = { switched: false };
  // Bing – Creative Genius (B12): the energy-field switch is listed once per call.
  const bing = { switched: false };
  // `extra`: markers a reader keys on (Rehan, B10: `rehanPhase` on the time-averaged Rage lines, `rehanNonBurst` on Tunnel Vision's
  // penalty; packages/engine/src/planner.js swaps them on Burst, the Seething Spirit and the disarmed player).
  const derive = (text, source, conditionText, extra = {}) =>
    derived.push({
      text,
      source,
      origin: /damage taken$/i.test(text) ? "derived" : "trait",
      multiplier: 1,
      derivedFrom: source,
      lineEffect: { conditional: true, key: "heroModule", conditionText, provisional: true },
      ...extra,
    });
  const entry = (line, module, active, conditionText, bodies = []) =>
    entries.push({
      source: line.source,
      origin: "trait",
      text: line.clean,
      active,
      conditionText: `${module.label}: ${conditionText}`,
      status: module.status === "Not modeled" ? "Not modeled" : active ? "In calc" : "Inactive",
      provisional: true,
      bodies: bodies.map((text) => ({ body: text, derivedText: active ? text : null, readers: ["hero"] })),
      condition: "heroModule",
      group: null,
      module: module.key,
    });
  // A line a module reads that moves no damage (defensive, settled elsewhere, the dummy already inside): its status and why.
  const neutral = (line, module, status, why) =>
    entries.push({
      source: line.source,
      origin: line.origin || "trait",
      text: line.clean,
      active: false,
      conditionText: `${module.label}: ${why}`,
      status,
      provisional: true,
      bodies: [],
      condition: "heroModule",
      group: null,
      module: module.key,
    });
  const moduleFor = (line) => heroModuleFor(heroId, line.clean);
  // What a hero's badge handler reads (each hero's badges.js): the call's lists, the entry / derive helpers and the per-call
  // caches and switch flags.
  const ctx = {
    heroId,
    state,
    traits,
    entries,
    derived,
    timedEffects,
    entry,
    derive,
    neutral,
    moduleFor,
    youga,
    gemma,
    b6,
  };
  // The readings a handler hands back to the return below.
  ctx.out = { illusion: null, spacetime: null, takenConversion: null };
  Object.assign(ctx, { thea, rosa, sage, carino, rehan, bing });
  for (const line of traits) {
    const module = moduleFor(line);
    if (!module) continue;
    if (module.status === "Not modeled") {
      entry(line, module, false, module.rule);
      continue;
    }
    if (module.badge) {
      module.badge(line, module, ctx);
      continue;
    }
  }
  return {
    entries,
    derived,
    illusion: ctx.out.illusion,
    spacetime: ctx.out.spacetime,
    timedEffects,
    takenConversion: ctx.out.takenConversion,
    gemma: {
      frostfire: gemma.frostfire ? { ...gemma.frostfire } : null,
      coldPulse: gemma.coldPulse?.pulse
        ? {
            intervalSeconds: gemma.coldPulse.intervalSeconds,
            pulsesPerSecond: gemma.coldPulse.pulse.pulsesPerSecond,
            stacks: gemma.coldPulse.pulse.stacks,
            blooming: gemma.coldPulse.blooming,
          }
        : null,
    },
    // The table rows without the lines and the handler a hero's record carries.
    modules: HERO_MODULES.filter((module) => module.heroes.test(heroId)).map((module) =>
      Object.fromEntries(Object.entries(module).filter(([key]) => key !== "lines" && key !== "badge")),
    ),
  };
}

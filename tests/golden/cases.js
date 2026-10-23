// Golden-master cases: planner inputs covering the default build, a real imported build (Youga The Ultimate One, L94,
// read from a game log and sanitised by src/game-log/game-log-import.js), every hero with two trait picks on that build's gear,
// combat-setting variants, and an Ignite build on an otherwise empty character (Fire Burst with Additional Ignite, Cataclysm
// and Control Spell, Flame Focus, Warlord with Starfire and the [5,2] Fire Infiltration node; built from the catalogs
// 2026-10-23, so it is a ruler for the Ignite path, not a measured character). Imports are relative to this file so tests/golden/diff.js can run the copy from an older
// git ref against its own src/.
import { readFileSync } from "node:fs";
import { calculatePlanner } from "../../packages/engine/src/planner.js";
import { defaultPlannerState, normalizePlannerState } from "../../packages/engine/src/state/planner-state.ts";
import { switchHeroLoadout } from "../../packages/engine/src/heroes/hero-loadouts.js";
import { heroCatalog } from "../../packages/engine/data/heroes/hero-catalog.js";
import { allHeroTraits } from "../../packages/engine/data/heroes/all-hero-traits.generated.js";

const TRAIT_LEVELS = [45, 60, 75];
const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const youga = fixture("youga-the-ultimate-one-l94.state.json");
const fireBurstIgnite = fixture("fire-burst-ignite-warlord.state.json");

function withHero(state, heroId, pick) {
  const next = structuredClone(state);
  next.hero = switchHeroLoadout(next.hero, heroId);
  const traits = allHeroTraits[heroId]?.traits || [];
  for (const level of TRAIT_LEVELS) {
    const options = traits.filter((trait) => trait.level === level);
    if (options.length)
      next.hero.selectedTraits[`level${level}`] = (pick === "first" ? options[0] : options.at(-1)).name;
  }
  return next;
}

function withCombat(state, combat) {
  const next = structuredClone(state);
  next.combat = { ...next.combat, ...combat };
  return next;
}

/** [{ id, state }] in a fixed order. */
export function goldenInputs() {
  const inputs = [
    { id: "default", state: structuredClone(defaultPlannerState) },
    { id: "youga-l94", state: structuredClone(youga) },
    { id: "youga-l94/manual-conditions", state: withCombat(youga, { conditionMode: "manual" }) },
    { id: "youga-l94/fire-res-0", state: withCombat(youga, { targetFireResistancePercent: 0 }) },
    { id: "youga-l94/fire-res-75", state: withCombat(youga, { targetFireResistancePercent: 75 }) },
    { id: "youga-l94/affliction-0", state: withCombat(youga, { afflictionAverage: 0, afflictionPeak: 0 }) },
    { id: "fire-burst-ignite", state: structuredClone(fireBurstIgnite) },
    { id: "fire-burst-ignite/manual-conditions", state: withCombat(fireBurstIgnite, { conditionMode: "manual" }) },
    {
      id: "fire-burst-ignite/cold-start",
      state: withCombat(fireBurstIgnite, { bestCaseOverrides: { prebuiltSelfBuffs: false } }),
    },
  ];
  for (const hero of heroCatalog) {
    for (const pick of ["first", "last"])
      inputs.push({ id: `hero/${hero.id}/${pick}`, state: withHero(youga, hero.id, pick) });
  }
  return inputs;
}

export const calculateGoldenCase = (state) => calculatePlanner(normalizePlannerState(state));

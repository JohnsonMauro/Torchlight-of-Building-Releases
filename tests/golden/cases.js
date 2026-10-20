// Golden-master cases: planner inputs covering the default build, a real imported build (Youga The Ultimate One, L94,
// read from a game log and sanitised by src/game-log-import.js), every hero with two trait picks on that build's gear,
// and combat-setting variants. Imports are relative to this file so tests/golden/diff.js can run the copy from an older
// git ref against its own src/.
import { readFileSync } from "node:fs";
import { calculatePlanner } from "../../src/planner.js";
import { defaultPlannerState, normalizePlannerState } from "../../src/planner-state.js";
import { switchHeroLoadout } from "../../src/hero-loadouts.js";
import { heroCatalogSs13 } from "../../src/data/heroes/hero-catalog-ss13.js";
import { allHeroTraitsSs13 } from "../../src/data/heroes/all-hero-traits-ss13.generated.js";

const TRAIT_LEVELS = [45, 60, 75];
const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const youga = fixture("youga-the-ultimate-one-l94.state.json");

function withHero(state, heroId, pick) {
  const next = structuredClone(state);
  next.hero = switchHeroLoadout(next.hero, heroId);
  const traits = allHeroTraitsSs13[heroId]?.traits || [];
  for (const level of TRAIT_LEVELS) {
    const options = traits.filter((trait) => trait.level === level);
    if (options.length) next.hero.selectedTraits[`level${level}`] = (pick === "first" ? options[0] : options.at(-1)).name;
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
    { id: "youga-l94/affliction-0", state: withCombat(youga, { afflictionAverage: 0, afflictionPeak: 0 }) }
  ];
  for (const hero of heroCatalogSs13) {
    for (const pick of ["first", "last"]) inputs.push({ id: `hero/${hero.id}/${pick}`, state: withHero(youga, hero.id, pick) });
  }
  return inputs;
}

export const calculateGoldenCase = (state) => calculatePlanner(normalizePlannerState(state));

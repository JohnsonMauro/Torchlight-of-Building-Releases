// Type-level checks for packages/engine/src/planner-api.ts, run by `pnpm typecheck`. Every expected error must happen: if a type
// loosens, tsc reports the unused directive.
import { calculate, plannerResultKeys } from "../../packages/engine/src/planner-api.ts";
import type { PlannerResult } from "../../packages/engine/src/planner-api.ts";

// plannerResultKeys lists every key of PlannerResult (and, by its `satisfies`, nothing else).
type Unlisted = Exclude<keyof PlannerResult, (typeof plannerResultKeys)[number]>;
export const everyKeyListed: [Unlisted] extends [never] ? true : false = true;

const result = calculate({});
export const headline: [string | undefined, string[], string, number | undefined] = [
  result.mainSkill?.name,
  result.warnings,
  result.state.hero.selectedHeroId,
  result.dummyRecount?.twentySeconds.bySource["hit:x"]?.dps,
];
export const timeline: Float64Array | undefined = result.dummyRecount?.timeline.total;
export const skills: [ReadonlySet<string>, string, number | undefined, string | undefined] = [
  result.activation.activeNames,
  result.activation.setups[0].setupKey,
  result.aura.planned?.manaDemandPercent,
  result.activation.setups[0].supports[0].traitGranted?.trait,
];

// @ts-expect-error a build without skills has no Main Skill
export const mainSkillName: string = result.mainSkill.name;
// @ts-expect-error the recount can be missing
export const dps: number = result.dummyRecount.twentySeconds.dps;
// @ts-expect-error untyped sections are read through a type of their own, not by guessing fields
export const guessed = result.activationMediumTerra.active;
// @ts-expect-error most setups are not granted by a hero trait
export const grantedRow: number = result.activation.setups[0].traitGranted.row;
// @ts-expect-error warnings are text
export const warningCount: number = result.warnings[0];
// @ts-expect-error the result is not any
export const missing = result.nickname;

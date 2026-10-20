// Type-level checks for the normalized PlannerState and the BuildLibrary, run by `pnpm typecheck` (tsc -p .). Every
// expected error must happen: if a type loosens (any, unknown, all optional), tsc reports the unused directive.
import { defaultPlannerState, normalizePlannerState } from "../../src/engine/state/planner-state.ts";
import { loadBuildLibrary } from "../../src/app/storage/build-library.ts";
import type { PlannerState } from "../../src/engine/state/planner-state.ts";
import type { BuildLibrary, ExternalLibraryChange } from "../../src/app/storage/build-library.ts";

const state: PlannerState = normalizePlannerState({});
const library: BuildLibrary = loadBuildLibrary();

// The defaults are a normalized build.
export const fromDefaults: PlannerState = defaultPlannerState;
// Every field with a default is present.
export const filled: [string, string[], number, boolean, number, string | null, string[]] = [
  state.hero.selectedHeroId,
  state.hero.sageScent.elixir ? [] : state.skills.boardSlots.auras,
  state.combat.idyllStacks,
  state.talents.useCapturedRanks,
  state.slates.geometryVersion,
  state.followers.followerId,
  state.pacts.selectedSpirits,
];
export const memoryBonus: number = state.hero.memoryInventory[0].traitLevelBonus;
export const openBuildName: string | undefined = library.builds.find(
  (build) => build.id === library.activeBuildId,
)?.name;
export const revisionState: PlannerState = library.builds[0].revisions[0].state;

// @ts-expect-error fields without a default stay optional
export const characterLevel: number = state.hero.characterLevel;
// @ts-expect-error Selena's selenaDanceTraits is dropped by normalization
export const dropped = state.hero.selenaDanceTraits;
// @ts-expect-error unknown fields are not part of the state
export const unknownField = state.nickname;
// @ts-expect-error inventory items keep their stored shape
export const unknownItemField = state.equipmentInventory[0].nickname;
// @ts-expect-error a number field
state.combat.idyllStacks = "15";
// @ts-expect-error only "auto" and "manual" are condition modes
state.combat.conditionMode = "always";
// @ts-expect-error a follower id is text or null
state.followers.followerId = 3;
// @ts-expect-error there may be no compared build
export const compared: string = library.compareBuildId;
// @ts-expect-error a deleted build comes with the state this tab opens instead
export const deleted: ExternalLibraryChange = { kind: "deleted" };

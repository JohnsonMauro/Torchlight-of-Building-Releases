// Type-level checks for the inferred StoredPlannerState, run by `pnpm typecheck` (tsc -p .). Each @ts-expect-error
// must hit an error: if the inferred type loosens (any, unknown), tsc reports the unused directive.
import type {
  StoredCustomSupport,
  StoredPlannerState,
  StoredSlatePlacement,
} from "../../src/engine/state/state-validation.ts";

export const minimal: StoredPlannerState = {};
export const typical: StoredPlannerState = {
  schemaVersion: 1,
  hero: { selectedHeroId: "youga-the-ultimate-one", characterLevel: 94, selectedTraits: { level45: "Name" } },
  combat: { conditionMode: "manual", targetFireResistancePercent: 30 },
  slates: { placements: { a: { column: 1, row: 2, rotation: 90 } }, parked: {} },
  followers: { followerId: null, skills: ["Name", null, { name: "N", tier: "T", affixes: [null, { id: 1 }] }] },
  equipmentInventory: [{ id: "item1", defenses: { armor: 10 } }],
};

// @ts-expect-error unknown top-level field
export const unknownField: StoredPlannerState = { nickname: "x" };
// @ts-expect-error a number where text belongs
export const wrongType: StoredPlannerState = { hero: { selectedHeroId: 7 } };
// @ts-expect-error only "auto" and "manual" are condition modes
export const wrongMode: StoredPlannerState = { combat: { conditionMode: "always" } };
// @ts-expect-error a placement needs column, row and rotation
export const partialPlacement: StoredSlatePlacement = { rotation: 90 };
// @ts-expect-error rotation is a quarter turn
export const oddRotation: StoredSlatePlacement = { column: 1, row: 1, rotation: 45 };
// @ts-expect-error a custom support is marked custom: true
export const notCustom: StoredCustomSupport = { name: "S", effects: [], custom: false };

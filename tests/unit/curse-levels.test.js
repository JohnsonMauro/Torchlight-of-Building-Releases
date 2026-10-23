// Scorch and Entangled Pain by skill level (packages/engine/src/skills/curse-model.js), against TLIDB's progression tables
// (https://tlidb.com/en/Scorch, https://tlidb.com/en/Entangled_Pain, read 2026-10-23: both tables carry the same 40 values).
// Before, a normal build got the captured Selena values (45% Scorch, 42.5% Entangled Pain) at any level, and a
// gear-triggered Entangled Pain the Lv.20 39% at any level.
import { test } from "node:test";
import assert from "node:assert/strict";
import { curseEffects, curseTakenPercentAtLevel } from "../../packages/engine/src/skills/curse-model.js";

const TLIDB = [
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 40.5, 41, 41.5, 42, 42.5, 43,
  43.5, 44, 44.5, 45, 45.5, 46, 46.5, 47, 47.5, 48, 48.5, 49, 49.5,
];

test("the curse level curve matches TLIDB's table at every level", () => {
  assert.deepEqual(
    TLIDB.map((_, index) => curseTakenPercentAtLevel(index + 1)),
    TLIDB,
  );
});

test("Scorch and Entangled Pain read their setup's effective level; a curse the build lacks gives 0", () => {
  assert.deepEqual(
    curseEffects([
      { name: "Scorch", baseLevel: 20, addedLevels: 6 },
      { name: "Entangled Pain", effectiveLevel: 31 },
    ]),
    { scorchDamagePercent: 42.5, entangledPainDamagePercent: 45 },
  );
  assert.deepEqual(curseEffects([]), { scorchDamagePercent: 0, entangledPainDamagePercent: 0 });
});

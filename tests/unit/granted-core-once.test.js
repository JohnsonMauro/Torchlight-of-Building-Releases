// A core talent is had once (owner, 2026-10-31: Beacon): "[Core] effect" gear grants of the same core on several items, or of
// a core the talent panel already has, add nothing past the first (packages/engine/src/text/modifier-texts.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { collectModifierTexts } from "../../packages/engine/src/text/modifier-texts.js";
import { resolveMaxSpellBurst } from "../../packages/engine/src/skills/max-spell-burst.js";

const item = (name, slot, modifiers) => ({ name, slot, modifiers });
const beaconGloves = item("Beacon Gloves", "gloves", [
  "[Beacon] +2 Max Spell Burst\n+6% additional Hit Damage for skills cast by Spell Burst",
]);
const beaconBoots = item("Beacon Boots", "boots", ["[Beacon] +2 Max Spell Burst", "+10% Movement Speed"]);
const goddessOfKnowledge = (cores) => ({ name: "Goddess of Knowledge", allocatedNodes: [], activeCores: cores });
const beaconCore = { name: "Beacon", description: "+2 Max Spell Burst" };
const maxSpellBurst = (modifierTexts) => resolveMaxSpellBurst({ modifierTexts }).total;

test("Beacon on two gear items gives +2 Max Spell Burst once; the items' other lines still count", () => {
  const lines = collectModifierTexts({ equipment: { candidateItems: [beaconGloves, beaconBoots] } });
  assert.equal(maxSpellBurst(lines), 2);
  assert.deepEqual(
    lines.filter((line) => line.grantedCore === "Beacon").map((line) => line.source),
    ["Beacon Gloves"],
  );
  assert.ok(lines.some((line) => line.text === "+6% additional Hit Damage for skills cast by Spell Burst"));
  assert.ok(lines.some((line) => line.text === "+10% Movement Speed" && line.source === "Beacon Boots"));
});

test("Beacon on gear adds nothing while the talent panel has the Beacon core", () => {
  const lines = collectModifierTexts({
    equipment: { candidateItems: [beaconGloves] },
    talents: [goddessOfKnowledge([beaconCore])],
  });
  assert.equal(maxSpellBurst(lines), 2);
  assert.deepEqual(
    lines.filter((line) => /Max Spell Burst/.test(line.text)).map((line) => line.source),
    ["Goddess of Knowledge core: Beacon"],
  );
});

test("a single Beacon grant and a different panel core both count", () => {
  const lines = collectModifierTexts({
    equipment: { candidateItems: [beaconGloves] },
    talents: [goddessOfKnowledge([{ name: "Insight", description: "+30% additional Spell Damage" }])],
  });
  assert.equal(maxSpellBurst(lines), 2);
  assert.ok(lines.some((line) => line.text === "+30% additional Spell Damage"));
});

test("two copies of one Beacon ring, in both Ring slots, give it once", () => {
  const ring = (slot) => item("Beacon Ring", slot, ["[Beacon] +2 Max Spell Burst"]);
  const lines = collectModifierTexts({ equipment: { candidateItems: [ring("ring1"), ring("ring2")] } });
  assert.equal(maxSpellBurst(lines), 2);
});

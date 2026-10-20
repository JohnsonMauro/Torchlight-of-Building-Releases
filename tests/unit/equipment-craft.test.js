// src/app/gear/equipment-craft.ts (the equipment crafter's draft) and src/app/bridge/equipment-crafter-view.ts: the rules
// the legacy crafter kept in its controls (what a change resets, how a roll snaps), Edit on the golden-master Youga build's
// crafted items (the form crafts the item back), and the views.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  changeEquipmentCraft,
  craftedLegendaryItem,
  craftedRareItem,
  equipmentCraftFromItem,
  newEquipmentCraft,
} from "../../src/app/gear/equipment-craft.ts";
import { equipmentCrafterView, modifierTextView } from "../../src/app/bridge/equipment-crafter-view.ts";
import { snappedModifierRoll } from "../../src/app/gear/affix-rolls.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const apply = (craft, ...changes) =>
  changes.reduce((draft, change) => changeEquipmentCraft(draft, change).craft, craft);
const preview = (item) => ({ name: item.name, modifiers: item.modifiers });

test("a roll snaps as a range input does: clamped, then to the nearest step from the minimum", () => {
  assert.equal(snappedModifierRoll({ min: 40, max: 60 }, 45.5), 46);
  assert.equal(snappedModifierRoll({ min: 40, max: 60 }, 99), 60);
  assert.equal(snappedModifierRoll({ min: 0.5, max: 1.5 }, 1.04), 1);
  assert.equal(snappedModifierRoll({ min: -150, max: -120 }, -135.5), -135);
});

test("rare: an Item Level change caps the energy and re-picks each affix's tier at its best roll", () => {
  let craft = apply(
    newEquipmentCraft("rare"),
    { kind: "affixFamily", index: 0, value: craftedFamily("[Basic Affix] +# Max Life") },
    { kind: "affixTier", index: 0, value: "2" },
    { kind: "roll", group: "affix", index: 0, rangeIndex: 0, value: 130 },
  );
  assert.deepEqual(craft.rare.affixes[0], {
    familyId: craft.rare.affixes[0].familyId,
    tier: "2",
    rolls: [130],
    legendary: false,
  });
  craft = apply(craft, { kind: "level", value: "60" });
  assert.equal(craft.rare.energy, "18");
  assert.deepEqual([craft.rare.affixes[0].tier, craft.rare.affixes[0].rolls], ["5", [70]]);
  craft = apply(craft, { kind: "level", value: "" });
  assert.equal(craft.rare.energy, "0");
  assert.deepEqual(
    [craft.rare.affixes[0].tier, craft.rare.affixes[0].rolls],
    ["5", [70]],
    "an empty level reads 100: T5 is still offered",
  );
});

function craftedFamily(label) {
  const view = equipmentCrafterView(newEquipmentCraft("rare"), 1, preview);
  return view.body.affixes[0].families.find((family) => family.label === label).value;
}

test("rare: a typed roll outside its range is ignored, a committed one is clamped", () => {
  const craft = apply(newEquipmentCraft("rare"), { kind: "baseAffix", index: 0, value: "+(54–74) Max Life" });
  const roll = (value, commit) =>
    apply(craft, { kind: "roll", group: "base", index: 0, rangeIndex: 0, value, commit }).rare.baseAffixes[0].rolls;
  assert.deepEqual(roll(80), [74]);
  assert.deepEqual(roll(80, true), [74]);
  assert.deepEqual(roll(0, true), [54]);
  assert.deepEqual(roll(60), [60]);
});

test("rare: a type change resets its base, base affixes, families and TOWER Sequence; Belt Blend only off a belt", () => {
  let craft = apply(
    newEquipmentCraft("rare"),
    { kind: "type", value: "Belt" },
    { kind: "beltBlend", value: "belt-blend-005" },
    { kind: "baseAffix", index: 1, value: "+(40–60) Max Mana" },
    { kind: "name", value: "Kept" },
  );
  assert.equal(craftedRareItem(craft).beltBlendId, "belt-blend-005");
  craft = apply(craft, { kind: "type", value: "Wand" });
  assert.deepEqual(
    {
      name: craft.rare.name,
      blend: craft.rare.beltBlendId,
      base: craft.rare.baseAffixes[1],
      energy: craft.rare.energy,
    },
    { name: "Kept", blend: "", base: { template: "", rolls: [] }, energy: "61" },
  );
});

test("Vorax: at most two slots inherit a Legendary affix; the third is refused with a notice", () => {
  let craft = apply(newEquipmentCraft("vorax"), { kind: "voraxBase", value: "Vorax Limb: Chest" });
  craft = apply(craft, { kind: "voraxLegendary", index: 0 }, { kind: "voraxLegendary", index: 4 });
  const refused = changeEquipmentCraft(craft, { kind: "voraxLegendary", index: 1 });
  assert.equal(refused.notice, "A Vorax item can inherit up to two Legendary affixes");
  assert.equal(refused.craft, craft);
  assert.deepEqual(craftedRareItem(craft).craftAffixTierIds, ["L", "", "", "", "L", ""]);
});

test("Edit on each crafted item of the Youga build: the form crafts its affixes back", () => {
  const crafted = youga.equipmentInventory.filter((item) => item.craftAffixFamilyIds);
  assert.equal(crafted.length, 5);
  for (const item of crafted) {
    const craft = equipmentCraftFromItem(item, item.base),
      back = craftedRareItem(craft);
    assert.equal(craft.editingId, item.id);
    // The form writes all six slots; a game-log item lists only the ones it fills.
    assert.deepEqual(back.craftAffixFamilyIds.slice(0, item.craftAffixFamilyIds.length), item.craftAffixFamilyIds);
    for (const key of ["name", "baseId", "itemLevel", "beltBlendId", "prefixModifiers", "suffixModifiers"])
      assert.deepEqual(back[key], item[key], `${item.name}: ${key}`);
    assert.equal(equipmentCrafterView(craft, 1, preview).saveLabel, "Save Changes");
  }
});

test("legendary: a tier change rolls every line again at its best value, as the legacy re-render did", () => {
  let craft = apply(newEquipmentCraft("legendary"), { kind: "legendary", id: "Ice_Pulse" });
  craft = apply(
    craft,
    { kind: "roll", group: "legendary", index: 0, rangeIndex: 0, value: 6 },
    { kind: "legendaryEnergy", value: "30" },
  );
  assert.equal(craftedLegendaryItem(craft).legendaryModifiers[0], "+6 to Max Frostbite Rating");
  craft = apply(craft, { kind: "legendaryTier", index: 1, value: 2 });
  const item = craftedLegendaryItem(craft);
  assert.deepEqual(item.legendaryModifiers.slice(0, 2), ["+8 to Max Frostbite Rating", "+29% Spell Damage"]);
  assert.equal(item.energy, 61);
  craft = apply(craft, { kind: "legendaryCorrosion", value: 1 }, { kind: "corrosionRoll", value: 0 });
  assert.deepEqual(craftedLegendaryItem(craft).corrosionModifiers, ["+12% Attack Speed"]);
});

test("the views: the legendary list's count and the Vorax limbs; a keyword line keeps its keyword apart", () => {
  const list = equipmentCrafterView(
    apply(newEquipmentCraft("legendary"), { kind: "search", value: "ice pulse" }),
    3,
    preview,
  );
  assert.deepEqual(
    [list.session, list.title, list.body.kind, list.body.count],
    [3, "Craft Legendary", "legendaryList", "1 legendary gear available"],
  );
  const vorax = equipmentCrafterView(newEquipmentCraft("vorax"), 1, preview);
  assert.equal(vorax.body.limbs.length, 10);
  assert.deepEqual(modifierTextView("+26 % damage"), { kind: "plain", text: "+26% damage" });
  assert.equal(modifierTextView("Wield My Sword").kind, "keyword");
});

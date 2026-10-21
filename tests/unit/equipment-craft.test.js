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
  rareBasesForType,
} from "../../src/app/gear/equipment-craft.ts";
import { equipmentCrafterView } from "../../src/app/bridge/equipment-crafter-view.ts";
import { modifierTextView } from "../../src/app/bridge/gear-item-view.ts";
import { snappedModifierRoll } from "../../src/app/gear/affix-rolls.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const apply = (craft, ...changes) =>
  changes.reduce((draft, change) => changeEquipmentCraft(draft, change).craft, craft);
const preview = (item) => ({ name: item.name, modifiers: item.modifiers });
/** A rare craft past the picker: the group's type and that type's top base (STR Helmet: Ranger's Broken Mask). */
const picked = (craft, group, type) =>
  apply(
    craft,
    { kind: "repick", step: "group" },
    { kind: "pickGroup", value: group },
    { kind: "pickType", value: type },
    { kind: "pickBase", value: rareBasesForType(type)[0].id },
  );
const rareCraft = (group = "helmet", type = "STR Helmet") => picked(newEquipmentCraft("rare"), group, type);

test("a roll snaps as a range input does: clamped, then to the nearest step from the minimum", () => {
  assert.equal(snappedModifierRoll({ min: 40, max: 60 }, 45.5), 46);
  assert.equal(snappedModifierRoll({ min: 40, max: 60 }, 99), 60);
  assert.equal(snappedModifierRoll({ min: 0.5, max: 1.5 }, 1.04), 1);
  assert.equal(snappedModifierRoll({ min: -150, max: -120 }, -135.5), -135);
});

test("rare: an Item Level change caps the energy and re-picks each affix's tier at its best roll", () => {
  let craft = apply(
    rareCraft(),
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
  craft = apply(craft, { kind: "level", value: "90" });
  assert.deepEqual(craft.rare.affixes[0].rolls, [130], "T2 still offered: its roll stays");
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
  const view = equipmentCrafterView(rareCraft(), 1, preview);
  return view.body.affixes[0].families.find((family) => family.label === label).value;
}

test("rare: a typed roll outside its range is ignored, a committed one is clamped", () => {
  const craft = apply(rareCraft(), { kind: "baseAffix", index: 0, value: "+(54–74) Max Life" });
  const roll = (value, commit) =>
    apply(craft, { kind: "roll", group: "base", index: 0, rangeIndex: 0, value, commit }).rare.baseAffixes[0].rolls;
  assert.deepEqual(roll(80), [74]);
  assert.deepEqual(roll(80, true), [74]);
  assert.deepEqual(roll(0, true), [54]);
  assert.deepEqual(roll(60), [60]);
});

test("rare: a type picked again resets its base, base affixes, families and TOWER Sequence; Belt Blend only off a belt", () => {
  let craft = apply(
    rareCraft("trinket", "Belt"),
    { kind: "beltBlend", value: "belt-blend-005" },
    { kind: "baseAffix", index: 1, value: "+(40–60) Max Mana" },
    { kind: "name", value: "Kept" },
  );
  assert.equal(craftedRareItem(craft).beltBlendId, "belt-blend-005");
  craft = picked(craft, "one-handed", "Wand");
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

test("legendary: a tier change rolls only its own line again; a new base caps the energy and drops the corrosion", () => {
  let craft = apply(newEquipmentCraft("legendary"), { kind: "legendary", id: "Ice_Pulse" });
  craft = apply(
    craft,
    { kind: "roll", group: "legendary", index: 0, rangeIndex: 0, value: 6 },
    { kind: "legendaryEnergy", value: "30" },
  );
  assert.equal(craftedLegendaryItem(craft).legendaryModifiers[0], "+6 to Max Frostbite Rating");
  craft = apply(craft, { kind: "legendaryTier", index: 1, value: 2 });
  const item = craftedLegendaryItem(craft);
  assert.deepEqual(item.legendaryModifiers.slice(0, 2), ["+6 to Max Frostbite Rating", "+29% Spell Damage"]);
  assert.equal(item.energy, 30);
  craft = apply(craft, { kind: "legendaryCorrosion", value: 1 }, { kind: "corrosionRoll", value: 0 });
  assert.deepEqual(craftedLegendaryItem(craft).corrosionModifiers, ["+12% Attack Speed"]);
  craft = apply(craft, { kind: "legendaryBase", value: "INT Gloves" });
  assert.deepEqual([craft.legendary.energy, craft.legendary.corrosionIndex], ["61", -1]);
  assert.equal(craftedLegendaryItem(craft).legendaryModifiers[0], "+6 to Max Frostbite Rating");
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

test("rare: the crafter opens on the item groups and drills down to a base, which opens the form", () => {
  let craft = newEquipmentCraft("rare");
  let view = equipmentCrafterView(craft, 1, preview);
  assert.equal(view.body.kind, "craftPick");
  assert.deepEqual(
    view.body.cards.map((card) => card.label),
    ["Helmet", "Chest Armor", "Gloves", "Boots", "Shield", "Trinket", "One-Handed", "Two-Handed"],
  );
  assert.deepEqual(view.body.path, [{ label: "Item groups", step: null }]);
  craft = apply(craft, { kind: "pickGroup", value: "trinket" });
  view = equipmentCrafterView(craft, 1, preview);
  assert.equal(view.body.heading, "Select a type");
  assert.deepEqual(
    view.body.cards.map((card) => [card.label, card.detail]),
    [
      ["Necklace", "19 bases"],
      ["Ring", "27 bases"],
      ["Belt", "12 bases"],
      ["Spirit Ring", "6 bases"],
    ],
  );
  craft = apply(craft, { kind: "pickType", value: "Belt" });
  view = equipmentCrafterView(craft, 1, preview);
  assert.equal(view.body.cards.length, 12);
  assert.deepEqual(view.body.path, [
    { label: "Item groups", step: "group" },
    { label: "Trinket", step: "type" },
    { label: "Belt", step: null },
  ]);
  craft = apply(craft, { kind: "pickBase", value: view.body.cards[0].value });
  view = equipmentCrafterView(craft, 1, preview);
  assert.equal(view.body.kind, "form");
  assert.equal(craft.rare.type, "Belt");
  assert.deepEqual(
    view.body.path.map((crumb) => crumb.step),
    ["group", "type", "base", null],
  );
  assert.equal(view.body.beltBlendShown, true);
});

test("rare: back from the form, another base of the type keeps the draft; the picker cannot be saved", () => {
  let craft = apply(
    rareCraft(),
    { kind: "baseAffix", index: 0, value: "+(54–74) Max Life" },
    { kind: "name", value: "Kept" },
  );
  craft = apply(craft, { kind: "repick", step: "base" });
  assert.equal(equipmentCrafterView(craft, 1, preview).body.step, "base");
  assert.deepEqual(craft.pick, { group: "helmet", type: "STR Helmet" });
  const other = rareBasesForType("STR Helmet")[1].id;
  craft = apply(craft, { kind: "pickBase", value: other });
  assert.equal(craft.pick, null);
  assert.deepEqual([craft.rare.baseId, craft.rare.name, craft.rare.baseAffixes[0].rolls], [other, "Kept", [74]]);
  assert.deepEqual(apply(craft, { kind: "repick", step: "type" }).pick, { group: "helmet", type: "" });
});

test("rare: the Item Level is typed up to 89; Priceless is level 100 and offers the T0+ tiers", () => {
  let craft = rareCraft();
  let form = equipmentCrafterView(craft, 1, preview).body;
  assert.deepEqual([form.level, form.levelMax, form.priceless], ["100", 89, true]);
  craft = apply(craft, { kind: "priceless", value: false });
  form = equipmentCrafterView(craft, 1, preview).body;
  assert.deepEqual([form.level, form.priceless], ["89", false]);
  assert.deepEqual(apply(craft, { kind: "level", value: "95" }).rare.level, "89");
  craft = apply(craft, { kind: "affixFamily", index: 0, value: craftedFamily("[Basic Affix] +# Max Life") });
  assert.ok(
    !equipmentCrafterView(craft, 1, preview).body.affixes[0].config.tier.options.some((o) => /T0\+/.test(o.label)),
  );
  craft = apply(craft, { kind: "priceless", value: true });
  assert.equal(craft.rare.level, "100");
  assert.ok(
    equipmentCrafterView(craft, 1, preview).body.affixes[0].config.tier.options.some((o) => /T0\+/.test(o.label)),
  );
  const vorax = apply(newEquipmentCraft("vorax"), { kind: "voraxBase", value: "Vorax Limb: Chest" });
  form = equipmentCrafterView(vorax, 1, preview).body;
  assert.deepEqual([form.levelMax, form.priceless], [100, null]);
});

test("rare: a family or a base affix one slot holds is not offered to its siblings", () => {
  const life = craftedFamily("[Basic Affix] +# Max Life");
  const craft = apply(
    rareCraft(),
    { kind: "affixFamily", index: 0, value: life },
    { kind: "baseAffix", index: 0, value: "+(54–74) Max Life" },
  );
  const form = equipmentCrafterView(craft, 1, preview).body;
  const families = (index) => form.affixes[index].families.map((option) => option.value);
  assert.ok(families(0).includes(life), "its own slot keeps it");
  assert.ok(!families(1).includes(life) && !families(2).includes(life));
  assert.ok(form.baseAffixes[0].options.some((option) => option.value === "+(54–74) Max Life"));
  assert.ok(!form.baseAffixes[1].options.some((option) => option.value === "+(54–74) Max Life"));
  assert.equal(families(3).length, equipmentCrafterView(rareCraft(), 1, preview).body.affixes[3].families.length);
});

test("rare: an affix list checks up to three a side, refuses a family without a tier, and moves the slots up", () => {
  const life = craftedFamily("[Basic Affix] +# Max Life");
  const list = (craft, side = 0) => equipmentCrafterView(craft, 1, preview).body.affixLists[side];
  let craft = rareCraft();
  const basic = list(craft).tabs[0].options;
  assert.deepEqual(
    list(craft).tabs.map((tab) => tab.label),
    ["Basic", "Advanced", "Ultimate"],
  );
  craft = apply(
    craft,
    ...basic.slice(0, 3).map((option) => ({ kind: "toggleAffix", side: "prefix", familyId: option.value })),
  );
  assert.equal(list(craft).count, "3/3");
  assert.equal(list(craft).tabs[0].options[3].blocked, "Three prefixes chosen");
  const refused = changeEquipmentCraft(craft, { kind: "toggleAffix", side: "prefix", familyId: basic[3].value });
  assert.equal(refused.notice, "An item takes up to three prefixes");
  craft = apply(craft, { kind: "toggleAffix", side: "prefix", familyId: life });
  assert.deepEqual(
    craft.rare.affixes.slice(0, 3).map((affix) => affix.familyId),
    [basic[1].value, basic[2].value, ""],
  );
  const moved = list(craft).tabs[0].options.find((option) => option.value === basic[1].value);
  assert.equal(moved.config.slot, 0);
  assert.ok(moved.config.tiers.some((tier) => tier.current));
  assert.ok(moved.config.rolls.length > 0);
  craft = apply(craft, { kind: "priceless", value: false });
  const ultimate = list(craft).tabs[2].options[0];
  assert.deepEqual([ultimate.blocked, ultimate.highestTier], ["Requires Priceless", ""]);
  const tooLow = changeEquipmentCraft(craft, { kind: "toggleAffix", side: "prefix", familyId: ultimate.value });
  assert.match(tooLow.notice, /needs a higher item level$/);
  assert.equal(list(craft, 1).count, "0/3");
});

test("rare: the base affix list checks up to two, and an unchecked one lets the other move up", () => {
  const options = (craft) => equipmentCrafterView(craft, 1, preview).body.baseAffixList.options;
  let craft = rareCraft();
  const [first, second, third] = options(craft);
  craft = apply(
    craft,
    { kind: "toggleBaseAffix", template: first.value },
    { kind: "toggleBaseAffix", template: second.value },
  );
  assert.equal(equipmentCrafterView(craft, 1, preview).body.baseAffixList.count, "2/2");
  assert.equal(options(craft)[2].blocked, "Two base affixes chosen");
  assert.equal(
    changeEquipmentCraft(craft, { kind: "toggleBaseAffix", template: third.value }).notice,
    "An item takes up to two base affixes",
  );
  craft = apply(craft, { kind: "toggleBaseAffix", template: first.value });
  assert.deepEqual(
    craft.rare.baseAffixes.map((affix) => affix.template),
    [second.value, ""],
  );
  assert.equal(options(craft)[1].config.slot, 0);
  assert.ok(options(craft)[1].config.rolls.length > 0 || !/\(/.test(second.value));
});

test("rare: the Corroded check is kept on the crafted item and back in the form on Edit", () => {
  const craft = apply(rareCraft(), { kind: "corroded", value: true });
  assert.equal(equipmentCrafterView(craft, 1, preview).body.corroded, true);
  const item = craftedRareItem(craft);
  assert.equal(item.corroded, true);
  assert.equal(equipmentCraftFromItem(item, "").rare.corroded, true);
  assert.equal("corroded" in craftedRareItem(rareCraft()), false);
});

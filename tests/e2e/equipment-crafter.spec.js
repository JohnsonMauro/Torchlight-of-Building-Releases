// The equipment crafter (the Gear section's Craft Rare Item, Craft Vorax Item and Craft Legendary, or Edit on a crafted
// rare): the rare form (type, base, the fields that depend on the slot, base affixes, prefixes and suffixes with their
// tiers and rolls) and its preview; the Vorax limbs and their Legendary affix toggles; the legendary list with its search
// and a legendary's configuration (base, corrosion, its mods' tiers and rolls); Add to Inventory and Save Changes.
// Written against the legacy crafter before it moves to React, so both must pass it unchanged.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { GearPage } from "./pages/gear-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
test.use({ viewport: { width: 1440, height: 1000 } });

async function openCrafter(page, mode) {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  await planner.showView("talents");
  const gear = new GearPage(page);
  await gear.button(mode).click();
  await expect(gear.crafter()).toBeVisible();
  return { planner, gear, body: gear.crafter().locator("#equipment-crafter-body") };
}
const preview = (body) => body.locator("aside");
const field = (body, attribute) => body.locator(`[${attribute}]`);

test("the rare form: type, base, the fields its slot allows, and the preview", async ({ page }) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Rare Item");
  await expect(field(body, "data-craft-type")).toHaveValue("STR Helmet");
  await expect(field(body, "data-craft-base").locator("option").first()).toHaveText("Lv 82 · Ranger's Broken Mask");
  await expect(field(body, "data-craft-level")).toHaveValue("100");
  await expect(field(body, "data-craft-energy")).toHaveValue("61");
  await expect(field(body, "data-belt-blend-field")).toBeHidden();
  await expect(field(body, "data-tower-sequence-field")).toBeHidden();
  await expect(body.locator("h3")).toHaveText(["Prefixes", "Suffixes", "Ranger's Broken Mask"]);
  await expect(preview(body)).toContainText("Ranger's Broken Mask");
  await expect(preview(body)).toContainText("STR Helmet · Require Lv.82");
  await expect(preview(body)).toContainText("+1920 Gear Armor");

  const types = await field(body, "data-craft-type").locator("option").allTextContents();
  const belt = types.find((name) => /Belt/.test(name));
  await field(body, "data-craft-type").selectOption(belt);
  await expect(field(body, "data-belt-blend-field")).toBeVisible();
  const weapon = types.find((name) => /Bow|Wand|Sword|Staff|Hammer/.test(name));
  await field(body, "data-craft-type").selectOption(weapon);
  await expect(field(body, "data-belt-blend-field")).toBeHidden();
  await expect(field(body, "data-craft-base").locator("option").first()).not.toHaveText("Lv 82 · Ranger's Broken Mask");
  await expect(preview(body)).toContainText(weapon);
  await gear.crafter().getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(gear.crafter()).toBeHidden();
  await planner.expectNoErrors();
});

test("rare affixes: a base affix and a prefix with its tier and roll, in the preview; Add to Inventory", async ({
  page,
}) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Rare Item");
  await field(body, 'data-craft-base-affix="0"').selectOption("+(54–74) Max Life");
  await expect(field(body, 'data-base-affix-roll="0"')).toHaveValue("74");
  await expect(preview(body)).toContainText("Base AffixT2+74 Max Life");

  await field(body, 'data-craft-affix-family="0"').selectOption({ label: "[Basic Affix] +# Max Life" });
  const tier = field(body, 'data-craft-affix-tier="0"');
  await expect(tier).toHaveValue("1");
  await expect(tier.locator("option").first()).toHaveText("T0+ · Requires Lv.100");
  const roll = field(body, 'data-craft-affix-roll="0"');
  await expect(roll).toHaveValue("220");
  await expect(preview(body)).toContainText("PrefixT1+220 Max Life");
  await expect(preview(body)).toContainText("MAGIC");
  const number = body.locator(".craft-affix-control").first().locator("[data-affix-roll-number]");
  await number.fill("200");
  await expect(roll).toHaveValue("200");
  await expect(preview(body)).toContainText("PrefixT1+200 Max Life");

  await field(body, "data-craft-name").fill("Test Helm");
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  await expect(gear.toast()).toHaveText("Test Helm added to Inventory");
  await expect(gear.crafter()).toBeHidden();
  await expect(gear.card("Test Helm")).toBeVisible();
  const saved = (await gear.stored()).inventory.at(-1);
  expect(saved.name).toBe("Test Helm");
  expect(saved.modifiers).toEqual(expect.arrayContaining(["+74 Max Life", "+200 Max Life"]));
  await planner.expectNoErrors();
});

test("rare tiers: the Item Level bounds the tiers and the energy; a tier sets its roll range", async ({ page }) => {
  const { planner, body } = await openCrafter(page, "Craft Rare Item");
  await field(body, 'data-craft-affix-family="0"').selectOption({ label: "[Basic Affix] +# Max Life" });
  const tier = field(body, 'data-craft-affix-tier="0"');
  const roll = field(body, 'data-craft-affix-roll="0"');
  await expect(tier.locator("option")).toHaveCount(9);
  const level = field(body, "data-craft-level");
  await level.fill("82");
  await expect(field(body, "data-craft-energy")).toHaveValue("61");
  await expect(tier.locator("option").first()).toHaveText("T2 · Requires Lv.82");
  await expect(tier.locator("option")).toHaveCount(6);
  await expect(tier).toHaveValue("2");
  await expect(roll).toHaveValue("154");
  await level.fill("60");
  await expect(field(body, "data-craft-energy")).toHaveValue("18");
  await expect(tier.locator("option")).toHaveCount(3);
  await expect(tier).toHaveValue("5");
  await expect(roll).toHaveValue("70");
  await level.fill("1");
  await expect(field(body, "data-craft-energy")).toHaveValue("0");
  await expect(tier.locator("option")).toHaveText(["T7 · Requires Lv.1"]);
  // Back at 100 the tier chosen at level 1 stays.
  await level.fill("100");
  await expect(tier.locator("option")).toHaveCount(9);
  await expect(tier).toHaveValue("7");
  await expect(roll).toHaveValue("44");

  await tier.selectOption("2");
  await expect(roll).toHaveValue("154");
  await expect(roll).toHaveAttribute("min", "129");
  await expect(roll).toHaveAttribute("max", "154");
  await expect(body.locator(".craft-affix-control").first().locator("em")).toHaveText("154");
  await expect(preview(body)).toContainText("PrefixT2+154 Max Life");
  await roll.fill("130");
  await expect(body.locator(".craft-affix-control").first().locator("[data-affix-roll-number]")).toHaveValue("130");
  await expect(preview(body)).toContainText("PrefixT2+130 Max Life");
  await field(body, 'data-craft-affix-family="0"').selectOption("");
  await expect(field(body, 'data-craft-affix-config="0"')).toBeEmpty();
  await expect(preview(body)).not.toContainText("Max Life");
  await planner.expectNoErrors();
});

test("a base affix's roll, the Belt Blend and the TOWER Sequence: in the preview and saved", async ({ page }) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Rare Item");
  await field(body, "data-craft-type").selectOption("Belt");
  await expect(field(body, "data-equipment-energy-field")).toBeHidden();
  await field(body, 'data-craft-base-affix="1"').selectOption("+(40–60) Max Mana");
  const baseRoll = field(body, 'data-base-affix-roll="1"');
  await expect(baseRoll).toHaveValue("60");
  await baseRoll.fill("45");
  await expect(body.locator('[data-base-affix-rolls="1"] em')).toHaveText("45");
  await expect(preview(body)).toContainText("Base AffixT2+45 Max Mana");
  await field(body, "data-craft-belt-blend").selectOption("belt-blend-005");
  await expect(preview(body)).toContainText("Belt BlendImmune to IgniteImmune to Ignite");
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  const belt = (await gear.stored()).inventory.at(-1);
  expect(belt).toMatchObject({ base: "Belt", slot: "belt", beltBlendId: "belt-blend-005", energy: 0 });
  expect(belt.baseAffixModifiers).toEqual(["+45 Max Mana"]);
  expect(belt.modifiers).toContain("+45 Max Mana");
  expect(belt.modifiers.at(-1)).toBe("Immune to Ignite\nMinions are immune to Fire Damage");

  await gear.button("Craft Rare Item").click();
  await field(body, "data-craft-type").selectOption("Wand");
  await expect(field(body, "data-tower-sequence-field")).toBeVisible();
  await expect(field(body, "data-belt-blend-field")).toBeHidden();
  await field(body, "data-craft-sequence").selectOption("tower-sequence-160423032");
  await expect(preview(body)).toContainText("TOWER Sequence");
  await expect(preview(body)).toContainText("+8% Fire Penetration");
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  const wand = (await gear.stored()).inventory.at(-1);
  expect(wand).toMatchObject({ base: "Wand", slot: "mainHand", towerSequenceId: "tower-sequence-160423032" });
  expect(wand.modifiers).toContain("+8% Fire Penetration");
  await planner.expectNoErrors();
});

test("Vorax: a limb opens its form; at most two organ affixes inherit a Legendary affix", async ({ page }) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Vorax Item");
  await expect(gear.crafterTitle()).toHaveText("Craft Vorax Item");
  await expect(body.locator("[data-select-vorax-base]")).toHaveCount(10);
  await expect(preview(body)).toContainText("Select options to preview item");
  await body.locator('[data-select-vorax-base="Vorax Limb: Chest"]').click();
  await expect(field(body, "data-craft-type")).toHaveValue("Vorax Limb: Chest");
  await expect(body.locator("h3").first()).toHaveText("Organ affixes");
  const toggles = body.locator("[data-toggle-vorax-legendary]");
  await expect(toggles).toHaveCount(6);
  const before = await field(body, 'data-craft-affix-family="0"').locator("option").count();
  await toggles.nth(0).click();
  await expect(toggles.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(body.locator(".craft-affix-control").nth(0)).toHaveClass(/\blegendary-affix-active\b/);
  await expect(field(body, 'data-craft-affix-family="0"').locator("option")).not.toHaveCount(before);
  await toggles.nth(1).click();
  await toggles.nth(2).click();
  await expect(gear.toast()).toHaveText("A Vorax item can inherit up to two Legendary affixes");
  await expect(toggles.nth(2)).toHaveAttribute("aria-pressed", "false");
  await toggles.nth(0).click();
  await expect(toggles.nth(0)).toHaveAttribute("aria-pressed", "false");
  await planner.expectNoErrors();
});

test("Vorax: a Legendary affix slot lists the donors' affixes and is saved as one", async ({ page }) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Vorax Item");
  await body.locator('[data-select-vorax-base="Vorax Limb: Chest"]').click();
  await body.locator("[data-toggle-vorax-legendary]").first().click();
  const family = field(body, 'data-craft-affix-family="0"');
  await expect(family.locator("option").nth(1)).toHaveText("[Glorious Journey] +# to All Stats");
  await family.selectOption("vorax-chest-donor-0-mod-0");
  await expect(field(body, 'data-craft-affix-tier="0"')).toHaveCount(0);
  await expect(field(body, 'data-craft-affix-roll="0"').first()).toBeVisible();
  await expect(preview(body).locator("li.legendary-affix")).toHaveCount(1);
  await expect(preview(body).locator("li.legendary-affix .affix-tier-badge")).toHaveText("L");
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  const saved = (await gear.stored()).inventory.at(-1);
  expect(saved).toMatchObject({ rarity: "vorax", base: "Vorax Limb: Chest", slot: "chest" });
  expect(saved.craftAffixFamilyIds[0]).toBe("vorax-chest-donor-0-mod-0");
  expect(saved.craftAffixTierIds[0]).toBe("L");
  expect(saved.craftAffixLegendary).toEqual([true, false, false, false, false, false]);
  expect(saved.prefixModifiers).toHaveLength(1);
  expect(saved.prefixModifiers[0]).toMatch(/^\+\d+ to All Stats$/);
  await planner.expectNoErrors();
});

test("legendary lines: a corroded line, a corrosion implicit's roll, the energy; all saved", async ({ page }) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Legendary");
  await field(body, "data-legendary-search").fill("ice pulse");
  await body.locator('[data-legendary-id="Ice_Pulse"]').click();
  const line = body.locator(".legendary-mod-control").nth(2);
  await line.locator("[data-toggle-legendary-corrosion]").click();
  await expect(line).toHaveClass(/\bcorrosion-affix\b/);
  await expect(line.locator("[data-toggle-legendary-corrosion]")).toHaveText("Corroded");
  await expect(preview(body).locator("li.corrosion-affix")).toHaveCount(1);

  await field(body, "data-legendary-corrosion").selectOption("1");
  await expect(body.locator("[data-corrosion-text]")).toHaveText("+15% Attack Speed");
  await expect(preview(body)).toContainText("Implicit · CorrodedSTR Gloves+15% Attack Speed");
  await field(body, "data-corrosion-roll").fill("0");
  await expect(body.locator("[data-corrosion-text]")).toHaveText("+12% Attack Speed");
  await expect(preview(body)).toContainText("+12% Attack Speed");
  await field(body, "data-legendary-energy").fill("30");
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  const saved = (await gear.stored()).inventory.at(-1);
  expect(saved).toMatchObject({ name: "Ice Pulse", energy: 30, corrosionModifiers: ["+12% Attack Speed"] });
  expect(saved.corrodedModifierIndices).toEqual([2]);
  await planner.expectNoErrors();
});

test("legendary choices: a random roll's option and Folklore's ring effect, in the line, the preview and saved", async ({
  page,
}) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Legendary");
  await field(body, "data-legendary-search").fill("enamor");
  await body.locator('[data-legendary-id="Enamor"]').click();
  const line = body.locator(".legendary-mod-control").nth(1);
  await expect(line.locator("[data-legendary-mod]")).toHaveText("<Random skill slot-related affix>");
  await field(body, 'data-legendary-placeholder="1"').selectOption(
    "when-an-attack-skill-is-equipped-in-the-third-slot-50-150-damage",
  );
  await expect(line.locator("[data-legendary-mod]")).toHaveText(
    "When an Attack Skill is equipped in the third slot, +150% damage",
  );
  await line.locator("[data-legendary-roll]").fill("100");
  await expect(line.locator("[data-legendary-mod]")).toHaveText(
    "When an Attack Skill is equipped in the third slot, +100% damage",
  );
  await expect(preview(body)).toContainText("When an Attack Skill is equipped in the third slot, +100% damage");
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  const enamor = (await gear.stored()).inventory.at(-1);
  expect(enamor.legendaryModifiers[1]).toBe("When an Attack Skill is equipped in the third slot, +100% damage");

  await gear.button("Craft Legendary").click();
  await field(body, "data-legendary-search").fill("locking fingers");
  await body.locator('[data-legendary-id="Folklore_of_Locking_Fingers"]').click();
  await field(body, "data-legendary-ring-option").selectOption("right");
  await expect(body.locator('[data-legendary-mod="2"]')).toContainText("right Ring");
  await expect(preview(body)).toContainText("right Ring");
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  const folklore = (await gear.stored()).inventory.at(-1);
  expect(folklore.legendaryModifiers[2]).toContain("right Ring");
  await planner.expectNoErrors();
});

test("legendary: the search, a legendary's base, corrosion, mod tiers and rolls, and Add to Inventory", async ({
  page,
}) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Legendary");
  await expect(body).toContainText("refine the search to see more");
  await field(body, "data-legendary-search").fill("ice pulse");
  await expect(body.locator("[data-legendary-id]")).toHaveCount(1);
  await expect(body).toContainText("1 legendary gear available");
  await expect(field(body, "data-legendary-search")).toBeFocused();
  await body.locator('[data-legendary-id="Ice_Pulse"]').click();

  await expect(field(body, "data-legendary-base")).toHaveValue("STR Gloves");
  await expect(field(body, "data-legendary-energy")).toHaveValue("61");
  await expect(preview(body)).toContainText("Ice PulseSTR Gloves · Require Lv.14");
  await expect(preview(body)).toContainText("+8 to Max Frostbite Rating+80% Spell Damage");
  const mods = body.locator(".legendary-mod-control");
  await expect(mods.first().locator("[data-legendary-mod]")).toHaveText("+8 to Max Frostbite Rating");
  await field(body, 'data-legendary-roll="0"').fill("6");
  await expect(mods.first().locator("[data-legendary-mod]")).toHaveText("+6 to Max Frostbite Rating");
  await expect(preview(body)).toContainText("+6 to Max Frostbite Rating");

  const tier = field(body, 'data-legendary-tier="1"');
  await expect(tier.locator("option")).toHaveText(["T1 · +(60–80)% Spell Damage", "T2 · +(22–29)% Spell Damage"]);
  await tier.selectOption("2");
  await expect(field(body, 'data-legendary-roll="1"')).toHaveValue("29");
  await expect(preview(body)).toContainText("+29% Spell Damage");

  await field(body, "data-legendary-base").selectOption("INT Gloves");
  await expect(preview(body)).toContainText("INT Gloves · Require Lv.14");
  await field(body, "data-legendary-corrosion").selectOption({ index: 1 });
  await expect(preview(body)).toContainText("+1 to Max Tenacity Blessing Stacks");

  await body.getByRole("button", { name: "Change", exact: true }).click();
  await expect(field(body, "data-legendary-search")).toBeVisible();
  await body.locator('[data-legendary-id="Ice_Pulse"]').click();
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  await expect(gear.toast()).toHaveText("Ice Pulse added to Inventory");
  const saved = (await gear.stored()).inventory.at(-1);
  expect(saved).toMatchObject({ name: "Ice Pulse", rarity: "legendary", base: "STR Gloves", itemLevel: 100 });
  expect(saved.legendaryModifiers.slice(0, 2)).toEqual(["+8 to Max Frostbite Rating", "+80% Spell Damage"]);
  await planner.expectNoErrors();
});

test("Edit on a crafted rare fills the form from the item; Save Changes updates it in place", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  await planner.showView("talents");
  const gear = new GearPage(page);
  await gear.cardTool("Arcanist Girdle", "Edit item").click();
  await expect(gear.crafter()).toBeVisible();
  await expect(gear.crafterTitle()).toHaveText("Edit Arcanist Girdle");
  const body = gear.crafter().locator("#equipment-crafter-body");
  await expect(gear.crafter().getByRole("button", { name: "Save Changes", exact: true })).toBeVisible();
  await expect(field(body, "data-craft-type")).toHaveValue(/Belt/);
  await expect(field(body, "data-belt-blend-field")).toBeVisible();
  await expect(preview(body)).toContainText("Arcanist Girdle");
  await field(body, "data-craft-name").fill("Renamed Girdle");
  await gear.crafter().getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(gear.toast()).toHaveText("Renamed Girdle updated");
  const stored = await gear.stored();
  const item = stored.inventory.find((entry) => entry.id === "gear-game-log-belt");
  expect(item.name).toBe("Renamed Girdle");
  expect(stored.inventory).toHaveLength(10);
  await planner.expectNoErrors();
});

test("Edit fills every field from the item: level, base, Belt Blend, each affix's family, tier and roll", async ({
  page,
}) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  await planner.showView("talents");
  const gear = new GearPage(page);
  const before = (await gear.stored()).inventory.find((entry) => entry.id === "gear-game-log-belt");
  await gear.cardTool("Arcanist Girdle", "Edit item").click();
  const body = gear.crafter().locator("#equipment-crafter-body");
  await expect(field(body, "data-craft-name")).toHaveValue("Arcanist Girdle");
  await expect(field(body, "data-craft-level")).toHaveValue("83");
  await expect(field(body, "data-craft-type")).toHaveValue("Belt");
  await expect(field(body, "data-craft-base")).toHaveValue("Belt-Arcanist-Girdle-76-9");
  await expect(field(body, "data-craft-belt-blend")).toHaveValue("belt-blend-014");
  const families = [
    "prefix-1402303",
    "prefix-1092302",
    "prefix-1052302",
    "suffix-1082302",
    "suffix-1082300",
    "suffix-1082301",
  ];
  const rolls = ["42", "35", "219", "19", "18", "17"];
  for (const [index, family] of families.entries()) {
    await expect(field(body, `data-craft-affix-family="${index}"`)).toHaveValue(family);
    await expect(field(body, `data-craft-affix-tier="${index}"`)).toHaveValue("2");
    await expect(field(body, `data-craft-affix-roll="${index}"`)).toHaveValue(rolls[index]);
    await expect(body.locator(".craft-affix-control").nth(index).locator("[data-affix-roll-number]")).toHaveValue(
      rolls[index],
    );
  }
  await expect(preview(body)).toContainText("PrefixT2+42% damageT2+35 IntelligenceT2+219 Max Energy Shield");

  await body.locator(".craft-affix-control").first().locator("[data-affix-roll-number]").fill("40");
  await expect(preview(body)).toContainText("T2+40% damage");
  await gear.crafter().getByRole("button", { name: "Save Changes", exact: true }).click();
  const after = (await gear.stored()).inventory.find((entry) => entry.id === "gear-game-log-belt");
  expect(after.prefixModifiers).toEqual(["+40% damage", ...before.prefixModifiers.slice(1)]);
  expect(after.suffixModifiers).toEqual(before.suffixModifiers);
  expect(after).toMatchObject({
    itemLevel: before.itemLevel,
    baseId: before.baseId,
    beltBlendId: before.beltBlendId,
    craftAffixFamilyIds: before.craftAffixFamilyIds,
    craftAffixTierIds: before.craftAffixTierIds,
  });
  await planner.expectNoErrors();
});

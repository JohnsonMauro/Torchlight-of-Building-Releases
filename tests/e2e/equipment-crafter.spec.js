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

// The equipment crafter (the Gear section's Craft Rare Item, Craft Vorax Item and Craft Legendary, or Edit on a crafted
// rare or Vorax item): the rare item picker (group, type, base) and its path back, the rare form (the fields that depend
// on the slot, base affixes, prefixes and suffixes with their tiers and rolls) and its preview; the Vorax picker (group,
// limb), its lists and their Legendary affixes; the legendary list with its search and a legendary's configuration
// (base, corrosion, its mods' tiers and rolls); Add to Inventory and Save Changes.
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
  await planner.showView("equipment");
  const gear = new GearPage(page);
  await gear.startCraft(mode);
  await expect(gear.crafter()).toBeVisible();
  return { planner, gear, body: gear.crafter().locator("#equipment-crafter-body") };
}
const preview = (body) => body.locator("aside");
/** The preview's lines of one kind ("Prefix", "Base Affix"…); each reads its tier marker's text, then the line. */
const lines = (body, kind) => preview(body).locator(`[data-preview-line="${kind}"]`);
const field = (body, attribute) => body.locator(`[${attribute}]`);
/** Picks an option of a list of choices (a radio row), its folded section opened first. */
async function choose(body, attribute, value) {
  const list = field(body, attribute);
  // The inner locator of `has` is matched inside each details: it may not start from the dialog.
  const section = body.locator("details", { has: body.page().locator(`[${attribute}]`) });
  if ((await section.count()) && !(await section.evaluate((details) => details.open))) {
    await section.locator("summary").click();
    await expect(section).toHaveJSProperty("open", true);
  }
  await list.locator(`[data-choice-value="${value}"]`).check();
}
/** The option a list of choices holds. */
const chosen = (body, attribute) => field(body, attribute).locator("input:checked");
/** A legendary line's tier chip. */
const tierChip = (body, index, tier) =>
  field(body, `data-legendary-tier="${index}"`).locator(`[data-tier-option="${tier}"]`);
const path = (body) => body.getByRole("navigation", { name: "Item" });
/** A rare's affix in its side's list ("prefix", "suffix"), on the tab it sits in ("Basic", "Advanced", "Ultimate"). */
function affixOption(body, side, label, tab = "Basic") {
  const list = body.locator(`[data-affix-list="${side}"]`);
  return {
    tab: list.getByRole("tab", { name: new RegExp(`^${tab}`) }),
    box: list.locator("label").filter({ hasText: label }).getByRole("checkbox"),
  };
}
/** Checks (or unchecks) a rare's affix, its tab opened first. */
async function checkAffix(body, side, label, tab = "Basic", checked = true) {
  const option = affixOption(body, side, label, tab);
  await option.tab.click();
  await option.box.setChecked(checked);
}
const MAX_LIFE = /^\+# Max Life/;
/** A rare's base affix option (its checkbox), by its text. */
const baseAffix = (body, text) =>
  body
    .locator("[data-base-affix-list] label")
    .filter({ hasText: new RegExp(`^${text.replace(/[()+]/g, "\\$&")}$`) })
    .getByRole("checkbox");
const TIER_TWO = '[data-craft-affix-tier-option="2"]';
/** A rare's checked affix row by its slot (prefixes 0–2, suffixes 3–5), on the open tab. */
const slot = (body, index) => body.locator(`[data-craft-affix-slot="${index}"]`);
/** Its tier chips, and the one it holds. */
const tierChips = (body, index) => slot(body, index).locator("[data-craft-affix-tier-option]");
const currentTier = (body, index) => slot(body, index).locator('[data-craft-affix-tier-option][aria-pressed="true"]');
/** Opens the tab a checked slot sits in, and returns its row. */
async function showSlot(body, index) {
  const list = body.locator(`[data-affix-list="${index < 3 ? "prefix" : "suffix"}"]`);
  for (const tab of await list.getByRole("tab").all()) {
    await tab.click();
    if (await slot(body, index).count()) return slot(body, index);
  }
  throw new Error(`No checked affix in slot ${index}`);
}
/** Craft Rare Item's picker: a group, a type, then a base (the type's top one unless `base` is given). */
async function pickRare(body, group, type, base = null) {
  await field(body, `data-craft-pick="${group}"`).click();
  await field(body, `data-craft-pick="${type}"`).click();
  await (base ? field(body, `data-craft-pick="${base}"`) : field(body, "data-craft-pick").first()).click();
  await expect(field(body, "data-craft-name")).toBeVisible();
}

test("the rare picker drills down to a base; the form shows the fields its slot allows, and the preview", async ({
  page,
}) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Rare Item");
  await expect(body.locator("h3")).toHaveText("Select an item group");
  await expect(field(body, "data-craft-pick")).toHaveCount(8);
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  await expect(gear.toast()).toHaveText("Select an item base first");
  await field(body, 'data-craft-pick="helmet"').click();
  await expect(field(body, "data-craft-pick")).toHaveText(["STR12 bases", "DEX12 bases", "INT12 bases"]);
  await field(body, 'data-craft-pick="STR Helmet"').click();
  await expect(field(body, "data-craft-pick").first()).toHaveText("Ranger's Broken MaskLv 82");
  await field(body, "data-craft-pick").first().click();
  await expect(path(body)).toHaveText("Craft›Item groups›Helmet›STR›Lv 82 · Ranger's Broken Mask");
  await expect(field(body, "data-craft-level")).toHaveValue("100");
  await expect(field(body, "data-craft-energy")).toHaveValue("61");
  await expect(field(body, "data-craft-belt-blend")).toHaveCount(0);
  await expect(field(body, "data-craft-sequence")).toHaveCount(0);
  await expect(body.locator("h3")).toHaveText([
    "Base affixes (0/2)",
    "Prefixes (0/3)",
    "Suffixes (0/3)",
    "Ranger's Broken Mask- Priceless",
  ]);
  await expect(preview(body)).toContainText("Ranger's Broken Mask");
  await expect(preview(body).locator("header")).toHaveText(
    "Ranger's Broken Mask- PricelessLv.100STR Helmet(Helmet)Require lv 82Energy 61",
  );
  await expect(preview(body)).toContainText("+1920 Gear Armor");

  await path(body).getByRole("button", { name: "Item groups" }).click();
  await pickRare(body, "trinket", "Belt");
  await expect(field(body, "data-craft-belt-blend")).toHaveCount(1);
  await path(body).getByRole("button", { name: "Item groups" }).click();
  await pickRare(body, "two-handed", "Bow");
  await expect(field(body, "data-craft-belt-blend")).toHaveCount(0);
  await expect(path(body)).toContainText("Two-Handed›Bow›");
  await expect(preview(body)).toContainText("Bow");
  await gear.crafter().getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(gear.crafter()).toBeHidden();
  await planner.expectNoErrors();
});

test("rare affixes: a base affix and a prefix with its tier and roll, in the preview; Add to Inventory", async ({
  page,
}) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Rare Item");
  await pickRare(body, "helmet", "STR Helmet");
  await baseAffix(body, "+(54–74) Max Life").check();
  await expect(field(body, 'data-base-affix-roll="0"')).toHaveValue("74");
  await expect(lines(body, "Base Affix")).toHaveText("T2+74 Max Life");

  await checkAffix(body, "prefix", MAX_LIFE);
  await expect(currentTier(body, 0)).toHaveText("T1");
  await expect(tierChips(body, 0).first()).toHaveText("T7");
  await expect(tierChips(body, 0).last()).toHaveText("T0+");
  await expect(tierChips(body, 0).last()).toHaveAttribute("title", "T0+ · Requires Lv.100");
  const roll = field(body, 'data-craft-affix-roll="0"');
  await expect(roll).toHaveValue("220");
  await expect(lines(body, "Prefix")).toHaveText("T1+220 Max Life");
  await expect(lines(body, "Prefix")).toHaveAttribute("title", "Prefix · T1");
  await expect(preview(body).locator("article")).toHaveClass(/\brarity-magic\b/);
  const number = slot(body, 0).locator("[data-affix-roll-number]");
  await number.fill("200");
  await expect(roll).toHaveValue("200");
  await expect(lines(body, "Prefix")).toHaveText("T1+200 Max Life");

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

test("rare tiers: the Item Level (up to 89, or Priceless: 100) bounds the tiers and the energy; a tier sets its roll range", async ({
  page,
}) => {
  const { planner, body } = await openCrafter(page, "Craft Rare Item");
  await pickRare(body, "helmet", "STR Helmet");
  await checkAffix(body, "prefix", MAX_LIFE);
  const chips = tierChips(body, 0);
  const roll = field(body, 'data-craft-affix-roll="0"');
  await expect(chips).toHaveCount(9);
  const level = field(body, "data-craft-level");
  const priceless = field(body, "data-craft-priceless");
  await expect(priceless).toBeChecked();
  await expect(level).toBeDisabled();
  await priceless.uncheck();
  await expect(level).toHaveValue("89");
  await level.fill("95");
  await expect(level).toHaveValue("89");
  await level.fill("82");
  await expect(field(body, "data-craft-energy")).toHaveValue("61");
  await expect(chips.last()).toHaveText("T2");
  await expect(chips).toHaveCount(6);
  await expect(currentTier(body, 0)).toHaveText("T2");
  await expect(roll).toHaveValue("154");
  await level.fill("60");
  await expect(field(body, "data-craft-energy")).toHaveValue("18");
  await expect(chips).toHaveCount(3);
  await expect(currentTier(body, 0)).toHaveText("T5");
  await expect(roll).toHaveValue("70");
  await level.fill("1");
  await expect(field(body, "data-craft-energy")).toHaveValue("0");
  await expect(chips).toHaveText(["T7"]);
  // Back at 100 the tier chosen at level 1 stays.
  await priceless.check();
  await expect(level).toHaveValue("100");
  await expect(chips).toHaveCount(9);
  await expect(currentTier(body, 0)).toHaveText("T7");
  await expect(roll).toHaveValue("44");

  await slot(body, 0).locator(TIER_TWO).click();
  await expect(roll).toHaveValue("154");
  await expect(roll).toHaveAttribute("min", "129");
  await expect(roll).toHaveAttribute("max", "154");
  await expect(slot(body, 0).locator("[data-affix-roll-number]")).toHaveValue("154");
  await expect(lines(body, "Prefix")).toHaveText("T2+154 Max Life");
  await roll.fill("130");
  await expect(slot(body, 0).locator("[data-affix-roll-number]")).toHaveValue("130");
  await expect(lines(body, "Prefix")).toHaveText("T2+130 Max Life");
  await checkAffix(body, "prefix", MAX_LIFE, "Basic", false);
  await expect(slot(body, 0)).toHaveCount(0);
  await expect(preview(body)).not.toContainText("Max Life");
  await planner.expectNoErrors();
});

test("a base affix's roll, the Belt Blend and the TOWER Sequence: in the preview and saved", async ({ page }) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Rare Item");
  await pickRare(body, "trinket", "Belt");
  await expect(field(body, "data-equipment-energy-field")).toBeHidden();
  await baseAffix(body, "+(40–60) Max Mana").check();
  const baseRoll = field(body, 'data-base-affix-roll="0"');
  await expect(baseRoll).toHaveValue("60");
  await baseRoll.fill("45");
  await expect(body.locator('[data-base-affix-slot="0"] [data-affix-roll-number]')).toHaveValue("45");
  await expect(lines(body, "Base Affix")).toHaveText("T2+45 Max Mana");
  await choose(body, "data-craft-belt-blend", "belt-blend-005");
  await expect(lines(body, "Belt Blend")).toHaveAttribute("title", "Belt Blend · Immune to Ignite");
  await expect(lines(body, "Belt Blend")).toContainText("Immune to Ignite");
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  const belt = (await gear.stored()).inventory.at(-1);
  expect(belt).toMatchObject({ base: "Belt", slot: "belt", beltBlendId: "belt-blend-005", energy: 0 });
  expect(belt.baseAffixModifiers).toEqual(["+45 Max Mana"]);
  expect(belt.modifiers).toContain("+45 Max Mana");
  expect(belt.modifiers.at(-1)).toBe("Immune to Ignite\nMinions are immune to Fire Damage");

  await gear.startCraft("Craft Rare Item");
  await pickRare(body, "one-handed", "Wand");
  await expect(field(body, "data-craft-sequence")).toHaveCount(1);
  await expect(field(body, "data-craft-belt-blend")).toHaveCount(0);
  await choose(body, "data-craft-sequence", "tower-sequence-160423032");
  await expect(lines(body, "TOWER Sequence")).toHaveCount(1);
  await expect(preview(body)).toContainText("+8% Fire Penetration");
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  const wand = (await gear.stored()).inventory.at(-1);
  expect(wand).toMatchObject({ base: "Wand", slot: "mainHand", towerSequenceId: "tower-sequence-160423032" });
  expect(wand.modifiers).toContain("+8% Fire Penetration");
  await planner.expectNoErrors();
});

/** A Vorax item's Legendary tab on a side, its search and a donor's section (its modifiers' checkboxes). */
function legendaryTab(body, side) {
  const list = body.locator(`[data-affix-list="${side}"]`);
  return {
    tab: list.getByRole("tab", { name: /^Legendary/ }),
    search: list.locator("[data-vorax-legendary-search]"),
    donors: list.locator("[data-vorax-donor]"),
    boxes: (donor) => list.locator(`[data-vorax-donor="${donor}"]`).getByRole("checkbox"),
  };
}
const GLORIOUS_JOURNEY = "vorax-chest-donor-0";

test("Vorax: the picker drills down to a limb; the form lists base affixes, organ affixes and suffixes", async ({
  page,
}) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Vorax Item");
  await expect(gear.crafterTitle()).toHaveText("Craft Vorax Item");
  await expect(body.locator("h3")).toHaveText("Select an item group");
  await expect(field(body, "data-craft-pick")).toHaveText(
    ["Helmet", "Chest Armor", "Gloves", "Boots", "Trinket"].map((label) => new RegExp(`^${label}`)),
  );
  await expect(preview(body)).toHaveCount(0);
  await field(body, 'data-craft-pick="boots"').click();
  await expect(body.locator("h3")).toHaveText("Select a limb");
  await expect(field(body, "data-craft-pick")).toHaveText(["Limb: Legs", "Aberrant Limb: Legs"]);
  await path(body).getByRole("button", { name: "Item groups" }).click();
  await field(body, 'data-craft-pick="chest-armor"').click();
  await field(body, 'data-craft-pick="Vorax Limb: Chest"').click();
  await expect(path(body)).toContainText("Chest Armor›Limb: Chest");
  await expect(field(body, "data-craft-priceless")).toHaveCount(0);
  await expect(body.locator("[data-craft-section] h3")).toHaveText([
    "Base affixes (0/2)",
    "Organ affixes (0/3)",
    "Suffixes (0/3)",
  ]);
  await expect(body.locator('[data-affix-list="prefix"]').getByRole("tab")).toHaveText([
    /^Basic/,
    /^Advanced/,
    /^Ultimate/,
    /^Legendary/,
  ]);
  await baseAffix(body, "+15 Strength").check();
  await expect(lines(body, "Base Affix")).toHaveText("T2+15 Strength");
  await checkAffix(body, "prefix", MAX_LIFE);
  await expect(tierChips(body, 0).last()).toHaveText("T0+");
  await expect(currentTier(body, 0)).toHaveText("T1");
  await expect(lines(body, "Prefix")).toHaveCount(1);
  await expect(body.locator("[data-craft-section] h3").nth(1)).toHaveText("Organ affixes (1/3)");
  await planner.expectNoErrors();
});

test("Vorax: up to two Legendary affixes from the donors' list, one side each; saved, and back on Edit", async ({
  page,
}) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Vorax Item");
  await field(body, 'data-craft-pick="chest-armor"').click();
  await field(body, 'data-craft-pick="Vorax Limb: Chest"').click();
  const prefixes = legendaryTab(body, "prefix"),
    suffixes = legendaryTab(body, "suffix");
  await prefixes.tab.click();
  await prefixes.search.fill("glorious journey");
  await expect(prefixes.donors).toHaveCount(1);
  await expect(prefixes.donors).toContainText("Glorious Journey");
  await prefixes.boxes(GLORIOUS_JOURNEY).nth(0).check();
  await expect(prefixes.tab).toHaveText("Legendary (1)");
  await expect(slot(body, 0).locator("[data-craft-affix-roll]").first()).toBeVisible();
  await expect(slot(body, 0).locator("[data-craft-affix-tier-option]")).toHaveCount(0);
  await expect(preview(body).locator("li.legendary-affix")).toHaveCount(1);
  await expect(preview(body).locator("li.legendary-affix .affix-tier-badge")).toHaveText("L");

  await suffixes.tab.click();
  await suffixes.search.fill("glorious journey");
  await expect(suffixes.boxes(GLORIOUS_JOURNEY).nth(0)).toBeDisabled();
  await suffixes.boxes(GLORIOUS_JOURNEY).nth(1).check();
  await expect(suffixes.boxes(GLORIOUS_JOURNEY).nth(2)).toBeDisabled();
  await expect(body.locator('[data-affix-list="suffix"]')).toContainText("Two Legendary affixes chosen");

  await field(body, "data-craft-name").fill("Test Vorax");
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  const saved = (await gear.stored()).inventory.at(-1);
  expect(saved).toMatchObject({ rarity: "vorax", base: "Vorax Limb: Chest", slot: "chest" });
  expect(saved.craftAffixFamilyIds[0]).toBe(`${GLORIOUS_JOURNEY}-mod-0`);
  expect(saved.craftAffixFamilyIds[3]).toBe(`${GLORIOUS_JOURNEY}-mod-1`);
  expect(saved.craftAffixTierIds).toEqual(["L", "", "", "L", "", ""]);
  expect(saved.craftAffixLegendary).toEqual([true, false, false, true, false, false]);
  expect(saved.prefixModifiers[0]).toMatch(/^\+\d+ to All Stats$/);

  await gear.cardTool("Test Vorax", "Edit item").click();
  await expect(gear.crafterTitle()).toHaveText("Edit Test Vorax");
  await expect(path(body)).toContainText("Chest Armor›Limb: Chest");
  await expect(prefixes.tab).toHaveText("Legendary (1)");
  await expect(suffixes.tab).toHaveText("Legendary (1)");
  await expect(preview(body).locator("li.legendary-affix")).toHaveCount(2);
  await planner.expectNoErrors();
});

test("legendary lines: a corroded line, a corrosion implicit's roll, the energy; all saved", async ({ page }) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Legendary");
  await field(body, "data-legendary-search").fill("ice pulse");
  await body.locator('[data-legendary-id="Ice_Pulse"]').click();
  const line = body.locator(".legendary-mod-control").nth(2);
  await line.locator("[data-toggle-legendary-corrosion]").click();
  await expect(line).toHaveClass(/\bcorrosion-affix\b/);
  await expect(line.locator("[data-toggle-legendary-corrosion]")).toHaveAttribute("aria-pressed", "true");
  await expect(line.locator('[data-tier-option="1"]')).toHaveAttribute("aria-pressed", "false");
  await expect(preview(body).locator("li.corrosion-affix")).toHaveCount(1);

  await choose(body, "data-legendary-corrosion", "1");
  await expect(body.locator("[data-corrosion-text]")).toHaveText("+15% Attack Speed");
  await expect(lines(body, "Implicit")).toHaveText("+15% Attack Speed");
  await expect(lines(body, "Implicit")).toHaveAttribute("title", "Implicit · Corroded · INT Gloves");
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

test("legendary: a line's tier, random roll or corroded form leaves the other lines' rolls and the energy as set", async ({
  page,
}) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Legendary");
  await field(body, "data-legendary-search").fill("ice pulse");
  await body.locator('[data-legendary-id="Ice_Pulse"]').click();
  await field(body, 'data-legendary-roll="0"').fill("6");
  await field(body, "data-legendary-energy").fill("30");
  await tierChip(body, 1, 2).click();
  await body.locator(".legendary-mod-control").nth(2).locator("[data-toggle-legendary-corrosion]").click();
  await expect(field(body, 'data-legendary-roll="0"')).toHaveValue("6");
  await expect(body.locator('[data-legendary-mod="0"]')).toHaveText("+6 to Max Frostbite Rating");
  await expect(field(body, "data-legendary-energy")).toHaveValue("30");
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  const saved = (await gear.stored()).inventory.at(-1);
  expect(saved.legendaryModifiers.slice(0, 2)).toEqual(["+6 to Max Frostbite Rating", "+29% Spell Damage"]);
  expect(saved.energy).toBe(30);
  await planner.expectNoErrors();
});

test("rare: an Item Level change that keeps an affix's tier keeps its roll", async ({ page }) => {
  const { planner, body } = await openCrafter(page, "Craft Rare Item");
  await pickRare(body, "helmet", "STR Helmet");
  await checkAffix(body, "prefix", MAX_LIFE);
  await slot(body, 0).locator(TIER_TWO).click();
  await field(body, 'data-craft-affix-roll="0"').fill("130");
  await field(body, "data-craft-priceless").uncheck();
  await field(body, "data-craft-level").fill("85");
  await expect(currentTier(body, 0)).toHaveText("T2");
  await expect(field(body, 'data-craft-affix-roll="0"')).toHaveValue("130");
  await expect(lines(body, "Prefix")).toHaveText("T2+130 Max Life");
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
  await choose(
    body,
    'data-legendary-placeholder="1"',
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

  await gear.startCraft("Craft Legendary");
  await field(body, "data-legendary-search").fill("locking fingers");
  await body.locator('[data-legendary-id="Folklore_of_Locking_Fingers"]').click();
  await field(body, "data-legendary-ring-option").locator('[data-ring-effect="right"]').click();
  await expect(body.locator('[data-legendary-mod="2"]')).toContainText("right Ring");
  await expect(preview(body)).toContainText("right Ring");
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  const folklore = (await gear.stored()).inventory.at(-1);
  expect(folklore.legendaryModifiers[2]).toContain("right Ring");
  await planner.expectNoErrors();
});

test("legendary: a group lists all its legendaries, its type chips keep theirs; the search reads text or /regex/", async ({
  page,
}) => {
  const { planner, body } = await openCrafter(page, "Craft Legendary");
  const chip = (type) => field(body, `data-legendary-type="${type}"`);
  const found = body.locator("[data-legendary-id]");
  await expect(body.locator("h3")).toHaveText("Select an item group");
  await expect(field(body, "data-craft-pick")).toHaveCount(8);
  await expect(field(body, "data-legendary-type")).toHaveCount(0);
  await field(body, 'data-craft-pick="chest-armor"').click();
  await expect(field(body, "data-legendary-type")).toHaveText([/^STR/, /^DEX/, /^INT/, /^Special/]);
  await expect(found).toHaveCount(49);
  await chip("Special").click();
  await expect(chip("Special")).toHaveAttribute("aria-pressed", "true");
  await expect(found).toHaveCount(1);
  await expect(found).toContainText("Omniscient Prototype");
  await chip("INT Chest Armor").click();
  await expect(found).toHaveCount(22);
  await expect(body).toContainText("22 legendaries");
  await chip("Special").click();
  await field(body, "data-legendary-search").fill("/^genius/");
  await expect(found.first()).toBeVisible();
  for (const name of await found.locator("strong").allTextContents()) expect(name).toMatch(/^Genius/i);
  await field(body, "data-legendary-search").fill("/(/");
  await expect(found).toHaveCount(0);
  await expect(body).toContainText("Invalid regular expression");
  await field(body, "data-legendary-search").fill("");
  await path(body).getByRole("button", { name: "Item groups" }).click();
  await field(body, "data-legendary-search").fill("ice pulse");
  await expect(found).toHaveCount(1);
  await planner.expectNoErrors();
});

test("legendary: the search, a legendary's base, corrosion, mod tiers and rolls, and Add to Inventory", async ({
  page,
}) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Legendary");
  await field(body, "data-legendary-search").fill("e");
  await expect(body).toContainText("refine the search to see more");
  await field(body, "data-legendary-search").fill("ice pulse");
  await expect(body.locator("[data-legendary-id]")).toHaveCount(1);
  await expect(body).toContainText("1 legendary gear available");
  await expect(field(body, "data-legendary-search")).toBeFocused();
  await body.locator('[data-legendary-id="Ice_Pulse"]').click();

  await expect(field(body, "data-legendary-base")).toHaveCount(0);
  await expect(field(body, "data-legendary-energy")).toHaveValue("61");
  await expect(preview(body).locator("header")).toContainText("Energy 61");
  await expect(preview(body).locator("header")).toContainText("Ice Pulse");
  await expect(preview(body).locator("header")).toContainText("INT Gloves(Gloves)Require lv 14");
  await expect(preview(body)).toContainText("+8 to Max Frostbite Rating+80% Spell Damage");
  const mods = body.locator(".legendary-mod-control");
  await expect(mods.first().locator("[data-legendary-mod]")).toHaveText("+8 to Max Frostbite Rating");
  await field(body, 'data-legendary-roll="0"').fill("6");
  await expect(mods.first().locator("[data-legendary-mod]")).toHaveText("+6 to Max Frostbite Rating");
  await expect(preview(body)).toContainText("+6 to Max Frostbite Rating");

  const tiers = field(body, 'data-legendary-tier="1"').locator("[data-tier-option]");
  // T0 is its corroded form.
  await expect(tiers).toHaveText(["T2", "T1", "T0"]);
  await expect(tierChip(body, 1, 1)).toHaveAttribute("title", "T1 · +(60–80)% Spell Damage");
  await expect(tierChip(body, 1, 1)).toHaveAttribute("aria-pressed", "true");
  await tierChip(body, 1, 2).click();
  await expect(field(body, 'data-legendary-roll="1"')).toHaveValue("29");
  await expect(preview(body)).toContainText("+29% Spell Damage");

  await choose(body, "data-legendary-corrosion", "1");
  await expect(preview(body)).toContainText("+15% Attack Speed");

  await expect(path(body)).toContainText("Item groups›Gloves›Ice Pulse");
  await path(body).getByRole("button", { name: "Gloves" }).click();
  await expect(field(body, "data-legendary-search")).toHaveValue("");
  await expect(field(body, "data-legendary-type")).toHaveText([/^STR/, /^DEX/, /^INT/]);
  await body.locator('[data-legendary-id="Ice_Pulse"]').click();
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  await expect(gear.toast()).toHaveText("Ice Pulse added to Inventory");
  const saved = (await gear.stored()).inventory.at(-1);
  expect(saved).toMatchObject({ name: "Ice Pulse", rarity: "legendary", base: "INT Gloves", itemLevel: 100 });
  expect(saved.legendaryModifiers.slice(0, 2)).toEqual(["+8 to Max Frostbite Rating", "+80% Spell Damage"]);
  await planner.expectNoErrors();
});

test("Edit on a crafted rare fills the form from the item; Save Changes updates it in place", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  await planner.showView("equipment");
  const gear = new GearPage(page);
  // Equipped, so it opens from its slot; the dialog's Edit opens the crafter on it.
  await gear.slot("belt").click();
  await gear.itemDialog().getByRole("button", { name: "Edit", exact: true }).click();
  await expect(gear.crafter()).toBeVisible();
  await expect(gear.crafterTitle()).toHaveText("Edit Arcanist Girdle");
  const body = gear.crafter().locator("#equipment-crafter-body");
  await expect(gear.crafter().getByRole("button", { name: "Save Changes", exact: true })).toBeVisible();
  await expect(path(body)).toContainText("Trinket›Belt›");
  await expect(field(body, "data-craft-belt-blend")).toHaveCount(1);
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
  await planner.showView("equipment");
  const gear = new GearPage(page);
  const before = (await gear.stored()).inventory.find((entry) => entry.id === "gear-game-log-belt");
  // Equipped, so it opens from its slot; the dialog's Edit opens the crafter on it.
  await gear.slot("belt").click();
  await gear.itemDialog().getByRole("button", { name: "Edit", exact: true }).click();
  const body = gear.crafter().locator("#equipment-crafter-body");
  await expect(field(body, "data-craft-name")).toHaveValue("Arcanist Girdle");
  await expect(field(body, "data-craft-level")).toHaveValue("83");
  await expect(path(body)).toHaveText("Item groups›Trinket›Belt›Lv 76 · Arcanist Girdle");
  await expect(chosen(body, "data-craft-belt-blend")).toHaveAttribute("data-choice-value", "belt-blend-014");
  const families = [
    "prefix-1402303",
    "prefix-1092302",
    "prefix-1052302",
    "suffix-1082302",
    "suffix-1082300",
    "suffix-1082301",
  ];
  const rolls = ["42", "35", "219", "19", "18", "17"];
  await expect(body.locator("h3", { hasText: "Prefixes" })).toHaveText("Prefixes (3/3)");
  await expect(body.locator("h3", { hasText: "Suffixes" })).toHaveText("Suffixes (3/3)");
  for (const index of families.keys()) {
    const row = await showSlot(body, index);
    await expect(currentTier(body, index)).toHaveText("T2");
    await expect(field(body, `data-craft-affix-roll="${index}"`)).toHaveValue(rolls[index]);
    await expect(row.locator("[data-affix-roll-number]")).toHaveValue(rolls[index]);
  }
  await expect(lines(body, "Prefix")).toHaveText(["T2+42% damage", "T2+35 Intelligence", "T2+219 Max Energy Shield"]);

  await (await showSlot(body, 0)).locator("[data-affix-roll-number]").fill("40");
  await expect(lines(body, "Prefix").first()).toHaveText("T2+40% damage");
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

test("rare: back from the form to the type's bases, another base keeps what the form holds", async ({ page }) => {
  const { planner, body } = await openCrafter(page, "Craft Rare Item");
  await pickRare(body, "helmet", "DEX Helmet");
  await field(body, "data-craft-name").fill("Kept Helm");
  await path(body).getByRole("button", { name: "DEX" }).click();
  await expect(body.locator("h3")).toHaveText("Select a base");
  await expect(path(body)).toHaveText("Craft›Item groups›Helmet›DEX");
  await field(body, "data-craft-pick").nth(1).click();
  await expect(field(body, "data-craft-name")).toHaveValue("Kept Helm");
  await path(body).getByRole("button", { name: "Helmet" }).click();
  await expect(field(body, "data-craft-pick")).toHaveCount(3);
  await planner.expectNoErrors();
});

test("rare: up to three affixes a side and two base affixes, from lists in folding sections; the Ultimate ones need Priceless", async ({
  page,
}) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Rare Item");
  await pickRare(body, "helmet", "STR Helmet");
  const prefixes = body.locator('[data-affix-list="prefix"]');
  await expect(prefixes.getByRole("tab")).toHaveText(["Basic (0)", "Advanced (0)", "Ultimate (0)"]);
  await checkAffix(body, "prefix", MAX_LIFE);
  await checkAffix(body, "prefix", /^\+#% damage/);
  await checkAffix(body, "prefix", /^\+# Strength/, "Advanced");
  await expect(body.locator("h3", { hasText: "Prefixes" })).toHaveText("Prefixes (3/3)");
  await expect(prefixes.getByRole("tab")).toHaveText(["Basic (2)", "Advanced (1)", "Ultimate (0)"]);
  const dexterity = affixOption(body, "prefix", /^\+# Dexterity/, "Advanced").box;
  await expect(dexterity).toBeDisabled();
  await expect(prefixes.locator("label").filter({ hasText: /^\+# Dexterity/ })).toContainText("Three prefixes chosen");
  // Unchecked, the first one leaves its slot and the others move up.
  await checkAffix(body, "prefix", MAX_LIFE, "Basic", false);
  await expect(slot(body, 0)).toContainText("+#% damage");
  await prefixes.getByRole("tab", { name: /^Advanced/ }).click();
  await expect(dexterity).toBeEnabled();

  await prefixes.getByRole("tab", { name: /^Ultimate/ }).click();
  await field(body, "data-craft-priceless").uncheck();
  const ultimate = prefixes.locator("label").first();
  await expect(ultimate).toContainText("Requires Priceless");
  await expect(ultimate.getByRole("checkbox")).toBeDisabled();
  await field(body, "data-craft-priceless").check();
  await expect(ultimate.getByRole("checkbox")).toBeEnabled();

  // Base affixes: up to two; the first unchecked, the other moves up.
  const bases = body.locator("[data-base-affix-list] [data-craft-base-affix-option]");
  await bases.nth(0).check();
  await bases.nth(1).check();
  await expect(body.locator("h3", { hasText: "Base affixes" })).toHaveText("Base affixes (2/2)");
  await expect(bases.nth(2)).toBeDisabled();
  await expect(body.locator("[data-base-affix-list] > div").nth(2)).toContainText("Two base affixes chosen");
  const second = await bases.nth(1).getAttribute("data-craft-base-affix-option");
  await bases.nth(0).uncheck();
  await expect(body.locator('[data-base-affix-slot="0"] [data-craft-base-affix-option]')).toHaveAttribute(
    "data-craft-base-affix-option",
    second,
  );
  await expect(bases.nth(2)).toBeEnabled();
  await expect(gear.toast()).not.toHaveText(/up to three|item level/);

  // Each section folds by its heading.
  await body.locator("summary", { hasText: "Prefixes" }).click();
  await expect(prefixes).toBeHidden();
  await body.locator("summary", { hasText: "Prefixes" }).click();
  await expect(prefixes).toBeVisible();
  await planner.expectNoErrors();
});

test("rare: the Corroded check marks the item, in the preview and saved", async ({ page }) => {
  const { planner, gear, body } = await openCrafter(page, "Craft Rare Item");
  await pickRare(body, "helmet", "STR Helmet");
  await expect(preview(body).locator("header")).not.toContainText("Corroded");
  await field(body, "data-craft-corroded").check();
  await expect(preview(body).locator("header")).toContainText("Corroded");
  await field(body, "data-craft-name").fill("Corroded Helm");
  await gear.crafter().getByRole("button", { name: "Add to Inventory", exact: true }).click();
  expect((await gear.stored()).inventory.at(-1)).toMatchObject({ name: "Corroded Helm", corroded: true });
  await gear.cardTool("Corroded Helm", "Edit item").click();
  await expect(field(body, "data-craft-corroded")).toBeChecked();
  await planner.expectNoErrors();
});

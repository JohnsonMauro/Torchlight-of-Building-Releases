// The Inventory item dialog (an Inventory card or an equipped slot opens it): the item with its rarity, Equip or
// Unequip, Edit, Copy and Delete; Edit opens the item editor in the dialog (a legendary) or the crafter (a crafted
// rare), whose Save Changes comes back to the item; a click outside closes it. Written against the legacy dialog
// before it moves to React, so both must pass it unchanged. The Youga build's ten items are all equipped.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { GearPage } from "./pages/gear-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
test.use({ viewport: { width: 1440, height: 1000 } });

// The Youga build's items are all equipped (an equipped item is in its slot, not in the Inventory list): each opens from
// its slot.
const SLOT_OF = {
  "Ice Pulse": "gloves",
  "Blind Vision": "helmet",
  "Old Grudge": "necklace",
  "Arcanist Girdle": "belt",
  "Blade-dancer's Steps": "boots",
};
async function openItem(page, name) {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  await planner.showView("equipment");
  const gear = new GearPage(page);
  await gear.slot(SLOT_OF[name]).click();
  await expect(gear.itemDialog()).toBeVisible();
  return { planner, gear };
}
const quick = (gear) => gear.itemDialog().locator(".inventory-quick-actions");

test("the item: its art, name and rarity, and Unequip, Edit, Copy, Delete", async ({ page }) => {
  const { planner, gear } = await openItem(page, "Ice Pulse");
  await expect(gear.itemDialogTitle()).toHaveText("Ice Pulse");
  await expect(gear.itemDialog()).not.toHaveClass(/\bgear-editor-dialog\b/);
  await expect(quick(gear)).toHaveClass(/\brarity-legendary\b/);
  await expect(quick(gear).locator("strong")).toHaveText("Ice Pulse");
  await expect(quick(gear).locator("img")).toHaveAttribute("src", /\S/);
  await expect(quick(gear).getByRole("button")).toHaveText(["Unequip", "Edit", "Copy", "Delete"]);
  await expect(gear.itemDialog().locator("footer")).toBeHidden();
  await gear.itemDialog().getByRole("button", { name: "Close", exact: true }).click();
  await expect(gear.itemDialog()).toBeHidden();
  await planner.expectNoErrors();
});

test("Equip on an unequipped item puts it back in its slot", async ({ page }) => {
  const { planner, gear } = await openItem(page, "Blind Vision");
  await quick(gear).getByRole("button", { name: "Unequip", exact: true }).click();
  await expect(gear.slot("helmet")).toHaveClass(/\bdisabled\b/);
  await gear.cardButton("Blind Vision").click();
  await expect(quick(gear).getByRole("button").first()).toHaveText("Equip");
  await quick(gear).getByRole("button", { name: "Equip", exact: true }).click();
  await expect(gear.toast()).toHaveText("Blind Vision equipped");
  await expect(gear.itemDialog()).toBeHidden();
  await expect(gear.slot("helmet")).not.toHaveClass(/\bdisabled\b/);
  await planner.expectNoErrors();
});

test("Delete removes the item from the Inventory and empties its slot", async ({ page }) => {
  const { planner, gear } = await openItem(page, "Old Grudge");
  await quick(gear).getByRole("button", { name: "Delete", exact: true }).click();
  await expect(gear.toast()).toHaveText("Item deleted from Inventory");
  await expect(gear.itemDialog()).toBeHidden();
  await expect(gear.slot("necklace")).toHaveClass(/\bdisabled\b/);
  const stored = await gear.stored();
  expect(stored.inventory).toHaveLength(9);
  expect(stored.inventory.map((item) => item.name)).not.toContain("Old Grudge");
  await planner.expectNoErrors();
});

test("Edit opens a legendary's editor in the dialog; its controls work and Save Changes comes back", async ({
  page,
}) => {
  const { planner, gear } = await openItem(page, "Ice Pulse");
  await quick(gear).getByRole("button", { name: "Edit", exact: true }).click();
  await expect(gear.itemDialog()).toHaveClass(/\bgear-editor-dialog\b/);
  await expect(gear.itemDialogTitle()).toHaveText("Ice Pulse");
  const footer = gear.itemDialog().locator("footer");
  await expect(footer).toBeVisible();
  await expect(footer.getByRole("button")).toHaveText(["Cancel", "Save Changes"]);
  const name = gear.itemDialog().getByRole("textbox", { name: "Name", exact: true });
  await expect(name).toHaveValue("Ice Pulse");

  // A control of the editor: a line that can be corroded switches to its corroded form (its T0 chip).
  const corrosion = gear.itemDialog().locator(".legendary-mod-control button[data-toggle-edit-corrosion]");
  await expect(corrosion.first()).toHaveAttribute("aria-pressed", "false");
  await corrosion.first().click();
  await expect(gear.itemDialog().locator(".legendary-mod-control.corrosion-affix")).toHaveCount(1);
  await expect(
    gear.itemDialog().locator(".legendary-mod-control.corrosion-affix button[data-toggle-edit-corrosion]"),
  ).toHaveAttribute("aria-pressed", "true");

  await name.fill("Ice Pulse Mk II");
  await footer.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(gear.toast()).toHaveText("Inventory item updated");
  await expect(gear.itemDialog()).toBeVisible();
  await expect(gear.itemDialog()).not.toHaveClass(/\bgear-editor-dialog\b/);
  await expect(footer).toBeHidden();
  await expect(gear.itemDialogTitle()).toHaveText("Ice Pulse Mk II");
  await expect(quick(gear).locator("strong")).toHaveText("Ice Pulse Mk II");
  await expect(gear.slot("gloves")).toContainText("Ice Pulse Mk II");
  const stored = await gear.stored();
  expect(stored.inventory.find((item) => item.id === "gear-game-log-gloves").name).toBe("Ice Pulse Mk II");

  // Edit again, then Cancel closes the dialog without keeping anything.
  await quick(gear).getByRole("button", { name: "Edit", exact: true }).click();
  await name.fill("Not kept");
  await footer.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(gear.itemDialog()).toBeHidden();
  await expect(gear.slot("gloves")).toContainText("Ice Pulse Mk II");
  await planner.expectNoErrors();
});

test("the legendary editor: a tier and a roll change their line; the fields and lines are saved", async ({ page }) => {
  const { planner, gear } = await openItem(page, "Ice Pulse");
  await quick(gear).getByRole("button", { name: "Edit", exact: true }).click();
  const editor = gear.itemDialog().locator("#inventory-item-body");
  const lineText = (index) => editor.locator(`[data-edit-modifier-text="${index}"]`);
  await expect(lineText(1)).toHaveText("+64% Spell Damage");
  await expect(editor.locator('[data-edit-legendary-tier="1"] [aria-pressed="true"]')).toHaveAttribute(
    "data-tier-option",
    "1",
  );
  await editor.locator('[data-edit-legendary-tier="1"] [data-tier-option="2"]').click();
  await expect(lineText(1)).toHaveText("+29% Spell Damage");
  await expect(editor.locator('[data-edit-legendary-roll="1"]')).toHaveAttribute("max", "29");
  await expect(editor.locator("aside")).toContainText("+29% Spell Damage");

  const roll = editor.locator('[data-edit-legendary-roll="0"]');
  await roll.fill("6");
  await expect(lineText(0)).toHaveText("+6 to Max Frostbite Rating");
  await expect(editor.locator(".legendary-mod-control").first().locator("em")).toHaveText("5 – 8");
  await expect(editor.locator(".legendary-mod-control").first().locator("[data-affix-roll-number]")).toHaveValue("6");
  await editor.locator(".legendary-mod-control").nth(1).locator("[data-affix-roll-number]").fill("25");
  await expect(lineText(1)).toHaveText("+25% Spell Damage");

  await gear.itemDialog().getByRole("spinbutton", { name: "Item level", exact: true }).fill("90");
  await gear.itemDialog().getByRole("spinbutton", { name: "Energy", exact: true }).fill("40");
  await gear.itemDialog().locator("footer").getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(gear.toast()).toHaveText("Inventory item updated");
  const saved = (await gear.stored()).inventory.find((item) => item.id === "gear-game-log-gloves");
  expect(saved).toMatchObject({ level: 90, energy: 40 });
  expect(saved.legendaryModifiers.slice(0, 2)).toEqual(["+6 to Max Frostbite Rating", "+25% Spell Damage"]);
  expect(saved.modifiers).toEqual(expect.arrayContaining(["+6 to Max Frostbite Rating", "+25% Spell Damage"]));

  // Edit again: the editor opens on the saved tier and rolls.
  await quick(gear).getByRole("button", { name: "Edit", exact: true }).click();
  await expect(editor.locator('[data-edit-legendary-tier="1"] [aria-pressed="true"]')).toHaveAttribute(
    "data-tier-option",
    "2",
  );
  await expect(lineText(1)).toHaveText("+25% Spell Damage");
  await expect(roll).toHaveValue("6");
  await planner.expectNoErrors();
});

test("the legendary editor keeps the typed fields through a tier or corroded-line change", async ({ page }) => {
  const { planner, gear } = await openItem(page, "Ice Pulse");
  await quick(gear).getByRole("button", { name: "Edit", exact: true }).click();
  const editor = gear.itemDialog().locator("#inventory-item-body");
  const name = gear.itemDialog().getByRole("textbox", { name: "Name", exact: true });
  const level = gear.itemDialog().getByRole("spinbutton", { name: "Item level", exact: true });
  await name.fill("Kept Pulse");
  await level.fill("91");
  await editor.locator('[data-edit-legendary-tier="1"] [data-tier-option="2"]').click();
  await editor.locator(".legendary-mod-control").nth(2).locator("[data-toggle-edit-corrosion]").click();
  await expect(name).toHaveValue("Kept Pulse");
  await expect(level).toHaveValue("91");
  await gear.itemDialog().locator("footer").getByRole("button", { name: "Save Changes", exact: true }).click();
  const saved = (await gear.stored()).inventory.find((item) => item.id === "gear-game-log-gloves");
  expect(saved).toMatchObject({ name: "Kept Pulse", level: 91 });
  await planner.expectNoErrors();
});

test("the editor opens on the stored corrosion: a corroded line and a corrosion implicit; both can be dropped", async ({
  page,
}) => {
  const { planner, gear } = await openItem(page, "Blind Vision");
  const editor = gear.itemDialog().locator("#inventory-item-body");
  const footer = gear.itemDialog().locator("footer");
  await quick(gear).getByRole("button", { name: "Edit", exact: true }).click();
  const first = editor.locator(".legendary-mod-control").first();
  await expect(first).toHaveClass(/\bcorrosion-affix\b/);
  await expect(first.locator("[data-toggle-edit-corrosion]")).toHaveAttribute("aria-pressed", "true");
  await expect(editor.locator("aside li.corrosion-affix")).toHaveCount(1);
  await first.locator('[data-tier-option="1"]').click();
  await expect(editor.locator(".legendary-mod-control").first()).not.toHaveClass(/\bcorrosion-affix\b/);
  await footer.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(gear.toast()).toHaveText("Inventory item updated");
  const helmet = (await gear.stored()).inventory.find((item) => item.id === "gear-game-log-helmet");
  expect(helmet.corrodedModifierIndices).toEqual([]);
  await gear.itemDialog().getByRole("button", { name: "Close", exact: true }).click();

  await gear.slot("boots").click();
  await quick(gear).getByRole("button", { name: "Edit", exact: true }).click();
  const corrosion = gear.itemDialog().getByRole("combobox", { name: "Corrosion Implicit", exact: true });
  await expect(corrosion).toHaveValue("+51% damage");
  await expect(editor.locator(".gear-mod-editor .fixed-mod.corrosion-affix")).toHaveText("Corroded+51% damage");
  const implicit = editor.locator('aside [data-preview-line="Implicit"]');
  await expect(implicit).toHaveText("+51% damage");
  await expect(implicit).toHaveAttribute("title", "Implicit · Corroded · DEX Boots");
  await corrosion.selectOption("");
  await footer.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(gear.toast()).toHaveText("Inventory item updated");
  const boots = (await gear.stored()).inventory.find((item) => item.id === "gear-game-log-boots");
  expect(boots.corrosionModifiers).toEqual([]);
  await planner.expectNoErrors();
});

test("a captured item (the default build's): its lines are text fields, saved as typed into an Inventory copy", async ({
  page,
}) => {
  const planner = new PlannerPage(page);
  await planner.open();
  await planner.showView("equipment");
  const gear = new GearPage(page);
  // Equipped, so it opens from its slot.
  await gear.slot("chest").click();
  await quick(gear).getByRole("button", { name: "Edit", exact: true }).click();
  const editor = gear.itemDialog().locator("#inventory-item-body");
  await expect(editor.locator("h3").first()).toHaveText("Prefixes and Suffixes");
  const first = editor.locator('.fixed-mod [data-edit-modifier="0"]');
  await expect(first).toHaveValue("+8% Aura Effect");
  await expect(editor.locator(".fixed-mod input[data-edit-modifier]")).toHaveCount(7);
  await first.fill("+9% Aura Effect");
  await gear.itemDialog().getByRole("textbox", { name: "Name", exact: true }).fill("Edited Robe");
  await gear.itemDialog().locator("footer").getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(gear.toast()).toHaveText("Inventory item updated");
  await expect(gear.itemDialogTitle()).toHaveText("Edited Robe");
  const saved = (await gear.stored()).inventory.find((item) => item.name === "Edited Robe");
  expect(saved.id).toMatch(/^gear-/);
  expect(saved.modifiers[0]).toBe("+9% Aura Effect");
  expect(saved.modifiers).toContain("+24% Fire Resistance");
  await planner.expectNoErrors();
});

test("the editor's Belt Blend and fields of a captured belt are saved", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.open();
  await planner.showView("equipment");
  const gear = new GearPage(page);
  await gear.slot("belt").click();
  await quick(gear).getByRole("button", { name: "Edit", exact: true }).click();
  const blend = gear.itemDialog().getByRole("combobox", { name: "Belt Blend", exact: true });
  await expect(blend).toHaveValue("");
  await expect(gear.itemDialog().getByRole("spinbutton", { name: "Energy", exact: true })).toHaveCount(0);
  await blend.selectOption("belt-blend-005");
  await gear.itemDialog().getByRole("textbox", { name: "Base item", exact: true }).fill("Belt");
  await gear.itemDialog().getByRole("spinbutton", { name: "Item level", exact: true }).fill("95");
  await gear.itemDialog().locator("footer").getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(gear.toast()).toHaveText("Inventory item updated");
  const saved = (await gear.stored()).inventory.find((item) => item.name === "Elder Sage Girdle - Priceless");
  expect(saved).toMatchObject({ beltBlendId: "belt-blend-005", level: 95, base: "Belt" });
  expect(saved.modifiers).toContain("Immune to Ignite\nMinions are immune to Fire Damage");
  await planner.expectNoErrors();
});

test("Edit on a crafted rare opens the crafter instead", async ({ page }) => {
  const { planner, gear } = await openItem(page, "Arcanist Girdle");
  await quick(gear).getByRole("button", { name: "Edit", exact: true }).click();
  await expect(gear.itemDialog()).toBeHidden();
  await expect(page.locator("#equipment-crafter")).toBeVisible();
  await expect(page.locator("#equipment-crafter-title")).toHaveText("Edit Arcanist Girdle");
  await planner.expectNoErrors();
});

test("a click outside the dialog closes it", async ({ page }) => {
  const { planner, gear } = await openItem(page, "Ice Pulse");
  await page.mouse.click(5, 5);
  await expect(gear.itemDialog()).toBeHidden();
  await planner.expectNoErrors();
});

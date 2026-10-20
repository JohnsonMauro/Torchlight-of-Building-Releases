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

async function openItem(page, name) {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  await planner.showView("talents");
  const gear = new GearPage(page);
  await gear.cardButton(name).click();
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
  await expect(gear.inventoryCount()).toHaveText("(9)");
  await expect(gear.slot("necklace")).toHaveClass(/\bdisabled\b/);
  const stored = await gear.stored();
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

  // A control of the editor: a line that can be corroded switches to Corroded.
  const corrosion = gear
    .itemDialog()
    .locator(".legendary-mod-control button[data-toggle-edit-corrosion]:not([disabled])");
  await expect(corrosion.first()).toHaveText("Normal");
  await corrosion.first().click();
  await expect(gear.itemDialog().locator(".legendary-mod-control.corrosion-affix")).toHaveCount(1);
  await expect(
    gear.itemDialog().locator(".legendary-mod-control.corrosion-affix button[data-toggle-edit-corrosion]"),
  ).toHaveText("Corroded");

  await name.fill("Ice Pulse Mk II");
  await footer.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(gear.toast()).toHaveText("Inventory item updated");
  await expect(gear.itemDialog()).toBeVisible();
  await expect(gear.itemDialog()).not.toHaveClass(/\bgear-editor-dialog\b/);
  await expect(footer).toBeHidden();
  await expect(gear.itemDialogTitle()).toHaveText("Ice Pulse Mk II");
  await expect(quick(gear).locator("strong")).toHaveText("Ice Pulse Mk II");
  await expect(gear.card("Ice Pulse Mk II")).toBeVisible();
  const stored = await gear.stored();
  expect(stored.inventory.find((item) => item.id === "gear-game-log-gloves").name).toBe("Ice Pulse Mk II");

  // Edit again, then Cancel closes the dialog without keeping anything.
  await quick(gear).getByRole("button", { name: "Edit", exact: true }).click();
  await name.fill("Not kept");
  await footer.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(gear.itemDialog()).toBeHidden();
  await expect(gear.card("Ice Pulse Mk II")).toBeVisible();
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

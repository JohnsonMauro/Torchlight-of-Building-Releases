// Gear section of the Build page: the ten equipped slots, the Inventory, equipping and unequipping (right-click, the item
// dialog, drags in both directions), the card tools, Reset Gear and the craft buttons. Written against the legacy section
// before it moves to React, so both must pass it unchanged. The golden-master Youga build has an item in every slot, each
// from its Inventory (two Headless Cleric Wands, Restless Glacier as Ring 2).
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { GearPage } from "./pages/gear-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const SLOTS = [
  "helmet",
  "chest",
  "necklace",
  "gloves",
  "belt",
  "boots",
  "leftRing",
  "rightRing",
  "mainHand",
  "secondaryHand",
];
// Tall enough for the slots and the Inventory to be on screen together (the drags move the mouse, which does not scroll
// the page).
test.use({ viewport: { width: 1440, height: 1300 } });

async function openGear(page, state = youga) {
  const planner = new PlannerPage(page);
  await planner.open(state);
  const gear = new GearPage(page);
  await gear.open();
  return { planner, gear };
}

test("lists the equipped items and the Inventory", async ({ page }) => {
  const { planner, gear } = await openGear(page);
  await expect(gear.equippedCount()).toHaveText("10/10");
  await expect(gear.inventoryCount()).toHaveText("(10)");
  await expect(gear.slots()).toHaveCount(10);
  await expect(gear.slot("helmet")).toContainText("Helmet");
  await expect(gear.slot("helmet")).toContainText("Blind Vision");
  await expect(gear.slot("helmet")).toContainText("Lv.");
  await expect(gear.slot("helmet")).toHaveClass(/\brarity-legendary\b/);
  await expect(gear.slot("rightRing")).toContainText("Restless Glacier");
  await expect(gear.slot("secondaryHand")).toContainText("Headless Cleric Wand");
  await expect(gear.slot("helmet").locator("img")).toHaveAttribute("src", /\.webp$/);
  await expect(gear.cards()).toHaveCount(10);
  await expect(gear.inventory().getByText("Equipped", { exact: true })).toHaveCount(10);
  await expect(gear.card("Blind Vision")).toContainText("Lv.");
  await expect(gear.cardTool("Blind Vision", "Edit item")).toBeVisible();
  await expect(gear.cardTool("Blind Vision", "Duplicate item")).toBeVisible();
  await planner.expectNoErrors();
});

test("an empty build shows empty slots and an empty Inventory", async ({ page }) => {
  const { planner, gear } = await openGear(page, {
    ...youga,
    disabledEquipmentSlots: SLOTS,
    equipmentOverrides: {},
    equipmentInventory: [],
  });
  await expect(gear.equippedCount()).toHaveText("0/10");
  await expect(gear.inventoryCount()).toHaveText("(0)");
  for (const key of SLOTS) await expect(gear.slot(key)).toHaveClass(/\bdisabled\b/);
  await expect(gear.slot("helmet")).toContainText("Empty");
  await expect(gear.slot("helmet")).toContainText("Select slot");
  await expect(gear.slot("helmet")).toHaveAttribute("title", "Select this slot, then choose an Inventory item");
  await expect(gear.cards()).toHaveCount(0);
  await expect(gear.inventory()).toContainText("No items crafted yet");
  await planner.expectNoErrors();
});

test("right-clicking an equipped slot unequips it; right-clicking its Inventory card equips it again", async ({
  page,
}) => {
  const { planner, gear } = await openGear(page);
  await expect(gear.slot("helmet")).toHaveAttribute("title", "Right-click to unequip");
  await gear.slot("helmet").click({ button: "right" });
  await expect(gear.toast()).toHaveText("Helmet unequipped");
  await expect(gear.equippedCount()).toHaveText("9/10");
  await expect(gear.slot("helmet")).toHaveClass(/\bdisabled\b/);
  await expect(gear.slot("helmet")).toContainText("Empty");
  await expect(gear.card("Blind Vision")).not.toContainText("Equipped");
  expect((await gear.stored()).disabled).toContain("helmet");
  // The context menu of the page does not open.
  await expect(gear.itemDialog()).not.toBeVisible();

  await gear.cardButton("Blind Vision").click({ button: "right" });
  await expect(gear.toast()).toHaveText("Blind Vision equipped");
  await expect(gear.equippedCount()).toHaveText("10/10");
  await expect(gear.slot("helmet")).toContainText("Blind Vision");
  await expect(gear.card("Blind Vision")).toContainText("Equipped");
  const stored = await gear.stored();
  expect(stored.disabled).not.toContain("helmet");
  expect(stored.overrides.helmet.sourceInventoryId).toBe("gear-game-log-helmet");
  await planner.expectNoErrors();
});

test("a selected empty slot is where a ring goes", async ({ page }) => {
  const { planner, gear } = await openGear(page);
  await gear.slot("leftRing").click({ button: "right" });
  await expect(gear.toast()).toHaveText("Left Ring unequipped");
  await gear.slot("rightRing").click({ button: "right" });
  await expect(gear.toast()).toHaveText("Right Ring unequipped");
  // Clicking an empty slot selects it (and opens nothing).
  await gear.slot("rightRing").click();
  await expect(gear.slot("rightRing")).toHaveClass(/\bselected\b/);
  await expect(gear.slot("helmet")).not.toHaveClass(/\bselected\b/);
  await expect(gear.itemDialog()).not.toBeVisible();
  await gear.cardButton("Depicted Ward Ring").click({ button: "right" });
  await expect(gear.toast()).toHaveText("Depicted Ward Ring equipped");
  await expect(gear.slot("rightRing")).toContainText("Depicted Ward Ring");
  await expect(gear.slot("leftRing")).toHaveClass(/\bdisabled\b/);
  const stored = await gear.stored();
  expect(stored.overrides.rightRing.sourceInventoryId).toBe("gear-game-log-leftRing");
  expect(stored.disabled).toContain("leftRing");
  await planner.expectNoErrors();
});

test("clicking an equipped slot opens its item, whose Unequip takes it off", async ({ page }) => {
  const { planner, gear } = await openGear(page);
  await gear.slot("helmet").click();
  await expect(gear.itemDialog()).toBeVisible();
  await expect(gear.itemDialogTitle()).toHaveText("Blind Vision");
  await gear.itemDialog().getByRole("button", { name: "Unequip", exact: true }).click();
  await expect(gear.toast()).toHaveText("Blind Vision unequipped");
  await expect(gear.itemDialog()).not.toBeVisible();
  await expect(gear.slot("helmet")).toHaveClass(/\bdisabled\b/);
  await expect(gear.equippedCount()).toHaveText("9/10");
  await planner.expectNoErrors();
});

test("clicking an Inventory card opens the item; its tools edit and duplicate it", async ({ page }) => {
  const { planner, gear } = await openGear(page);
  await gear.cardButton("Ice Pulse").click();
  await expect(gear.itemDialog()).toBeVisible();
  await expect(gear.itemDialogTitle()).toHaveText("Ice Pulse");
  await expect(gear.itemDialog().getByRole("button", { name: "Unequip", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(gear.itemDialog()).not.toBeVisible();

  await gear.cardTool("Ice Pulse", "Edit item").click();
  await expect(gear.itemDialog()).toBeVisible();
  await expect(gear.itemDialog()).toHaveClass(/\bgear-editor-dialog\b/);
  await expect(gear.itemDialog().getByRole("button", { name: "Save Changes", exact: true })).toBeVisible();
  await gear.itemDialog().getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(gear.itemDialog()).not.toBeVisible();

  await gear.cardTool("Ice Pulse", "Duplicate item").click();
  await expect(gear.toast()).toHaveText("Ice Pulse duplicated");
  await expect(gear.inventoryCount()).toHaveText("(11)");
  await expect(gear.card("Ice Pulse Copy")).toBeVisible();
  await expect(gear.card("Ice Pulse Copy")).not.toContainText("Equipped");
  await expect(gear.itemDialog()).not.toBeVisible();
  const stored = await gear.stored();
  expect(stored.inventory).toHaveLength(11);
  expect(stored.inventory.at(-1).name).toBe("Ice Pulse Copy");
  await planner.expectNoErrors();
});

test("Reset Gear empties every slot and keeps the Inventory", async ({ page }) => {
  const { planner, gear } = await openGear(page);
  await gear.button("Reset Gear").click();
  await expect(gear.toast()).toHaveText("Gear reset to empty");
  await expect(gear.equippedCount()).toHaveText("0/10");
  for (const key of SLOTS) await expect(gear.slot(key)).toHaveClass(/\bdisabled\b/);
  await expect(gear.cards()).toHaveCount(10);
  await expect(gear.inventory().getByText("Equipped", { exact: true })).toHaveCount(0);
  const stored = await gear.stored();
  expect(stored.overrides).toEqual({});
  expect([...stored.disabled].sort()).toEqual([...SLOTS].sort());
  await planner.expectNoErrors();
});

test("the craft buttons open the crafter in their mode", async ({ page }) => {
  const { planner, gear } = await openGear(page);
  for (const name of ["Craft Rare Item", "Craft Legendary", "Craft Vorax Item"]) {
    await gear.button(name).click();
    await expect(gear.crafter()).toBeVisible();
    await expect(gear.crafterTitle()).toHaveText(name);
    await page.keyboard.press("Escape");
    await expect(gear.crafter()).not.toBeVisible();
  }
  await planner.expectNoErrors();
});

test("dragging an Inventory card onto a slot equips it there", async ({ page }) => {
  const { planner, gear } = await openGear(page);
  // Restless Glacier is Ring 2: on Ring 1 it replaces Depicted Ward Ring, and Ring 2 is left empty.
  await gear.drag(gear.cardButton("Restless Glacier"), gear.slot("leftRing"), {
    during: async () => {
      await expect(gear.slot("leftRing")).toHaveClass(/\bgear-drop-target\b/);
      await expect(gear.slot("leftRing")).toHaveClass(/\bgear-drop-eligible\b/);
      await expect(gear.slot("rightRing")).toHaveClass(/\bgear-drop-eligible\b/);
      await expect(gear.slot("helmet")).not.toHaveClass(/\bgear-drop-eligible\b/);
      await expect(gear.cardButton("Restless Glacier")).toHaveClass(/\bgear-drag-source\b/);
      await expect(page.locator(".gear-drag-ghost")).toContainText("Restless Glacier");
    },
  });
  await expect(gear.toast()).toHaveText("Restless Glacier equipped");
  await expect(gear.slot("leftRing")).toContainText("Restless Glacier");
  await expect(gear.slot("rightRing")).toHaveClass(/\bdisabled\b/);
  await expect(page.locator(".gear-drag-ghost")).toHaveCount(0);
  await expect(page.locator(".gear-drop-eligible")).toHaveCount(0);
  // The click that ends the drag does not also open the item.
  await expect(gear.itemDialog()).not.toBeVisible();
  const stored = await gear.stored();
  expect(stored.overrides.leftRing.sourceInventoryId).toBe("gear-game-log-rightRing");
  expect(stored.disabled).toContain("rightRing");
  await planner.expectNoErrors();
});

test("dragging an equipped slot onto the Inventory unequips it", async ({ page }) => {
  const { planner, gear } = await openGear(page);
  await gear.drag(gear.slot("helmet"), gear.inventory(), {
    during: async () => {
      await expect(gear.inventory()).toHaveClass(/\bgear-drop-target\b/);
      await expect(gear.slot("helmet")).toHaveClass(/\bgear-drag-source\b/);
    },
  });
  await expect(gear.toast()).toHaveText("Blind Vision unequipped");
  await expect(gear.slot("helmet")).toHaveClass(/\bdisabled\b/);
  await expect(gear.itemDialog()).not.toBeVisible();
  expect((await gear.stored()).disabled).toContain("helmet");
  await planner.expectNoErrors();
});

test("dragging an equipped weapon onto the other weapon slot moves it there", async ({ page }) => {
  const { planner, gear } = await openGear(page);
  await gear.drag(gear.slot("mainHand"), gear.slot("secondaryHand"));
  await expect(gear.toast()).toHaveText("Headless Cleric Wand equipped");
  await expect(gear.slot("mainHand")).toHaveClass(/\bdisabled\b/);
  const stored = await gear.stored();
  expect(stored.overrides.secondaryHand.sourceInventoryId).toBe("gear-game-log-mainHand");
  expect(stored.disabled).toContain("mainHand");
  await planner.expectNoErrors();
});

test("a drop on a slot the item does not fit returns it", async ({ page }) => {
  const { planner, gear } = await openGear(page);
  const before = await gear.stored();
  await gear.drag(gear.cardButton("Ice Pulse"), gear.slot("helmet"), {
    during: async () => {
      await expect(gear.slot("helmet")).not.toHaveClass(/\bgear-drop-target\b/);
      await expect(gear.slot("gloves")).toHaveClass(/\bgear-drop-eligible\b/);
    },
  });
  await expect(gear.toast()).toHaveText("Invalid drop · item returned to its original place");
  await expect(gear.slot("helmet")).toContainText("Blind Vision");
  await expect(gear.itemDialog()).not.toBeVisible();
  expect(await gear.stored()).toEqual(before);
  await planner.expectNoErrors();
});

test("hovering a slot and an Inventory card shows the item's tooltip", async ({ page }) => {
  const { planner, gear } = await openGear(page);
  // The planner ignores hovers for a moment after a scroll, and hover() scrolls the element into view first.
  await expect(async () => {
    await page.mouse.move(0, 0);
    await gear.slot("boots").hover();
    await expect(gear.tooltip()).toBeVisible({ timeout: 500 });
  }).toPass();
  await expect(gear.tooltip()).toContainText("Blade-dancer's Steps");
  await expect(async () => {
    await page.mouse.move(0, 0);
    await gear.cardButton("Old Grudge").hover();
    await expect(gear.tooltip()).toContainText("Old Grudge", { timeout: 500 });
  }).toPass();
  await planner.expectNoErrors();
});

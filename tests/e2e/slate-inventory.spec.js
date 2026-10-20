// The Slate Inventory (the slate board's Inventory button): the crafted slates with their state (on the grid, in the
// workspace beside it), affix count and god; Duplicate, Edit, Remove from grid and Delete; a right-click to place one on
// the grid; Craft Slate and the way back from the crafter; the tooltip. Written against the legacy dialog before its
// list moves to React, so both must pass it unchanged. Youga's build has three legendary slates, all on the grid.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { SlatesPage } from "./pages/slates-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const PEDIGREE = "game-log-slate-2";
const FALLEN = "game-log-slate-5";
test.use({ viewport: { width: 1440, height: 900 } });

async function openInventory(page, state = youga) {
  const planner = new PlannerPage(page);
  await planner.open(state);
  const slates = new SlatesPage(page);
  await slates.open();
  await slates.inventoryButton().click();
  await expect(slates.inventory()).toBeVisible();
  return { planner, slates };
}
const items = (slates) => slates.inventory().locator(".crafted-slate-item");
const item = (slates, name) => items(slates).filter({ hasText: name });

test("the inventory lists each slate with its state, affixes and god, and its tools", async ({ page }) => {
  const { planner, slates } = await openInventory(page);
  await expect(slates.inventory().locator("#slate-inventory-title")).toHaveText("Slate Inventory");
  await expect(items(slates).locator("strong")).toHaveText([
    "Pedigree of GodsEquipped",
    "A Corner of DivinityEquipped",
    "Fallen StarlightEquipped",
  ]);
  await expect(items(slates).locator("small")).toHaveText([
    "4 affixes · Goddess of Deception",
    "2 affixes · Goddess of Deception",
    "4 affixes · Goddess of Deception",
  ]);
  await expect(items(slates).first()).toHaveClass(/\bequipped\b/);
  await expect(items(slates).first().locator(".crafted-slate-icon img")).toHaveAttribute("src", /\S/);
  await expect(items(slates).first().locator(".crafted-slate-tools button")).toHaveText(["▢", "✎", "⊘", "×"]);
  for (const title of ["Duplicate", "Edit", "Remove from grid", "Delete"])
    await expect(items(slates).first().getByTitle(title, { exact: true })).toBeEnabled();
  await slates.inventory().getByRole("button", { name: "Close slate inventory" }).click();
  await expect(slates.inventory()).toBeHidden();
  await planner.expectNoErrors();
});

test("Remove from grid takes a slate off the grid; a right-click puts it back", async ({ page }) => {
  const { planner, slates } = await openInventory(page);
  await item(slates, "Fallen Starlight").getByTitle("Remove from grid", { exact: true }).click();
  await expect(slates.toast()).toHaveText("Slate removed from grid");
  await expect(item(slates, "Fallen Starlight").locator("strong")).toHaveText("Fallen Starlight");
  await expect(item(slates, "Fallen Starlight")).not.toHaveClass(/\bequipped\b/);
  await expect(item(slates, "Fallen Starlight").getByTitle("Remove from grid", { exact: true })).toBeDisabled();
  expect((await slates.stored()).equipped).not.toContain(FALLEN);

  await item(slates, "Fallen Starlight").click({ button: "right" });
  await expect(slates.toast()).toHaveText("Fallen Starlight placed on the grid");
  await expect(item(slates, "Fallen Starlight").locator("strong")).toHaveText("Fallen StarlightEquipped");
  expect((await slates.stored()).equipped).toContain(FALLEN);
  await page.keyboard.press("Escape");
  await expect(slates.piece(FALLEN)).toHaveCount(1);
  await planner.expectNoErrors();
});

test("Duplicate adds a copy off the grid; Delete removes a slate", async ({ page }) => {
  const { planner, slates } = await openInventory(page);
  await item(slates, "Pedigree of Gods").getByTitle("Duplicate", { exact: true }).click();
  await expect(slates.toast()).toHaveText("Slate duplicated");
  await expect(items(slates)).toHaveCount(4);
  const copy = items(slates).nth(3);
  await expect(copy.locator("strong")).toHaveText("Pedigree of Gods Copy");
  await expect(copy).not.toHaveClass(/\bequipped\b/);
  await expect(copy.getByTitle("Remove from grid", { exact: true })).toBeDisabled();
  let stored = await slates.stored();
  expect(stored.inventory.map((slate) => slate.name)).toContain("Pedigree of Gods Copy");

  await copy.getByTitle("Delete", { exact: true }).click();
  await expect(slates.toast()).toHaveText("Slate deleted");
  await expect(items(slates)).toHaveCount(3);
  await item(slates, "Pedigree of Gods").getByTitle("Delete", { exact: true }).click();
  await expect(items(slates)).toHaveCount(2);
  stored = await slates.stored();
  expect(stored.inventory.map((slate) => slate.id)).not.toContain(PEDIGREE);
  expect(stored.equipped).not.toContain(PEDIGREE);
  await page.keyboard.press("Escape");
  await expect(slates.piece(PEDIGREE)).toHaveCount(0);
  await planner.expectNoErrors();
});

test("an empty inventory says so; Craft Slate opens the crafter and Back to Inventory returns", async ({ page }) => {
  const state = structuredClone(youga);
  state.slates.inventory = [];
  state.equippedSlateIds = [];
  state.slates.placements = {};
  const { planner, slates } = await openInventory(page, state);
  await expect(slates.inventory().locator(".crafted-slate-empty")).toHaveText(
    "No crafted slates yetCraft a slate to add it to this build's inventory.",
  );
  await slates.inventory().getByRole("button", { name: "Craft Slate", exact: true }).click();
  await expect(slates.inventory().locator("[data-slate-inventory-tab]").first()).toHaveText("Craft Slate");
  await expect(slates.inventory().locator("#slate-inventory-title")).toHaveCount(0);
  await slates.inventory().getByRole("button", { name: "Back to Inventory", exact: true }).click();
  await expect(slates.inventory().locator("#slate-inventory-title")).toHaveText("Slate Inventory");
  await expect(slates.inventory().locator(".crafted-slate-empty")).toBeVisible();
  await planner.expectNoErrors();
});

test("Edit opens the crafter on the slate; Cancel returns to the inventory", async ({ page }) => {
  const { planner, slates } = await openInventory(page);
  await item(slates, "Fallen Starlight").getByTitle("Edit", { exact: true }).click();
  await expect(slates.inventory().locator("[data-slate-inventory-tab].active")).toHaveText("Craft Legendary Slate");
  await expect(slates.inventory()).toContainText("Fallen Starlight");
  await slates.inventory().getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(slates.inventory().locator("#slate-inventory-title")).toHaveText("Slate Inventory");
  await expect(items(slates)).toHaveCount(3);
  await planner.expectNoErrors();
});

test("hovering a slate in the inventory shows its affixes", async ({ page }) => {
  const { planner, slates } = await openInventory(page);
  await expect(async () => {
    await page.mouse.move(0, 0);
    await item(slates, "A Corner of Divinity").hover();
    await expect(slates.tooltip()).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(slates.tooltip()).toContainText("A Corner of Divinity");
  await planner.expectNoErrors();
});

// The planner tooltip's behaviour, whatever it shows: it follows the pointer (beside an Inventory card instead), a scroll
// hides it, an element's own hint shows under it, Alt shows a named affix's effect, the "?" help toggles from the
// keyboard, and a damage source's breakdown stays while the pointer moves into it. Written against the planner's own
// tooltip before it moved to React, so both must pass it unchanged.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { GearPage } from "./pages/gear-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
test.use({ viewport: { width: 1440, height: 900 } });

const tooltip = (page) => page.getByRole("tooltip");

async function openGear(page, state = youga) {
  const planner = new PlannerPage(page);
  await planner.open(state);
  await planner.showView("equipment");
  return { planner, gear: new GearPage(page) };
}
/** Hovers `target` until the tooltip shows (the planner ignores hovers for a moment after a scroll). */
async function hoverUntilShown(page, target) {
  await expect(async () => {
    await page.mouse.move(0, 0);
    await target.hover();
    await expect(tooltip(page)).toBeVisible({ timeout: 500 });
  }).toPass();
}

test("the tooltip follows the pointer, and a scroll hides it", async ({ page }) => {
  const { planner, gear } = await openGear(page);
  await hoverUntilShown(page, gear.slot("boots"));
  const slot = await gear.slot("boots").boundingBox();
  const x = slot.x + 10,
    y = slot.y + 10;
  await page.mouse.move(x, y);
  await expect.poll(async () => Math.round((await tooltip(page).boundingBox()).x)).toBe(Math.round(x + 18));
  await page.mouse.move(x + 30, y + 5);
  await expect.poll(async () => Math.round((await tooltip(page).boundingBox()).x)).toBe(Math.round(x + 48));
  await page.evaluate(() => document.dispatchEvent(new Event("scroll")));
  await expect(tooltip(page)).toBeHidden();
  await planner.expectNoErrors();
});

test("an Inventory card's tooltip sits beside the card", async ({ page }) => {
  const { planner, gear } = await openGear(page);
  await hoverUntilShown(page, gear.cardButton("Old Grudge"));
  await expect(tooltip(page)).toContainText("Old Grudge");
  const card = await gear.card("Old Grudge").boundingBox();
  await expect
    .poll(async () => {
      const box = await tooltip(page).boundingBox();
      return box.x + box.width <= card.x - 11 || box.x >= card.x + card.width + 11;
    })
    .toBe(true);
  await planner.expectNoErrors();
});

test("an element's own hint shows under its tooltip", async ({ page }) => {
  const { planner, gear } = await openGear(page);
  await expect(gear.slot("helmet")).toHaveAttribute("title", "Right-click to unequip");
  await hoverUntilShown(page, gear.slot("helmet"));
  await expect(tooltip(page)).toContainText("Right-click to unequip");
  await planner.expectNoErrors();
});

test("Alt shows a named affix's effect while held", async ({ page }) => {
  const state = structuredClone(youga);
  state.equipmentOverrides.chest.modifiers = [...state.equipmentOverrides.chest.modifiers, "Castling"];
  state.equipmentOverrides.chest.suffixModifiers = [...state.equipmentOverrides.chest.suffixModifiers, "Castling"];
  const { planner, gear } = await openGear(page, state);
  await hoverUntilShown(page, gear.slot("chest"));
  const effect = tooltip(page).locator(".keyword-roll-effect").first();
  await expect(tooltip(page).locator(".keyword-roll-name").first()).toHaveText("Castling");
  await expect(effect).toBeHidden();
  await page.keyboard.down("Alt");
  await expect(effect).toBeVisible();
  await page.keyboard.up("Alt");
  await expect(effect).toBeHidden();
  await planner.expectNoErrors();
});

test("a section's ? help shows on focus and toggles with Enter", async ({ page }) => {
  const { planner } = await openGear(page);
  const help = page
    .locator("#equipment-view")
    .getByRole("button", { name: /controls$/ })
    .first();
  await help.focus();
  await expect(tooltip(page)).toBeVisible();
  await expect(tooltip(page)).toContainText("Controls · Gear");
  await expect(tooltip(page)).toContainText("Right-click");
  await expect(tooltip(page)).toContainText("Ctrl + F: find text on the page");
  await page.keyboard.press("Enter");
  await expect(tooltip(page)).toBeHidden();
  await page.keyboard.press("Enter");
  await expect(tooltip(page)).toBeVisible();
  await planner.expectNoErrors();
});

test("a damage source's breakdown stays while the pointer moves into it", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  await planner.showView("character");
  await planner.statsPanelTab("damage-path").click();
  const source = page.locator("[data-damage-source]").first();
  await hoverUntilShown(page, source);
  const box = await tooltip(page).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 20, { steps: 4 });
  await page.waitForTimeout(400);
  await expect(tooltip(page)).toBeVisible();
  await page.mouse.move(1, 899);
  await expect(tooltip(page)).toBeHidden();
  await planner.expectNoErrors();
});

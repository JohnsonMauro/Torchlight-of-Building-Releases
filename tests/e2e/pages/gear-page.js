// The Gear section of the Build page (equipped slots, Inventory, Reset Gear, the craft buttons) and the dialogs it opens.
// Every selector the gear tests use lives here. Slots are found by their slot key (their accessible name starts with a
// CURSE OFF badge when the curse limit leaves the item out), Inventory cards by their item name, card tools by title
// (their text is a symbol).
import { expect } from "@playwright/test";

const LIBRARY_STORAGE_KEY = "tli-builder:build-library:v1";

export class GearPage {
  constructor(page) {
    this.page = page;
  }

  view() {
    return this.page.locator("#equipment-view");
  }
  equippedCount() {
    return this.page.locator("#equipment-count");
  }
  inventoryCount() {
    return this.page.locator("#inventory-count");
  }
  grid() {
    return this.page.locator("#equipment-grid");
  }
  slots() {
    return this.grid().getByRole("button");
  }
  /** An equipped slot by its key (helmet, chest, …, leftRing, rightRing, mainHand, secondaryHand). */
  slot(key) {
    return this.grid().locator(`[data-equipment-slot="${key}"]`);
  }
  inventory() {
    return this.page.locator("#equipment-inventory");
  }
  cards() {
    return this.inventory().getByRole("article");
  }
  /** An Inventory card by its item name. */
  card(name) {
    return this.cards().filter({ has: this.page.getByText(name, { exact: true }) });
  }
  /** The button of a card that opens the item (and starts a drag). */
  cardButton(name) {
    return this.card(name).locator(".inventory-item-main");
  }
  cardTool(name, title) {
    return this.card(name).getByTitle(title, { exact: true });
  }
  button(name) {
    return this.view().getByRole("button", { name, exact: true });
  }
  itemDialog() {
    return this.page.locator("#inventory-item-dialog");
  }
  itemDialogTitle() {
    return this.page.locator("#inventory-item-title");
  }
  crafter() {
    return this.page.locator("#equipment-crafter");
  }
  crafterTitle() {
    return this.page.locator("#equipment-crafter-title");
  }
  tooltip() {
    return this.page.getByRole("tooltip");
  }
  toast() {
    return this.page.locator("#toast");
  }

  /** Gear is a section of the Build page (talents, skills, equipment and pacts on one page). */
  async open() {
    await this.page.locator('button.view-tab[data-view="equipment"]').click();
    await expect(this.view()).toBeVisible();
    await this.view().scrollIntoViewIfNeeded();
  }
  /**
   * Drags with the mouse from one element to another, in steps (the planner starts a drag after 5 px). The source is
   * scrolled into view first (Inventory scrolls on its own); both ends must then be on screen, since mouse moves do not
   * scroll.
   */
  async drag(from, to, { during } = {}) {
    await from.scrollIntoViewIfNeeded();
    const start = await from.boundingBox();
    const end = await to.boundingBox();
    const viewport = this.page.viewportSize();
    for (const box of [start, end]) expect(box.y + box.height / 2).toBeLessThan(viewport.height);
    await this.page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(start.x + start.width / 2 + 20, start.y + start.height / 2, { steps: 4 });
    await this.page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 8 });
    await during?.();
    await this.page.mouse.up();
  }
  /** The open build's stored gear (null while the default library has not been saved yet). */
  async stored() {
    return this.page.evaluate((key) => {
      const library = JSON.parse(localStorage.getItem(key));
      if (!library) return null;
      const build = library.builds.find((entry) => entry.id === library.activeBuildId) || library.builds[0];
      const { disabledEquipmentSlots, equipmentOverrides, equipmentInventory } = build.state;
      return { disabled: disabledEquipmentSlots, overrides: equipmentOverrides, inventory: equipmentInventory };
    }, LIBRARY_STORAGE_KEY);
  }
}

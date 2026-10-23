// The Divinity Slates board of the Build page (shown in place of the talent tree by the talent column's Slates button)
// and the dialogs it opens. Every selector the slates tests use lives here. Pieces are found by their slate id (two
// pieces can share a name), tools by their title (their text is a symbol).
import { expect } from "@playwright/test";
import { openView } from "./planner-page.js";

const LIBRARY_STORAGE_KEY = "tli-builder:build-library:v1";

export class SlatesPage {
  constructor(page) {
    this.page = page;
  }

  slatesButton() {
    return this.page.locator("#talents-view").getByRole("button", { name: /Slates$/ });
  }
  board() {
    return this.page.locator("#slate-board");
  }
  grid() {
    return this.board().locator(".divinity-board");
  }
  cells() {
    return this.board().getByRole("button", { name: /^Board cell / });
  }
  /** The cells the character's level has not opened (a lock and the level, no button). */
  lockedCells() {
    return this.board().getByRole("img", { name: /^Board cell \d, \d: opens at character level \d+$/ });
  }
  cell(column, row) {
    return this.board().getByRole("button", { name: `Board cell ${column}, ${row}`, exact: true });
  }
  pieces() {
    return this.board().locator(".slate-piece");
  }
  piece(id) {
    return this.board().locator(`.slate-piece[data-slate-id="${id}"]`);
  }
  /** A piece's first tile: the part of the piece that is surely under the pointer (pieces overlap their neighbours). */
  tile(id) {
    return this.piece(id).locator(":scope > i").first();
  }
  tool(title) {
    return this.board().locator(".slate-quick-tools").getByTitle(title, { exact: true });
  }
  tools() {
    return this.board().locator(".slate-quick-tools button");
  }
  inventoryButton() {
    return this.board().getByRole("button", { name: "Inventory", exact: true });
  }
  talentTree() {
    return this.page.locator("#talents-view .talent-tree-panel");
  }
  inventory() {
    return this.page.locator("#slate-inventory");
  }
  tooltip() {
    return this.page.getByRole("tooltip");
  }
  toast() {
    return this.page.locator("#toast");
  }

  async open() {
    await openView(this.page, "talents");
    await this.slatesButton().click();
    await expect(this.board()).toBeVisible();
  }
  /** Drags a piece by its first tile by (dx, dy) pixels, in steps; `rightClick` presses the right button mid-drag. */
  async drag(id, dx, dy, { rightClick = false } = {}) {
    const box = await this.tile(id).boundingBox();
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + 10, y, { steps: 3 });
    if (rightClick) {
      await this.page.mouse.down({ button: "right" });
      await this.page.mouse.up({ button: "right" });
    }
    await this.page.mouse.move(x + dx, y + dy, { steps: 8 });
    await this.page.mouse.up();
  }
  /** The open build's stored slate layout. */
  async stored() {
    return this.page.evaluate((key) => {
      const library = JSON.parse(localStorage.getItem(key));
      if (!library) return null;
      const build = library.builds.find((entry) => entry.id === library.activeBuildId) || library.builds[0];
      return {
        equipped: build.state.equippedSlateIds,
        placements: build.state.slates.placements,
        parked: build.state.slates.parked,
        inventory: build.state.slates.inventory,
      };
    }, LIBRARY_STORAGE_KEY);
  }
}

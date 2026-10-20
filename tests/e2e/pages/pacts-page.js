// The Pactspirits view ("Pacts" tab) and the dialogs it opens. Every selector the pacts tests use lives here. Controls are
// found by role and accessible name where they have one; tree nodes by the start of their accessible name.
import { expect } from "@playwright/test";

const LIBRARY_STORAGE_KEY = "tli-builder:build-library:v1";
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class PactsPage {
  constructor(page) {
    this.page = page;
  }

  view() {
    return this.page.locator("#pacts-view");
  }
  count() {
    return this.page.locator("#pactspirit-count");
  }
  slots() {
    return this.view().locator("article.pact-slot");
  }
  /** The slot whose main button starts with `name` (a Pactspirit, or "Select Pactspirit N" for an empty slot). */
  slot(name) {
    return this.slots().filter({
      has: this.page.getByRole("button", { name: new RegExp(`^${escapeRegExp(name)}\\b`) }),
    });
  }
  slotButton(name) {
    return this.view().getByRole("button", { name: new RegExp(`^${escapeRegExp(name)}\\b`) });
  }
  removeButton(name) {
    return this.view().getByRole("button", { name: `Remove ${name}`, exact: true });
  }
  level(name) {
    return this.slot(name).getByRole("combobox", { name: "Level", exact: true });
  }
  allocatedCount(name) {
    return this.slot(name).locator(".pact-node-count");
  }
  /** The `index`-th node of a Pactspirit's tree whose accessible name starts with `nodeName:`. */
  node(spirit, nodeName, index = 0) {
    return this.slot(spirit).locator(`.pact-tree-node[aria-label^="${nodeName}:"]`).nth(index);
  }
  kismetSummary() {
    return this.page.locator("#pact-kismet-summary");
  }
  tooltip() {
    return this.page.locator("#planner-tooltip");
  }
  pactspiritSelector() {
    return this.page.locator("#pactspirit-selector");
  }
  pactspiritChoice(name) {
    return this.pactspiritSelector().getByRole("button", { name: new RegExp(`^${escapeRegExp(name)}\\b`) });
  }
  kismetCrafter() {
    return this.page.locator("#kismet-crafter");
  }
  fateSlotSelector() {
    return this.page.locator("#fate-slot-selector");
  }
  toast() {
    return this.page.locator("#toast");
  }

  /** Pacts is a section of the Build page (talents, skills, equipment and pacts on one page). */
  async open() {
    await this.page.locator('button.view-tab[data-view="talents"]').click();
    await expect(this.view()).toBeVisible();
    await this.view().scrollIntoViewIfNeeded();
  }
  /** Drags with the mouse from one element to another, in steps (the planner starts a drag after 5 px). */
  async drag(from, to, { copy = false } = {}) {
    const start = await from.boundingBox();
    const end = await to.boundingBox();
    await this.page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(start.x + start.width / 2 + 20, start.y + start.height / 2, { steps: 4 });
    await this.page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 8 });
    if (copy) {
      await this.page.mouse.down({ button: "right" });
      await this.page.mouse.up({ button: "right" });
    }
    await this.page.mouse.up();
  }
  /** The open build's stored pact settings. */
  async storedPacts() {
    return this.page.evaluate((key) => {
      const library = JSON.parse(localStorage.getItem(key));
      const build = library.builds.find((entry) => entry.id === library.activeBuildId) || library.builds[0];
      return build.state.pacts;
    }, LIBRARY_STORAGE_KEY);
  }
}

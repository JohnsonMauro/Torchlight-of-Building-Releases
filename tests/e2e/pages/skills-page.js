// The Skills section of the Build page (skill board, Skills/Auras tabs, Energy, aura reservation) and the skill selector it
// opens. Every selector the skills tests use lives here; sockets are found by role and accessible name, rows by the
// socket they hold.
import { expect } from "@playwright/test";

const LIBRARY_STORAGE_KEY = "tli-builder:build-library:v1";

export class SkillsPage {
  constructor(page) {
    this.page = page;
  }

  view() {
    return this.page.locator("#skills-view");
  }
  setupCount() {
    return this.page.locator("#skill-setup-count");
  }
  energyTotal() {
    return this.page.locator("#energy-total");
  }
  tab(name) {
    return this.view().locator(".compendium-tabs").getByRole("button", { name, exact: true });
  }
  rows() {
    return this.view().getByRole("article");
  }
  /** A board socket by its accessible name ("Replace Aim", "Select Active 5", "Add support 5 to Aim"). */
  socket(name) {
    return this.view().getByRole("button", { name, exact: true });
  }
  /** The row of a skill (the row whose skill socket is "Replace <skill>"). */
  row(skill) {
    return this.rows().filter({ has: this.page.getByRole("button", { name: `Replace ${skill}`, exact: true }) });
  }
  /** A support socket on a skill's row. */
  support(skill, name) {
    return this.row(skill).getByRole("button", { name, exact: true });
  }
  reservationSummary() {
    return this.page.locator("#aura-reservation-summary");
  }
  resetButton() {
    return this.view().getByRole("button", { name: "Reset Skills", exact: true });
  }
  selector() {
    return this.page.locator("#skill-selector");
  }
  selectorTitle() {
    return this.page.locator("#skill-selector-title");
  }
  selectorSearch() {
    return this.selector().getByRole("searchbox");
  }
  selectorResults() {
    return this.page.locator("#skill-selector-results").getByRole("button");
  }
  selectorConfirm() {
    return this.selector().getByRole("button", { name: "Confirm", exact: true });
  }
  tooltip() {
    return this.page.locator("#planner-tooltip");
  }
  toast() {
    return this.page.locator("#toast");
  }

  /** Skills is a section of the Build page (talents, skills, equipment and pacts on one page). */
  async open() {
    await this.page.locator('button.view-tab[data-view="skills"]').click();
    await expect(this.view()).toBeVisible();
    await this.view().scrollIntoViewIfNeeded();
  }
  /** Drags with the mouse from one element to another, in steps (the planner starts a drag after 5 px). */
  async drag(from, to, { copy = false } = {}) {
    await from.scrollIntoViewIfNeeded();
    const start = await from.boundingBox();
    await this.page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(start.x + start.width / 2 + 20, start.y + start.height / 2, { steps: 4 });
    // The target may sit below the window: scroll to it mid-drag, as a user would.
    await to.scrollIntoViewIfNeeded();
    const end = await to.boundingBox();
    await this.page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 8 });
    if (copy) {
      await this.page.mouse.down({ button: "right" });
      await this.page.mouse.up({ button: "right" });
    }
    await this.page.mouse.up();
  }
  /** The open build's stored skill settings (null while the default library has not been saved yet). */
  async stored() {
    return this.page.evaluate((key) => {
      const library = JSON.parse(localStorage.getItem(key));
      if (!library) return null;
      const build = library.builds.find((entry) => entry.id === library.activeBuildId) || library.builds[0];
      return build.state.skills;
    }, LIBRARY_STORAGE_KEY);
  }
}

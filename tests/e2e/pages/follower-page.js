// The Follower tab of the hero panel (Build page) and the dialogs it opens. Every selector the follower tests use lives
// here; controls are found by role and accessible name.
import { expect } from "@playwright/test";

const LIBRARY_STORAGE_KEY = "tli-builder:build-library:v1";

export class FollowerPage {
  constructor(page) {
    this.page = page;
  }

  tab() {
    return this.page.locator('[role="tab"][data-hero-panel-tab="follower"]');
  }
  panel() {
    return this.page.locator("#follower-panel");
  }
  name() {
    return this.panel().locator("#selected-follower-name");
  }
  rarity() {
    return this.panel().locator("#selected-follower-rarity");
  }
  portrait() {
    return this.panel().locator(".follower-portrait");
  }
  specialEffect(name) {
    return this.panel().getByLabel(`Special effect: ${name}`, { exact: true });
  }
  /** A button by the end of its name ("↻ Change Follower": the icon is CSS ::before content, part of the name). */
  button(name) {
    return this.panel().getByRole("button", { name: new RegExp(`${name}$`) });
  }
  /** A skill slot button, by the start of its accessible name. */
  slot(start) {
    return this.panel().getByRole("button", { name: new RegExp(`^${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) });
  }
  slots() {
    return this.panel().locator(".follower-skill-slot");
  }
  selector() {
    return this.page.locator("#follower-selector");
  }
  selectorChoice(start) {
    return this.selector().getByRole("button", { name: new RegExp(`^${start}`) });
  }
  skillSelector() {
    return this.page.locator("#skill-selector");
  }
  tooltip() {
    return this.page.locator("#planner-tooltip");
  }
  toast() {
    return this.page.locator("#toast");
  }

  async open() {
    await this.page.locator('button.view-tab[data-view="talents"]').click();
    await this.tab().click();
    await expect(this.panel()).toBeVisible();
  }
  /** The open build's stored follower. */
  async stored() {
    return this.page.evaluate((key) => {
      const library = JSON.parse(localStorage.getItem(key));
      const build = library.builds.find((entry) => entry.id === library.activeBuildId) || library.builds[0];
      return build.state.followers;
    }, LIBRARY_STORAGE_KEY);
  }
}

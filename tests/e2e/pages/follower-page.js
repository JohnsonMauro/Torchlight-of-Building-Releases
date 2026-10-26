// The Follower tab of the hero panel (Build page) and the dialogs it opens. Every selector the follower tests use lives
// here; controls are found by role and accessible name.
import { expect } from "@playwright/test";
import { openView } from "./planner-page.js";

const LIBRARY_STORAGE_KEY = "tli-builder:build-library:v1";

export class FollowerPage {
  constructor(page) {
    this.page = page;
  }

  panel() {
    return this.page.locator("#follower-panel");
  }
  name() {
    return this.panel().locator("#selected-follower-name");
  }
  portrait() {
    return this.panel().locator(".follower-portrait");
  }
  specialEffect(name) {
    return this.panel().getByLabel(`Special effect: ${name}`, { exact: true });
  }
  /** A button by the end of its name (Change Follower is the portrait's button, Choose Follower the empty panel's). */
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
  /** A character on the selector's opening screen ("Lion Queen 4 ranks · 3 ULT"). */
  selectorCharacter(name) {
    return this.selector().getByRole("button", { name: new RegExp(`^${name} \\d+ ranks?`) });
  }
  selectorCharacters() {
    return this.selector().locator(".follower-character-card");
  }
  /** The selector's way back from a character's followers. */
  selectorPath() {
    return this.selector().getByRole("navigation", { name: "Follower selector path" });
  }
  skillSelector() {
    return this.page.locator("#skill-selector");
  }
  tooltip() {
    return this.page.getByRole("tooltip");
  }
  toast() {
    return this.page.locator("#toast");
  }
  /** The "!" beside the Follower tab's "?" (a game-log build without its follower). */
  notice() {
    return this.page.locator("#follower-view").getByRole("button", { name: "Follower notice", exact: true });
  }
  /** Marks the open build as made by Import from game, as the import stores it, and reloads into the build. */
  async markImportedFromLog(planner) {
    await this.page.evaluate((key) => {
      const library = JSON.parse(localStorage.getItem(key));
      library.builds.find((entry) => entry.id === library.activeBuildId).origin = "game-log";
      localStorage.setItem(key, JSON.stringify(library));
    }, LIBRARY_STORAGE_KEY);
    await this.page.reload();
    await planner.enterBuild();
    await this.open();
  }

  async open() {
    await openView(this.page, "follower");
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

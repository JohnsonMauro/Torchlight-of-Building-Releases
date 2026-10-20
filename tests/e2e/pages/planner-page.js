// The planner page as the smoke tests drive it. Every selector the e2e tests use lives here.
import { expect } from "@playwright/test";

const LIBRARY_STORAGE_KEY = "tli-builder:build-library:v1";
export const VIEWS = ["talents", "character", "configuration", "builds"];

export class PlannerPage {
  constructor(page) {
    this.page = page;
    this.errors = [];
    page.on("pageerror", (error) => this.errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error") this.errors.push(`console: ${message.text()}`); });
  }

  /** Opens the planner with a one-build library holding `state` (or the app's own default library when null). */
  async open(state = null) {
    if (state) {
      const library = {
        schemaVersion: 1,
        activeBuildId: "e2e-build",
        compareBuildId: null,
        builds: [{ id: "e2e-build", name: "E2E build", notes: "", createdAt: "2026-10-19T00:00:00.000Z", updatedAt: "2026-10-19T00:00:00.000Z", state, revisions: [], shareHistory: [] }]
      };
      await this.page.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, [LIBRARY_STORAGE_KEY, JSON.stringify(library)]);
    }
    await this.page.goto("./");
    await expect(this.view("talents")).toBeVisible();
  }

  view(name) { return this.page.locator(`#${name}-view`); }
  selectedHeroTrait() { return this.page.locator("#selected-hero-trait"); }
  viewTab(name) { return this.page.locator(`button.view-tab[data-view="${name}"]`); }
  statsPanelTab(name) { return this.page.locator(`[role="tab"][data-stats-panel="${name}"]`); }
  heroPanelTab(name) { return this.page.locator(`[role="tab"][data-hero-panel-tab="${name}"]`); }

  async showView(name) {
    await this.viewTab(name).click();
    await expect(this.view(name)).toBeVisible();
  }

  async expectNoErrors() {
    expect(this.errors, this.errors.join("\n")).toEqual([]);
  }
}

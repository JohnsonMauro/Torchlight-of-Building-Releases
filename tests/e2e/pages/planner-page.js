// The planner page as the smoke tests drive it. Every selector the e2e tests use lives here.
import { expect } from "@playwright/test";

const LIBRARY_STORAGE_KEY = "tli-builder:build-library:v1";
// apps/web/src/boot.tsx sets this session key before loading the planner and removes it once the first render has painted.
const BOOT_FLAG_KEY = "tli-builder:booting";
export const VIEWS = [
  "hero",
  "follower",
  "skills",
  "equipment",
  "pacts",
  "talents",
  "character",
  "configuration",
  "builds",
];

export class PlannerPage {
  constructor(page) {
    this.page = page;
    this.errors = [];
    page.on("pageerror", (error) => this.errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") this.errors.push(`console: ${message.text()}`);
    });
  }

  /**
   * Opens the planner with a one-build library holding `state` (or the app's own default library when null) and waits
   * until the planner has finished booting: the views are in the static HTML, so they are visible before any listener
   * exists, and a click that early is lost.
   */
  async open(state = null) {
    await this.load(state);
    await expect(this.view("hero")).toBeVisible();
  }

  /** Loads the planner as open() does, without expecting the Build view (a library that cannot be read opens Builds). */
  async load(state = null) {
    await this.page.addInitScript((key) => {
      const remove = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function (name) {
        if (this === sessionStorage && name === key) window.__plannerReady = true;
        return remove.call(this, name);
      };
    }, BOOT_FLAG_KEY);
    if (state) {
      const library = {
        schemaVersion: 1,
        activeBuildId: "e2e-build",
        compareBuildId: null,
        builds: [
          {
            id: "e2e-build",
            name: "E2E build",
            notes: "",
            createdAt: "2026-10-19T00:00:00.000Z",
            updatedAt: "2026-10-19T00:00:00.000Z",
            state,
            revisions: [],
            shareHistory: [],
          },
        ],
      };
      await this.page.addInitScript(
        ([key, value]) => {
          if (!localStorage.getItem(key)) localStorage.setItem(key, value);
        },
        [LIBRARY_STORAGE_KEY, JSON.stringify(library)],
      );
    }
    await this.page.goto("./");
    await this.waitUntilReady();
  }

  /** Waits for the boot flag to clear on the current load (the init script above runs again on every reload). */
  async waitUntilReady() {
    await this.page.waitForFunction(() => window.__plannerReady === true, null, { timeout: 15_000 });
  }

  view(name) {
    return this.page.locator(`#${name}-view`);
  }
  selectedHeroTrait() {
    return this.page.locator("#selected-hero-trait");
  }
  /** A view's tab: the rail's or the build strip's ("hero" has both, the rail's Build and Hero Trait; the first is taken). */
  viewTab(name) {
    return this.page.locator(`button.view-tab[data-view="${name}"]`).first();
  }
  statsPanelTab(name) {
    return this.page.locator(`[role="tab"][data-stats-panel="${name}"]`);
  }

  async showView(name) {
    await this.viewTab(name).click();
    await expect(this.view(name)).toBeVisible();
  }

  async expectNoErrors() {
    expect(this.errors, this.errors.join("\n")).toEqual([]);
  }
}

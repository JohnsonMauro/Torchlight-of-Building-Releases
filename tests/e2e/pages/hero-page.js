// The hero: the character column (portrait, name, trait), the Hero Trait tab (its trait tabs, the trait tiers with their
// memory sockets, a tree hero's Trait Path, Sage's Scent Bottle, Carino's and Rosa's support slots), Change Hero in the
// open build's details (Builds view) and the dialogs they open.
// Every selector the hero tests use lives here; traits and sockets are found by role and accessible name.
import { expect } from "@playwright/test";

const LIBRARY_STORAGE_KEY = "tli-builder:build-library:v1";

export class HeroPage {
  constructor(page) {
    this.page = page;
  }

  panel() {
    return this.page.locator("#hero-panel-hero");
  }
  heroName() {
    return this.page.locator("#selected-hero-name");
  }
  heroTrait() {
    return this.page.locator("#selected-hero-trait");
  }
  portrait() {
    return this.page.locator("#selected-hero-portrait");
  }
  changeHero() {
    return this.page.locator("#build-editor").getByRole("button", { name: "Change Hero", exact: true });
  }
  /** Opens the hero selector from the open build's details (the Builds view stays open under it). */
  async openHeroSelector() {
    await this.page.locator('button.view-tab[data-view="builds"]').click();
    await this.changeHero().click();
    await expect(this.heroSelector()).toBeVisible();
  }
  detailTabs() {
    return this.page.locator("#hero-detail-tabs");
  }
  detailTab(name) {
    return this.detailTabs().getByRole("button", { name, exact: true });
  }
  tree() {
    return this.page.locator("#hero-trait-tree");
  }
  /** A trait, memory socket or slot of the tree by its accessible name. */
  button(name) {
    return this.tree().getByRole("button", { name, exact: true });
  }
  /** A Trait Path node by its trait name (its art carries the name). */
  pathNode(name) {
    return this.tree()
      .locator(".selena-dance-node")
      .filter({ has: this.page.getByRole("img", { name, exact: true }) });
  }
  pathCount() {
    return this.tree().locator(".selena-dance-tree header strong");
  }
  /** A trait tier row of a tree hero ("0" = Lv45, "1" = Lv60, "2" = Lv75). */
  treeRow(row) {
    return this.tree().locator(`[data-selena-dance-row="${row}"]`);
  }
  heroSelector() {
    return this.page.locator("#hero-selector");
  }
  memorySelector() {
    return this.page.locator("#hero-memory-selector");
  }
  scentSelector() {
    return this.page.locator("#sage-scent-selector");
  }
  ammoSelector() {
    return this.page.locator("#carino-ammo-selector");
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

  /** Switches the open build to a hero, then returns to the Hero Trait tab. */
  async selectHero(id) {
    await this.openHeroSelector();
    await this.heroSelector().locator(`[data-select-hero="${id}"]`).click();
    await expect(this.heroSelector()).not.toBeVisible();
    await this.page.locator('button.view-tab[data-view="hero"]').first().click();
    await expect(this.panel()).toBeVisible();
  }
  /** Drags with the mouse from one element to another, in steps (the planner starts a drag after 5 px). */
  async drag(from, to) {
    await from.scrollIntoViewIfNeeded();
    const start = await from.boundingBox();
    const end = await to.boundingBox();
    await this.page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(start.x + start.width / 2 + 20, start.y + start.height / 2, { steps: 4 });
    await this.page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 8 });
    await this.page.mouse.up();
  }
  /** The open build's stored hero settings. */
  async stored() {
    return this.page.evaluate((key) => {
      const library = JSON.parse(localStorage.getItem(key));
      if (!library) return null;
      const build = library.builds.find((entry) => entry.id === library.activeBuildId) || library.builds[0];
      return build.state.hero;
    }, LIBRARY_STORAGE_KEY);
  }
}

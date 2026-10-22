// The talent trees of the Build page (tree tabs, the open tree's bar: core talents, points and actions; nodes, the
// installed prism) and the dialogs they open. Every selector the talents tests use lives here. Nodes are found by their
// accessible name ("Unallocated micro talent, rank 0 of 3"), which carries rank and reason, or by their coordinate.
import { expect } from "@playwright/test";
import { openView } from "./planner-page.js";

const LIBRARY_STORAGE_KEY = "tli-builder:build-library:v1";

export class TalentsPage {
  constructor(page) {
    this.page = page;
  }

  view() {
    return this.page.locator("#talents-view");
  }
  tabs() {
    return this.page.locator("#talent-board-tabs");
  }
  /** A tree tab by its slot label ("God tree", "Class tree", "Tree 3", "Tree 4"). */
  tab(label) {
    return this.tabs()
      .locator(".talent-tree-slot")
      .filter({ has: this.page.locator("small", { hasText: new RegExp(`^${label}$`) }) });
  }
  slatesTab() {
    return this.tabs().getByRole("button", { name: /Slates$/ });
  }
  /** "Total points" under the tree tabs ("109 / 115"). */
  totalPoints() {
    return this.tabs().locator(".talent-slot-total strong");
  }
  /** The open tree's points ("30 Talent Points spent in current panel"). */
  panelPoints() {
    return this.page.locator("#talent-panel-points");
  }
  action(name) {
    return this.view().getByRole("group", { name: "Talent tree actions" }).getByRole("button", { name, exact: true });
  }
  stage() {
    return this.page.locator("#talent-stage");
  }
  treePanel() {
    return this.view().locator(".talent-tree-panel");
  }
  /** The talent node at a coordinate ("1,1"); the installed prism sits on its node as a second button. */
  node(coordinate) {
    return this.stage().locator(`.talent-node:not(.installed-prism-node)[data-coordinate="${coordinate}"]`);
  }
  prismNode() {
    return this.stage().locator(".installed-prism-node");
  }
  cores() {
    return this.page.locator("#core-talents > *");
  }
  /** A core slot by its points; its accessible name says what it holds ("24 point core: Off The Beaten Track"). */
  core(threshold) {
    return this.page.locator(`#core-talents [data-core-slot="${threshold}"]`);
  }
  /** The installed prism's own effect among the cores ("Separate prism effect: Haze"). */
  prismCore() {
    return this.page.locator("#core-talents .prism");
  }
  placementPrompt() {
    return this.page.locator("#prism-placement-prompt");
  }
  treePicker() {
    return this.page.locator("#talent-panel-picker");
  }
  treePickerTitle() {
    return this.page.locator("#talent-picker-title");
  }
  /** The tree picker's god columns, by the god's name. */
  treePickerGods() {
    return this.treePicker().locator(".talent-picker-god");
  }
  treePickerTrees() {
    return this.treePicker().locator(".talent-picker-card");
  }
  /** A tree in the picker; its accessible name starts with the tree's name, then its kind and points. */
  treePickerTree(name) {
    return this.treePicker().getByRole("button", { name: new RegExp(`^${name},`) });
  }
  corePicker() {
    return this.page.locator("#core-talent-picker");
  }
  prismInventory() {
    return this.page.locator("#prism-inventory-dialog");
  }
  tooltip() {
    return this.page.getByRole("tooltip");
  }
  toast() {
    return this.page.locator("#toast");
  }

  /** The Talent tab in the build strip: the talent trees alone. */
  async open() {
    await openView(this.page, "talents");
    await expect(this.tabs()).toBeVisible();
  }
  async openTree(label) {
    await this.tab(label).click();
    await expect(this.tab(label)).toHaveClass(/\bactive\b/);
  }
  /** Drags with the mouse from one element to another, in steps (the planner starts a drag after 5 px). */
  async drag(from, to) {
    await from.scrollIntoViewIfNeeded();
    const start = await from.boundingBox();
    const end = typeof to.boundingBox === "function" ? await to.boundingBox() : to;
    await this.page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(start.x + start.width / 2 + 20, start.y + start.height / 2, { steps: 4 });
    await this.page.mouse.move(end.x + (end.width ?? 0) / 2, end.y + (end.height ?? 0) / 2, { steps: 8 });
    await this.page.mouse.up();
  }
  /** The open build's stored talents (ranks by "<tree>:<coordinate>", trees, cores, prisms). */
  async stored() {
    return this.page.evaluate((key) => {
      const library = JSON.parse(localStorage.getItem(key));
      if (!library) return null;
      const build = library.builds.find((entry) => entry.id === library.activeBuildId) || library.builds[0];
      return { ranks: build.state.talentRanks, ...build.state.talents };
    }, LIBRARY_STORAGE_KEY);
  }
}

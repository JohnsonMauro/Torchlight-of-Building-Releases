// The Workspace (the Builds view, the home page) and its confirm dialogs. Every selector the builds tests use lives here.
// Buttons are found by role and accessible name, as a user finds them, not by the data-* hooks of one implementation.
import { expect } from "@playwright/test";
import { openView } from "./planner-page.js";

export class BuildsPage {
  constructor(page) {
    this.page = page;
  }

  view() {
    return this.page.locator("#builds-view");
  }
  count() {
    return this.page.locator("#build-count");
  }
  cards() {
    return this.page.locator("#build-list .build-list-card");
  }
  card(name) {
    return this.cards().filter({ has: this.page.getByText(name, { exact: true }) });
  }
  activeCard() {
    return this.page.locator("#build-list .build-list-card.active");
  }
  emptyState() {
    return this.page.locator("#build-list .build-empty-state");
  }
  button(name) {
    return this.view().getByRole("button", { name, exact: true });
  }
  newBuildButton() {
    return this.button("New Build");
  }
  emptyStateNewBuildButton() {
    return this.emptyState().getByRole("button", { name: "+ New Build", exact: true });
  }
  duplicateButton() {
    return this.button("Duplicate current");
  }
  backupButton() {
    return this.button("Back up all builds");
  }
  deleteAllButton() {
    return this.button("Delete all builds");
  }
  editor() {
    return this.page.locator("#build-editor");
  }
  nameInput() {
    return this.editor().getByRole("textbox", { name: "Build name", exact: true });
  }
  notesInput() {
    return this.editor().getByRole("textbox", { name: "Notes", exact: true });
  }
  saveDetailsButton() {
    return this.editor().getByRole("button", { name: "Save details", exact: true });
  }
  editorSummaryName() {
    return this.page.locator("#build-editor .build-active-summary strong");
  }
  deleteDialog() {
    return this.page.locator("#delete-build-confirm");
  }
  deleteDialogMessage() {
    return this.page.locator("#delete-build-message");
  }
  deleteAllDialog() {
    return this.page.locator("#delete-all-builds-confirm");
  }
  toast() {
    return this.page.locator("#toast");
  }
  loadoutTabName() {
    return this.page.locator(".loadout-tab strong");
  }

  async open() {
    await openView(this.page, "builds");
    await expect(this.view()).toBeVisible();
  }
  /** Opens a build from its card (the build's pages, on the page a build was last left on). */
  async openCard(name) {
    await this.card(name)
      .getByRole("button", { name: `Open ${name}`, exact: true })
      .click();
  }
  async deleteCard(name) {
    await this.card(name)
      .getByRole("button", { name: `Delete ${name}`, exact: true })
      .click();
  }
  async confirmDelete() {
    await this.deleteDialog().getByRole("button", { name: "Delete Build", exact: true }).click();
  }
  async cancelDelete() {
    await this.deleteDialog().getByRole("button", { name: "Keep Build", exact: true }).click();
  }
  async confirmDeleteAll() {
    await this.deleteAllDialog().getByRole("button", { name: "Delete All Builds", exact: true }).click();
  }
  async expectToast(text) {
    await expect(this.toast()).toHaveText(text);
  }
}

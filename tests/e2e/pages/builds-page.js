// The Builds view (the "Notes" tab) and its confirm dialogs. Every selector the builds tests use lives here.
import { expect } from "@playwright/test";

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
  newBuildButton() {
    return this.view().locator(".builds-page-header [data-new-build]");
  }
  duplicateButton() {
    return this.page.locator("[data-duplicate-build]");
  }
  backupButton() {
    return this.page.locator("[data-backup-builds]");
  }
  deleteAllButton() {
    return this.page.locator("[data-delete-all-builds]");
  }
  nameInput() {
    return this.page.locator("#build-editor input[data-build-name]");
  }
  notesInput() {
    return this.page.locator("#build-editor textarea[data-build-notes]");
  }
  saveDetailsButton() {
    return this.page.locator("#build-editor [data-save-build-meta]");
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
    await this.page.locator('button.view-tab[data-view="builds"]').click();
    await expect(this.view()).toBeVisible();
  }
  async openCard(name) {
    await this.card(name).locator("[data-activate-build]").click();
  }
  async editCard(name) {
    await this.card(name).locator("[data-edit-build]").click();
  }
  async deleteCard(name) {
    await this.card(name).locator("[data-delete-build]").click();
  }
  async confirmDelete() {
    await this.deleteDialog().locator("[data-confirm-delete-build]").click();
  }
  async cancelDelete() {
    await this.deleteDialog().locator("[data-cancel-delete-build]").click();
  }
  async confirmDeleteAll() {
    await this.deleteAllDialog().locator("[data-confirm-delete-all-builds]").click();
  }
  async expectToast(text) {
    await expect(this.toast()).toHaveText(text);
  }
}

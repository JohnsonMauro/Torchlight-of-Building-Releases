// The Configuration view ("Config" tab). Every selector the configuration tests use lives here. Controls are found by
// role and accessible name, as a user finds them, not by the data-* hooks of one implementation.
import { expect } from "@playwright/test";

const LIBRARY_STORAGE_KEY = "tli-builder:build-library:v1";

export class ConfigurationPage {
  constructor(page) {
    this.page = page;
  }

  view() {
    return this.page.locator("#configuration-view");
  }
  card() {
    return this.view().getByRole("region", { name: "Configuration", exact: true });
  }
  modeLabel() {
    return this.card().locator("h2 small");
  }
  /** A section by its exact title (sections nest: Manual conditions sits inside Scenario). */
  section(title) {
    return this.card()
      .locator("details > summary .stat-section-title")
      .getByText(title, { exact: true })
      .locator("xpath=ancestor::details[1]");
  }
  sectionSummary(title) {
    return this.section(title).locator(":scope > summary");
  }
  sectionCount(title) {
    return this.section(title).locator(":scope > summary .stat-section-count");
  }
  /** A switch, by the start of its label ("Best case", "Mobility Skill used recently"). */
  switch(label) {
    return this.card().getByRole("checkbox", { name: new RegExp(`^${escapeRegExp(label)}\\b`) });
  }
  choiceGroup(group) {
    return this.card().getByRole("group", { name: group, exact: true });
  }
  choice(group, label) {
    return this.choiceGroup(group).getByRole("button", { name: new RegExp(`^${escapeRegExp(label)}`) });
  }
  number(label) {
    return this.card().getByRole("spinbutton", { name: label, exact: true });
  }
  resetBestCase() {
    return this.card().getByRole("link", { name: "Reset to best case", exact: true });
  }

  async open() {
    await this.page.locator('button.view-tab[data-view="configuration"]').click();
    await expect(this.view()).toBeVisible();
    await expect(this.card()).toBeVisible();
  }
  async openSection(title) {
    if (!(await this.section(title).evaluate((details) => details.open))) await this.sectionSummary(title).click();
    await expect(this.section(title)).toHaveAttribute("open", "");
  }
  /** Types a value and commits it the way a user does (the change event fires on blur / Enter). */
  async setNumber(label, value) {
    const input = this.number(label);
    await input.fill(String(value));
    await input.press("Enter");
    await input.blur();
  }
  /** The open build's stored combat settings. */
  async storedCombat() {
    return this.page.evaluate((key) => {
      const library = JSON.parse(localStorage.getItem(key));
      const build = library.builds.find((entry) => entry.id === library.activeBuildId) || library.builds[0];
      return build.state.combat;
    }, LIBRARY_STORAGE_KEY);
  }
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

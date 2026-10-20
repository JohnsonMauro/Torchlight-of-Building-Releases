// The Stats view (the header's Stats tab): the build status, the Stat sheet / Damage path switch, the stat sheet (active
// skill, damage banner, Effective HP, the Character stats tabs and their rows) and the damage path tabs. Every selector
// the stats tests use lives here.
import { expect } from "@playwright/test";

export class StatsPage {
  constructor(page) {
    this.page = page;
  }

  view() {
    return this.page.locator("#character-view");
  }
  status() {
    return this.page.locator("#character-status");
  }
  panelTab(name) {
    return this.page.locator("#stats-panel-options").getByRole("tab", { name, exact: true });
  }
  sheet() {
    return this.page.locator("#stat-sheet");
  }
  damagePath() {
    return this.page.locator("#damage-path");
  }
  skillSelect() {
    return this.sheet().getByLabel("Active skill", { exact: true });
  }
  /** The active skill's damage banner (the Effective HP banner after it shares its class). */
  banner() {
    return this.sheet().locator(".stat-sheet-banner").first();
  }
  /** A Character stats tab ("Offense", "Defense", "Utility", "Target & assumptions"); its name ends with its row count. */
  statTab(name) {
    return this.sheet()
      .getByRole("tablist", { name: "Stat categories" })
      .getByRole("tab", { name: new RegExp(`^${name.replace(/[&]/g, "\\$&")}\\s*\\d+$`) });
  }
  statPanel() {
    return this.sheet().getByRole("tabpanel");
  }
  /** The training dummy recount panel of the damage banner. */
  recount() {
    return this.sheet().getByRole("region", { name: "Training dummy recount" });
  }
  /** A recount field's value ("averageDps", "highest5sDps", "last5sDps"), a short / full number toggle. */
  recountValue(field) {
    return this.recount().locator(`[data-recount-field="${field}"] .dummy-recount-value`);
  }
  /** A source in the recount's share legend by its label ("Homing Frost Bolt hits"); a toggle button. */
  recountSource(label) {
    return this.recount()
      .locator(".dummy-recount-mix-legend")
      .getByRole("button", { name: new RegExp(`^${label.replace(/[()]/g, "\\$&")}`) });
  }
  /** Total modeled DPS below the recount panel. */
  totalModeled() {
    return this.banner().locator(".dummy-recount-secondary .number-toggle");
  }
  /** The recount's "How this is calculated" details in the banner's foot. */
  recountDetails() {
    return this.banner().locator(".dummy-recount-foot > details");
  }
  effectiveHp() {
    return this.sheet().getByRole("region", { name: "Effective HP" });
  }
  /** A damage path tab by the start of its name ("Homing Frost Bolt hits", "Thunder Magus (Minion)", "All paths"). */
  pathTab(name) {
    return this.damagePath().getByRole("tab", { name: new RegExp(`^${name.replace(/[()]/g, "\\$&")}`) });
  }
  pathViews() {
    return this.damagePath().locator("[data-damage-path-view]:not([hidden])");
  }
  feedbackDialog() {
    return this.page.locator("#feedback-dialog");
  }

  async open() {
    await this.page.locator('button.view-tab[data-view="character"]').click();
    await expect(this.view()).toBeVisible();
  }
}

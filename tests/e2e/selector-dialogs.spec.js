// The planner's small picker dialogs, opened from the Build page: the hero selector (Change Hero), the follower
// selector (Change Follower) and the Pactspirit selector (a pact slot). Each lists its
// choices, marks the current one, filters by the search box, and closes from its × button, from a click outside it and
// from Escape, opening again with the search cleared. Written against the legacy dialogs before they move to React, so
// both must pass it unchanged.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { heroCatalogSs13 } from "../../src/data/heroes/hero-catalog-ss13.js";
import { PlannerPage } from "./pages/planner-page.js";
import { HeroPage } from "./pages/hero-page.js";
import { FollowerPage } from "./pages/follower-page.js";
import { followerPickerOptions } from "../../src/app/follower-panel.js";
import { PactsPage } from "./pages/pacts-page.js";
import { pactspiritCatalogSs13 } from "../../src/data/pacts/pactspirit-catalog-ss13.js";
import { sortPactspirits } from "../../src/engine/pacts/pactspirit-selection.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
test.use({ viewport: { width: 1440, height: 1000 } });

async function openPlanner(page) {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  return { planner, hero: new HeroPage(page) };
}
const heroCards = (dialog) => dialog.locator(".hero-selector-card");
const matching = (query) =>
  heroCatalogSs13.filter((hero) => `${hero.name} ${hero.trait}`.toLowerCase().includes(query)).length;

test("the hero selector lists every hero, marks the current one and filters by name or trait", async ({ page }) => {
  const { planner, hero } = await openPlanner(page);
  await hero.changeHero().click();
  const dialog = hero.heroSelector();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Select Hero" })).toBeVisible();
  await expect(heroCards(dialog)).toHaveCount(heroCatalogSs13.length);
  await expect(dialog.locator(".hero-selector-card.selected")).toHaveText("YougaThe Ultimate One");
  await expect(dialog.locator('[data-select-hero="selena-sing-with-the-tide"]').locator("img")).toHaveAttribute(
    "src",
    /\S/,
  );
  const search = dialog.getByRole("searchbox", { name: "Search heroes" });
  await search.fill("Tide");
  await expect(heroCards(dialog)).toHaveCount(matching("tide"));
  await expect(dialog.locator('[data-select-hero="selena-sing-with-the-tide"]')).toBeVisible();
  await search.fill("  RANGER ");
  await expect(heroCards(dialog)).toHaveCount(matching("ranger"));
  await search.fill("zzz");
  await expect(heroCards(dialog)).toHaveCount(0);
  await expect(dialog.locator(".hero-selector-empty")).toHaveText("No heroes match that search.");
  await planner.expectNoErrors();
});

test("the hero selector closes from ×, from outside and from Escape, and opens with the search cleared", async ({
  page,
}) => {
  const { planner, hero } = await openPlanner(page);
  const dialog = hero.heroSelector();
  const search = dialog.getByRole("searchbox", { name: "Search heroes" });
  await hero.changeHero().click();
  await search.fill("sel");
  await dialog.getByRole("button", { name: "Close hero selector" }).click();
  await expect(dialog).toBeHidden();
  await hero.changeHero().click();
  await expect(search).toHaveValue("");
  await expect(heroCards(dialog)).toHaveCount(heroCatalogSs13.length);
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
  await hero.changeHero().click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect((await hero.stored()).selectedHeroId).toBe("youga-the-ultimate-one");
  await planner.expectNoErrors();
});

const withFollower = {
  ...youga,
  followers: { followerId: "scion-of-light", rarity: "ult", skills: [], rarityScheme: "letter" },
};
async function openFollowerSelector(page) {
  const planner = new PlannerPage(page);
  await planner.open(withFollower);
  const follower = new FollowerPage(page);
  await follower.open();
  await follower.button("Change Follower").click();
  await expect(follower.selector()).toBeVisible();
  return { planner, follower, dialog: follower.selector() };
}
const followerCards = (dialog) => dialog.locator(".follower-selector-card");

test("the follower selector lists each follower per rarity, marks the current one and searches", async ({ page }) => {
  const { planner, follower, dialog } = await openFollowerSelector(page);
  await expect(dialog.getByRole("heading", { name: "Select Follower" })).toBeVisible();
  await expect(followerCards(dialog)).toHaveCount(followerPickerOptions("").length);
  await expect(dialog.locator('.follower-selector-card[aria-pressed="true"]')).toHaveCount(1);
  const current = follower.selectorChoice("Arianrhod Scion of Light ULT");
  await expect(current).toHaveClass(/\bselected\b/);
  await expect(current).toHaveClass(/\bfollower-tint-ult\b/);
  await expect(current.locator("small")).toHaveText(/^ULT · \d skill slots?$/);
  const search = dialog.getByRole("searchbox", { name: "Search followers" });
  // Two spaces around the word: only a trimmed search matches it.
  await search.fill("  Lion  ");
  await expect(followerCards(dialog)).toHaveCount(followerPickerOptions("lion").length);
  await search.fill("legendary");
  await expect(followerCards(dialog)).toHaveCount(followerPickerOptions("legendary").length);
  await search.fill("zzz");
  await expect(followerCards(dialog)).toHaveCount(0);
  await expect(dialog.locator(".hero-selector-empty")).toHaveText("No followers match that search.");
  await planner.expectNoErrors();
});

test("the follower selector shows a follower's tooltip, closes from × and outside, and opens cleared", async ({
  page,
}) => {
  const { planner, follower, dialog } = await openFollowerSelector(page);
  // The tooltip moves into the dialog, which scrolls it a little, and a scroll hides the tooltip: each try hovers anew.
  await expect(async () => {
    await page.mouse.move(0, 0);
    await follower.selectorChoice("Lion Queen Normal").hover();
    await expect(dialog.locator("#planner-tooltip")).toBeVisible({ timeout: 500 });
  }).toPass();
  await expect(follower.tooltip()).toContainText("Lion Queen");
  const search = dialog.getByRole("searchbox", { name: "Search followers" });
  await search.fill("lion");
  await dialog.getByRole("button", { name: "Close follower selector" }).click();
  await expect(dialog).toBeHidden();
  await follower.button("Change Follower").click();
  await expect(search).toHaveValue("");
  await expect(followerCards(dialog)).toHaveCount(followerPickerOptions("").length);
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
  expect((await follower.stored()).followerId).toBe("scion-of-light");
  await planner.expectNoErrors();
});

async function openPactspiritSelector(page) {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  const pacts = new PactsPage(page);
  await pacts.open();
  await pacts.slotButton("Dreamweaver").click();
  await expect(pacts.pactspiritSelector()).toBeVisible();
  return { planner, pacts, dialog: pacts.pactspiritSelector() };
}
const pactCategories = [...new Set(pactspiritCatalogSs13.map((entry) => entry.category))];
const pactMatches = (search, category = "All") =>
  pactspiritCatalogSs13.filter(
    (entry) =>
      (category === "All" || entry.category === category) &&
      `${entry.name} ${entry.description}`.toLowerCase().includes(search),
  );

test("the Pactspirit selector groups every Pactspirit by category and filters by search and category", async ({
  page,
}) => {
  const { planner, dialog } = await openPactspiritSelector(page);
  const search = dialog.getByRole("searchbox", { name: "Search pactspirits" });
  const category = dialog.getByRole("combobox", { name: "Pactspirit category" });
  await expect(search).toBeFocused();
  await expect(category).toHaveValue("All");
  await expect(category.locator("option")).toHaveText(["All", ...pactCategories]);
  await expect(dialog.locator(".pactspirit-choice")).toHaveCount(pactspiritCatalogSs13.length);
  const firstGroup = pactspiritCatalogSs13[0].category;
  await expect(dialog.locator(".pactspirit-selector-group h3").first()).toHaveText(
    `${firstGroup} (${pactMatches("", firstGroup).length})`,
  );
  await expect(dialog.getByRole("button", { name: /^Dreamweaver\b/ })).toContainText("Dreamweaver");
  // Within a group: by rarity, then by name.
  await expect(dialog.locator(".pactspirit-selector-group").first().locator(".pactspirit-choice strong")).toHaveText(
    sortPactspirits(pactMatches("", firstGroup)).map((entry) => entry.name),
  );
  await search.fill("  FIRE ");
  await expect(dialog.locator(".pactspirit-choice")).toHaveCount(pactMatches("fire").length);
  await category.selectOption("Fire");
  await expect(dialog.locator(".pactspirit-choice")).toHaveCount(pactMatches("fire", "Fire").length);
  await expect(dialog.locator(".pactspirit-selector-group h3")).toHaveCount(1);
  await search.fill("zzz");
  await expect(dialog.locator(".pactspirit-no-results")).toHaveText("No Pactspirits match your search.");
  await planner.expectNoErrors();
});

test("the Pactspirit selector closes from × and Escape, and opens with its filters cleared", async ({ page }) => {
  const { planner, pacts, dialog } = await openPactspiritSelector(page);
  const search = dialog.getByRole("searchbox", { name: "Search pactspirits" });
  const category = dialog.getByRole("combobox", { name: "Pactspirit category" });
  await search.fill("fire");
  await category.selectOption("Spell");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
  await pacts.slotButton("Dreamweaver").click();
  await expect(search).toHaveValue("");
  await expect(category).toHaveValue("All");
  await expect(dialog.locator(".pactspirit-choice")).toHaveCount(pactspiritCatalogSs13.length);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await planner.expectNoErrors();
});

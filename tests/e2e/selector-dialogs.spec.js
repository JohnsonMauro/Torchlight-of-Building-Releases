// The planner's small picker dialogs, opened from the Build page: the hero selector (Change Hero), the follower
// selector (Change Follower), the Pactspirit selector (a pact slot), and Sage's scent and Carino's Special Ammo
// selectors (the HERO tab), the talent tree and core talent pickers, and the Fate slot selector (a Pactspirit's
// Undetermined Fate node). Each lists its
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
import { TalentsPage } from "./pages/talents-page.js";
import { fateSlotChoices } from "../../src/engine/pacts/fate-slot-unlocks.js";
import { pactspiritCatalogSs13 } from "../../src/data/pacts/pactspirit-catalog-ss13.js";
import { sortPactspirits } from "../../src/engine/pacts/pactspirit-selection.js";
import { sageElixirsSs13 } from "../../src/data/heroes/sage-scent-ss13.generated.js";
import { sageScentIngredientsSs13 } from "../../src/data/heroes/sage-scent-options-ss13.js";

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

async function openHeroAs(page, heroId) {
  const { planner, hero } = await openPlanner(page);
  await hero.selectHero(heroId);
  return { planner, hero };
}

test("Sage's scent selector lists elixirs or one kind of ingredient, searches, picks and clears", async ({ page }) => {
  const { planner, hero } = await openHeroAs(page, "sage-licorice-note");
  await hero.detailTab("Scent Bottle").click();
  const dialog = hero.scentSelector();
  const search = dialog.getByRole("searchbox", { name: "Search scent choices" });
  const options = dialog.locator(".sage-scent-option");
  await hero.tree().locator(".sage-basic-scent").click();
  await expect(dialog.getByRole("heading", { name: "Select Elixir Skill" })).toBeVisible();
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute("placeholder", "Search skills...");
  await expect(options).toHaveCount(sageElixirsSs13.length);
  await expect(options.first().locator("small i").first()).toHaveText(sageElixirsSs13[0].tags[0]);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  await hero
    .tree()
    .getByRole("button", { name: /Damage Ingredient/ })
    .click();
  await expect(page.locator("#sage-scent-title")).toHaveText("Select Damage Ingredient");
  await expect(search).toHaveAttribute("placeholder", "Search ingredients...");
  const ingredients = sageScentIngredientsSs13.damage;
  await expect(options).toHaveCount(ingredients.length);
  await expect(options.first().locator("small")).toHaveText(ingredients[0].description.replace(/(\d) %/g, "$1%"));
  const word = ingredients[0].name.split(" ")[0];
  await search.fill(`  ${word.toUpperCase()}  `);
  await expect(options).toHaveCount(
    ingredients.filter((entry) => entry.name.toLowerCase().includes(word.toLowerCase())).length,
  );
  await search.fill("zzz");
  await expect(dialog.locator(".hero-selector-empty")).toHaveText("No matching choices.");
  await search.fill("");
  await options.first().click();
  await expect(dialog).toBeHidden();
  await expect(hero.toast()).toHaveText(`${ingredients[0].name} selected`);
  expect((await hero.stored()).sageScent.damage).toBe(ingredients[0].name);

  await hero
    .tree()
    .getByRole("button", { name: /Damage Ingredient/ })
    .click();
  await expect(search).toHaveValue("");
  await dialog.getByRole("button", { name: "Clear Slot" }).click();
  await expect(dialog).toBeHidden();
  await expect(hero.toast()).toHaveText("Scent slot cleared");
  expect((await hero.stored()).sageScent.damage).toBe("");
  await hero
    .tree()
    .getByRole("button", { name: /Damage Ingredient/ })
    .click();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
  await hero
    .tree()
    .getByRole("button", { name: /Damage Ingredient/ })
    .click();
  await dialog.getByRole("button", { name: "Close selector" }).click();
  await expect(dialog).toBeHidden();
  await planner.expectNoErrors();
});

test("Carino's Special Ammo selector: slot title, Well Prepared help, installed supports, search, clear", async ({
  page,
}) => {
  const { planner, hero } = await openHeroAs(page, "carino-ranger-of-glory");
  const dialog = hero.ammoSelector();
  const search = dialog.getByRole("searchbox", { name: "Search projectile supports" });
  const help = dialog.locator(".carino-ammo-help");
  await hero.button("Select support for Special Ammo slot 2").click();
  await expect(page.locator("#carino-ammo-title")).toHaveText("Select Special Ammo Support · Slot 2");
  await expect(dialog.locator(".eyebrow")).toHaveText("Ranger of Glory");
  await expect(search).toBeFocused();
  await expect(help).toHaveText(
    "Choose a compatible regular Projectile support. Well Prepared unlocks Magnificent and Noble supports.",
  );
  const options = dialog.locator("[data-select-carino-ammo]");
  const regular = await options.count();
  expect(regular).toBeGreaterThan(0);
  const first = await options.first().getAttribute("data-select-carino-ammo");
  await options.first().click();
  await expect(hero.toast()).toHaveText(`${first} installed`);
  expect((await hero.stored()).carinoSpecialAmmoSupports[1]).toBe(first);

  await hero.button("Select support for Special Ammo slot 1").click();
  const installed = dialog.locator(`[data-select-carino-ammo="${first}"]`);
  await expect(installed).toBeDisabled();
  await expect(installed).toHaveClass(/\binstalled\b/);
  await search.fill("zzz");
  await expect(dialog.locator(".hero-selector-empty")).toHaveText("No matching Projectile supports.");
  await search.fill(`  ${first.split(" ")[0]}  `);
  await expect(installed).toBeVisible();
  for (const text of await options.allTextContents()) expect(text.length).toBeGreaterThan(0);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  await hero.button("Well Prepared").click();
  await hero.button(`Edit ${first}; right-click to remove`).click();
  await expect(search).toHaveValue("");
  await expect(help).toHaveText("Choose a compatible Projectile support that is not installed on the skill panel.");
  expect(await options.count()).toBeGreaterThan(regular);
  await dialog.getByRole("button", { name: "Clear Slot" }).click();
  await expect(hero.toast()).toHaveText("Support slot cleared");
  expect((await hero.stored()).carinoSpecialAmmoSupports[1]).toBe("");
  await hero.button("Select support for Special Ammo slot 3").click();
  await expect(page.locator("#carino-ammo-title")).toHaveText("Select Special Ammo Support · Slot 3");
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
  await planner.expectNoErrors();
});

async function openTree(page, tree) {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  const talents = new TalentsPage(page);
  await talents.open();
  await talents.openTree(tree);
  return { planner, talents };
}

test("the tree picker lists the trees a slot can take with their points, the slot's tree pressed", async ({ page }) => {
  const { planner, talents } = await openTree(page, "God tree");
  const picker = talents.treePicker();
  const cards = picker.locator(".talent-picker-card");
  await talents.action("Reselect").click();
  await expect(talents.treePickerTitle()).toHaveText("Select a God tree");
  await expect(cards.first()).toHaveClass(/\bgod-tree\b/);
  await expect(picker.locator('.talent-picker-card[aria-pressed="true"]')).toHaveCount(1);
  const current = picker.getByRole("button", { name: /Goddess of Knowledge/ });
  await expect(current).toHaveAttribute("aria-pressed", "true");
  await expect(current).toHaveClass(/\bselected\b/);
  await expect(current).toContainText("God tree");
  await expect(current.locator("small")).toHaveText("28 points");
  await picker.getByRole("button", { name: "Close talent tree selector" }).click();
  await expect(picker).toBeHidden();

  await talents.openTree("Class tree");
  await talents.action("Reselect").click();
  await expect(talents.treePickerTitle()).toHaveText("Select a Goddess of Knowledge class tree");
  await expect(cards.first()).toHaveClass(/\bclass-tree\b/);
  await expect(picker.getByRole("button", { name: /Prophet/ })).toHaveAttribute("aria-pressed", "true");
  await expect(cards).not.toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();
  await planner.expectNoErrors();
});

test("the core talent picker marks the tree's choice and locks its choices below their points", async ({ page }) => {
  const { planner, talents } = await openTree(page, "Tree 4");
  const picker = talents.corePicker();
  await talents.core(24).click({ button: "right" });
  await talents.core(24).click();
  await expect(picker.locator("#core-picker-title")).toHaveText("Select 24-point core talent");
  await expect(picker.locator("#core-picker-status")).toHaveText("Choose one core talent for Lich.");
  const options = picker.locator(".core-picker-option");
  await expect(options).not.toHaveCount(0);
  for (const option of await options.all()) await expect(option).toBeEnabled();
  await picker.getByRole("button", { name: /Off The Beaten Track/ }).click();
  await talents.core(24).click({ button: "right" });
  await talents.action("Reset").click();
  await talents.core(24).click();
  await expect(picker.locator("#core-picker-status")).toHaveText(
    "0/24 points in Lich. These choices unlock at 24 points.",
  );
  for (const option of await options.all()) await expect(option).toBeDisabled();
  await picker.getByRole("button", { name: "Close core talent selector" }).click();
  await expect(picker).toBeHidden();

  // A tree with its 24-point core chosen: the choice is marked.
  await talents.openTree("Tree 3");
  await talents.core(24).click();
  await expect(picker.locator(".core-picker-option.selected")).toContainText("Gale");
  await page.keyboard.press("Escape");
  await planner.expectNoErrors();
});

test("the Fate slot selector lists the unlocks with the current one marked, stores a choice and clears", async ({
  page,
}) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  const pacts = new PactsPage(page);
  await pacts.open();
  const dialog = pacts.fateSlotSelector();
  const node = pacts.node("Dreamweaver", "Undetermined Fate Slots");
  await node.click({ button: "right" });
  await expect(dialog.getByRole("heading", { name: "Unlock Fate Slots" })).toBeVisible();
  const choices = dialog.locator("#fate-slot-options button");
  await expect(choices).toHaveText(fateSlotChoices.map((choice) => `${choice.label}›`));
  await choices.nth(1).click();
  await expect(dialog).toBeHidden();
  expect((await pacts.storedPacts()).fateUnlocks.Dreamweaver).toBe(fateSlotChoices[1].id);
  await node.click({ button: "right" });
  await expect(choices.nth(1)).toHaveClass(/\bselected\b/);
  await expect(choices.nth(1)).toHaveText(`${fateSlotChoices[1].label}✓`);
  await dialog.getByRole("button", { name: "Clear Fate slots" }).click();
  await expect(dialog).toBeHidden();
  expect((await pacts.storedPacts()).fateUnlocks.Dreamweaver).toBeUndefined();
  await node.click({ button: "right" });
  await dialog.getByRole("button", { name: "Close Fate slot selector" }).click();
  await expect(dialog).toBeHidden();
  await planner.expectNoErrors();
});

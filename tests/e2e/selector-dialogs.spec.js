// The planner's small picker dialogs, opened from the Build page: the hero selector (Change Hero), the follower
// selector (Change Follower), the Pactspirit selector (a pact slot), and Sage's scent and Carino's Special Ammo
// selectors (the HERO tab), the talent tree and core talent pickers, and the Fate slot selector (a Pactspirit's
// Undetermined Fate node), and the prism inventory (Install Prism / the installed prism). Each lists its
// choices, marks the current one, filters by the search box, and closes from its × button, from a click outside it and
// from Escape, opening again with the search cleared. Written against the legacy dialogs before they move to React, so
// both must pass it unchanged.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { heroCatalog } from "../../packages/engine/data/heroes/hero-catalog.js";
import { PlannerPage } from "./pages/planner-page.js";
import { HeroPage } from "./pages/hero-page.js";
import { FollowerPage } from "./pages/follower-page.js";
import { followerPickerOptions } from "../../src/app/hero/follower-panel.js";
import { PactsPage } from "./pages/pacts-page.js";
import { TalentsPage } from "./pages/talents-page.js";
import { fateSlotChoices } from "../../packages/engine/src/pacts/fate-slot-unlocks.js";
import { pactspiritCatalog } from "../../packages/engine/data/pacts/pactspirit-catalog.js";
import { sortPactspirits } from "../../packages/engine/src/pacts/pactspirit-selection.js";
import { sageElixirs } from "../../packages/engine/data/heroes/sage-scent.generated.js";
import { sageScentIngredients } from "../../packages/engine/data/heroes/sage-scent-options.js";

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
  heroCatalog.filter((hero) => `${hero.name} ${hero.trait}`.toLowerCase().includes(query)).length;

test("the hero selector lists every hero, marks the current one and filters by name or trait", async ({ page }) => {
  const { planner, hero } = await openPlanner(page);
  await hero.openHeroSelector();
  const dialog = hero.heroSelector();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Select Hero" })).toBeVisible();
  await expect(heroCards(dialog)).toHaveCount(heroCatalog.length);
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
  await hero.openHeroSelector();
  await search.fill("sel");
  await dialog.getByRole("button", { name: "Close hero selector" }).click();
  await expect(dialog).toBeHidden();
  await hero.openHeroSelector();
  await expect(search).toHaveValue("");
  await expect(heroCards(dialog)).toHaveCount(heroCatalog.length);
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
  await hero.openHeroSelector();
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
const lionQueen = followerPickerOptions("").filter(({ follower }) => follower.species === "Lion Queen");

test("the follower selector opens on the four characters; a character lists its ranks and ULT followers", async ({
  page,
}) => {
  const { planner, follower, dialog } = await openFollowerSelector(page);
  await expect(dialog.getByRole("heading", { name: "Select Follower" })).toBeVisible();
  await expect(follower.selectorCharacters()).toHaveText([/^Lion Queen/, /^Lone Wolf/, /^Mammoth/, /^Witch Rat/]);
  await expect(followerCards(dialog)).toHaveCount(0);
  // The build's follower (Arianrhod, a Lion Queen) marks its character.
  await expect(follower.selectorCharacter("Lion Queen")).toHaveClass(/\bselected\b/);
  await expect(follower.selectorCharacter("Lone Wolf")).not.toHaveClass(/\bselected\b/);
  await expect(follower.selectorCharacter("Lion Queen")).toContainText("4 ranks · 3 ULT");
  await follower.selectorCharacter("Lion Queen").click();
  await expect(followerCards(dialog)).toHaveCount(lionQueen.length);
  await expect(followerCards(dialog).first()).toHaveAccessibleName(/^Lion Queen Normal/);
  await expect(follower.selectorCharacters()).toHaveCount(0);
  await follower.selectorPath().getByRole("button", { name: "Characters", exact: true }).click();
  await expect(follower.selectorCharacters()).toHaveCount(4);
  await expect(followerCards(dialog)).toHaveCount(0);
  await planner.expectNoErrors();
});

test("the follower selector marks the current follower and searches every character", async ({ page }) => {
  const { planner, follower, dialog } = await openFollowerSelector(page);
  await follower.selectorCharacter("Lion Queen").click();
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
  // An empty search goes back to the character it was on.
  await search.fill("");
  await expect(followerCards(dialog)).toHaveCount(lionQueen.length);
  await planner.expectNoErrors();
});

test("the follower selector shows a follower's tooltip, closes from × and outside, and opens cleared", async ({
  page,
}) => {
  const { planner, follower, dialog } = await openFollowerSelector(page);
  // The tooltip moves into the dialog, which scrolls it a little, and a scroll hides the tooltip: each try hovers anew.
  await expect(async () => {
    await page.mouse.move(0, 0);
    if (!(await follower.selectorChoice("Lion Queen Normal").count()))
      await follower.selectorCharacter("Lion Queen").click();
    await follower.selectorChoice("Lion Queen Normal").hover();
    await expect(dialog.getByRole("tooltip")).toBeVisible({ timeout: 500 });
  }).toPass();
  await expect(follower.tooltip()).toContainText("Lion Queen");
  const search = dialog.getByRole("searchbox", { name: "Search followers" });
  await search.fill("lion");
  await dialog.getByRole("button", { name: "Close follower selector" }).click();
  await expect(dialog).toBeHidden();
  await follower.button("Change Follower").click();
  await expect(search).toHaveValue("");
  await expect(follower.selectorCharacters()).toHaveCount(4);
  await expect(followerCards(dialog)).toHaveCount(0);
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
// The selector lists every Pactspirit but the Drop ones (src/app/bridge/pacts-view-model.ts UNLISTED_CATEGORIES).
const listedPacts = pactspiritCatalog.filter((entry) => entry.category !== "Drop");
const pactCategories = [...new Set(listedPacts.map((entry) => entry.category))];
// What the selector keeps: every typed word somewhere in the name, category or description (src/app/bridge/search-match.ts).
const pactMatches = (search, category = "All") =>
  listedPacts.filter(
    (entry) =>
      (category === "All" || entry.category === category) &&
      search
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((word) => `${entry.name} ${entry.category} ${entry.description}`.toLowerCase().includes(word)),
  );
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A category's button in the left column: its name, then the count it would leave.
const categoryButton = (column, name) =>
  column.getByRole("button", { name: new RegExp(`^${escapeRegExp(name)}\\s*\\d+$`) });

test("the Pactspirit selector groups every Pactspirit by category and filters by search and category", async ({
  page,
}) => {
  const { planner, dialog } = await openPactspiritSelector(page);
  const search = dialog.getByRole("searchbox", { name: "Search pactspirits" });
  const category = dialog.getByRole("navigation", { name: "Pactspirit category" });
  await expect(search).toBeFocused();
  await expect(category.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(category.getByRole("button")).toHaveText([
    "All",
    ...pactCategories.map((name) => new RegExp(`^${escapeRegExp(name)}${pactMatches("", name).length}$`)),
  ]);
  await expect(dialog.locator(".pactspirit-choice")).toHaveCount(listedPacts.length);
  const firstGroup = listedPacts[0].category;
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
  await categoryButton(category, "Fire").click();
  await expect(categoryButton(category, "Fire")).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.locator(".pactspirit-choice")).toHaveCount(pactMatches("fire", "Fire").length);
  await expect(dialog.locator(".pactspirit-selector-group h3")).toHaveCount(1);
  await search.fill("zzz");
  await expect(dialog.locator(".pactspirit-no-results")).toHaveText("No Pactspirits match your search.");
  await planner.expectNoErrors();
});

test("the Pactspirit selector closes from × and Escape, and opens with its filters cleared", async ({ page }) => {
  const { planner, pacts, dialog } = await openPactspiritSelector(page);
  const search = dialog.getByRole("searchbox", { name: "Search pactspirits" });
  const category = dialog.getByRole("navigation", { name: "Pactspirit category" });
  await search.fill("fire");
  await categoryButton(category, "Fire").click();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
  await pacts.slotButton("Dreamweaver").click();
  await expect(search).toHaveValue("");
  await expect(category.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.locator(".pactspirit-choice")).toHaveCount(listedPacts.length);
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
  await expect(search).toHaveAttribute("placeholder", "Search skills… · /regex/");
  await expect(options).toHaveCount(sageElixirs.length);
  await expect(options.first().locator("small i").first()).toHaveText(sageElixirs[0].tags[0]);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  await hero
    .tree()
    .getByRole("button", { name: /Damage Ingredient/ })
    .click();
  await expect(page.locator("#sage-scent-title")).toHaveText("Select Damage Ingredient");
  await expect(search).toHaveAttribute("placeholder", "Search ingredients… · /regex/");
  const ingredients = sageScentIngredients.damage;
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

test("the tree picker shows every god's trees, the ones the slot can take on and the slot's tree pressed", async ({
  page,
}) => {
  const { planner, talents } = await openTree(page, "God tree");
  const picker = talents.treePicker();
  await talents.action("Reselect").click();
  await expect(talents.treePickerTitle()).toHaveText("Select a God tree");
  // The game's layout: six god columns, a God tree and four class trees each.
  await expect(talents.treePickerGods()).toHaveCount(6);
  await expect(talents.treePickerTrees()).toHaveCount(30);
  await expect(picker.locator('.talent-picker-card[aria-pressed="true"]')).toHaveCount(1);
  const current = talents.treePickerTree("Goddess of Knowledge");
  await expect(current).toHaveAttribute("aria-pressed", "true");
  await expect(current).toHaveClass(/\bselected\b/);
  await expect(current).toHaveAccessibleName("Goddess of Knowledge, God tree, 28 points, in the build");
  await expect(talents.treePickerTree("God of War")).toBeEnabled();
  await expect(talents.treePickerTree("Ronin")).toBeDisabled();
  await picker.getByRole("button", { name: "Close talent tree selector" }).click();
  await expect(picker).toBeHidden();

  await talents.openTree("Class tree");
  await talents.action("Reselect").click();
  await expect(talents.treePickerTitle()).toHaveText("Select a Goddess of Knowledge class tree");
  await expect(talents.treePickerTree("Prophet")).toHaveAttribute("aria-pressed", "true");
  await expect(talents.treePickerTree("Arcanist")).toBeEnabled();
  // Another god's class tree is off, and a click on it picks nothing.
  const other = talents.treePickerTree("Ronin");
  await expect(other).toBeDisabled();
  await expect(other).toHaveAccessibleName(/Tree 2 takes a Goddess of Knowledge class tree$/);
  await other.click({ force: true });
  await expect(picker).toBeVisible();
  expect((await talents.stored()).selectedTrees[1]).toBe("Prophet");
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();
  await planner.expectNoErrors();
});

test("the core talent picker marks the tree's choice and locks its choices below their points", async ({ page }) => {
  const { planner, talents } = await openTree(page, "Tree 4");
  const picker = talents.corePicker();
  await talents.core(24).click({ button: "right" });
  await talents.core(24).click();
  await expect(picker.locator("#core-picker-title")).toHaveText("Core talent");
  // The heading is the title alone.
  await expect(picker.locator("#core-picker-status")).toHaveCount(0);
  const options = picker.locator(".core-picker-option");
  await expect(options).not.toHaveCount(0);
  for (const option of await options.all()) await expect(option).toBeEnabled();
  await picker.getByRole("button", { name: /Off The Beaten Track/ }).click();
  await talents.core(24).click({ button: "right" });
  await talents.action("Reset").click();
  await talents.core(24).click();
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

test("the prism inventory lists the crafted prisms, where each is installed, and unequips or deletes them", async ({
  page,
}) => {
  const { planner, talents } = await openTree(page, "Tree 4");
  const dialog = talents.prismInventory();
  const crafter = page.locator("#prism-crafter-dialog");
  await talents.prismNode().click();
  await expect(dialog.locator("#prism-inventory-title")).toHaveText("Install Prism - Tree Slot 4");
  const row = dialog.locator(".prism-inventory-item");
  await expect(row).toHaveCount(1);
  await expect(row.locator("strong")).toHaveText("Ethereal Prism: Haze");
  await expect(row.locator("small")).toHaveText("Ethereal Prism · 1x1 area · Installed in Lich");
  await expect(row.locator(".prism-item-icon img")).toHaveAttribute("src", /\S/);
  await expect(row.getByRole("button", { name: "Equipped", exact: true })).toBeEnabled();

  await row.getByRole("button", { name: "Edit Ethereal Prism: Haze" }).click();
  await expect(crafter).toBeVisible();
  await crafter.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(crafter).toBeHidden();
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Unequip current Prism" }).click();
  await expect(row.getByRole("button", { name: "Install", exact: true })).toBeEnabled();
  await expect(row.locator("small")).toHaveText("Ethereal Prism · 1x1 area");
  await expect(dialog.getByRole("button", { name: "Unequip current Prism" })).toHaveCount(0);
  expect((await talents.stored()).installedPrisms.Lich).toBeUndefined();

  await row.getByRole("button", { name: "Delete Ethereal Prism: Haze" }).click();
  await expect(dialog.locator(".prism-inventory-empty")).toContainText("No prisms crafted yet");
  expect((await talents.stored()).prismInventory).toEqual([]);
  // With none crafted, the footer's Craft Prism is the only way to the crafter.
  await expect(dialog.getByRole("button", { name: /Craft/ })).toHaveCount(1);
  await dialog.getByRole("button", { name: "Craft Prism", exact: true }).click();
  await expect(crafter).toBeVisible();
  await crafter.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close Prism inventory" }).click();
  await expect(dialog).toBeHidden();
  await planner.expectNoErrors();
});

test("deleting the installed prism also takes it off its node", async ({ page }) => {
  const { planner, talents } = await openTree(page, "Tree 4");
  const dialog = talents.prismInventory();
  await talents.prismNode().click();
  await dialog.getByRole("button", { name: "Delete Ethereal Prism: Haze" }).click();
  await expect(talents.prismNode()).toHaveCount(0);
  const stored = await talents.stored();
  expect(stored.installedPrisms.Lich).toBeUndefined();
  expect(stored.installedPrismNodes.Lich).toBeUndefined();
  await expect(dialog.getByRole("button", { name: "Craft Prism", exact: true })).toBeVisible();
  await planner.expectNoErrors();
});

test("a prism installed in another tree cannot be installed from this one", async ({ page }) => {
  const { planner, talents } = await openTree(page, "Tree 3");
  const dialog = talents.prismInventory();
  await talents.action("Install Prism").click();
  await expect(dialog.locator("#prism-inventory-title")).toHaveText("Install Prism - Tree Slot 3");
  const row = dialog.locator(".prism-inventory-item");
  await expect(row.locator("small")).toHaveText("Ethereal Prism · 1x1 area · Installed in Lich");
  await expect(row.getByRole("button", { name: "Install", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Unequip current Prism" })).toHaveCount(0);
  await planner.expectNoErrors();
});

const prismCrafter = (page) => page.locator("#prism-crafter-dialog");
async function openPrismCrafter(page) {
  const { planner, talents } = await openTree(page, "Tree 4");
  await talents.prismNode().click();
  await talents.prismInventory().getByRole("button", { name: "Craft Prism", exact: true }).click();
  await expect(prismCrafter(page)).toBeVisible();
  return { planner, talents };
}

/** A random affix slot's list in the crafter, and an option of it by its text. */
const prismAffixList = (crafter, label) =>
  crafter.getByRole("radiogroup", { name: `${label} Prism affix`, exact: true });
const prismAffixOption = (crafter, label, option) =>
  prismAffixList(crafter, label).getByRole("radio", { name: option, exact: true });

test("Craft Prism: the bases as cards, then the base's random affixes and preview; Craft adds it", async ({ page }) => {
  const { planner, talents } = await openPrismCrafter(page);
  const crafter = prismCrafter(page);
  const preview = crafter.locator("#prism-crafter-preview");
  const craft = crafter.locator("footer").getByRole("button", { name: "Craft", exact: true });
  const path = crafter.getByRole("navigation", { name: "Prism" });
  await expect(crafter.locator("#prism-crafter-title")).toHaveText("Craft Prism");
  // The first page: the type's tabs and its bases as cards, no form and no preview yet.
  await expect(crafter.locator(".prism-type-tabs button")).toHaveText(["Ethereal Prism", "Inverse Image"]);
  await expect(crafter.locator(".prism-type-tabs button.active")).toHaveText("Ethereal Prism");
  await expect(crafter.locator("[data-prism-pick]")).not.toHaveCount(0);
  await expect(crafter.getByRole("combobox")).toHaveCount(0);
  await expect(preview).toHaveCount(0);
  await expect(craft).toBeDisabled();

  await crafter.locator('[data-prism-pick="Unwavering Fortress"]').click();
  // The form: the path back to the bases in place of the tabs, the affixes as lists, the preview beside them.
  await expect(crafter.locator(".prism-type-tabs")).toHaveCount(0);
  await expect(path.getByRole("button", { name: "Ethereal Prism", exact: true })).toBeVisible();
  await expect(path.locator('[aria-current="step"]')).toHaveText("Unwavering Fortress");
  await expect(crafter.locator(".prism-fixed small")).toHaveText("This prism replaces the panel core talent");
  await expect(crafter.locator(".prism-fixed p")).toHaveText(
    "Replaces the Core Talent of the Advanced Talent Panel with Unwavering Fortress.",
  );
  await expect(crafter.locator("[data-craft-section] h3")).toHaveText([
    "Core Talent",
    "Radius affix",
    "Rare affix",
    "Legendary affix",
  ]);
  await expect(crafter.getByRole("heading", { name: "Random Affixes (0/3)" })).toBeVisible();
  await expect(prismAffixOption(crafter, "Radius", "None")).toBeChecked();
  await expect(craft).toBeEnabled();
  await expect(preview.locator("h3")).toHaveText("Ethereal Prism: Unwavering Fortress");
  await expect(preview.locator(".prism-preview-card small").first()).toHaveText("ETHEREAL PRISM");
  await expect(preview.locator(".prism-effect-area")).toHaveText("Effect Area: 1x1");
  await expect(preview.locator(".prism-affix-section h4")).toHaveText(["Base Affix"]);

  await prismAffixOption(crafter, "Radius", "The Effect Area expands to 3x3 Rectangle").check();
  await expect(crafter.getByRole("heading", { name: "Random Affixes (1/3)" })).toBeVisible();
  await expect(preview.locator(".prism-effect-area")).toHaveText("Effect Area: 3x3");
  await expect(preview.locator(".prism-affix-section h4")).toHaveText(["Base Affix", "Radius Affix"]);
  await prismAffixOption(crafter, "Rare", "All Micro Talent within the area also gain: +6% Attack Damage").check();
  await prismAffixOption(
    crafter,
    "Legendary",
    "Points can be allocated to all Micro Talent within the area 1 additional time(s)",
  ).check();
  await expect(crafter.getByRole("heading", { name: "Random Affixes (3/3)" })).toBeVisible();
  await expect(preview.locator(".prism-affix-section h4")).toHaveText([
    "Base Affix",
    "Radius Affix",
    "Rare Affix",
    "Legendary Affix",
  ]);

  // The path goes back to the bases; another base keeps only the affixes it can roll, and Haze has no legendary one.
  await path.getByRole("button", { name: "Ethereal Prism", exact: true }).click();
  await expect(preview).toHaveCount(0);
  await crafter.locator('[data-prism-pick="Phantasmagoria"]').click();
  await expect(prismAffixOption(crafter, "Rare", "None")).toBeChecked();
  await expect(crafter.locator("[data-craft-section] h3").first()).toHaveText("Prism Effect");
  await expect(crafter.locator(".prism-fixed small")).toHaveText("This prism does not replace the panel core talent");
  await path.getByRole("button", { name: "Ethereal Prism", exact: true }).click();
  await crafter.locator('[data-prism-pick="Haze"]').click();
  await expect(prismAffixList(crafter, "Legendary")).toHaveCount(0);
  await expect(crafter.getByRole("heading", { name: "Random Affixes (1/2)" })).toBeVisible();

  await craft.click();
  await expect(crafter).toBeHidden();
  await expect(talents.prismInventory()).toBeVisible();
  await expect(page.locator("#toast")).toHaveText("Ethereal Prism: Haze crafted");
  await expect(talents.prismInventory().locator(".prism-inventory-item")).toHaveCount(2);
  const saved = (await talents.stored()).prismInventory.at(-1);
  expect(saved).toMatchObject({
    type: "ethereal",
    base: "Haze",
    radiusAffix: "The Effect Area expands to 3x3 Rectangle",
    rareAffix: "",
    legendaryAffix: "",
  });
  await planner.expectNoErrors();
});

test("a Haze rolls its base affix: the effect it adds to the core, kept only on a Haze", async ({ page }) => {
  const { planner, talents } = await openPrismCrafter(page);
  const crafter = prismCrafter(page);
  const preview = crafter.locator("#prism-crafter-preview");
  const path = crafter.getByRole("navigation", { name: "Prism" });
  const effect = "+1% additional Damage per +5% Movement Speed, up to +12%";
  await crafter.locator('[data-prism-pick="Haze"]').click();
  await expect(crafter.locator("[data-craft-section] h3")).toHaveText([
    "Prism Effect",
    "Base affix",
    "Radius affix",
    "Rare affix",
  ]);
  // None, then the ten effects of the game's Haze base affixes.
  await expect(prismAffixList(crafter, "Base").getByRole("radio")).toHaveCount(11);
  await expect(prismAffixOption(crafter, "Base", "None")).toBeChecked();
  // A two-line effect keeps its line break, as the game prints it.
  expect(await prismAffixList(crafter, "Base").locator("label").nth(1).innerText()).toBe(
    "+12% additional Attack Damage when holding a One-Handed Weapon\n+12% additional Base Damage for Two-Handed Weapons",
  );
  // A long one in the section's summary is cut there: it does not widen the form past its column.
  await prismAffixList(crafter, "Base").getByRole("radio").nth(1).check();
  const form = crafter.locator(".prism-crafter-form > div").last();
  expect(await form.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
  await prismAffixOption(crafter, "Base", effect).check();
  await expect(preview.locator(".prism-affix-section").first()).toContainText(effect);
  // The affix search reaches the base affix list too.
  await crafter.getByRole("searchbox", { name: "Search affixes" }).fill("Spell Aggression");
  await expect(crafter.locator("[data-craft-section] h3")).toHaveText(["Prism Effect", "Base affix"]);
  await crafter.getByRole("searchbox", { name: "Search affixes" }).fill("");
  // Another base has no base affix to roll and drops it; back on a Haze it starts from none.
  await path.getByRole("button", { name: "Ethereal Prism", exact: true }).click();
  await crafter.locator('[data-prism-pick="Phantasmagoria"]').click();
  await expect(prismAffixList(crafter, "Base")).toHaveCount(0);
  await path.getByRole("button", { name: "Ethereal Prism", exact: true }).click();
  await crafter.locator('[data-prism-pick="Haze"]').click();
  await expect(prismAffixOption(crafter, "Base", "None")).toBeChecked();
  await prismAffixOption(crafter, "Base", effect).check();

  await crafter.locator("footer").getByRole("button", { name: "Craft", exact: true }).click();
  await expect(crafter).toBeHidden();
  expect((await talents.stored()).prismInventory.at(-1)).toMatchObject({
    base: "Haze",
    baseAffix: `Adds an additional effect to the Core Talent on the Any Advanced Talent Panel:\n${effect}`,
  });
  await planner.expectNoErrors();
});

test("the prism search finds the bases by what they hold or can roll, and the card says which line matched", async ({
  page,
}) => {
  const { planner } = await openPrismCrafter(page);
  const crafter = prismCrafter(page);
  const search = crafter.getByRole("searchbox", { name: "Search prisms" });
  const cards = crafter.locator("[data-prism-pick]");
  await search.fill("effects of Random Affixes");
  await expect(cards).toHaveCount(1);
  await expect(cards).toHaveAttribute("data-prism-pick", "Phantasmagoria");
  await expect(cards.locator("small")).toHaveText("+75% to the effects of Random Affixes on this Prism.");
  // A Haze is found by the effects its base affix can add.
  await search.fill("Synthetic Troop");
  await expect(cards).toHaveAttribute("data-prism-pick", "Haze");
  await expect(cards.locator("small")).toContainText("Synthetic Troop Minion");
  // A match on the name needs no line.
  await search.fill("haze");
  await expect(cards).toHaveCount(1);
  await expect(cards.locator("small")).toHaveCount(0);
  await search.fill("zzqx");
  await expect(cards).toHaveCount(0);
  await expect(crafter.locator(".prism-pick-empty")).toBeVisible();
  // The search stays through a base's form and back.
  await search.fill("haze");
  await cards.click();
  await crafter.getByRole("navigation", { name: "Prism" }).getByRole("button", { name: "Ethereal Prism" }).click();
  await expect(search).toHaveValue("haze");
  await planner.expectNoErrors();
});

test("the affix search filters every random affix list and hides the slots it finds nothing in", async ({ page }) => {
  const { planner } = await openPrismCrafter(page);
  const crafter = prismCrafter(page);
  await crafter.locator('[data-prism-pick="Unwavering Fortress"]').click();
  const search = crafter.getByRole("searchbox", { name: "Search affixes" });
  // One field for all the lists: none offers its own.
  await expect(crafter.locator("[data-prism-affix] input[type=search]")).toHaveCount(0);
  await search.fill("7x1");
  await expect(crafter.locator("[data-craft-section] h3")).toHaveText(["Core Talent", "Radius affix"]);
  await expect(prismAffixOption(crafter, "Radius", "The Effect Area expands to 7x1 Rectangle")).toBeVisible();
  await expect(prismAffixOption(crafter, "Radius", "The Effect Area expands to 3x3 Rectangle")).toHaveCount(0);
  await search.fill("zzqx");
  await expect(crafter.locator(".prism-affix-empty")).toBeVisible();
  await search.fill("");
  await expect(crafter.locator("[data-craft-section] h3")).toHaveText([
    "Core Talent",
    "Radius affix",
    "Rare affix",
    "Legendary affix",
  ]);
  await planner.expectNoErrors();
});

test("an Inverse Image's mod values: the number and slider move together, clamped, and the preview follows", async ({
  page,
}) => {
  const { planner, talents } = await openPrismCrafter(page);
  const crafter = prismCrafter(page);
  const preview = crafter.locator("#prism-crafter-preview");
  await crafter.locator(".prism-type-tabs").getByRole("button", { name: "Inverse Image", exact: true }).click();
  await expect(crafter.locator("#prism-crafter-title")).toHaveText("Craft Inverse Image");
  // An Inverse Image has one base: its card opens the form.
  await expect(crafter.locator("[data-prism-pick]")).toHaveCount(1);
  await crafter.locator('[data-prism-pick="Inverse Image"]').click();
  await expect(crafter.locator(".inverse-image-heading")).toHaveText("Inverse ImageUltimate");
  await expect(crafter.locator(".inverse-radius")).toHaveText("Radius: 3x3");
  const rolls = crafter.locator(".inverse-roll");
  await expect(rolls.locator("label")).toHaveText([
    "Micro Talent Effect Range",
    "Medium Talent Effect Range",
    "Legendary Medium Talent Effect Range",
  ]);
  const micro = crafter.getByLabel("Micro Talent Effect Range", { exact: true });
  const microSlider = crafter.getByLabel("Micro Talent Effect Range slider", { exact: true });
  await expect(micro).toHaveValue("-100");
  await expect(rolls.first()).toHaveClass(/\bnegative\b/);
  await expect(preview.locator("h3")).toHaveText("Inverse Image");
  await expect(preview.locator(".prism-preview-card small").first()).toHaveText("INVERSE IMAGE");
  await expect(preview.locator(".prism-effect-area")).toHaveText("Effect Area: 3x3");

  await micro.fill("50");
  await expect(microSlider).toHaveValue("50");
  await expect(rolls.first()).toHaveClass(/\bpositive\b/);
  await expect(rolls.first()).toHaveAttribute("style", /--inverse-start:\s*33\.3+\d*%;\s*--inverse-end:\s*50%/);
  await expect(preview.locator(".inverse-fixed strong").first()).toHaveText("50");
  await expect(preview.locator(".inverse-fixed strong").first()).toHaveClass(/\bpositive\b/);
  await micro.fill("999");
  await expect(microSlider).toHaveValue("200");
  await micro.press("Tab");
  await expect(micro).toHaveValue("200");
  await crafter.getByLabel("Medium Talent Effect Range slider", { exact: true }).fill("0");
  await expect(crafter.getByLabel("Medium Talent Effect Range", { exact: true })).toHaveValue("0");
  await expect(rolls.nth(1)).toHaveClass(/\bzero\b/);

  await crafter.locator("footer").getByRole("button", { name: "Craft", exact: true }).click();
  await expect(page.locator("#toast")).toHaveText("Inverse Image crafted");
  const saved = (await talents.stored()).prismInventory.at(-1);
  expect(saved).toMatchObject({
    type: "inverse",
    base: "Inverse Image",
    inverseRolls: { micro: 200, medium: 0, legendary: -100 },
  });
  await planner.expectNoErrors();
});

test("Edit on a prism: the type is fixed, Save Changes updates it; Cancel and the close button come back", async ({
  page,
}) => {
  const { planner, talents } = await openTree(page, "Tree 4");
  const crafter = prismCrafter(page);
  await talents.prismNode().click();
  const row = talents.prismInventory().locator(".prism-inventory-item");
  await row.getByRole("button", { name: "Edit Ethereal Prism: Haze" }).click();
  await expect(crafter.locator("#prism-crafter-title")).toHaveText("Edit Prism");
  // Edit opens on the prism's form; its path back shows the bases of its type only.
  const path = crafter.getByRole("navigation", { name: "Prism" });
  await expect(path.locator('[aria-current="step"]')).toHaveText("Haze");
  await path.getByRole("button", { name: "Ethereal Prism", exact: true }).click();
  await expect(
    crafter.locator(".prism-type-tabs").getByRole("button", { name: "Inverse Image", exact: true }),
  ).toBeDisabled();
  await crafter.locator('[data-prism-pick="Haze"]').click();
  await crafter.getByRole("button", { name: "Close Prism crafter" }).click();
  await expect(crafter).toBeHidden();
  await expect(talents.prismInventory()).toBeVisible();

  await row.getByRole("button", { name: "Edit Ethereal Prism: Haze" }).click();
  await prismAffixOption(crafter, "Radius", "The Effect Area expands to 2x2 Rectangle").check();
  await crafter.locator("footer").getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page.locator("#toast")).toHaveText("Ethereal Prism: Haze updated");
  await expect(row).toHaveCount(1);
  await expect(row.locator("small")).toHaveText("Ethereal Prism · 2x2 area · Installed in Lich");
  await planner.expectNoErrors();
});

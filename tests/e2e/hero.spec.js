// HERO tab of the Build page's hero panel: the selected hero, the Hero Trait / Trait Path tabs, the trait tiers with
// their memory sockets, picking and dragging a tree hero's traits, regular trait choices, Bing's paired choices, Sage's
// Scent Bottle, Carino's Special Ammo slots, Rosa's trait support slot, and an empty hero. Written against the legacy
// tab before it moves to React, so both must pass it unchanged. The golden-master Youga build is The Ultimate One (a
// tree hero) with no trait picked yet; other heroes are switched to through Change Hero.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { HeroPage } from "./pages/hero-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const YOUGA = "youga-the-ultimate-one";
test.use({ viewport: { width: 1440, height: 1000 } });

async function openHero(page, state = youga) {
  const planner = new PlannerPage(page);
  await planner.open(state);
  return { planner, hero: new HeroPage(page) };
}

test("shows the selected hero, its trait tabs and its trait tiers", async ({ page }) => {
  const { planner, hero } = await openHero(page);
  await expect(hero.heroName()).toHaveText("Youga");
  await expect(hero.heroTrait()).toHaveText("The Ultimate One");
  await expect(hero.portrait().getByRole("img", { name: "Youga" })).toBeVisible();
  await expect(hero.detailTabs()).toBeVisible();
  await expect(hero.detailTab("Hero Trait")).toHaveClass(/\bactive\b/);
  await expect(hero.detailTab("Trait Path")).not.toHaveClass(/\bactive\b/);
  await expect(hero.tree()).toHaveAttribute("aria-label", "Youga, The Ultimate One hero traits");
  await expect(hero.button("I Am the Ultimate One")).toHaveAttribute("aria-pressed", "true");
  await expect(hero.tree().locator(".hero-memory-socket")).toHaveCount(3);
  await planner.expectNoErrors();
});

test("memories stored under the level alone (as the game-log import writes them) show in their sockets", async ({
  page,
}) => {
  // The calculation reads "<hero>:level45", then "level45"; the sockets must show what it counts.
  const { planner, hero } = await openHero(page);
  expect(Object.keys(youga.hero.equippedMemoryIds).sort()).toEqual(["level45", "level60", "level75"]);
  await expect(hero.button("Manage Memory of Origin")).toBeVisible();
  await expect(hero.button("Manage Memory of Discipline")).toBeVisible();
  await expect(hero.button("Manage Memory of Progress")).toBeVisible();
  // A right-click takes it off, from the key it is stored under.
  await hero.button("Manage Memory of Discipline").click({ button: "right" });
  await expect(hero.button("Add level 60 hero memory")).toBeVisible();
  expect((await hero.stored()).equippedMemoryIds.level60).toBeUndefined();
  await planner.expectNoErrors();
});

test("a memory socket opens the memory selector", async ({ page }) => {
  const { planner, hero } = await openHero(page);
  await hero.tree().locator(".hero-memory-socket").nth(1).click();
  await expect(hero.memorySelector()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(hero.memorySelector()).not.toBeVisible();
  await planner.expectNoErrors();
});

test("Trait Path: a click picks a trait under the next row, a second click takes the path back", async ({ page }) => {
  const { planner, hero } = await openHero(page);
  await hero.detailTab("Trait Path").click();
  await expect(hero.detailTab("Trait Path")).toHaveClass(/\bactive\b/);
  await expect(hero.pathCount()).toHaveText("0/3 selected");
  await expect(hero.pathNode("I Will Hunt You Down")).toBeDisabled();
  await hero.pathNode("I Hold All in My Grasp").click();
  await expect(hero.toast()).toContainText("I Hold All in My Grasp selected under");
  await expect(hero.pathCount()).toHaveText("1/3 selected");
  await expect(hero.pathNode("I Hold All in My Grasp")).toHaveClass(/\bselected\b/);
  await expect(hero.pathNode("I Will Hunt You Down")).toBeEnabled();
  expect((await hero.stored()).treeTraits[YOUGA][0]).toBe("I Hold All in My Grasp");

  // The pick shows on the Hero Trait tab, in its row.
  await hero.detailTab("Hero Trait").click();
  await expect(hero.treeRow(0).getByRole("button", { name: "I Hold All in My Grasp", exact: true })).toBeVisible();

  await hero.detailTab("Trait Path").click();
  await hero.pathNode("I Hold All in My Grasp").click();
  await expect(hero.toast()).toHaveText("Trait path shortened");
  await expect(hero.pathCount()).toHaveText("0/3 selected");
  await planner.expectNoErrors();
});

test("a picked trait dragged onto another row moves there; a drop off the rows returns it", async ({ page }) => {
  const { planner, hero } = await openHero(page);
  await hero.detailTab("Trait Path").click();
  await hero.pathNode("I Arrive Alongside Destiny").click();
  await hero.pathNode("I Meet the Selves").click();
  await expect(hero.pathCount()).toHaveText("2/3 selected");
  await hero.detailTab("Hero Trait").click();
  const before = (await hero.stored()).treeTraits[YOUGA];
  expect(before.slice(0, 2)).toEqual(["I Arrive Alongside Destiny", "I Meet the Selves"]);

  await hero.drag(hero.treeRow(0).getByRole("button", { name: "I Arrive Alongside Destiny" }), hero.treeRow(2));
  await expect(hero.toast()).toContainText("Moved I Arrive Alongside Destiny under");
  const moved = (await hero.stored()).treeTraits[YOUGA];
  expect(moved[2]).toBe("I Arrive Alongside Destiny");
  expect(moved[0] || "").toBe("");
  await expect(hero.treeRow(2).getByRole("button", { name: "I Arrive Alongside Destiny" })).toBeVisible();
  // The click that ends the drag does not open the trait's row memory.
  await expect(hero.memorySelector()).not.toBeVisible();

  await hero.drag(hero.treeRow(2).getByRole("button", { name: "I Arrive Alongside Destiny" }), hero.portrait());
  await expect(hero.toast()).toHaveText("Invalid drop · trait returned to its row");
  expect((await hero.stored()).treeTraits[YOUGA]).toEqual(moved);
  await planner.expectNoErrors();
});

test("Change Hero switches the hero; a regular hero picks one trait per level", async ({ page }) => {
  const { planner, hero } = await openHero(page);
  await hero.selectHero("selena-sing-with-the-tide");
  await expect(hero.toast()).toHaveText("Selena · Sing with the Tide selected");
  await expect(hero.heroName()).toHaveText("Selena");
  await expect(hero.heroTrait()).toHaveText("Sing with the Tide");
  await expect(hero.detailTabs()).toBeHidden();
  await hero.button("Wave Aria").click();
  await expect(hero.toast()).toHaveText("Wave Aria selected");
  await expect(hero.button("Wave Aria")).toHaveAttribute("aria-pressed", "true");
  await expect(hero.button("Undersea Ballad")).toHaveAttribute("aria-pressed", "false");
  const stored = await hero.stored();
  expect(stored.selectedHeroId).toBe("selena-sing-with-the-tide");
  expect(stored.selectedTraits.level45).toBe("Wave Aria");
  await planner.expectNoErrors();
});

test("Bing, Creative Genius picks an upper and a lower trait per level", async ({ page }) => {
  const { planner, hero } = await openHero(page);
  await hero.selectHero("bing-creative-genius");
  const upper = hero.tree().getByLabel("Level 45 upper trait choice", { exact: true });
  const lower = hero.tree().getByLabel("Level 45 lower trait choice", { exact: true });
  await expect(upper.getByRole("button")).toHaveCount(1);
  await expect(lower.getByRole("button")).toHaveCount(2);
  await lower.getByRole("button", { name: "Over-Shield Module", exact: true }).click();
  await expect(hero.toast()).toHaveText("Over-Shield Module selected");
  expect((await hero.stored()).selectedTraits["bing-creative-genius:level45:lower"]).toBe("Over-Shield Module");
  await planner.expectNoErrors();
});

test("Sage's Scent Bottle tab shows the scent slots, which open the scent selector", async ({ page }) => {
  const { planner, hero } = await openHero(page);
  await hero.selectHero("sage-licorice-note");
  await expect(hero.detailTab("Scent Bottle")).toBeVisible();
  await hero.detailTab("Scent Bottle").click();
  await expect(hero.detailTab("Scent Bottle")).toHaveClass(/\bactive\b/);
  await expect(hero.tree().locator(".sage-scent-panel")).toBeVisible();
  await expect(hero.tree()).toContainText("Damage Ingredient");
  await hero
    .tree()
    .getByRole("button", { name: /Damage Ingredient/ })
    .click();
  await expect(hero.scentSelector()).toBeVisible();
  await expect(page.locator("#sage-scent-title")).toHaveText("Select Damage Ingredient");
  await page.keyboard.press("Escape");
  await planner.expectNoErrors();
});

test("Carino's Special Ammo slots open the ammo selector; a third one needs Well Prepared", async ({ page }) => {
  const { planner, hero } = await openHero(page);
  await hero.selectHero("carino-ranger-of-glory");
  await expect(hero.button("Requires Well Prepared")).toBeDisabled();
  await hero.button("Select support for Special Ammo slot 1").click();
  await expect(hero.ammoSelector()).toBeVisible();
  await expect(page.locator("#carino-ammo-title")).toHaveText("Select Special Ammo Support · Slot 1");
  const option = hero.ammoSelector().locator("[data-select-carino-ammo]:not(:disabled)").first();
  const name = await option.getAttribute("data-select-carino-ammo");
  await option.click();
  await expect(hero.ammoSelector()).not.toBeVisible();
  const slot = hero.button(`Edit ${name}; right-click to remove`);
  await expect(slot).toBeVisible();
  await expect(async () => {
    await page.mouse.move(0, 0);
    await slot.hover();
    await expect(hero.tooltip()).toContainText(name, { timeout: 500 });
  }).toPass();
  await expect(hero.tooltip()).toContainText("Click to edit · Right-click to remove");
  await slot.click({ button: "right" });
  await expect(hero.toast()).toHaveText(`${name} removed`);
  await expect(hero.button("Select support for Special Ammo slot 1")).toBeVisible();
  await planner.expectNoErrors();
});

test("Rosa's trait support slot opens the support selector", async ({ page }) => {
  const { planner, hero } = await openHero(page);
  await hero.selectHero("rosa-high-court-chariot");
  await hero.button("Select support for Holy Domain").click();
  await expect(hero.skillSelector()).toBeVisible();
  await page.keyboard.press("Escape");
  await planner.expectNoErrors();
});

test("a build without a hero asks for one", async ({ page }) => {
  const { planner, hero } = await openHero(page, { ...youga, hero: { ...youga.hero, selectedHeroId: "" } });
  await expect(hero.heroName()).toHaveText("No hero selected");
  await expect(hero.heroTrait()).toHaveText("Choose a hero trait");
  await expect(hero.detailTabs()).toBeHidden();
  await expect(hero.tree()).toContainText("Select a hero");
  await hero.button("Choose Hero").click();
  await expect(hero.heroSelector()).toBeVisible();
  await planner.expectNoErrors();
});

test("hovering a trait shows its tooltip", async ({ page }) => {
  const { planner, hero } = await openHero(page);
  await expect(async () => {
    await page.mouse.move(0, 0);
    await hero.button("I Am the Ultimate One").hover();
    await expect(hero.tooltip()).toContainText("I Am the Ultimate One", { timeout: 500 });
  }).toPass();
  await planner.expectNoErrors();
});

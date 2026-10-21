// The slate crafter (the Slate Inventory's Craft Slate, or Edit on a slate): Craft Slate (a god, a shape, rotation and
// flips, two fixed and three random affixes picked in the searchable list, a name), Nether King (its type, Authority and
// Brand Talent Nodes), Craft Legendary Slate (the templates, a copy rule, talent affixes), and Add to Inventory / Save
// Changes. Written against the legacy crafter before it moves to React, so both must pass it unchanged.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { SlatesPage } from "./pages/slates-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const FALLEN = "game-log-slate-5";
test.use({ viewport: { width: 1440, height: 900 } });

async function openCrafter(page) {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  const slates = new SlatesPage(page);
  await slates.open();
  await slates.inventoryButton().click();
  await slates.inventory().getByRole("button", { name: "Craft Slate", exact: true }).click();
  const crafter = slates.inventory();
  await expect(crafter.locator("[data-slate-inventory-tab].active")).toHaveText("Craft Slate");
  return { planner, slates, crafter };
}
// An affix select lists its pool in the planner's search popover (a pointer press opens it).
async function pick(page, select, query) {
  await select.dispatchEvent("pointerdown");
  const popover = page.locator("#select-search-popover");
  await popover.locator("input").fill(query);
  const choice = popover.locator(".select-search-result").first();
  const text = await choice.textContent();
  await choice.click();
  await expect(popover).toHaveCount(0);
  return text;
}
const card = (crafter) => crafter.locator(".slate-craft-card");
const shapePreview = (crafter) => crafter.locator(".slate-shape-preview > *").first();
const legends = (crafter) => crafter.locator("#slate-crafter-body fieldset > legend");

test("Craft Slate: a god, a shape, rotation and flips, affixes and a name; Add to Inventory saves them", async ({
  page,
}) => {
  const { planner, slates, crafter } = await openCrafter(page);
  await expect(legends(crafter)).toHaveText([
    "God",
    "Shape & Orientation",
    "Fixed Affixes (0/2)",
    "Random Affixes (0/3)",
  ]);
  await expect(card(crafter)).toContainText("Goddess of DeceptionDIVINITY SLATE · MAGIC");
  await expect(card(crafter)).toContainText("Choose affixes to preview their effects.");

  await crafter.locator('[data-slate-god="God of War"]').click();
  await expect(crafter.locator("[data-slate-god].active")).toHaveText("God of War");
  await expect(card(crafter).locator("strong")).toHaveText("God of War");
  await expect(crafter.locator("[data-craft-shape]")).toHaveCount(4);
  await expect(crafter.locator("[data-craft-shape].active")).toHaveAttribute("data-craft-shape", "war-0");
  await crafter.locator('[data-craft-shape="war-2"]').click();
  await expect(crafter.locator("[data-craft-shape].active")).toHaveAttribute("data-craft-shape", "war-2");
  await crafter.locator('[data-craft-transform="rotate"]').click();
  await crafter.locator('[data-craft-transform="flip-v"]').click();
  await expect(shapePreview(crafter)).toHaveAttribute("style", /rotate\(90deg\) scale\(1, -1\)/);
  // A new shape starts upright again.
  await crafter.locator('[data-craft-shape="war-1"]').click();
  await crafter.locator('[data-craft-transform="flip-h"]').click();
  await expect(shapePreview(crafter)).toHaveAttribute("style", /rotate\(0deg\) scale\(-1, 1\)/);

  const rows = crafter.locator(".slate-affix-row select");
  await expect(rows).toHaveCount(5);
  const fixed = await pick(page, rows.nth(0), "damage");
  await expect(legends(crafter).nth(2)).toHaveText("Fixed Affixes (1/2)");
  await pick(page, rows.nth(2), "speed");
  await expect(legends(crafter).nth(3)).toHaveText("Random Affixes (1/3)");
  await expect(card(crafter).locator(".slate-craft-affix-preview h3")).toHaveText(["Fixed Affixes", "Random Affixes"]);
  await expect(card(crafter).locator(".slate-craft-affix-preview li")).toHaveCount(2);
  await expect(card(crafter).locator(".slate-craft-affix-preview li").first()).toContainText(
    fixed.slice(fixed.lastIndexOf(": ") + 2),
  );
  await crafter.locator("[data-slate-craft-name]").fill("Probe Slate");
  await expect(card(crafter).locator("strong")).toHaveText("Probe Slate");

  await crafter.getByRole("button", { name: "Add to Inventory", exact: true }).click();
  await expect(page.locator("#toast")).toHaveText("Probe Slate added to Slate Inventory");
  await expect(crafter.locator("#slate-inventory-title")).toHaveText("Slate Inventory");
  const saved = (await slates.stored()).inventory.at(-1);
  expect(saved).toMatchObject({
    name: "Probe Slate",
    god: "God of War",
    shape: "war-1",
    rotation: 0,
    flipX: -1,
    flipY: 1,
    rarity: "magic",
  });
  expect(saved.affixes).toHaveLength(2);
  expect(saved.affixGroups.fixed[0]).toBe(saved.affixes[0]);
  expect(saved.affixGroups.fixed[1]).toBe("");
  expect(saved.affixGroups.random).toEqual([saved.affixes[1], "", ""]);
  expect(saved.icon).toMatch(/\S/);
  await planner.expectNoErrors();
});

test("Nether King: its type, the Authority effect and Brand Talent Nodes; saved as a legendary Nether King slate", async ({
  page,
}) => {
  const { planner, slates, crafter } = await openCrafter(page);
  await crafter.locator('[data-slate-inventory-tab="judgment"]').click();
  await expect(legends(crafter)).toHaveText([
    "Nether King Type",
    "Shape & Orientation",
    "Authority Effect",
    "Fixed Affixes (0/2)",
    "Brand Talent Nodes (0/3)",
  ]);
  await crafter.locator('[data-nether-slate-type="Offspring"]').click();
  await expect(crafter.locator("[data-nether-slate-type].active")).toHaveText("Offspring");
  await expect(crafter.locator("input.slate-readonly")).toHaveValue("Nether King's Divinity: Offspring");
  await expect(card(crafter)).toContainText("Nether King's Divinity: OffspringNETHER KING'S DIVINITY · LEGENDARY");
  await pick(page, crafter.locator(".slate-affix-row select").nth(3), "e");
  await expect(legends(crafter).nth(4)).toHaveText("Brand Talent Nodes (1/3)");
  await crafter.getByRole("button", { name: "Add to Inventory", exact: true }).click();
  const saved = (await slates.stored()).inventory.at(-1);
  expect(saved).toMatchObject({
    name: "Nether King's Divinity: Offspring",
    god: "Nether King",
    shape: "authority",
    rarity: "legendary",
  });
  expect(saved.affixGroups.brand[1]).toBe(saved.affixes[0]);
  await planner.expectNoErrors();
});

test("Craft Legendary Slate: the templates; a copy rule picks its direction; talent affixes count up", async ({
  page,
}) => {
  const { planner, slates, crafter } = await openCrafter(page);
  await crafter.locator('[data-slate-inventory-tab="legendary"]').click();
  await expect(crafter.locator("[data-slate-template]")).toHaveText([
    "Sparks of Moth Fire",
    "Fallen Starlight",
    "A Corner of Divinity",
    "Space Rift",
    "Pedigree of Gods",
    "Residence of Stars",
    "When Sparks Set the Prairie Ablaze",
  ]);
  await expect(crafter.locator(".slate-empty-preview")).toHaveText("Select options to preview slate");

  await crafter.locator('[data-slate-template="Sparks of Moth Fire"]').click();
  const sparks = crafter.locator("[data-sparks-copy-rule]");
  await expect(sparks.locator("option")).toHaveCount(4);
  await expect(card(crafter).locator("[data-sparks-preview-direction]")).toHaveText("From above");
  await sparks.selectOption({ index: 2 });
  await expect(card(crafter).locator("[data-sparks-preview-rule]")).toHaveText(await sparks.inputValue());
  await expect(card(crafter).locator("[data-sparks-preview-direction]")).not.toHaveText("From above");
  await crafter.locator('[data-craft-transform="rotate"]').click();
  await expect(card(crafter).locator(":scope > img")).toHaveAttribute("style", /rotate\(90deg\)/);
  await crafter.getByRole("button", { name: "Add to Inventory", exact: true }).click();
  const moth = (await slates.stored()).inventory.at(-1);
  expect(moth).toMatchObject({ name: "Sparks of Moth Fire", template: "Sparks of Moth Fire", rotation: 90 });
  expect(moth.copyRule).toBe(moth.affixes[0]);

  await slates.inventory().getByRole("button", { name: "Craft Slate", exact: true }).click();
  await crafter.locator('[data-slate-inventory-tab="legendary"]').click();
  await crafter.locator('[data-slate-template="Space Rift"]').click();
  await crafter.locator("[data-legendary-copy-rule]").selectOption({ index: 1 });
  await expect(card(crafter).locator("[data-legendary-copy-label]")).toHaveText("From right");
  await expect(card(crafter).locator("[data-legendary-copy-arrow]")).toHaveText("→");
  await crafter.locator("[data-change-slate-template]").click();
  await expect(crafter.locator("[data-slate-template]")).toHaveCount(7);

  await crafter.locator('[data-slate-template="Fallen Starlight"]').click();
  const slots = crafter.locator("[data-legendary-affix]");
  await expect(slots).toHaveCount(4);
  await expect(legends(crafter).last()).toHaveText("Talent Affixes (0/4)");
  await pick(page, slots.nth(1), "e");
  await expect(legends(crafter).last()).toHaveText("Talent Affixes (1/4)");
  await expect(card(crafter).locator(".slate-craft-affix-preview h3")).toHaveText("Talent Affixes");
  await crafter.getByRole("button", { name: "Add to Inventory", exact: true }).click();
  const fallen = (await slates.stored()).inventory.at(-1);
  expect(fallen).toMatchObject({ name: "Fallen Starlight", template: "Fallen Starlight", rarity: "legendary" });
  expect(fallen.affixes).toHaveLength(4);
  expect(fallen.affixes[0]).toBe("");
  expect(fallen.affixes[1]).toMatch(/\S/);
  await planner.expectNoErrors();
});

test("Edit on a legendary slate: its orientation and affixes fill the form; Save Changes updates it in place", async ({
  page,
}) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  const slates = new SlatesPage(page);
  await slates.open();
  await slates.inventoryButton().click();
  const crafter = slates.inventory();
  await crafter
    .locator(".crafted-slate-item")
    .filter({ hasText: "Fallen Starlight" })
    .getByTitle("Edit", { exact: true })
    .click();
  await expect(shapePreview(crafter)).toHaveAttribute("style", /rotate\(270deg\) scale\(1, 1\)/);
  await expect(legends(crafter).last()).toHaveText("Talent Affixes (4/4)");
  await expect(card(crafter).locator(".slate-craft-affix-preview li")).toHaveCount(4);
  await crafter.locator('[data-craft-transform="rotate"]').click();
  await crafter.getByRole("button", { name: "Save Changes", exact: true }).click();
  const stored = await slates.stored();
  const fallen = stored.inventory.find((slate) => slate.id === FALLEN);
  expect(fallen.rotation).toBe(0);
  expect(fallen.affixes).toEqual(youga.slates.inventory.find((slate) => slate.id === FALLEN).affixes);
  expect(stored.inventory).toHaveLength(3);
  await planner.expectNoErrors();
});

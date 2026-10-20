// Pactspirits view ("Pacts" tab): the three pact slots, their trees, Kismets and the dialogs they open. Written against the
// legacy view before it moved to React, so both must pass it unchanged. The golden-master Youga build has Kismet slot mode
// on and every Dreamweaver node allocated; the default library has slot mode off.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { PactsPage } from "./pages/pacts-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const withKismet = structuredClone(youga);
withKismet.pacts.kismetSlots = { "Dreamweaver:0": { name: "Micro Fate: Fire Resistance", rolls: [7] } };
const DREAMWEAVER = "Dreamweaver";

async function openPacts(page, state = youga) {
  const planner = new PlannerPage(page);
  await planner.open(state);
  const pacts = new PactsPage(page);
  await pacts.open();
  return { planner, pacts };
}

test("lists the three Pactspirits with their levels, trees and Kismet counts", async ({ page }) => {
  const { planner, pacts } = await openPacts(page);
  await expect(pacts.count()).toHaveText("3/3");
  for (const name of [DREAMWEAVER, "Iron Lion", "Awooawoo - White Mist"])
    await expect(pacts.slotButton(name)).toBeVisible();
  await expect(pacts.level(DREAMWEAVER)).toHaveValue("1");
  await expect(pacts.allocatedCount(DREAMWEAVER)).toHaveText("11 allocated");
  await expect(pacts.node(DREAMWEAVER, "Elemental Mastery")).toHaveAttribute("aria-pressed", "true");
  await expect(pacts.kismetSummary()).toContainText("Micro Kismets");
  await expect(pacts.kismetSummary()).toContainText("Medium Kismets");
  await planner.expectNoErrors();
});

test("removing a Pactspirit empties its slot, and choosing one fills it again", async ({ page }) => {
  const { planner, pacts } = await openPacts(page);
  await pacts.removeButton(DREAMWEAVER).click();
  await expect(pacts.slotButton("Select Pactspirit 1")).toBeVisible();
  await expect(pacts.count()).toHaveText("2/3");
  expect((await pacts.storedPacts()).selectedSpirits).toEqual(["", "Iron Lion", "Awooawoo - White Mist"]);
  await pacts.slotButton("Select Pactspirit 1").click();
  await expect(pacts.pactspiritSelector()).toBeVisible();
  await pacts.pactspiritChoice(DREAMWEAVER).click();
  await expect(pacts.pactspiritSelector()).toBeHidden();
  await expect(pacts.slotButton(DREAMWEAVER)).toBeVisible();
  await expect(pacts.count()).toHaveText("3/3");
  expect((await pacts.storedPacts()).selectedSpirits[0]).toBe(DREAMWEAVER);
  await planner.expectNoErrors();
});

test("right-clicking a Pactspirit removes it", async ({ page }) => {
  const { planner, pacts } = await openPacts(page);
  await pacts.slotButton("Iron Lion").click({ button: "right" });
  await expect(pacts.slotButton("Select Pactspirit 2")).toBeVisible();
  expect((await pacts.storedPacts()).selectedSpirits).toEqual([DREAMWEAVER, "", "Awooawoo - White Mist"]);
  await planner.expectNoErrors();
});

test("a Pactspirit's level is saved", async ({ page }) => {
  const { planner, pacts } = await openPacts(page);
  await pacts.level(DREAMWEAVER).selectOption("4");
  expect((await pacts.storedPacts()).spiritLevels[DREAMWEAVER]).toBe(4);
  await page.reload();
  await planner.waitUntilReady();
  await pacts.open();
  await expect(pacts.level(DREAMWEAVER)).toHaveValue("4");
  await planner.expectNoErrors();
});

test("slot mode: a node is refunded and allocated again by click and by Enter", async ({ page }) => {
  const { planner, pacts } = await openPacts(page);
  const mastery = pacts.node(DREAMWEAVER, "Elemental Mastery");
  await mastery.click();
  await expect(mastery).toHaveAttribute("aria-pressed", "false");
  expect((await pacts.storedPacts()).nativeNodeQuantities[`${DREAMWEAVER}:9`] ?? 0).toBe(0);
  await mastery.focus();
  await page.keyboard.press("Enter");
  await expect(mastery).toHaveAttribute("aria-pressed", "true");
  expect((await pacts.storedPacts()).nativeNodeQuantities[`${DREAMWEAVER}:9`]).toBeGreaterThan(0);
  await planner.expectNoErrors();
});

test("slot mode: right-click opens the Kismet crafter on a Kismet node and the Fate slots on the Fate node", async ({
  page,
}) => {
  const { planner, pacts } = await openPacts(page);
  await pacts.node(DREAMWEAVER, "Elemental Damage I").click({ button: "right" });
  await expect(pacts.kismetCrafter()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(pacts.kismetCrafter()).toBeHidden();
  await pacts.node(DREAMWEAVER, "Undetermined Fate Slots").click({ button: "right" });
  await expect(pacts.fateSlotSelector()).toBeVisible();
  await planner.expectNoErrors();
});

test("hovering a node shows its tooltip", async ({ page }) => {
  const { planner, pacts } = await openPacts(page);
  const mastery = pacts.node(DREAMWEAVER, "Elemental Mastery");
  // The planner ignores hovers for a moment after a scroll, and hover() scrolls the node into view first.
  await expect(async () => {
    await page.mouse.move(0, 0);
    await mastery.hover();
    await expect(pacts.tooltip()).toBeVisible({ timeout: 500 });
  }).toPass();
  await expect(pacts.tooltip()).toContainText("Elemental Mastery");
  await planner.expectNoErrors();
});

test("an equipped Kismet moves to another slot by drag, and is copied with a right-click during the drag", async ({
  page,
}) => {
  const { planner, pacts } = await openPacts(page, withKismet);
  const first = pacts.node(DREAMWEAVER, "Elemental Damage I", 0);
  const second = pacts.node(DREAMWEAVER, "Elemental Damage I", 1);
  await expect(first).toHaveAttribute("aria-label", /drag to move/);
  await pacts.drag(first, second);
  await expect(second).toHaveAttribute("aria-label", /drag to move/);
  expect(Object.keys((await pacts.storedPacts()).kismetSlots)).toEqual([`${DREAMWEAVER}:1`]);
  await pacts.drag(second, first, { copy: true });
  await expect(first).toHaveAttribute("aria-label", /drag to move/);
  expect(Object.keys((await pacts.storedPacts()).kismetSlots).sort()).toEqual([`${DREAMWEAVER}:0`, `${DREAMWEAVER}:1`]);
  await expect(page.locator(".kismet-drag-ghost")).toHaveCount(0);
  await expect(page.locator(".kismet-drag-source, .kismet-drop-target")).toHaveCount(0);
  await planner.expectNoErrors();
});

test("without slot mode, clicking a Kismet node opens the crafter", async ({ page }) => {
  const { planner, pacts } = await openPacts(page, null);
  await expect(pacts.count()).toHaveText("3/3");
  const node = pacts.slots().first().locator('.pact-tree-node[aria-label$="Click to craft a Kismet"]').first();
  await node.click();
  await expect(pacts.kismetCrafter()).toBeVisible();
  await planner.expectNoErrors();
});

// ---- The Kismet crafter (right-click on a Kismet node in slot mode, or a click without it).
const crafter = (pacts) => pacts.kismetCrafter();
const choices = (pacts) => crafter(pacts).locator(".kismet-choice");
async function openCrafter(page, nodeName = "Elemental Damage I", state = youga) {
  const { planner, pacts } = await openPacts(page, state);
  await pacts.node(DREAMWEAVER, nodeName).click({ button: "right" });
  await expect(crafter(pacts)).toBeVisible();
  return { planner, pacts };
}

test("the Kismet crafter lists its kind's Kismets; the search filters by name and effect", async ({ page }) => {
  const { planner, pacts } = await openCrafter(page);
  await expect(crafter(pacts).locator("#kismet-crafter-title")).toHaveText("Select Micro Kismet");
  const search = crafter(pacts).getByRole("searchbox", { name: "Search kismets" });
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("");
  await expect(choices(pacts)).toHaveCount(51);
  await expect(choices(pacts).first()).toHaveText("Micro Fate: Affliction Effect+(10–13)% Affliction EffectRare");
  await expect(choices(pacts).first()).toHaveClass(/\bselected\b/);
  await expect(choices(pacts).first().locator("em")).toHaveClass("rare");
  await expect(choices(pacts).first().locator("img")).toHaveAttribute("src", /\S/);
  await search.fill("minion attack and cast");
  await expect(choices(pacts).locator("strong")).toHaveText(["Micro Fate: Attack Cast Speed"]);
  await search.fill("zzz");
  await expect(crafter(pacts).locator(".kismet-no-results")).toHaveText("No matching kismets.");
  await search.fill("");
  await expect(choices(pacts)).toHaveCount(51);
  await page.keyboard.press("Escape");
  await expect(crafter(pacts)).toBeHidden();
  // A medium node lists the medium Kismets, Legendary first; a Kismet without rolls says so.
  await pacts.node(DREAMWEAVER, "Elemental Damage II").click({ button: "right" });
  await expect(crafter(pacts).locator("#kismet-crafter-title")).toHaveText("Select Medium Kismet");
  await expect(crafter(pacts).getByRole("searchbox", { name: "Search kismets" })).toHaveValue("");
  await expect(choices(pacts).first().locator("strong")).toHaveText("Dual Kismet: Banshee");
  await expect(choices(pacts).first().locator("em")).toHaveClass("legendary");
  await expect(crafter(pacts).locator(".kismet-fixed-roll")).toHaveText("This Kismet has fixed effects.");
  await expect(crafter(pacts).locator("#kismet-preview p")).toHaveText("Install to replace this Medium node.");
  await planner.expectNoErrors();
});

test("a Kismet's values: slider and number together, out of range ignored until committed, the preview follows", async ({
  page,
}) => {
  const { planner, pacts } = await openCrafter(page);
  await choices(pacts).filter({ hasText: "Micro Fate: Attack Cast Speed" }).click();
  await expect(choices(pacts).filter({ hasText: "Micro Fate: Attack Cast Speed" })).toHaveClass(/\bselected\b/);
  const rows = crafter(pacts).locator(".kismet-roll-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.locator("span")).toHaveText(["Value 1: 6", "Value 2: 6"]);
  await expect(rows.locator("small")).toHaveText([
    "+(4–6)% Attack and Cast Speed",
    "+(4–6)% Minion Attack and Cast Speed",
  ]);
  const preview = crafter(pacts).locator("#kismet-preview");
  await expect(preview.locator(".kismet-preview-head")).toHaveText("Micro Fate: Attack Cast SpeedRare · Micro Kismet");
  await expect(preview.locator("li")).toHaveText(["+6% Attack and Cast Speed", "+6% Minion Attack and Cast Speed"]);

  const value1 = crafter(pacts).getByRole("spinbutton", { name: "Value 1" });
  await value1.fill("4");
  await expect(rows.first().locator("strong")).toHaveText("4");
  await expect(rows.first().getByRole("slider")).toHaveValue("4");
  await expect(preview.locator("li").first()).toHaveText("+4% Attack and Cast Speed");
  await value1.fill("9");
  await expect(rows.first().locator("strong")).toHaveText("4");
  await value1.press("Tab");
  await expect(value1).toHaveValue("6");
  await expect(rows.first().locator("strong")).toHaveText("6");
  await rows.nth(1).getByRole("slider").fill("5");
  await expect(crafter(pacts).getByRole("spinbutton", { name: "Value 2" })).toHaveValue("5");
  await expect(preview.locator("li").nth(1)).toHaveText("+5% Minion Attack and Cast Speed");
  await planner.expectNoErrors();
});

test("Confirm installs the Kismet with its values, the crafter reopens on it, and Clear Slot empties the slot", async ({
  page,
}) => {
  const { planner, pacts } = await openCrafter(page);
  await choices(pacts).filter({ hasText: "Micro Fate: Fire Resistance" }).click();
  await crafter(pacts).getByRole("spinbutton", { name: "Value 1" }).fill("5");
  await crafter(pacts).getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(crafter(pacts)).toBeHidden();
  expect((await pacts.storedPacts()).kismetSlots[`${DREAMWEAVER}:0`]).toEqual({
    name: "Micro Fate: Fire Resistance",
    rolls: [5],
  });
  const node = pacts.node(DREAMWEAVER, "Elemental Damage I");
  await expect(node).toHaveAttribute("aria-label", /drag to move/);

  await node.click({ button: "right" });
  await expect(choices(pacts).filter({ hasText: "Micro Fate: Fire Resistance" })).toHaveClass(/\bselected\b/);
  await expect(crafter(pacts).getByRole("spinbutton", { name: "Value 1" })).toHaveValue("5");
  await crafter(pacts).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(crafter(pacts)).toBeHidden();
  expect((await pacts.storedPacts()).kismetSlots[`${DREAMWEAVER}:0`].rolls).toEqual([5]);

  await node.click({ button: "right" });
  await crafter(pacts).getByRole("button", { name: "Clear Slot", exact: true }).click();
  await expect(crafter(pacts)).toBeHidden();
  expect((await pacts.storedPacts()).kismetSlots[`${DREAMWEAVER}:0`]).toBeUndefined();
  await node.click({ button: "right" });
  await crafter(pacts).getByRole("button", { name: "Close Kismet crafter" }).click();
  await expect(crafter(pacts)).toBeHidden();
  await planner.expectNoErrors();
});

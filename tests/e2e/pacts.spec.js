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

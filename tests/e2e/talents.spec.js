// Talent trees of the Build page: the four tree tabs, the open tree's points and actions, core talents, allocating and
// removing points, the tree picker, and the installed prism (its dialog, removal, installation, drag). Written against
// the legacy section before it moves to React, so both must pass it unchanged. The golden-master Youga build has
// Goddess of Knowledge, Prophet, Marksman and Lich, with an Ethereal Prism (Haze) on Lich node 4,0.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { TalentsPage } from "./pages/talents-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
// Tall enough for the whole tree to be on screen (the prism drag moves the mouse, which does not scroll the page).
test.use({ viewport: { width: 1440, height: 1100 } });

async function openTalents(page, tree = "Tree 4", state = youga) {
  const planner = new PlannerPage(page);
  await planner.open(state);
  const talents = new TalentsPage(page);
  await talents.open();
  if (tree) await talents.openTree(tree);
  return { planner, talents };
}

test("the tabs show the build's four trees and the total; a tab opens its tree with its points", async ({ page }) => {
  const { planner, talents } = await openTalents(page, null);
  await expect(talents.tab("God tree")).toContainText("Goddess of Knowledge");
  await expect(talents.tab("Class tree")).toContainText("Prophet");
  await expect(talents.tab("Tree 3")).toContainText("Marksman");
  await expect(talents.tab("Tree 4")).toContainText("Lich");
  // A tab names its tree only: the points are the open tree's, beside its core talents.
  await expect(talents.tab("God tree")).not.toContainText("pts");
  await expect(talents.totalPoints()).toHaveText("109 / 115");

  await talents.openTree("Tree 4");
  await expect(talents.tab("God tree")).not.toHaveClass(/\bactive\b/);
  await expect(talents.panelPoints()).toHaveText("30 Talent Points spent in current panel");
  await expect(talents.action("Install Prism")).toBeVisible();
  await expect(talents.node("1,1")).toHaveAccessibleName("Unallocated micro talent, rank 0 of 3");
  await expect(talents.node("0,0")).toHaveAccessibleName("Unallocated micro talent, rank 3 of 3, Maximum rank reached");
  await expect(talents.node("0,0")).toHaveClass(/\ballocated\b/);
  await expect(talents.node("1,2")).toHaveClass(/\blocked\b/);

  await talents.openTree("God tree");
  await expect(talents.panelPoints()).toHaveText("28 Talent Points spent in current panel");
  // The God tree takes no prism.
  await expect(talents.action("Install Prism")).toBeHidden();
  await planner.expectNoErrors();
});

test("a prism's extra allocations let a Micro in its area take points past its printed max", async ({ page }) => {
  // Lich (5,1) is a Micro at 3 of 3, inside a 3x3 prism area on (4,0).
  const state = structuredClone(youga);
  state.talents.prismInventory = [
    {
      id: "e2e-extra",
      type: "ethereal",
      base: "Phantasmagoria",
      radiusAffix: "The Effect Area expands to 3x3 Rectangle",
      rareAffix: "",
      legendaryAffix: "Points can be allocated to all Micro Talent within the area 2 additional time(s)",
      baseAffix: "",
    },
  ];
  state.talents.installedPrisms = { Lich: "e2e-extra" };
  const { planner, talents } = await openTalents(page, "Tree 4", state);
  await expect(talents.node("5,1")).toHaveAccessibleName("Unallocated micro talent, rank 3 of 5, within prism area");
  await talents.node("5,1").click();
  await expect(talents.node("5,1")).toHaveAccessibleName("Unallocated micro talent, rank 4 of 5, within prism area");
  expect((await talents.stored()).ranks["Lich:5,1"]).toBe(4);
  await planner.expectNoErrors();
});

test("the planner opens on the build's first tree", async ({ page }) => {
  const { planner, talents } = await openTalents(page, null);
  await expect(talents.tab("God tree")).toHaveClass(/\bactive\b/);
  await expect(talents.panelPoints()).toHaveText("28 Talent Points spent in current panel");
  await planner.expectNoErrors();
});

test("a click adds a point and a right-click takes one off; a right-click on an empty node fills it", async ({
  page,
}) => {
  const { planner, talents } = await openTalents(page);
  await talents.node("1,1").click();
  await expect(talents.node("1,1")).toHaveAccessibleName("Unallocated micro talent, rank 1 of 3");
  await expect(talents.node("1,1")).toHaveClass(/\ballocated\b/);
  await expect(talents.panelPoints()).toHaveText("31 Talent Points spent in current panel");
  await expect(talents.totalPoints()).toHaveText("110 / 115");
  expect((await talents.stored()).ranks["Lich:1,1"]).toBe(1);

  await talents.node("1,1").click({ button: "right" });
  await expect(talents.node("1,1")).toHaveAccessibleName("Unallocated micro talent, rank 0 of 3");
  await expect(talents.panelPoints()).toHaveText("30 Talent Points spent in current panel");
  await expect(talents.totalPoints()).toHaveText("109 / 115");

  await talents.node("1,1").click({ button: "right" });
  await expect(talents.node("1,1")).toHaveAccessibleName("Unallocated micro talent, rank 3 of 3, Maximum rank reached");
  await expect(talents.panelPoints()).toHaveText("33 Talent Points spent in current panel");
  await expect(talents.totalPoints()).toHaveText("112 / 115");
  expect((await talents.stored()).ranks["Lich:1,1"]).toBe(3);
  await planner.expectNoErrors();
});

test("a full node takes no more points; taking points off can take a dependent node along", async ({ page }) => {
  const { planner, talents } = await openTalents(page);
  await talents.node("0,0").click();
  await expect(talents.toast()).toHaveText("Maximum rank reached");
  // The first point off also empties node 1,0 (3 points), which hangs on it (the engine's removal rule).
  await talents.node("0,0").click({ button: "right" });
  await expect(talents.node("0,0")).toHaveAccessibleName("Unallocated micro talent, rank 2 of 3");
  await expect(talents.node("1,0")).toHaveAccessibleName(/rank 0 of 3/);
  await expect(talents.panelPoints()).toHaveText("26 Talent Points spent in current panel");
  await expect(talents.totalPoints()).toHaveText("105 / 115");
  await talents.node("0,0").click({ button: "right" });
  await talents.node("0,0").click({ button: "right" });
  await expect(talents.node("0,0")).toHaveAccessibleName("Unallocated micro talent, rank 0 of 3");
  await expect(talents.panelPoints()).toHaveText("24 Talent Points spent in current panel");
  await expect(talents.totalPoints()).toHaveText("103 / 115");
  const ranks = (await talents.stored()).ranks;
  expect(ranks["Lich:0,0"]).toBe(0);
  expect(ranks["Lich:1,0"]).toBe(0);
  await planner.expectNoErrors();
});

test("a click on a node behind an empty one also fills the way to it", async ({ page }) => {
  const { planner, talents } = await openTalents(page);
  await expect(talents.node("2,1")).toHaveAccessibleName(
    "Unallocated medium talent, rank 0 of 3, Requires an allocated connected talent to the left",
  );
  await talents.node("2,1").click();
  await expect(talents.node("2,1")).toHaveAccessibleName(/rank 1 of 3/);
  const ranks = (await talents.stored()).ranks;
  expect(ranks["Lich:2,1"]).toBe(1);
  expect(ranks["Lich:1,1"]).toBeGreaterThan(0);
  await planner.expectNoErrors();
});

test("a core talent slot opens its picker; a choice fills it, a right-click empties it", async ({ page }) => {
  const { planner, talents } = await openTalents(page);
  await expect(talents.core(24)).toHaveAccessibleName("24 point core: Off The Beaten Track");
  await expect(talents.core(24)).toHaveClass(/\bselected\b/);
  await expect(talents.cores().nth(1)).toHaveAccessibleName("Separate prism effect: Haze");

  await talents.core(24).click({ button: "right" });
  await expect(talents.toast()).toHaveText("Core talent removed");
  await expect(talents.core(24)).toHaveAccessibleName("24 point core: Select core talent");
  expect((await talents.stored()).coreSelections["Lich:24"]).toBeUndefined();

  await talents.core(24).click();
  await expect(talents.corePicker()).toBeVisible();
  await talents
    .corePicker()
    .getByRole("button", { name: /Off The Beaten Track/ })
    .click();
  await expect(talents.toast()).toHaveText("Off The Beaten Track selected");
  await expect(talents.corePicker()).not.toBeVisible();
  await expect(talents.core(24)).toHaveAccessibleName("24 point core: Off The Beaten Track");
  expect((await talents.stored()).coreSelections["Lich:24"]).toBe("Off The Beaten Track");
  await planner.expectNoErrors();
});

test("Reset empties the open tree's points and cores; Reselect opens the tree picker for its slot", async ({
  page,
}) => {
  const { planner, talents } = await openTalents(page);
  await talents.action("Reset").click();
  await expect(talents.toast()).toHaveText("Lich points reset");
  await expect(talents.panelPoints()).toHaveText("0 Talent Points spent in current panel");
  await expect(talents.totalPoints()).toHaveText("79 / 115");
  await expect(talents.core(24)).toHaveAccessibleName("24 point core: Select core talent (locked)");
  await expect(talents.node("0,0")).toHaveAccessibleName("Unallocated micro talent, rank 0 of 3");
  const stored = await talents.stored();
  expect(stored.coreSelections["Lich:24"]).toBeUndefined();
  expect(stored.coreSelections["Marksman:24"]).toBe("Gale");

  await talents.action("Reselect").click();
  await expect(talents.treePicker()).toBeVisible();
  await expect(talents.treePickerTitle()).toHaveText("Select talent tree 4");
  await page.keyboard.press("Escape");
  await expect(talents.treePicker()).not.toBeVisible();
  await planner.expectNoErrors();
});

test("a right-click on a tree tab removes it and the trees after it; an empty tab picks a new tree", async ({
  page,
}) => {
  const { planner, talents } = await openTalents(page);
  await talents.tab("Tree 3").click({ button: "right" });
  await expect(talents.toast()).toHaveText("Talent tree removed");
  await expect(talents.tab("Tree 3")).toHaveClass(/\bempty\b/);
  await expect(talents.tab("Tree 3")).toContainText("Click to select");
  await expect(talents.tab("Tree 4")).toContainText("Select previous");
  await expect(talents.tab("Tree 4")).toBeDisabled();
  let stored = await talents.stored();
  expect(stored.selectedTrees).toEqual(["Goddess of Knowledge", "Prophet", "", ""]);
  expect(stored.installedPrisms.Lich).toBeUndefined();

  await talents.tab("Tree 3").click();
  await expect(talents.treePicker()).toBeVisible();
  await expect(talents.treePickerTitle()).toHaveText("Select talent tree 3");
  await talents.treePickerTree("Marksman").click();
  await expect(talents.treePicker()).not.toBeVisible();
  await expect(talents.tab("Tree 3")).toContainText("Marksman");
  await expect(talents.tab("Tree 3")).toHaveClass(/\bactive\b/);
  await expect(talents.panelPoints()).toHaveText("0 Talent Points spent in current panel");
  stored = await talents.stored();
  expect(stored.selectedTrees).toEqual(["Goddess of Knowledge", "Prophet", "Marksman", ""]);
  await planner.expectNoErrors();
});

test("the installed prism opens the prism inventory on click and comes off with a right-click", async ({ page }) => {
  const { planner, talents } = await openTalents(page);
  await expect(talents.prismNode()).toHaveAccessibleName("Ethereal Prism: Haze installed here");
  await expect(talents.node("4,0")).toHaveClass(/\bprism-covered-node\b/);
  await expect(talents.stage().locator(".prism-area-box")).toHaveCount(1);
  await expect(talents.prismCore()).toHaveAccessibleName("Separate prism effect: Haze");

  await talents.prismNode().click();
  await expect(talents.prismInventory()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(talents.prismInventory()).not.toBeVisible();

  await talents.prismNode().click({ button: "right" });
  await expect(talents.toast()).toHaveText("Prism removed from talent node");
  await expect(talents.prismNode()).toHaveCount(0);
  await expect(talents.prismCore()).toHaveCount(0);
  const stored = await talents.stored();
  expect(stored.installedPrisms.Lich).toBeUndefined();
  expect(stored.installedPrismNodes.Lich).toBeUndefined();
  await planner.expectNoErrors();
});

test("Install Prism places a prism from the inventory on the next node clicked, or Cancel stops it", async ({
  page,
}) => {
  const { planner, talents } = await openTalents(page);
  await talents.prismNode().click({ button: "right" });
  await expect(talents.toast()).toHaveText("Prism removed from talent node");

  await talents.action("Install Prism").click();
  await expect(talents.prismInventory()).toBeVisible();
  await talents.prismInventory().getByRole("button", { name: "Install", exact: true }).click();
  await expect(talents.prismInventory()).not.toBeVisible();
  await expect(talents.placementPrompt()).toBeVisible();
  await expect(talents.placementPrompt()).toContainText("Click a talent node to install Ethereal Prism: Haze.");
  await expect(talents.node("1,1")).toHaveClass(/\bprism-placement-target\b/);
  await talents.placementPrompt().getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(talents.placementPrompt()).toBeHidden();
  await expect(talents.node("1,1")).not.toHaveClass(/\bprism-placement-target\b/);

  await talents.action("Install Prism").click();
  await talents.prismInventory().getByRole("button", { name: "Install", exact: true }).click();
  await talents.node("1,1").click();
  await expect(talents.toast()).toHaveText("Ethereal Prism: Haze installed on node 1,1");
  await expect(talents.placementPrompt()).toBeHidden();
  await expect(talents.prismNode()).toHaveAttribute("data-coordinate", "1,1");
  // The click placed the prism; it did not also add a point.
  expect((await talents.stored()).installedPrismNodes.Lich).toBe("1,1");
  expect((await talents.stored()).ranks["Lich:1,1"] ?? 0).toBe(0);
  await planner.expectNoErrors();
});

test("dragging the installed prism onto another node moves it there", async ({ page }) => {
  const { planner, talents } = await openTalents(page);
  await talents.drag(talents.prismNode(), talents.node("1,1"));
  await expect(talents.toast()).toHaveText("Prism moved to node 1,1");
  await expect(talents.prismNode()).toHaveAttribute("data-coordinate", "1,1");
  await expect(talents.node("4,0")).not.toHaveClass(/\bprism-covered-node\b/);
  // The click that ends the drag does not also open the prism inventory.
  await expect(talents.prismInventory()).not.toBeVisible();
  const stored = await talents.stored();
  expect(stored.installedPrismNodes.Lich).toBe("1,1");
  expect(stored.ranks["Lich:1,1"] ?? 0).toBe(0);
  await planner.expectNoErrors();
});

test("a prism dropped away from the nodes returns to its node", async ({ page }) => {
  const { planner, talents } = await openTalents(page);
  const panel = await talents.treePanel().boundingBox();
  await talents.drag(talents.prismNode(), { x: panel.x + 10, y: panel.y + 10 });
  await expect(talents.toast()).toHaveText("Invalid drop · Prism returned to its original node");
  await expect(talents.prismNode()).toHaveAttribute("data-coordinate", "4,0");
  await expect(talents.prismInventory()).not.toBeVisible();
  expect((await talents.stored())?.installedPrismNodes.Lich ?? "4,0").toBe("4,0");
  await planner.expectNoErrors();
});

test("the Slates tab shows the slate board in place of the tree, and a tree tab brings the tree back", async ({
  page,
}) => {
  const { planner, talents } = await openTalents(page);
  await talents.slatesTab().click();
  await expect(talents.slatesTab()).toHaveClass(/\bactive\b/);
  await expect(talents.tab("Tree 4")).not.toHaveClass(/\bactive\b/);
  await expect(talents.treePanel()).toBeHidden();
  await expect(page.locator("#slate-board")).toBeVisible();
  await talents.openTree("Tree 4");
  await expect(talents.treePanel()).toBeVisible();
  await expect(talents.slatesTab()).not.toHaveClass(/\bactive\b/);
  await planner.expectNoErrors();
});

test("the slate board takes the tree's box, and the tree keeps it when it comes back", async ({ page }) => {
  const { planner, talents } = await openTalents(page);
  const tree = await talents.treePanel().boundingBox();
  await talents.slatesTab().click();
  const board = page.locator("#talents-view .slate-board-panel");
  await expect(board).toBeVisible();
  const slateBox = await board.boundingBox();
  for (const side of ["x", "y", "width", "height"])
    expect(Math.abs(slateBox[side] - tree[side])).toBeLessThanOrEqual(1);
  await talents.openTree("Tree 4");
  const back = await talents.treePanel().boundingBox();
  expect(Math.abs(back.height - tree.height)).toBeLessThanOrEqual(1);
  await planner.expectNoErrors();
});

test("a reload on the slate board opens it again", async ({ page }) => {
  const { planner, talents } = await openTalents(page);
  await talents.slatesTab().click();
  await expect(page.locator("#slate-board")).toBeVisible();
  await page.reload();
  await planner.waitUntilReady();
  await planner.enterBuild();
  await expect(page.locator("#slate-board")).toBeVisible();
  await expect(talents.treePanel()).toBeHidden();
  await expect(talents.slatesTab()).toHaveClass(/\bactive\b/);
  await talents.openTree("Tree 4");
  await expect(talents.treePanel()).toBeVisible();
  await expect(page.locator("#slate-board")).toBeHidden();
  await planner.expectNoErrors();
});

test("hovering a core talent slot shows its tooltip", async ({ page }) => {
  const { planner, talents } = await openTalents(page);
  await expect(async () => {
    await page.mouse.move(0, 0);
    await talents.core(24).hover();
    await expect(talents.tooltip()).toContainText("Core talent · 24 points", { timeout: 500 });
  }).toPass();
  await expect(talents.tooltip()).toContainText("Selected · Click to change");
  await planner.expectNoErrors();
});

test("hovering a node and the installed prism shows their tooltips", async ({ page }) => {
  const { planner, talents } = await openTalents(page);
  // The planner ignores hovers for a moment after a scroll, and hover() scrolls the node into view first.
  await expect(async () => {
    await page.mouse.move(0, 0);
    await talents.node("5,0").hover();
    await expect(talents.tooltip()).toContainText("Attack and Cast Speed", { timeout: 500 });
  }).toPass();
  await expect(async () => {
    await page.mouse.move(0, 0);
    await talents.prismNode().hover();
    await expect(talents.tooltip()).toContainText("Ethereal Prism: Haze", { timeout: 500 });
  }).toPass();
  await planner.expectNoErrors();
});

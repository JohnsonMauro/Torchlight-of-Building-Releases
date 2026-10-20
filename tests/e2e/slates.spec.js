// Divinity Slates board (Build page, talent column's Slates button): the statue grid, the pieces, their quick tools,
// drags (place, park beside the grid, rotate with a right-click), keyboard and wheel transforms, a rotation that no
// longer fits following the pointer, and the dialogs the board opens. Written against the legacy board before it moves to
// React, so both must pass it unchanged. Youga's build has three slates and free cells; the default library has nine,
// with the Judgment overlay on top of the middle.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { SlatesPage } from "./pages/slates-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const PEDIGREE = "game-log-slate-2";
const CORNER = "game-log-slate-4";
const FALLEN = "game-log-slate-5";
// The board's cells are 72 px at this size, and the whole board fits the screen (the drags move the mouse, which does not
// scroll the page).
const CELL = 72;
test.use({ viewport: { width: 1440, height: 900 } });

async function openSlates(page, state = youga) {
  const planner = new PlannerPage(page);
  await planner.open(state);
  const slates = new SlatesPage(page);
  await slates.open();
  return { planner, slates };
}

test("the Slates button shows the statue board in place of the talent tree", async ({ page }) => {
  const { planner, slates } = await openSlates(page, null);
  await expect(slates.talentTree()).toBeHidden();
  await expect(slates.cells()).toHaveCount(24);
  await expect(slates.pieces()).toHaveCount(9);
  await expect(slates.board().locator(".slate-piece.judgment-affected")).toHaveCount(4);
  await expect(slates.board().locator(".slate-piece.copy-slate")).toHaveCount(2);
  await expect(slates.piece("judgment")).toHaveClass(/\boverlay-slate\b/);
  await expect(slates.piece("judgment")).toHaveAttribute(
    "aria-label",
    "Nether King's Divinity: Judgment: hover for affixes",
  );
  await planner.expectNoErrors();
});

test("clicking a slate selects it and shows its tools", async ({ page }) => {
  const { planner, slates } = await openSlates(page);
  // Pedigree of Gods only flips. (The tools open where the click was, over the clicked tile.)
  await slates.tile(PEDIGREE).click();
  await expect(slates.piece(PEDIGREE)).toHaveClass(/\bselected\b/);
  await expect(slates.tool("Rotate clockwise (D)")).toHaveCount(0);
  await expect(slates.tool("Flip vertical (W)")).toBeVisible();
  await slates.tile(CORNER).click();
  await expect(slates.piece(CORNER)).toHaveClass(/\bselected\b/);
  await expect(slates.piece(PEDIGREE)).not.toHaveClass(/\bselected\b/);
  await expect(slates.tools()).toHaveCount(7);
  for (const title of ["Move", "Rotate clockwise (D)", "Rotate counter-clockwise (A)", "Flip horizontal (S)", "Remove"])
    await expect(slates.tool(title)).toBeVisible();
  await planner.expectNoErrors();
});

test("dragging a slate onto free cells places it there", async ({ page }) => {
  const { planner, slates } = await openSlates(page);
  await slates.drag(FALLEN, -CELL, CELL);
  await expect(slates.toast()).toHaveText("Slate placed on grid");
  expect((await slates.stored()).placements[FALLEN]).toEqual({ column: 2, row: 2, rotation: 270, flipX: 1, flipY: 1 });
  await expect(slates.board().locator(".slate-piece.dragging")).toHaveCount(0);
  // The click that ends the drag does not also select the slate.
  await expect(slates.piece(FALLEN)).not.toHaveClass(/\bselected\b/);
  await expect(slates.tools()).toHaveCount(0);
  await planner.expectNoErrors();
});

test("dragging a slate off the grid parks it beside the grid, unequipped", async ({ page }) => {
  const { planner, slates } = await openSlates(page);
  await slates.drag(FALLEN, -4.5 * CELL, 0);
  await expect(slates.toast()).toHaveText("Slate parked beside the grid");
  await expect(slates.piece(FALLEN)).toHaveClass(/\bparked-slate\b/);
  await expect(slates.piece(FALLEN)).toHaveAttribute("aria-label", /parked outside the grid/);
  const stored = await slates.stored();
  expect(stored.equipped).not.toContain(FALLEN);
  expect(stored.placements[FALLEN]).toBeUndefined();
  expect(stored.parked[FALLEN]).toMatchObject({ rotation: 270, flipX: 1, flipY: 1 });
  await planner.expectNoErrors();
});

test("a right-click during a drag rotates the slate", async ({ page }) => {
  const { planner, slates } = await openSlates(page);
  await slates.drag(CORNER, -3 * CELL, -CELL, { rightClick: true });
  await expect(slates.toast()).toHaveText("Slate placed on grid");
  expect((await slates.stored()).placements[CORNER]).toEqual({ column: 2, row: 2, rotation: 90, flipX: 1, flipY: 1 });
  await planner.expectNoErrors();
});

test("D rotates the selected slate; when it no longer fits, it follows the pointer until a click places it", async ({
  page,
}) => {
  const { planner, slates } = await openSlates(page);
  await slates.tile(CORNER).click();
  await page.keyboard.press("d");
  await expect(slates.toast()).toHaveText("Move the Rotated slate and click to place it");
  await expect(slates.piece(CORNER)).toHaveClass(/\bpending-drop\b/);
  const grid = await slates.grid().boundingBox();
  await page.mouse.move(grid.x + 1.5 * CELL, grid.y + 3 * CELL, { steps: 5 });
  await page.mouse.click(grid.x + 1.5 * CELL, grid.y + 3 * CELL);
  await expect(slates.toast()).toHaveText("Rotated slate placed");
  await expect(slates.board().locator(".pending-drop")).toHaveCount(0);
  expect((await slates.stored()).placements[CORNER]).toEqual({ column: 2, row: 3, rotation: 90, flipX: 1, flipY: 1 });
  await planner.expectNoErrors();
});

test("the wheel over the board rotates the selected slate", async ({ page }) => {
  const { planner, slates } = await openSlates(page);
  await slates.tile(FALLEN).click();
  // Over the grid, away from the tools that opened at the click.
  const grid = await slates.grid().boundingBox();
  await page.mouse.move(grid.x + CELL / 2, grid.y + 3 * CELL);
  await page.mouse.wheel(0, 100);
  await expect.poll(async () => (await slates.stored()).placements[FALLEN].rotation).toBe(0);
  await planner.expectNoErrors();
});

test("Remove takes the slate off the grid", async ({ page }) => {
  const { planner, slates } = await openSlates(page);
  await slates.tile(FALLEN).click();
  await slates.tool("Remove").click();
  await expect(slates.piece(FALLEN)).toHaveCount(0);
  await expect(slates.tools()).toHaveCount(0);
  expect((await slates.stored()).equipped).toEqual([PEDIGREE, CORNER]);
  await planner.expectNoErrors();
});

test("right-clicking a slate removes it", async ({ page }) => {
  const { planner, slates } = await openSlates(page);
  await slates.tile(FALLEN).click({ button: "right" });
  await expect(slates.toast()).toHaveText("Slate removed");
  await expect(slates.piece(FALLEN)).toHaveCount(0);
  expect((await slates.stored()).equipped).toEqual([PEDIGREE, CORNER]);
  await planner.expectNoErrors();
});

test("Move, then a board cell, places the slate in that cell", async ({ page }) => {
  const { planner, slates } = await openSlates(page);
  await slates.tile(FALLEN).click();
  await slates.tool("Move").click();
  await expect(slates.toast()).toHaveText("Choose an empty board cell");
  await expect(slates.grid()).toHaveClass(/\bediting\b/);
  await slates.cell(2, 3).click();
  expect((await slates.stored()).placements[FALLEN]).toEqual({ column: 2, row: 3, rotation: 270, flipX: 1, flipY: 1 });
  await planner.expectNoErrors();
});

test("Inventory opens the slate inventory, and Edit affixes opens the slate's editor", async ({ page }) => {
  const { planner, slates } = await openSlates(page, null);
  await slates.inventoryButton().click();
  await expect(slates.inventory()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(slates.inventory()).toBeHidden();
  await slates.tile("moth-fire").click();
  await slates.tool("Edit affixes").click();
  await expect(slates.editor()).toBeVisible();
  await expect(slates.editor()).toContainText("Sparks of Moth Fire");
  await planner.expectNoErrors();
});

test("hovering a slate shows its affixes", async ({ page }) => {
  const { planner, slates } = await openSlates(page);
  // The planner ignores hovers for a moment after a scroll, and hover() scrolls first.
  await expect(async () => {
    await page.mouse.move(0, 0);
    await slates.tile(PEDIGREE).hover();
    await expect(slates.tooltip()).toBeVisible({ timeout: 500 });
  }).toPass();
  await expect(slates.tooltip()).toContainText("Pedigree of Gods");
  await planner.expectNoErrors();
});

// ---- The slate editor (a board slate's Edit affixes tool).
async function openEditor(page, id = "corner-life") {
  const { planner, slates } = await openSlates(page, null);
  await slates.tile(id).click();
  await slates.tool("Edit affixes").click();
  await expect(slates.editor()).toBeVisible();
  return { planner, slates };
}
const affixInputs = (slates) => slates.editor().locator(".slate-affix-row input");

test("the slate editor shows the slate, its orientation tools and affixes; Add affix and Save Changes keep the edits", async ({
  page,
}) => {
  const { planner, slates } = await openEditor(page);
  const editor = slates.editor();
  await expect(editor.locator("#slate-editor-title")).toHaveText("Edit Legendary Slate");
  await expect(editor.locator("h2")).toHaveText("A Corner of Divinity");
  await expect(editor.locator(".slate-craft-card")).toHaveText("A Corner of DivinityDIVINITY SLATE · LEGENDARY");
  await expect(editor.locator(".slate-editor-shape button")).toHaveText([
    "↻ Rotate",
    "↶ Rotate back",
    "↔ Flip H",
    "↕ Flip V",
  ]);
  await expect(editor.locator(".slate-editor-shape img")).toHaveAttribute("src", /\S/);
  const count = await affixInputs(slates).count();
  expect(count).toBeGreaterThan(0);
  await expect(editor.locator("legend")).toHaveText(`Affixes (${count})`);
  await expect(editor.locator(".slate-affix-row span").first()).toHaveText("Slot 1");
  const first = await affixInputs(slates).first().inputValue();
  expect(first).not.toBe("");

  await editor.getByRole("button", { name: "Add affix" }).click();
  await expect(affixInputs(slates)).toHaveCount(count + 1);
  await expect(editor.locator(".slate-affix-row span").last()).toHaveText(`Slot ${count + 1}`);
  await expect(affixInputs(slates).last()).toHaveValue("");
  await affixInputs(slates).last().fill("+10% Fire Damage");
  await affixInputs(slates).first().fill("  ");
  await editor.getByRole("button", { name: "Save Changes" }).click();
  await expect(slates.toast()).toHaveText("Slate affixes saved");
  await expect(editor).toBeHidden();
  const saved = (await slates.stored()).affixOverrides["corner-life"];
  expect(saved.at(-1)).toBe("+10% Fire Damage");
  expect(saved).toHaveLength(count);
  expect(saved).not.toContain(first);

  // Cancel closes without saving.
  await slates.tile("corner-life").click();
  await slates.tool("Edit affixes").click();
  await expect(affixInputs(slates).last()).toHaveValue("+10% Fire Damage");
  await affixInputs(slates).last().fill("not kept");
  await editor.getByRole("button", { name: "Cancel" }).click();
  await expect(editor).toBeHidden();
  expect((await slates.stored()).affixOverrides["corner-life"].at(-1)).toBe("+10% Fire Damage");
  await planner.expectNoErrors();
});

test("the slate editor's Rotate turns the slate on the board and draws the editor again", async ({ page }) => {
  const { planner, slates } = await openEditor(page);
  const editor = slates.editor();
  const rotation = async () => (await slates.stored())?.placements["corner-life"]?.rotation ?? 0;
  const before = await affixInputs(slates).first().inputValue();
  await affixInputs(slates).first().fill("typed, not saved");
  await editor.getByRole("button", { name: "↻ Rotate" }).click();
  await expect.poll(async () => (await slates.stored())?.placements["corner-life"]).toBeTruthy();
  const turned = await rotation();
  // The editor is drawn again from the slate: what was typed and not saved is gone.
  await expect(affixInputs(slates).first()).toHaveValue(before);
  await editor.getByRole("button", { name: "↶ Rotate back" }).click();
  await expect.poll(rotation).toBe((turned + 270) % 360);
  await planner.expectNoErrors();
});

// Skills section of the Build page: the skill board (Skills and Auras tabs), Energy, the aura reservation summary, the skill
// and support drags, and the skill selector the sockets open. Written against the legacy section before it moved to React,
// so both must pass it unchanged. The default library is Selena's Scorching Beam build; the golden-master Youga build has
// a support granted by its hero trait (Clockwork Core).
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { SkillsPage } from "./pages/skills-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);

async function openSkills(page, state = null) {
  const planner = new PlannerPage(page);
  await planner.open(state);
  const skills = new SkillsPage(page);
  await skills.open();
  return { planner, skills };
}

test("lists the active skills with their levels, supports and Energy", async ({ page }) => {
  const { planner, skills } = await openSkills(page);
  await expect(skills.energyTotal()).toHaveText("515/518");
  await expect(skills.rows()).toHaveCount(5);
  await expect(skills.rows().first()).toContainText("Scorching Beam");
  await expect(skills.row("Scorching Beam")).toContainText("Lv.20 +11");
  await expect(skills.row("Scorching Beam").locator(".skill-row-energy")).toHaveText("175");
  await expect(skills.support("Scorching Beam", "Replace Guard")).toBeVisible();
  await expect(skills.support("Aim", "Add support 5 to Aim")).toBeVisible();
  await expect(skills.reservationSummary()).toBeHidden();
  await planner.expectNoErrors();
});

test("the Auras tab shows the four aura rows and the reservation summary", async ({ page }) => {
  const { planner, skills } = await openSkills(page);
  await skills.tab("Auras").click();
  await expect(skills.tab("Auras")).toHaveClass(/\bactive\b/);
  await expect(skills.tab("Skills")).not.toHaveClass(/\bactive\b/);
  await expect(skills.rows()).toHaveCount(4);
  await expect(skills.socket("Replace Precise: Deep Pain")).toBeVisible();
  await expect(skills.reservationSummary()).toBeVisible();
  await expect(skills.reservationSummary()).toContainText("494.64 / 525");
  await expect(skills.reservationSummary()).toContainText("94.22% sealed · 30.36 usable");
  await expect(skills.reservationSummary()).toContainText("1,920.54 / 2,150");
  await skills.tab("Skills").click();
  await expect(skills.rows()).toHaveCount(5);
  await expect(skills.reservationSummary()).toBeHidden();
  await planner.expectNoErrors();
});

test("right-clicking a skill removes it; its empty slot opens the selector, and a choice fills the row again", async ({
  page,
}) => {
  const { planner, skills } = await openSkills(page);
  await skills.socket("Replace Scorch").click({ button: "right" });
  await expect(skills.toast()).toHaveText("Scorch removed");
  await expect(skills.socket("Select Active 5")).toBeVisible();
  expect((await skills.stored()).setupEnabled.Scorch).toBe(false);
  await skills.socket("Select Active 5").click();
  await expect(skills.selector()).toBeVisible();
  await expect(skills.selectorTitle()).toContainText("Select Active Skill");
  await skills.selectorSearch().fill("Scorch");
  await skills
    .selectorResults()
    .filter({ hasText: /^◆Scorch[A-Z]/ })
    .click();
  await skills.selectorConfirm().click();
  await expect(skills.selector()).toBeHidden();
  await expect(skills.toast()).toHaveText("Scorch setup added");
  await expect(skills.rows().nth(4).getByRole("button", { name: "Replace Scorch", exact: true })).toBeVisible();
  await planner.expectNoErrors();
});

test("a support socket opens the support selector; a choice is linked to that skill", async ({ page }) => {
  const { planner, skills } = await openSkills(page);
  await skills.support("Aim", "Add support 5 to Aim").click();
  await expect(skills.selector()).toBeVisible();
  await expect(skills.selectorTitle()).toContainText("Select Support for Aim");
  // The list starts with supports Aim already has (their button reads "Installed"): take the first one it can add.
  let name = "";
  for (let index = 0; !name; index++) {
    const choice = skills.selectorResults().nth(index);
    await choice.click();
    if ((await skills.selectorConfirm().count()) && (await skills.selectorConfirm().isEnabled()))
      name = (await choice.locator("strong").textContent()).trim();
  }
  await skills.selectorConfirm().click();
  await expect(skills.selector()).toBeHidden();
  await expect(skills.toast()).toHaveText(`${name} linked to Aim`);
  await expect(skills.support("Aim", `Replace ${name}`)).toBeVisible();
  expect((await skills.stored()).supportOrder.Aim[4]).toBe(name);
  await planner.expectNoErrors();
});

test("right-clicking a support removes it", async ({ page }) => {
  const { planner, skills } = await openSkills(page);
  await skills.support("Scorching Beam", "Replace Guard").click({ button: "right" });
  await expect(skills.toast()).toHaveText("Guard removed");
  await expect(skills.support("Scorching Beam", "Add support 2 to Scorching Beam")).toBeVisible();
  expect((await skills.stored()).supportOrder["Scorching Beam"][1]).toBe("");
  await planner.expectNoErrors();
});

test("dragging a skill onto another row swaps them; a drop off the board puts it back", async ({ page }) => {
  const { planner, skills } = await openSkills(page);
  await skills.drag(skills.socket("Replace Aim"), skills.socket("Replace Scorch"));
  await expect(skills.toast()).toHaveText("Active skills swapped");
  await expect(skills.rows().nth(1).getByRole("button", { name: "Replace Scorch", exact: true })).toBeVisible();
  await expect(skills.rows().nth(4).getByRole("button", { name: "Replace Aim", exact: true })).toBeVisible();
  expect((await skills.stored()).boardSlots.skills).toEqual([
    "Scorching Beam",
    "Scorch",
    "Swiftness Dew",
    "Entangled Pain",
    "Aim",
  ]);
  await skills.drag(skills.socket("Replace Aim"), skills.view().locator(".compendium-tabs"));
  await expect(skills.toast()).toHaveText("Invalid drop · skill returned to its original slot");
  await expect(skills.rows().nth(4).getByRole("button", { name: "Replace Aim", exact: true })).toBeVisible();
  await expect(page.locator(".skill-dragging, .skill-drop-target")).toHaveCount(0);
  await planner.expectNoErrors();
});

test("dragging a support moves it, and a right-click during the drag duplicates it", async ({ page }) => {
  const { planner, skills } = await openSkills(page);
  await skills.drag(skills.support("Aim", "Replace Mass Effect"), skills.support("Aim", "Add support 5 to Aim"));
  await expect(skills.toast()).toHaveText("Support moved to Aim");
  expect((await skills.stored()).supportOrder.Aim).toEqual([
    "Activation Medium: Preparation",
    "",
    "Extended Duration",
    "Well-Fought Battle",
    "Mass Effect",
  ]);
  await skills.support("Scorch", "Replace Terrain of Malice").click({ button: "right" });
  await expect(skills.support("Scorch", "Add support 3 to Scorch")).toBeVisible();
  await skills.drag(
    skills.support("Entangled Pain", "Replace Terrain of Malice"),
    skills.support("Scorch", "Add support 3 to Scorch"),
    { copy: true },
  );
  await expect(skills.toast()).toHaveText("Support duplicated to Scorch");
  await expect(skills.support("Scorch", "Replace Terrain of Malice")).toBeVisible();
  await expect(skills.support("Entangled Pain", "Replace Terrain of Malice")).toBeVisible();
  await expect(skills.selector()).toBeHidden();
  await expect(page.locator(".support-drag-ghost, .support-drag-source, .support-drop-target")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveClass(/support-dragging/);
  await planner.expectNoErrors();
});

test("a support that does not fit the skill is refused and stays where it was", async ({ page }) => {
  const { planner, skills } = await openSkills(page);
  await skills.drag(
    skills.support("Swiftness Dew", "Replace Hyper Metabolism"),
    skills.support("Aim", "Add support 5 to Aim"),
  );
  await expect(skills.toast()).toHaveText("Hyper Metabolism cannot support Aim");
  await expect(skills.support("Swiftness Dew", "Replace Hyper Metabolism")).toBeVisible();
  await expect(skills.support("Aim", "Add support 5 to Aim")).toBeVisible();
  await planner.expectNoErrors();
});

test("Reset Skills empties both tabs", async ({ page }) => {
  const { planner, skills } = await openSkills(page);
  await skills.resetButton().click();
  await expect(skills.toast()).toHaveText("Skills reset to empty");
  for (const row of [1, 2, 3, 4, 5]) await expect(skills.socket(`Select Active ${row}`)).toBeVisible();
  await expect(skills.socket("Add support 1 to empty skill").first()).toBeDisabled();
  await skills.tab("Auras").click();
  for (const row of [1, 2, 3, 4]) await expect(skills.socket(`Select Aura ${row}`)).toBeVisible();
  await skills.socket("Select Aura 2").click();
  await expect(skills.selectorTitle()).toContainText("Select Passive Skill / Aura");
  expect((await skills.stored()).boardSlots).toEqual({ skills: [], auras: [] });
  await planner.expectNoErrors();
});

test("a support granted by the hero trait opens nothing and cannot be removed", async ({ page }) => {
  const { planner, skills } = await openSkills(page, youga);
  const granted = skills.support("Homing Frost Bolt", "Replace Clockwork Core");
  await expect(async () => {
    await page.mouse.move(0, 0);
    await granted.hover();
    await expect(skills.tooltip()).toContainText("Granted by I Am the Ultimate One · second support slot", {
      timeout: 500,
    });
  }).toPass();
  await granted.click();
  await expect(skills.selector()).toBeHidden();
  await granted.click({ button: "right" });
  await expect(granted).toBeVisible();
  await expect(skills.toast()).not.toHaveText("Clockwork Core removed");
  await planner.expectNoErrors();
});

test("hovering a skill and a support shows their tooltips", async ({ page }) => {
  const { planner, skills } = await openSkills(page);
  // The planner ignores hovers for a moment after a scroll, and hover() scrolls the socket into view first.
  await expect(async () => {
    await page.mouse.move(0, 0);
    await skills.socket("Replace Scorching Beam").hover();
    await expect(skills.tooltip()).toBeVisible({ timeout: 500 });
  }).toPass();
  await expect(skills.tooltip()).toContainText("Scorching Beam");
  await expect(async () => {
    await page.mouse.move(0, 0);
    await skills.support("Scorching Beam", "Replace Guard").hover();
    await expect(skills.tooltip()).toContainText("Guard", { timeout: 500 });
  }).toPass();
  await planner.expectNoErrors();
});

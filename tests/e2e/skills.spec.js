// Skills section of the Build page: the skill board (Skills and Auras tabs), Energy, the aura reservation summary, the skill
// and support drags, and the skill selector the sockets open. Written against the legacy section before it moved to React,
// so both must pass it unchanged. The tests read the golden-master Youga build (a full board, and a support granted by its
// hero trait: Clockwork Core).
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
  const { planner, skills } = await openSkills(page, youga);
  await expect(skills.energyTotal()).toHaveText("450/455");
  await expect(skills.rows()).toHaveCount(5);
  await expect(skills.rows().first()).toContainText("Homing Frost Bolt");
  await expect(skills.row("Homing Frost Bolt")).toContainText("Lv.20 +6");
  await expect(skills.row("Homing Frost Bolt").locator(".skill-row-energy")).toHaveText("175");
  await expect(skills.support("Homing Frost Bolt", "Replace Multiple Projectiles")).toBeVisible();
  await expect(skills.support("Ice Bond", "Add support 5 to Ice Bond")).toBeVisible();
  await expect(skills.reservationSummary()).toBeHidden();
  await planner.expectNoErrors();
});

test("the Auras tab shows the four aura rows and the reservation summary", async ({ page }) => {
  const { planner, skills } = await openSkills(page, youga);
  await skills.tab("Auras").click();
  await expect(skills.tab("Auras")).toHaveClass(/\bactive\b/);
  await expect(skills.tab("Skills")).not.toHaveClass(/\bactive\b/);
  await expect(skills.rows()).toHaveCount(4);
  await expect(skills.socket("Replace Frigid Domain")).toBeVisible();
  await expect(skills.reservationSummary()).toBeVisible();
  // As the game shows it: what the auras leave free of the build's own Max Mana / Life, and what they seal.
  await expect(skills.reservationSummary()).toContainText("65.58 / 580.75");
  await expect(skills.reservationSummary()).toContainText("11.29%");
  await expect(skills.reservationSummary()).toContainText("515.17 sealed");
  await expect(skills.reservationSummary()).toContainText("79.9 / 2,232.44");
  await skills.tab("Skills").click();
  await expect(skills.rows()).toHaveCount(5);
  await expect(skills.reservationSummary()).toBeHidden();
  await planner.expectNoErrors();
});

test("right-clicking a skill removes it; its empty slot opens the selector, and a choice fills the row again", async ({
  page,
}) => {
  const { planner, skills } = await openSkills(page, youga);
  await skills.socket("Replace Timid").click({ button: "right" });
  await expect(skills.toast()).toHaveText("Timid removed");
  await expect(skills.socket("Select Active 5")).toBeVisible();
  expect((await skills.stored()).customSetups.map((setup) => setup.name)).not.toContain("Timid");
  await skills.socket("Select Active 5").click();
  await expect(skills.selector()).toBeVisible();
  await expect(skills.selectorTitle()).toContainText("Select Active Skill");
  await skills.selectorSearch().fill("Timid");
  await skills
    .selectorResults()
    .filter({ hasText: /^◆Timid[A-Z]/ })
    .click();
  await skills.selectorConfirm().click();
  await expect(skills.selector()).toBeHidden();
  await expect(skills.toast()).toHaveText("Timid setup added");
  await expect(skills.rows().nth(4).getByRole("button", { name: "Replace Timid", exact: true })).toBeVisible();
  await planner.expectNoErrors();
});

test("a support socket opens the support selector; a choice is linked to that skill", async ({ page }) => {
  const { planner, skills } = await openSkills(page, youga);
  await skills.support("Ice Bond", "Add support 5 to Ice Bond").click();
  await expect(skills.selector()).toBeVisible();
  await expect(skills.selectorTitle()).toContainText("Select Support for Ice Bond");
  // The list starts with supports Ice Bond already has (their button reads "Installed"): take the first one it can add.
  let name = "";
  for (let index = 0; !name; index++) {
    const choice = skills.selectorResults().nth(index);
    await choice.click();
    if ((await skills.selectorConfirm().count()) && (await skills.selectorConfirm().isEnabled()))
      name = (await choice.locator("strong").textContent()).trim();
  }
  await skills.selectorConfirm().click();
  await expect(skills.selector()).toBeHidden();
  await expect(skills.toast()).toHaveText(`${name} linked to Ice Bond`);
  await expect(skills.support("Ice Bond", `Replace ${name}`)).toBeVisible();
  expect((await skills.stored()).supportOrder["game-log-skill-2"][4]).toBe(name);
  await planner.expectNoErrors();
});

test("right-clicking a support removes it", async ({ page }) => {
  const { planner, skills } = await openSkills(page, youga);
  await skills.support("Homing Frost Bolt", "Replace Multiple Projectiles").click({ button: "right" });
  await expect(skills.toast()).toHaveText("Multiple Projectiles removed");
  await expect(skills.support("Homing Frost Bolt", "Add support 1 to Homing Frost Bolt")).toBeVisible();
  expect((await skills.stored()).supportOrder["game-log-skill-1"][0]).toBe("");
  await planner.expectNoErrors();
});

test("dragging a skill onto another row swaps them; a drop off the board puts it back", async ({ page }) => {
  const { planner, skills } = await openSkills(page, youga);
  await skills.drag(skills.socket("Replace Ice Bond"), skills.socket("Replace Timid"));
  await expect(skills.toast()).toHaveText("Active skills swapped");
  await expect(skills.rows().nth(1).getByRole("button", { name: "Replace Timid", exact: true })).toBeVisible();
  await expect(skills.rows().nth(4).getByRole("button", { name: "Replace Ice Bond", exact: true })).toBeVisible();
  expect((await skills.stored()).boardSlots.skills).toEqual([
    "game-log-skill-1",
    "game-log-skill-5",
    "game-log-skill-3",
    "game-log-skill-4",
    "game-log-skill-2",
  ]);
  await skills.drag(skills.socket("Replace Ice Bond"), skills.view().locator(".compendium-tabs"));
  await expect(skills.toast()).toHaveText("Invalid drop · skill returned to its original slot");
  await expect(skills.rows().nth(4).getByRole("button", { name: "Replace Ice Bond", exact: true })).toBeVisible();
  await expect(page.locator(".skill-dragging, .skill-drop-target")).toHaveCount(0);
  await planner.expectNoErrors();
});

test("dragging a support moves it, and a right-click during the drag duplicates it", async ({ page }) => {
  const { planner, skills } = await openSkills(page, youga);
  await skills.drag(
    skills.support("Ice Bond", "Replace Mass Effect"),
    skills.support("Ice Bond", "Add support 5 to Ice Bond"),
  );
  await expect(skills.toast()).toHaveText("Support moved to Ice Bond");
  expect((await skills.stored()).supportOrder["game-log-skill-2"]).toEqual([
    "Preparation",
    "Well-Fought Battle",
    "",
    "Grudge",
    "Mass Effect",
  ]);
  await skills.support("Timid", "Replace Terrain of Malice").click({ button: "right" });
  await expect(skills.support("Timid", "Add support 1 to Timid")).toBeVisible();
  await skills.drag(
    skills.support("Speed Phantom", "Replace Cooldown Reduction"),
    skills.support("Timid", "Add support 1 to Timid"),
    { copy: true },
  );
  await expect(skills.toast()).toHaveText("Support duplicated to Timid");
  await expect(skills.support("Timid", "Replace Cooldown Reduction")).toBeVisible();
  await expect(skills.support("Speed Phantom", "Replace Cooldown Reduction")).toBeVisible();
  await expect(skills.selector()).toBeHidden();
  await expect(page.locator(".support-drag-ghost, .support-drag-source, .support-drop-target")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveClass(/support-dragging/);
  await planner.expectNoErrors();
});

test("a support that does not fit the skill is refused and stays where it was", async ({ page }) => {
  const { planner, skills } = await openSkills(page, youga);
  await skills.drag(
    skills.support("Homing Frost Bolt", "Replace Multiple Projectiles"),
    skills.support("Ice Bond", "Add support 5 to Ice Bond"),
  );
  await expect(skills.toast()).toHaveText("Multiple Projectiles cannot support Ice Bond");
  await expect(skills.support("Homing Frost Bolt", "Replace Multiple Projectiles")).toBeVisible();
  await expect(skills.support("Ice Bond", "Add support 5 to Ice Bond")).toBeVisible();
  await planner.expectNoErrors();
});

test("Reset Skills empties both tabs", async ({ page }) => {
  const { planner, skills } = await openSkills(page, youga);
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
  const { planner, skills } = await openSkills(page, youga);
  // The planner ignores hovers for a moment after a scroll, and hover() scrolls the socket into view first.
  await expect(async () => {
    await page.mouse.move(0, 0);
    await skills.socket("Replace Homing Frost Bolt").hover();
    await expect(skills.tooltip()).toBeVisible({ timeout: 500 });
  }).toPass();
  await expect(skills.tooltip()).toContainText("Homing Frost Bolt");
  await expect(async () => {
    await page.mouse.move(0, 0);
    await skills.support("Homing Frost Bolt", "Replace Multiple Projectiles").hover();
    await expect(skills.tooltip()).toContainText("Multiple Projectiles", { timeout: 500 });
  }).toPass();
  await planner.expectNoErrors();
});

test("Necklace of Firebird puts Barrier Burst in Active slot 1, and the selector names the necklace as its source", async ({
  page,
}) => {
  const line =
    "When you have a Barrier, triggers the Main Skill upon taking damage, then removes Barrier\nReplaces the Main Skill with Lv. 20 Barrier Burst";
  const state = structuredClone(youga);
  state.equipmentOverrides = {
    ...state.equipmentOverrides,
    necklace: {
      name: "Necklace of Firebird",
      base: "Necklace",
      rarity: "legendary",
      legendaryModifiers: [line],
      modifiers: [line],
      implicitModifiers: [],
    },
  };
  const { planner, skills } = await openSkills(page, state);
  await expect(skills.rows().first()).toContainText("replaces Homing Frost Bolt");
  await expect(skills.socket("Barrier Burst, granted by Necklace of Firebird")).toBeVisible();
  await skills.socket("Replace Timid").click();
  await skills.selectorSearch().fill("Barrier Burst");
  await skills.selectorResults().first().click();
  await expect(skills.selectorSkillSource()).toContainText("Necklace of Firebird");
  await page.mouse.move(0, 0);
  await skills.selectorSkillSource().getByText("Necklace of Firebird", { exact: true }).hover();
  await expect(skills.tooltip()).toContainText("Replaces the Main Skill with Lv. 20");
  await planner.expectNoErrors();
});

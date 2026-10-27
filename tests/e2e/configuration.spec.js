// Configuration view ("Config" tab) with the golden-master Youga build: scenario, exclusive choices, best-case assumptions
// and Advanced inputs. Written against the legacy view before it moved to React, so both must pass it unchanged.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { ConfigurationPage } from "./pages/configuration-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const CLOSE = "Close to the dummy";
const DISTANT = "6 m away";
const MOBILITY = "Mobility Skill used recently";

const HARES_AGILITY = "Hare's Agility stacks held (one per exit from Stand Still, 2 s each)";
const SCORCH_REDUCTION = "Scorch resistance reduction % (Profound 20, Deep Space 30)";

/** The Youga build with an Ethereal Prism of `base` (its core) on Prophet (2,0), a node it leaves empty. */
function withPrismCore(base) {
  const state = structuredClone(youga);
  const prism = {
    id: "e2e-prism",
    type: "ethereal",
    base,
    radiusAffix: "",
    rareAffix: "",
    legendaryAffix: "",
    baseAffix: "",
  };
  state.talents.prismInventory = [...state.talents.prismInventory, prism];
  state.talents.installedPrisms = { ...state.talents.installedPrisms, Prophet: prism.id };
  state.talents.installedPrismNodes = { ...state.talents.installedPrismNodes, Prophet: "2,0" };
  return state;
}

async function openConfiguration(page, state = youga) {
  const planner = new PlannerPage(page);
  await planner.open(state);
  const config = new ConfigurationPage(page);
  await config.open();
  return { planner, config };
}

test("shows the best-case scenario, the exclusive choices and the best-case assumptions", async ({ page }) => {
  const { planner, config } = await openConfiguration(page);
  await expect(config.modeLabel()).toHaveText("Best case");
  await expect(config.switch("Best case")).toBeChecked();
  await expect(config.switch("Own buffs built before the fight")).toBeChecked();
  await expect(config.section("Manual conditions")).toHaveCount(0);
  await expect(config.sectionCount("Choices that can't both hold")).toHaveText("1");
  await expect(config.choice("Distance", DISTANT)).toHaveAttribute("aria-pressed", "true");
  await expect(config.choice("Distance", DISTANT)).toContainText("best");
  await expect(config.choice("Distance", CLOSE)).toHaveAttribute("aria-pressed", "false");
  await expect(config.section("Choices that can't both hold")).toContainText("20 s DPS · ");
  await expect(config.sectionCount("Best-case assumptions")).toHaveText("2");
  await expect(config.section("Best-case assumptions")).not.toHaveAttribute("open", "");
  await expect(config.section("Advanced")).not.toHaveAttribute("open", "");
  await planner.expectNoErrors();
});

test("switching Best case off lists the manual conditions, and it is saved", async ({ page }) => {
  const { planner, config } = await openConfiguration(page);
  await config.switch("Best case").uncheck();
  await expect(config.modeLabel()).toHaveText("Manual");
  await expect(config.section("Manual conditions")).toHaveCount(1);
  await expect(config.section("Choices that can't both hold")).toHaveCount(0);
  expect((await config.storedCombat()).conditionMode).toBe("manual");
  await page.reload();
  await planner.waitUntilReady();
  await config.open();
  await expect(config.switch("Best case")).not.toBeChecked();
  await config.switch("Best case").check();
  await expect(config.modeLabel()).toHaveText("Best case");
  expect((await config.storedCombat()).conditionMode).toBe("auto");
  await planner.expectNoErrors();
});

test("a choice pins that option; picking the best option again clears the pin", async ({ page }) => {
  const { planner, config } = await openConfiguration(page);
  await config.choice("Distance", CLOSE).click();
  await expect(config.choice("Distance", CLOSE)).toHaveAttribute("aria-pressed", "true");
  expect((await config.storedCombat()).bestCaseOverrides).toEqual({ nearTarget: true });
  await page.reload();
  await planner.waitUntilReady();
  await config.open();
  await expect(config.choice("Distance", CLOSE)).toHaveAttribute("aria-pressed", "true");
  await config.choice("Distance", DISTANT).click();
  await expect(config.choice("Distance", DISTANT)).toHaveAttribute("aria-pressed", "true");
  expect((await config.storedCombat()).bestCaseOverrides).toEqual({});
  await planner.expectNoErrors();
});

test("a best-case assumption switched off is saved, and Reset to best case turns it back on", async ({ page }) => {
  const { planner, config } = await openConfiguration(page);
  await config.openSection("Best-case assumptions");
  await config.switch(MOBILITY).uncheck();
  await expect(config.switch(MOBILITY)).not.toBeChecked();
  await expect(config.section("Best-case assumptions")).toHaveAttribute("open", "");
  expect((await config.storedCombat()).bestCaseOverrides).toEqual({ mobilitySkillUsed: false });
  await config.resetBestCase().click();
  await expect(config.switch(MOBILITY)).toBeChecked();
  await expect(config.section("Best-case assumptions")).toHaveAttribute("open", "");
  expect((await config.storedCombat()).bestCaseOverrides).toEqual({});
  await planner.expectNoErrors();
});

test("Advanced numbers are saved; open sections stay open across re-renders", async ({ page }) => {
  const { planner, config } = await openConfiguration(page);
  await config.openSection("Advanced");
  await config.setNumber("Target Fire Resistance %", 0);
  await expect(config.number("Target Fire Resistance %")).toHaveValue("0");
  await expect(config.section("Advanced")).toHaveAttribute("open", "");
  await config.setNumber("Idyll stacks", 7);
  await expect(config.section("Advanced")).toHaveAttribute("open", "");
  const combat = await config.storedCombat();
  expect([combat.targetFireResistancePercent, combat.idyllStacks]).toEqual([0, 7]);
  await config.sectionSummary("Advanced").click();
  await expect(config.section("Advanced")).not.toHaveAttribute("open", "");
  await config.switch("Best case").uncheck();
  await expect(config.section("Advanced")).not.toHaveAttribute("open", "");
  await planner.expectNoErrors();
});

test("Hare's Agility holds 1 stack until set, and the line's 5 caps what is set", async ({ page }) => {
  const { planner, config } = await openConfiguration(page, withPrismCore("Hare's Agility"));
  await config.openSection("Advanced");
  await expect(config.number(HARES_AGILITY)).toHaveValue("1");
  await config.setNumber(HARES_AGILITY, 9);
  await expect(config.number(HARES_AGILITY)).toHaveValue("5");
  expect((await config.storedCombat()).exitStandStillStacks).toBe(9);
  await planner.expectNoErrors();
});

test("Scorch's resistance reduction is Profound's 20 until Deep Space's 30 is set", async ({ page }) => {
  const { planner, config } = await openConfiguration(page, withPrismCore("Fire's Allure"));
  await config.openSection("Advanced");
  await expect(config.number(SCORCH_REDUCTION)).toHaveValue("20");
  await expect(config.number(HARES_AGILITY)).toHaveCount(0);
  await config.setNumber(SCORCH_REDUCTION, 30);
  await expect(config.number(SCORCH_REDUCTION)).toHaveValue("30");
  expect((await config.storedCombat()).scorchResistanceReductionPercent).toBe(30);
  await planner.expectNoErrors();
});

test("own buffs built before the fight: saved as a best-case override and recalculated", async ({ page }) => {
  const { planner, config } = await openConfiguration(page);
  const figures = config.section("Choices that can't both hold").locator("small");
  const before = await figures.textContent();
  await config.switch("Own buffs built before the fight").uncheck();
  await expect(config.switch("Own buffs built before the fight")).not.toBeChecked();
  await expect(figures).not.toHaveText(before);
  expect((await config.storedCombat()).bestCaseOverrides).toEqual({ prebuiltSelfBuffs: false });
  await planner.expectNoErrors();
});

test("every Advanced number is saved, kept within its range, and saving keeps working after it", async ({ page }) => {
  const { planner, config } = await openConfiguration(page);
  await config.openSection("Advanced");
  await config.setNumber("Well-Fought Battle stacks", 2);
  await config.setNumber("Idyll stacks", 1.5);
  await config.setNumber("Allies affected by aura (Safety in Numbers)", 9);
  const combat = await config.storedCombat();
  expect([combat.aimBattleStacks, combat.idyllStacks, combat.auraAffectedAllies]).toEqual([2, 1, 7]);
  await expect(config.number("Idyll stacks")).toHaveValue("1");
  await config.switch("Own buffs built before the fight").uncheck();
  expect((await config.storedCombat()).bestCaseOverrides).toEqual({ prebuiltSelfBuffs: false });
  await planner.expectNoErrors();
});

// The skill selector (the dialog the skill board's sockets, Rosa's trait support slot and the follower's skill slots
// open): its title with the number of choices, the search over names, tags and effects, the clear-search button, the
// highlighted choice and the follower picker's groups; and its detail: the skill level, a skill's preview, a star
// support's tiers, roll and stars, an Activation Medium's affix lines, and the Confirm button. Written against the legacy list before it moves to React, so
// both must pass it unchanged. The default library is Selena's Scorching Beam build.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { SkillsPage } from "./pages/skills-page.js";
import { HeroPage } from "./pages/hero-page.js";
import { FollowerPage } from "./pages/follower-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
test.use({ viewport: { width: 1440, height: 1000 } });

async function openSkills(page, state = null) {
  const planner = new PlannerPage(page);
  await planner.open(state);
  const skills = new SkillsPage(page);
  await skills.open();
  return { planner, skills };
}
const available = async (skills) => Number((await skills.selectorTitle().textContent()).match(/· (\d+) available$/)[1]);
const search = (skills) => skills.selector().getByRole("searchbox");
const detailName = (skills) => skills.selector().locator("#skill-selector-detail h3");

test("the skill list counts its choices, marks the row's skill, searches and clears the search", async ({ page }) => {
  const { planner, skills } = await openSkills(page);
  await skills.socket("Replace Scorching Beam").click();
  await expect(skills.selectorTitle()).toHaveText(/^Select Active Skill · \d+ available$/);
  const total = await available(skills);
  await expect(skills.selectorResults()).toHaveCount(total);
  await expect(search(skills)).toHaveAttribute("placeholder", "Search skills…");
  await expect(search(skills)).toBeFocused();
  const selected = skills.selector().locator("#skill-selector-results .selector-result.selected");
  await expect(selected).toHaveCount(1);
  await expect(selected.locator("strong")).toHaveText("Scorching Beam");
  await expect(detailName(skills)).toHaveText("Scorching Beam");

  // Tags and effects count too: "Fire" finds skills whose name does not hold it.
  await search(skills).fill("  Fire  ");
  const fire = await skills.selectorResults().count();
  expect(fire).toBeGreaterThan(0);
  expect(fire).toBeLessThan(total);
  const names = (await skills.selectorResults().locator("strong").allTextContents()).filter(
    (name) => !/fire/i.test(name),
  );
  expect(names.length).toBeGreaterThan(0);
  await expect(skills.selectorTitle()).toHaveText(`Select Active Skill · ${total} available`);
  await search(skills).fill("zzz");
  await expect(skills.selectorResults()).toHaveCount(0);
  await expect(skills.selector().locator("#skill-selector-results")).toHaveText("No matching entries.");
  await expect(detailName(skills)).toHaveText("Scorching Beam");
  await skills.selector().getByRole("button", { name: "Clear search" }).click();
  await expect(search(skills)).toHaveValue("");
  await expect(search(skills)).toBeFocused();
  await expect(skills.selectorResults()).toHaveCount(total);

  const other = skills
    .selectorResults()
    .filter({ hasNot: page.locator(".selected") })
    .filter({ hasText: /^◆Scorch[A-Z]/ });
  await other.click();
  await expect(other).toHaveClass(/\bselected\b/);
  await expect(detailName(skills)).toHaveText("Scorch");
  await expect(selected).toHaveCount(1);

  await page.keyboard.press("Escape");
  await skills.socket("Replace Scorching Beam").click();
  await expect(search(skills)).toHaveValue("");
  await expect(selected.locator("strong")).toHaveText("Scorching Beam");
  await planner.expectNoErrors();
});

test("the support and aura lists say what they are for", async ({ page }) => {
  const { planner, skills } = await openSkills(page);
  await skills.support("Aim", "Add support 5 to Aim").click();
  await expect(skills.selectorTitle()).toHaveText(/^Select Support for Aim · \d+ available$/);
  await expect(skills.selectorResults()).toHaveCount(await available(skills));
  await expect(search(skills)).toHaveAttribute("placeholder", "Search supports…");
  await expect(skills.selector().locator("#skill-selector-results .selector-result.selected")).toHaveCount(0);
  await expect(skills.selector().locator("#skill-selector-detail")).toHaveText("Select a support to configure");
  await skills.selector().getByRole("button", { name: "Cancel" }).click();
  await skills.tab("Auras").click();
  await skills.socket("Replace Precise: Deep Pain").click();
  await expect(skills.selectorTitle()).toHaveText(/^Select Passive Skill \/ Aura · \d+ available$/);
  await expect(skills.selectorResults()).toHaveCount(await available(skills));
  await planner.expectNoErrors();
});

test("Rosa's trait support list names its skill", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.open(youga);
  const hero = new HeroPage(page);
  const skills = new SkillsPage(page);
  await hero.selectHero("rosa-high-court-chariot");
  await hero.button("Select support for Holy Domain").click();
  await expect(skills.selectorTitle()).toHaveText(/^Select Support for Holy Domain · \d+ available$/);
  await expect(skills.selectorResults()).toHaveCount(await available(skills));
  await search(skills).fill("activation medium");
  expect(await skills.selectorResults().count()).toBeGreaterThan(0);
  await planner.expectNoErrors();
});

test("the follower skill list groups Tartarus and Origin skills and searches them", async ({ page }) => {
  const planner = new PlannerPage(page);
  await planner.open({
    ...youga,
    followers: { followerId: "scion-of-light", rarity: "ult", skills: [], rarityScheme: "letter" },
  });
  const follower = new FollowerPage(page);
  const skills = new SkillsPage(page);
  await follower.open();
  await follower.slot("Choose a Tartarus Skill for slot 2").click();
  await expect(skills.selectorTitle()).toHaveText(/^Select Arianrhod Scion of Light skill 2 · \d+ available$/);
  const total = await available(skills);
  await expect(skills.selectorResults()).toHaveCount(total);
  await expect(skills.selector().locator(".follower-selector-group").first()).toHaveText("Tartarus Skills");
  await search(skills).fill("zzz");
  await expect(skills.selector().locator("#skill-selector-results")).toHaveText("No matching entries.");
  await search(skills).fill("");
  await skills.selectorResults().first().click();
  await expect(skills.selectorResults().first()).toHaveClass(/\bselected\b/);
  await expect(skills.selectorConfirm()).toBeEnabled();
  await planner.expectNoErrors();
});

const detail = (skills) => skills.selector().locator("#skill-selector-detail");
const level = (skills) => detail(skills).locator("[data-selector-level], .selector-level input").first();

test("a skill's detail: its level, preview, effects and source", async ({ page }) => {
  const { planner, skills } = await openSkills(page);
  await skills.socket("Replace Scorching Beam").click();
  const preview = detail(skills).locator(".selector-preview");
  const start = Number(await level(skills).inputValue());
  await expect(preview.locator(".selector-preview-head small")).toHaveText(`Lv. ${start}`);
  await detail(skills).getByRole("button", { name: "+", exact: true }).click();
  await expect(level(skills)).toHaveValue(String(start + 1));
  await expect(preview.locator(".selector-preview-head small")).toHaveText(`Lv. ${start + 1}`);
  await detail(skills).getByRole("button", { name: "−", exact: true }).click();
  await detail(skills).getByRole("button", { name: "−", exact: true }).click();
  await expect(preview.locator(".selector-preview-head small")).toHaveText(`Lv. ${start - 1}`);
  await level(skills).fill("55");
  await level(skills).press("Tab");
  await expect(level(skills)).toHaveValue("40");
  await expect(preview.locator(".selector-preview-head small")).toHaveText("Lv. 40");
  await expect(preview.locator("h3")).toHaveText("Scorching Beam");
  await expect(preview.locator(".selector-tags span").first()).not.toBeEmpty();
  await expect(preview.locator(".selector-stat-rows > div").first()).toContainText(":");
  await expect(preview.locator(".selector-effect-list h4")).toHaveText("Scorching Beam:");
  expect(await preview.locator(".skill-damage-value").count()).toBeGreaterThan(0);
  await expect(preview.getByRole("link", { name: "Open TLIDB source" })).toHaveAttribute("href", /^https?:/);
  await expect(skills.selectorConfirm()).toBeEnabled();
  await planner.expectNoErrors();
});

test("a star support's detail: tiers, roll and stars, saved on Confirm", async ({ page }) => {
  const { planner, skills } = await openSkills(page);
  const NAME = "Scorching Beam: Disintegrate (Noble)";
  await skills.socket(`Replace ${NAME}`).click();
  const config = detail(skills).locator(".special-support-config");
  const tiers = config.locator(".special-tier-buttons button");
  await expect(tiers).toHaveText(["T219–20%", "T121–22%", "T024–26%"]);
  await expect(config.locator(".special-tier-buttons button.active")).toHaveText("T024–26%");
  await tiers.nth(1).click();
  await expect(config.locator(".special-tier-buttons button.active")).toHaveText("T121–22%");
  await expect(config.locator(".special-roll-label strong")).toHaveText("+22%");
  await expect(detail(skills).locator(".selector-effect-list")).toContainText(
    "Main affix · T1 · +22% additional Ignite Damage for each stack of Ignite additionally inflicted",
  );
  await config.locator('input[type="range"]').fill("21");
  await expect(config.locator('input[type="number"]')).toHaveValue("21");
  await expect(config.locator(".special-roll-control output")).toHaveText("+21%");
  await config.getByRole("button", { name: "3 stars" }).click();
  await expect(config.getByRole("button", { name: "3 stars" })).toHaveClass(/\bactive\b/);
  await expect(detail(skills).locator(".selector-effect-list")).toContainText("Star bonus · +");
  await skills.selectorConfirm().click();
  await expect(skills.selector()).toBeHidden();
  const saved = (await skills.stored()).specialSupportConfigs[`Scorching Beam:${NAME}`];
  expect(saved).toMatchObject({ tier: 1, roll: 21, stars: 3 });
  await planner.expectNoErrors();
});

test("an Activation Medium's detail: every affix line, its stat choice, tiers and rolls", async ({ page }) => {
  const { planner, skills } = await openSkills(page);
  await skills.row("Aim").getByRole("button", { name: "Replace Activation Medium: Preparation", exact: true }).click();
  const config = detail(skills).locator(".activation-affix-config");
  await expect(config.locator(".special-support-heading strong").first()).toHaveText("Set all affixes");
  const blocks = config.locator(".special-affix-block");
  await expect(blocks.nth(1).locator(".special-support-heading strong")).toHaveText("Affix 1");
  await expect(blocks.nth(1).locator("p")).toHaveText("Prepares the supported skill every 5 s");
  await expect(blocks.nth(1).getByRole("button", { name: /^Off/ })).toBeVisible();
  const choice = blocks.nth(2).locator("select");
  await expect(choice.locator("option")).toHaveText(["Cooldown Recovery Speed", "Additional Duration"]);
  await choice.selectOption({ label: "Additional Duration" });
  await expect(config.locator(".special-affix-block").nth(2).locator("p")).toContainText("Duration");
  await config.locator(".special-affix-block").nth(2).getByRole("button", { name: /^T0/ }).click();
  await expect(config.locator(".special-affix-block").nth(2).locator(".special-support-heading span")).toHaveText(
    "Tier 0",
  );
  await config.locator(".special-affix-block").nth(2).locator('input[type="range"]').fill("21");
  await expect(config.locator(".special-affix-block").nth(2).locator('input[type="number"]')).toHaveValue("21");
  await config
    .locator(".special-support-heading")
    .first()
    .locator("xpath=..")
    .getByRole("button", { name: "T2" })
    .click();
  await expect(config.locator(".special-support-heading span").first()).toHaveText("Tier 2");
  await expect(detail(skills).locator(".selector-effect-list")).toContainText("T2 · ");
  await planner.expectNoErrors();
});

test("a progression support with stars shows its tiers, rolls and stars", async ({ page }) => {
  const { planner, skills } = await openSkills(page, youga);
  await skills.socket("Replace Homing Frost Bolt: Deep Chill (Noble)").click();
  const config = detail(skills).locator(".special-support-config");
  await expect(config.locator(".special-support-heading strong")).toHaveText("Main affix");
  const tiers = config.locator(".special-tier-buttons button");
  expect(await tiers.count()).toBeGreaterThan(1);
  await tiers.first().click();
  await expect(tiers.first()).toHaveClass(/\bactive\b/);
  expect(await config.locator('input[type="range"]').count()).toBeGreaterThan(0);
  await expect(config.locator(".special-stars button")).toHaveCount(5);
  await config.getByRole("button", { name: "5 stars" }).click();
  await expect(config.getByRole("button", { name: "5 stars" })).toHaveClass(/\bactive\b/);
  await planner.expectNoErrors();
});

test("an aura on another row reads Installed and cannot be confirmed again", async ({ page }) => {
  const { planner, skills } = await openSkills(page);
  await skills.tab("Auras").click();
  await skills.socket("Replace Precise: Deep Pain").click();
  const other = skills.selectorResults().filter({ hasNot: page.locator(".selected") });
  // Take an aura already on the board (another row): its Confirm reads Installed.
  const names = await skills
    .rows()
    .locator(".skill-primary-socket")
    .evaluateAll((items) => items.map((item) => (item.getAttribute("aria-label") || "").replace(/^Replace /, "")));
  const target = names.find((name) => name && name !== "Precise: Deep Pain");
  await other
    .filter({ has: page.getByText(target, { exact: true }) })
    .first()
    .click();
  await expect(skills.selector().getByRole("button", { name: "Installed", exact: true })).toBeDisabled();
  await planner.expectNoErrors();
});

// The skill selector's list (the dialog the skill board's sockets, Rosa's trait support slot and the follower's skill
// slots open): its title with the number of choices, the search over names, tags and effects, the clear-search button,
// the highlighted choice, and the follower picker's groups. Written against the legacy list before it moves to React, so
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

// Follower tab of the hero panel: the follower card, its Tartarus Skill slots, and the dialogs they open. Written against
// the legacy panel before it moved to React, so both must pass it unchanged.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { FollowerPage } from "./pages/follower-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const withFollower = structuredClone(youga);
withFollower.followers = {
  followerId: "scion-of-light",
  rarity: "ult",
  skills: [
    { name: "Tartarus: Black Hole", tier: "III", affixes: [null, null, null] },
    "Tartarus: Lightning Storm",
    null,
  ],
  rarityScheme: "letter",
};

async function openFollower(page, state = withFollower) {
  const planner = new PlannerPage(page);
  await planner.open(state);
  const follower = new FollowerPage(page);
  await follower.open();
  return { planner, follower };
}

test("shows the follower card, its special effect and its skill slots", async ({ page }) => {
  const { planner, follower } = await openFollower(page);
  await expect(follower.name()).toHaveText("Arianrhod Scion of Light");
  await expect(follower.rarity()).toContainText("ULT · ");
  await expect(follower.specialEffect("Scion of Light")).toBeVisible();
  await expect(follower.slots()).toHaveCount(3);
  await expect(follower.slot("Tartarus: Black Hole")).toContainText("Initial skill");
  await expect(follower.slot("Tartarus: Lightning Storm")).toHaveAttribute(
    "aria-label",
    /slot 2; right-click to clear$/,
  );
  await expect(follower.slot("Choose a Tartarus Skill for slot 3")).toContainText("Empty slot");
  await planner.expectNoErrors();
});

test("without a follower: Choose Follower opens the selector, and a choice fills the card", async ({ page }) => {
  const { planner, follower } = await openFollower(page, youga);
  await expect(follower.panel()).toContainText("No follower selected");
  await follower.button("Change Follower").click();
  await expect(follower.selector()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(follower.selector()).toBeHidden();
  await follower.button("Choose Follower").click();
  await expect(follower.selector()).toBeVisible();
  await follower.selectorChoice("Lion Queen Normal").click();
  await expect(follower.selector()).toBeHidden();
  await expect(follower.name()).toHaveText("Lion Queen");
  await expect(follower.slots()).toHaveCount(2);
  expect((await follower.stored()).followerId).toBe("lion-queen");
  await planner.expectNoErrors();
});

test("Change Follower opens the selector with the current follower pressed", async ({ page }) => {
  const { planner, follower } = await openFollower(page);
  await follower.button("Change Follower").click();
  await expect(follower.selector()).toBeVisible();
  await expect(follower.selectorChoice("Arianrhod Scion of Light ULT")).toHaveAttribute("aria-pressed", "true");
  await planner.expectNoErrors();
});

test("a skill slot opens the skill picker; right-click clears a filled slot", async ({ page }) => {
  const { planner, follower } = await openFollower(page);
  await follower.slot("Choose a Tartarus Skill for slot 3").click();
  await expect(follower.skillSelector()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(follower.skillSelector()).toBeHidden();
  await follower.slot("Tartarus: Lightning Storm").click({ button: "right" });
  await expect(follower.toast()).toHaveText("Skill slot cleared");
  await expect(follower.slot("Choose a Tartarus Skill for slot 2")).toBeVisible();
  expect((await follower.stored()).skills[1]).toBeNull();
  await planner.expectNoErrors();
});

test("hovering the follower card shows its tooltip", async ({ page }) => {
  const { planner, follower } = await openFollower(page);
  // The planner ignores hovers for a moment after a scroll, and hover() scrolls first.
  await expect(async () => {
    await page.mouse.move(0, 0);
    await follower.portrait().hover();
    await expect(follower.tooltip()).toBeVisible({ timeout: 500 });
  }).toPass();
  await expect(follower.tooltip()).toContainText("Scion of Light");
  await planner.expectNoErrors();
});

test("a build imported from the game log warns on the Follower tab until a follower is chosen", async ({ page }) => {
  const { planner, follower } = await openFollower(page, youga);
  await expect(follower.notice()).toBeHidden();
  await follower.markImportedFromLog(planner);
  await expect(follower.notice()).toBeVisible();
  await follower.notice().hover();
  await expect(follower.tooltip()).toContainText("does not record your active follower");
  await page.mouse.move(0, 0);
  await follower.button("Choose Follower").click();
  await follower.selectorChoice("Lion Queen Normal").click();
  await expect(follower.name()).toHaveText("Lion Queen");
  await expect(follower.notice()).toBeHidden();
  await planner.expectNoErrors();
});

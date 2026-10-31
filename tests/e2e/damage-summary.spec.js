// The character column's damage summary (apps/web/src/features/stats/DamageSummary.tsx): every source row stays inside
// the column, its share on screen, however long its label (owner's screenshot, 2026-10-31: "Pipe Curl-Tailed Sentinel:
// Speed Phantom (follower)" widened the list past the panel, which cut the rows and hid the shares).
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { HeroPage } from "./pages/hero-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
const withLongFollower = structuredClone(youga);
withLongFollower.followers = {
  followerId: "curl-tailed-sentinel",
  rarity: "ult",
  skills: [{ name: "Tartarus: Black Hole", tier: "III", affixes: [null, null, null] }, null, null],
  rarityScheme: "letter",
};

for (const width of [1600, 390])
  test(`at ${width} px a long source label truncates inside the column and its share stays shown`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const planner = new PlannerPage(page);
    await planner.open(withLongFollower);
    const hero = new HeroPage(page);
    const row = hero.damageSources().filter({ hasText: "Pipe Curl-Tailed Sentinel: Black Hole (follower)" });
    await expect(row).toHaveCount(1);
    const column = await hero.damageSummary().boundingBox();
    const rowBox = await row.boundingBox();
    expect(rowBox.x + rowBox.width).toBeLessThanOrEqual(column.x + column.width);
    const share = await row.getByText(/%$/).boundingBox();
    expect(share.x + share.width).toBeLessThanOrEqual(column.x + column.width);
    await planner.expectNoErrors();
  });

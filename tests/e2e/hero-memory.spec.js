// The hero memory dialog (a memory socket of the HERO tab opens it): the inventory of crafted memories with each one's
// type, rarity and slot, Equip / Unequip (a right-click equips into an open compatible slot), Copy, Edit and Delete,
// Unequip slot, the base trait slot's mode, and the way to the crafter. Written against the legacy dialog before it
// moves to React, so both must pass it unchanged. The Youga build has three legendary memories, one per socket.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PlannerPage } from "./pages/planner-page.js";
import { HeroPage } from "./pages/hero-page.js";

const youga = JSON.parse(
  readFileSync(new URL("../golden/fixtures/youga-the-ultimate-one-l94.state.json", import.meta.url), "utf8"),
);
test.use({ viewport: { width: 1440, height: 1000 } });

const dialog = (page) => page.locator("#hero-memory-selector");
const title = (page) => dialog(page).locator("#hero-memory-title");
const items = (page) => dialog(page).locator(".hero-memory-item");
const item = (page, index) => items(page).nth(index);
const footer = (page) => dialog(page).locator(".hero-memory-inventory-footer");
/** The memory equipped at a level: the planner keys it by hero ("<hero>:level60"); the game-log import by level alone. */
const equippedAt = (stored, level) =>
  stored.equippedMemoryIds[`${stored.selectedHeroId}:${level}`] ?? stored.equippedMemoryIds[level];

async function open(page, state = youga) {
  const planner = new PlannerPage(page);
  await planner.open(state);
  return { planner, hero: new HeroPage(page) };
}
async function openSocket(page, hero, name) {
  await hero.button(name).click();
  await expect(dialog(page)).toBeVisible();
}
/** Youga with Memory of Origin revived into an Origin base trait slot (epic at most), and two more Origin memories. */
function withBaseSlot() {
  const state = structuredClone(youga);
  const origin = state.hero.memoryInventory.find((memory) => memory.id === "game-log-memory-1");
  Object.assign(origin, { revivedAffix: "Origin Base Trait Slot", revivedTier: 1 });
  const extra = (id, rarity) => ({
    ...structuredClone(origin),
    id,
    rarity,
    enhancementLevel: 1,
    revivedAffix: "",
    revivedTier: 1,
    revivedRoll: null,
  });
  state.hero.memoryInventory.push(extra("origin-epic", "epic"), extra("origin-legendary", "legendary"));
  return state;
}

test("a socket opens the inventory: every memory with its type, rarity and slot", async ({ page }) => {
  const { planner, hero } = await open(page);
  await openSocket(page, hero, "Manage Memory of Discipline");
  await expect(title(page)).toHaveText("Hero Memories");
  await expect(items(page).locator("strong")).toHaveText([
    "Memory of Discipline",
    "Memory of Progress",
    "Memory of Origin",
  ]);
  await expect(items(page).locator("small")).toHaveText([
    "Memory of Discipline · legendary · Equipped at Lv.60",
    "Memory of Progress · legendary · Equipped at Lv.75",
    "Memory of Origin · legendary · Equipped at Lv.45",
  ]);
  await expect(item(page, 0).getByRole("button")).toHaveText(["Unequip", "Copy", "✎", "×"]);
  await expect(item(page, 0).getByRole("button", { name: "Edit Memory of Discipline" })).toBeVisible();
  await expect(item(page, 0).locator("img")).toHaveAttribute("src", /\S/);
  await expect(footer(page).getByRole("button")).toHaveText(["Unequip slot", "Craft Memory"]);
  await dialog(page).getByRole("button", { name: "Close hero memories" }).click();
  await expect(dialog(page)).toBeHidden();
  await planner.expectNoErrors();
});

test("Unequip and Equip move a memory out of and back into its socket", async ({ page }) => {
  const { planner, hero } = await open(page);
  await openSocket(page, hero, "Manage Memory of Discipline");
  await item(page, 0).getByRole("button", { name: "Unequip" }).click();
  await expect(hero.toast()).toHaveText("Hero memory unequipped");
  await expect(item(page, 0).locator("small")).toHaveText("Memory of Discipline · legendary");
  await expect(item(page, 0).getByRole("button").first()).toHaveText("Equip");
  await expect(footer(page).getByRole("button")).toHaveText(["Craft Memory"]);
  let stored = await hero.stored();
  expect(equippedAt(stored, "level60")).toBeUndefined();
  expect(stored.memories.level60).toBe("");
  await expect(hero.button("Add level 60 hero memory")).toBeVisible();

  await item(page, 0).getByRole("button", { name: "Equip" }).click();
  await expect(hero.toast()).toHaveText("Memory of Discipline equipped");
  await expect(item(page, 0).locator("small")).toHaveText("Memory of Discipline · legendary · Equipped at Lv.60");
  stored = await hero.stored();
  expect(equippedAt(stored, "level60")).toBe("game-log-memory-2");
  await expect(hero.button("Manage Memory of Discipline")).toBeVisible();
  await planner.expectNoErrors();
});

test("Unequip slot empties the socket the dialog was opened for", async ({ page }) => {
  const { planner, hero } = await open(page);
  await openSocket(page, hero, "Manage Memory of Progress");
  await footer(page).getByRole("button", { name: "Unequip slot" }).click();
  await expect(hero.toast()).toHaveText("Hero memory unequipped");
  expect(equippedAt(await hero.stored(), "level75")).toBeUndefined();
  await expect(item(page, 1).locator("small")).toHaveText("Memory of Progress · legendary");
  await expect(footer(page).getByRole("button")).toHaveText(["Craft Memory"]);
  await planner.expectNoErrors();
});

test("Copy adds a copy at the end; equipping the copy takes the original's socket", async ({ page }) => {
  const { planner, hero } = await open(page);
  await openSocket(page, hero, "Manage Memory of Origin");
  await item(page, 2).getByRole("button", { name: "Copy Memory of Origin" }).click();
  await expect(hero.toast()).toHaveText("Memory of Origin copied");
  await expect(items(page)).toHaveCount(4);
  await expect(item(page, 3).locator("small")).toHaveText("Memory of Origin · legendary");
  const stored = await hero.stored();
  expect(stored.memoryInventory).toHaveLength(4);
  const copy = stored.memoryInventory[3];
  expect(copy.id).not.toBe("game-log-memory-1");
  expect({ ...copy, id: "" }).toEqual({ ...stored.memoryInventory[2], id: "" });

  await item(page, 3).getByRole("button", { name: "Equip" }).click();
  await expect(item(page, 3).locator("small")).toHaveText("Memory of Origin · legendary · Equipped at Lv.45");
  await expect(item(page, 2).locator("small")).toHaveText("Memory of Origin · legendary");
  // The original was stored under the level alone (as the game-log import writes it): it leaves the socket too, so
  // only one memory counts at Lv.45.
  const after = await hero.stored();
  expect(equippedAt(after, "level45")).toBe(copy.id);
  expect(Object.values(after.equippedMemoryIds)).not.toContain("game-log-memory-1");
  expect(Object.keys(after.equippedMemoryIds).filter((key) => key.endsWith("level45"))).toHaveLength(1);
  await expect(hero.button("Manage Memory of Origin")).toBeVisible();
  await planner.expectNoErrors();
});

test("Delete removes a memory and empties its socket", async ({ page }) => {
  const { planner, hero } = await open(page);
  await openSocket(page, hero, "Manage Memory of Discipline");
  await item(page, 1).getByRole("button", { name: "Delete Memory of Progress" }).click();
  await expect(hero.toast()).toHaveText("Memory deleted");
  await expect(items(page).locator("strong")).toHaveText(["Memory of Discipline", "Memory of Origin"]);
  const stored = await hero.stored();
  expect(stored.memoryInventory.map((memory) => memory.id)).toEqual(["game-log-memory-2", "game-log-memory-1"]);
  expect(equippedAt(stored, "level75")).toBeUndefined();
  expect(stored.memories.level75).toBe("");
  await expect(hero.button("Add level 75 hero memory")).toBeVisible();
  await planner.expectNoErrors();
});

test("a right-click unequips an equipped memory, or equips one into its open socket", async ({ page }) => {
  const { planner, hero } = await open(page);
  await openSocket(page, hero, "Manage Memory of Discipline");
  await item(page, 0).click({ button: "right" });
  await expect(hero.toast()).toHaveText("Hero memory unequipped");
  expect(equippedAt(await hero.stored(), "level60")).toBeUndefined();
  await item(page, 0).click({ button: "right" });
  await expect(hero.toast()).toHaveText("Memory of Discipline equipped");
  expect(equippedAt(await hero.stored(), "level60")).toBe("game-log-memory-2");
  // A copy has no open socket while the original holds it.
  await item(page, 0).getByRole("button", { name: "Copy Memory of Discipline" }).click();
  await item(page, 3).click({ button: "right" });
  await expect(hero.toast()).toHaveText("No open compatible memory slot");
  await expect(item(page, 3)).toHaveClass(/\bincompatible\b/);
  await expect(item(page, 0)).not.toHaveClass(/\bincompatible\b/);
  await planner.expectNoErrors();
});

test("only one revived memory can be equipped", async ({ page }) => {
  const state = structuredClone(youga);
  state.hero.memoryInventory[0].waxAndWane = true;
  const revived = { ...structuredClone(state.hero.memoryInventory[1]), id: "revived-progress", waxAndWane: true };
  state.hero.memoryInventory.push(revived);
  const { planner, hero } = await open(page, state);
  await openSocket(page, hero, "Manage Memory of Progress");
  const equip = item(page, 3).getByRole("button", { name: "Equip" });
  await expect(equip).toBeDisabled();
  await expect(equip).toHaveAttribute("title", "Only one revived memory can be equipped");
  await expect(item(page, 3)).toHaveClass(/\bincompatible\b/);
  await expect(item(page, 1).getByRole("button", { name: "Unequip" })).toBeEnabled();
  await planner.expectNoErrors();
});

test("the base trait slot lists the memories that fit it, equips one at its best roll and empties it", async ({
  page,
}) => {
  const { planner, hero } = await open(page, withBaseSlot());
  await openSocket(page, hero, "Add base trait memory");
  await expect(title(page)).toHaveText("Hero Memories · Base Trait Slot");
  await expect(dialog(page).locator(".hero-memory-slot-hint")).toHaveText(
    "This slot accepts Memory of Origin. Right-click any memory to equip it in an open compatible slot.",
  );
  await expect(items(page).locator("button:first-of-type")).toHaveText([
    "Unavailable",
    "Unavailable",
    "Unavailable",
    "Equip",
    "Unavailable",
  ]);
  const unavailable = item(page, 4).getByRole("button", { name: "Unavailable" });
  await expect(unavailable).toBeDisabled();
  await expect(unavailable).toHaveAttribute("title", "Only a matching, unequipped memory fits this base trait slot");
  await expect(footer(page).getByRole("button")).toHaveText(["Craft Memory"]);

  await item(page, 3).getByRole("button", { name: "Equip" }).click();
  await expect(item(page, 3).locator("small")).toHaveText("Memory of Origin · epic · Base trait slot");
  await expect(item(page, 3).getByRole("button").first()).toHaveText("Unequip");
  let stored = await hero.stored();
  expect(stored.baseTraitMemoryId).toBe("origin-epic");
  expect(stored.baseTraitMemoryRoll).toBe(-55);
  await expect(footer(page).getByRole("button")).toHaveText(["Unequip slot", "Craft Memory"]);

  await footer(page).getByRole("button", { name: "Unequip slot" }).click();
  await expect(footer(page).getByRole("button")).toHaveText(["Craft Memory"]);
  stored = await hero.stored();
  expect(stored.baseTraitMemoryId).toBe("");
  expect(stored.baseTraitMemoryRoll).toBeNull();

  // A right-click in this mode equips into the base trait slot first.
  await item(page, 3).click({ button: "right" });
  await expect(hero.toast()).toHaveText("Memory of Origin equipped in base trait slot");
  expect((await hero.stored()).baseTraitMemoryId).toBe("origin-epic");
  await item(page, 3).click({ button: "right" });
  await expect(hero.toast()).toHaveText("Base trait memory unequipped");
  await item(page, 3).getByRole("button", { name: "Equip" }).click();
  await item(page, 3).getByRole("button", { name: "Unequip" }).click();
  expect((await hero.stored()).baseTraitMemoryId).toBe("");
  await planner.expectNoErrors();
});

test("with no memories the inventory offers to craft one; the crafter's Cancel comes back", async ({ page }) => {
  const state = structuredClone(youga);
  Object.assign(state.hero, {
    memoryInventory: [],
    equippedMemoryIds: {},
    memories: { level45: "", level60: "", level75: "" },
  });
  const { planner, hero } = await open(page, state);
  await openSocket(page, hero, "Add level 45 hero memory");
  await expect(dialog(page).locator(".hero-memory-empty")).toHaveText("No memories crafted yetCraft your first Memory");
  await dialog(page).getByRole("button", { name: "Craft your first Memory" }).click();
  await expect(title(page)).toHaveText("Craft Memory");
  await expect(dialog(page).locator(".hero-memory-craft")).toBeVisible();
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(title(page)).toHaveText("Hero Memories");
  await footer(page).getByRole("button", { name: "Craft Memory" }).click();
  await expect(title(page)).toHaveText("Craft Memory");
  await planner.expectNoErrors();
});

test("Edit opens the crafter on that memory", async ({ page }) => {
  const { planner, hero } = await open(page);
  await openSocket(page, hero, "Manage Memory of Discipline");
  await item(page, 0).getByRole("button", { name: "Edit Memory of Discipline" }).click();
  await expect(title(page)).toHaveText("Edit Memory");
  await expect(dialog(page).getByRole("button", { name: "Save Changes" })).toBeEnabled();
  await planner.expectNoErrors();
});

test("hovering a memory shows its tooltip", async ({ page }) => {
  const { planner, hero } = await open(page);
  await openSocket(page, hero, "Manage Memory of Discipline");
  await expect(async () => {
    await item(page, 1).hover();
    await expect(hero.tooltip()).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(hero.tooltip()).toContainText("Memory of Progress");
  await planner.expectNoErrors();
});

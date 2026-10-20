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

// ---- The crafter (Craft Memory, or Edit on a memory).
const crafter = (page) => dialog(page).locator(".hero-memory-craft");
const preview = (page) => crafter(page).locator(".hero-memory-preview");
const craftButton = (page) => crafter(page).getByRole("button", { name: "Craft", exact: true });
const choice = (page, row, name) =>
  crafter(page).locator(`.hero-memory-choice-row.${row}`).getByRole("button", { name, exact: true });
/** A build with no memories: the crafter opens from a socket's Craft your first Memory. */
async function openCrafter(page, socket = "Add level 45 hero memory") {
  const state = structuredClone(youga);
  Object.assign(state.hero, {
    memoryInventory: [],
    equippedMemoryIds: {},
    memories: { level45: "", level60: "", level75: "" },
  });
  const { planner, hero } = await open(page, state);
  await openSocket(page, hero, socket);
  await dialog(page).getByRole("button", { name: "Craft your first Memory" }).click();
  await expect(crafter(page)).toBeVisible();
  return { planner, hero };
}

test("the crafter starts on the socket's type; Craft waits for a rarity and a base stat; the preview follows", async ({
  page,
}) => {
  const { planner, hero } = await openCrafter(page, "Add level 60 hero memory");
  await expect(crafter(page).locator(".memory-types button")).toHaveText([
    "Memory of Origin",
    "Memory of Discipline",
    "Memory of Progress",
  ]);
  await expect(crafter(page).locator(".memory-types button.active")).toHaveText("Memory of Discipline");
  await choice(page, "memory-types", "Memory of Origin").click();
  await expect(crafter(page).locator(".memory-types button.active")).toHaveText("Memory of Origin");
  await expect(crafter(page).locator(".rarities button")).toHaveText([
    "Normal",
    "Magic",
    "Epic",
    "Legendary",
    "Ultimate",
  ]);
  await expect(crafter(page).locator(".rarities button.active")).toHaveCount(0);
  await expect(preview(page)).toHaveText("Select a base stat to preview memory");
  await expect(craftButton(page)).toBeDisabled();

  await choice(page, "rarities", "Magic").click();
  await expect(crafter(page).locator(".rarities button.active")).toHaveText("Magic");
  await expect(craftButton(page)).toBeDisabled();
  const baseStat = crafter(page).getByLabel("Base stat", { exact: true });
  await expect(baseStat.locator("option")).toHaveText([
    "None",
    "+# Strength",
    "+# Dexterity",
    "+# Intelligence",
    "+#% damage",
    "+#% Minion Damage",
  ]);
  await baseStat.selectOption("+90 Strength");
  await expect(craftButton(page)).toBeEnabled();
  await expect(preview(page).locator("header")).toHaveText("Memory of Originmagic · HERO MEMORY");
  await expect(preview(page).locator("p").first()).toHaveText("Enhancement Level 1/20Trait Level +1");
  await expect(preview(page).locator(".memory-implicit")).toHaveText("+17 Strength");

  const level = crafter(page).getByLabel("Enhancement level value", { exact: true });
  await expect(crafter(page).getByLabel("Enhancement level slider", { exact: true })).toHaveAttribute("max", "20");
  await level.fill("25");
  await level.press("Tab");
  await expect(level).toHaveValue("20");
  await expect(
    crafter(page)
      .locator("label", { has: page.getByLabel("Enhancement level value", { exact: true }) })
      .locator("strong"),
  ).toHaveText("Lv.20");
  await expect(preview(page).locator("p").first()).toHaveText("Enhancement Level 20/20Trait Level +1");
  await choice(page, "rarities", "Epic").click();
  await expect(crafter(page).getByLabel("Enhancement level slider", { exact: true })).toHaveAttribute("max", "30");
  await crafter(page).getByLabel("Enhancement level slider", { exact: true }).fill("30");
  await expect(preview(page).locator("p").first()).toHaveText("Enhancement Level 30/30Trait Level +2");
  await expect(
    crafter(page)
      .locator("label", { has: page.getByLabel("Enhancement level value", { exact: true }) })
      .locator("strong"),
  ).toHaveText("Lv.30");

  await crafter(page).getByLabel("Wax and Wane (+30% base stat)", { exact: true }).check();
  await expect(preview(page).locator(".memory-implicit")).toHaveClass(/\bwax-applied\b/);
  await expect(preview(page).locator(".memory-revival-badge")).toHaveText("☾ Revived");
  await expect(preview(page)).toContainText("Memory RevivalWax and Wane · +30% base stat");

  // Another type clears the base stat.
  await choice(page, "memory-types", "Memory of Progress").click();
  await expect(preview(page)).toHaveText("Select a base stat to preview memory");
  await expect(craftButton(page)).toBeDisabled();
  await choice(page, "memory-types", "Memory of Origin").click();
  await baseStat.selectOption("+90 Strength");
  await craftButton(page).click();
  await expect(hero.toast()).toHaveText("Memory of Origin saved");
  await expect(title(page)).toHaveText("Hero Memories");
  await expect(items(page).locator("small")).toHaveText(["Memory of Origin · epic"]);
  const [saved] = (await hero.stored()).memoryInventory;
  expect(saved).toMatchObject({
    name: "Memory of Origin",
    type: "Memory of Origin",
    rarity: "epic",
    baseStat: "+90 Strength",
    enhancementLevel: 30,
    traitLevelBonus: 2,
    waxAndWane: true,
  });
  await planner.expectNoErrors();
});

test("an affix line: its choice, tiers, roll and the preview row", async ({ page }) => {
  const { planner } = await openCrafter(page);
  await choice(page, "rarities", "Legendary").click();
  await crafter(page).getByLabel("Base stat", { exact: true }).selectOption("+90 Strength");
  const fixed1 = crafter(page).locator("label", { has: page.getByLabel("Fixed 1", { exact: true }) });
  await crafter(page).getByLabel("Fixed 1", { exact: true }).selectOption("+(38–42)% Critical Strike Damage");
  await expect(crafter(page).getByRole("heading", { name: "Fixed Affixes (1/2)" })).toBeVisible();
  await expect(fixed1.locator(".memory-tier-row button")).toHaveText(["T3", "T2", "T1"]);
  await expect(fixed1.locator(".memory-tier-row button.active")).toHaveText("T1");
  await expect(crafter(page).getByLabel("Fixed 1 roll value", { exact: true })).toHaveValue("42");
  await expect(crafter(page).getByLabel("Fixed 1 roll slider", { exact: true })).toHaveAttribute("min", "38");
  const row = preview(page).locator(".memory-affix-row").first();
  await expect(row).toHaveText("T1+42% Critical Strike Damage");
  await expect(row.locator(".affix-tier-badge")).toHaveClass(/\btier-t1\b/);

  await fixed1.getByRole("button", { name: "T2", exact: true }).click();
  await expect(fixed1.locator(".memory-tier-row button.active")).toHaveText("T2");
  await expect(crafter(page).getByLabel("Fixed 1 roll value", { exact: true })).toHaveValue("26");
  await expect(crafter(page).getByLabel("Fixed 1 roll value", { exact: true })).toBeFocused();
  await expect(row).toHaveText("T2+26% Critical Strike Damage");
  await crafter(page).getByLabel("Fixed 1 roll value", { exact: true }).fill("21");
  // A typed number is committed on change (Tab); the legacy re-render on that change replaces every control.
  await crafter(page).getByLabel("Fixed 1 roll value", { exact: true }).press("Tab");
  await expect(crafter(page).getByLabel("Fixed 1 roll slider", { exact: true })).toHaveValue("21");
  await expect(row).toHaveText("T2+21% Critical Strike Damage");
  await crafter(page).getByLabel("Fixed 1 roll slider", { exact: true }).fill("24");
  await expect(crafter(page).getByLabel("Fixed 1 roll value", { exact: true })).toHaveValue("24");
  await expect(row).toHaveText("T2+24% Critical Strike Damage");

  // A line whose tiers differ by a number only: a tier slider and the tier's value.
  await crafter(page).getByLabel("Fixed 2", { exact: true }).selectOption("+32% Skill Area");
  const slider = crafter(page).getByLabel("Fixed 2 tier value slider", { exact: true });
  await expect(slider).toHaveValue("2");
  await expect(crafter(page).getByLabel("Fixed 2 tier value", { exact: true })).toHaveValue("32");
  await slider.fill("0");
  await expect(crafter(page).getByLabel("Fixed 2 tier value", { exact: true })).toHaveValue("15");
  await expect(preview(page).locator(".memory-affix-row").nth(1)).toHaveText("T3+15% Skill Area");
  await crafter(page).getByLabel("Fixed 2 tier value", { exact: true }).fill("24");
  await crafter(page).getByLabel("Fixed 2 tier value", { exact: true }).press("Tab");
  await expect(slider).toHaveValue("1");
  await expect(preview(page).locator(".memory-affix-row").nth(1)).toHaveText("T2+23% Skill Area");

  // A random line starts at its best tier, T0.
  await crafter(page).getByLabel("Random 1", { exact: true }).selectOption("+(26–40)% Affliction Effect");
  const random1 = crafter(page).locator("label", { has: page.getByLabel("Random 1", { exact: true }) });
  await expect(random1.locator(".memory-tier-row button.active")).toHaveText("T0");
  await expect(crafter(page).getByLabel("Random 1 roll value", { exact: true })).toHaveValue("40");
  await expect(crafter(page).getByRole("heading", { name: "Random Affixes (1/2)" })).toBeVisible();
  await expect(preview(page).locator(".memory-affix-row").nth(2)).toHaveText("T0+40% Affliction Effect");
  await crafter(page).getByLabel("Fixed 1", { exact: true }).selectOption("");
  await expect(crafter(page).getByRole("heading", { name: "Fixed Affixes (1/2)" })).toBeVisible();
  await expect(preview(page).locator(".memory-affix-row")).toHaveCount(2);
  await planner.expectNoErrors();
});

test("a revived affix: its tiers, roll and preview; Rising Moon is saved", async ({ page }) => {
  const { planner, hero } = await openCrafter(page);
  await choice(page, "rarities", "Ultimate").click();
  await crafter(page).getByLabel("Base stat", { exact: true }).selectOption("+90 Strength");
  const revived = crafter(page).getByLabel("Revived affix", { exact: true });
  await expect(revived.locator("optgroup")).toHaveCount(2);
  await revived.selectOption("All Stats");
  const controls = crafter(page).locator(".memory-revived-controls");
  await expect(controls.locator(".memory-tier-row button")).toHaveText(["T1", "T2", "T3"]);
  await expect(controls.locator(".memory-tier-row button.active")).toHaveText("T1");
  await expect(crafter(page).getByLabel("Revived affix roll value", { exact: true })).toHaveValue("100");
  await expect(preview(page).locator("h4", { hasText: "Revived Affix" })).toHaveText("Revived Affix");
  await expect(preview(page).locator(".memory-revived-name")).toHaveText("-20% All Stats\n+100 to All Stats");
  await expect(preview(page).locator(".memory-revival-badge")).toBeVisible();
  await controls.getByRole("button", { name: "T2", exact: true }).click();
  await expect(crafter(page).getByLabel("Revived affix roll value", { exact: true })).toHaveValue("75");
  await expect(crafter(page).getByLabel("Revived affix roll value", { exact: true })).toBeFocused();
  await expect(preview(page).locator(".memory-revived-name")).toHaveText("-15% All Stats\n+75 to All Stats");
  await crafter(page).getByLabel("Revived affix roll value", { exact: true }).fill("73");
  await crafter(page).getByLabel("Revived affix roll value", { exact: true }).press("Tab");
  await expect(crafter(page).getByLabel("Revived affix roll slider", { exact: true })).toHaveValue("73");
  await expect(preview(page).locator(".memory-revived-name")).toHaveText("-15% All Stats\n+73 to All Stats");

  await revived.selectOption("Hero's Resourcefulness");
  await expect(preview(page).locator("h4", { hasText: "Revived Affix" })).toHaveText("Revived Affix · Lunar Phase");
  await expect(preview(page).locator(".memory-revived-effect")).toHaveClass(/\bspecial\b/);

  await crafter(page).getByLabel("Rising Moon (T0 fixed affixes)", { exact: true }).check();
  await craftButton(page).click();
  await expect(hero.toast()).toHaveText("Memory of Origin saved");
  const [saved] = (await hero.stored()).memoryInventory;
  expect(saved).toMatchObject({ rarity: "ultimate", revivedAffix: "Hero's Resourcefulness", risingMoon: true });
  await planner.expectNoErrors();
});

test("Edit changes a memory in place and its socket follows; another type takes it out of the socket", async ({
  page,
}) => {
  const { planner, hero } = await open(page);
  await openSocket(page, hero, "Manage Memory of Discipline");
  await item(page, 0).getByRole("button", { name: "Edit Memory of Discipline" }).click();
  await expect(crafter(page).locator(".rarities button.active")).toHaveText("Legendary");
  await expect(crafter(page).getByLabel("Enhancement level value", { exact: true })).toHaveValue("40");
  await expect(crafter(page).getByLabel("Fixed 1", { exact: true })).toHaveValue("+(10–14)% Max Life");
  await crafter(page).getByLabel("Enhancement level value", { exact: true }).fill("20");
  await crafter(page).getByLabel("Enhancement level value", { exact: true }).press("Tab");
  await crafter(page).getByRole("button", { name: "Save Changes" }).click();
  await expect(hero.toast()).toHaveText("Memory of Discipline saved");
  let stored = await hero.stored();
  expect(stored.memoryInventory.map((memory) => memory.id)).toEqual([
    "game-log-memory-2",
    "game-log-memory-3",
    "game-log-memory-1",
  ]);
  expect(stored.memoryInventory[0]).toMatchObject({ enhancementLevel: 20, traitLevelBonus: 1 });
  expect(stored.memoryTraitLevels.level60).toBe(1);

  await item(page, 0).getByRole("button", { name: "Edit Memory of Discipline" }).click();
  await choice(page, "memory-types", "Memory of Origin").click();
  await crafter(page).getByLabel("Base stat", { exact: true }).selectOption("+90 Strength");
  await crafter(page).getByRole("button", { name: "Save Changes" }).click();
  await expect(hero.toast()).toHaveText("Memory of Origin saved");
  stored = await hero.stored();
  expect(equippedAt(stored, "level60")).toBeUndefined();
  expect(stored.memories.level60).toBe("");
  await expect(item(page, 0).locator("small")).toHaveText("Memory of Origin · legendary");

  // Cancel drops the changes.
  await item(page, 1).getByRole("button", { name: "Edit Memory of Progress" }).click();
  await choice(page, "rarities", "Normal").click();
  await crafter(page).getByRole("button", { name: "Cancel" }).click();
  await expect(item(page, 1).locator("small")).toHaveText("Memory of Progress · legendary · Equipped at Lv.75");
  expect((await hero.stored()).memoryInventory[1].rarity).toBe("legendary");
  await planner.expectNoErrors();
});

test("the crafter's selects open the planner's search popover, and a result is chosen", async ({ page }) => {
  const { planner } = await openCrafter(page);
  await choice(page, "rarities", "Magic").click();
  const popover = page.locator("#select-search-popover");
  await crafter(page).getByLabel("Base stat", { exact: true }).click();
  await expect(popover.getByRole("searchbox", { name: "Search options" })).toBeFocused();
  await popover.getByRole("button", { name: "+# Dexterity" }).click();
  await expect(popover).toBeHidden();
  await expect(crafter(page).getByLabel("Base stat", { exact: true })).toHaveValue("+90 Dexterity");
  await expect(preview(page).locator(".memory-implicit")).toHaveText("+17 Dexterity");

  await crafter(page).getByLabel("Revived affix", { exact: true }).click();
  await expect(popover.getByText("Select Revived Affix")).toBeVisible();
  await popover.getByRole("searchbox", { name: "Search revived affixes" }).fill("all stats");
  await popover.locator(".select-search-result", { hasText: "All Stats" }).first().click();
  await expect(crafter(page).getByLabel("Revived affix", { exact: true })).toHaveValue("All Stats");
  await expect(preview(page).locator(".memory-revived-name")).toHaveText("-20% All Stats\n+100 to All Stats");

  await crafter(page).getByLabel("Fixed 1", { exact: true }).click();
  await popover.getByRole("searchbox", { name: "Search options" }).fill("critical strike damage");
  await popover.getByRole("searchbox", { name: "Search options" }).press("Enter");
  await expect(crafter(page).getByLabel("Fixed 1", { exact: true })).toHaveValue("+(38–42)% Critical Strike Damage");
  await expect(crafter(page).getByLabel("Fixed 1 roll value", { exact: true })).toHaveValue("42");
  await planner.expectNoErrors();
});

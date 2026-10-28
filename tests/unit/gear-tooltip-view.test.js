// The gear tooltip's view (src/app/bridge/gear-item-view.ts): an item's lines with their marks, coverage and keyword
// effects, the curse note and the frame's look.
import { test } from "node:test";
import assert from "node:assert/strict";
import { coverageView, gearTooltipView, modifierTextView } from "../../src/app/bridge/gear-item-view.ts";

const input = (overrides = {}) => ({
  item: { name: "Test Robe", base: "INT Chest Armor", slot: "chest", level: 82, energy: 30 },
  rarity: "epic",
  icon: "robe.webp",
  sixAffix: false,
  priceless: false,
  itemLevel100: false,
  sections: [
    { label: "Implicit", detail: "INT Chest Armor", entries: [{ text: "+170 gear Energy Shield", index: 0 }] },
    {
      label: "Prefix",
      entries: [
        { text: "+57 % gear Energy Shield", index: 1, badge: "T1" },
        { text: "+10% Curse Effect", index: 2, tone: "corrosion" },
      ],
    },
  ],
  energyAllowed: true,
  inventory: false,
  lineStatus: (line) => (line.includes("Curse") ? "Not modeled" : "In calc"),
  curseReason: () => "",
  ...overrides,
});

test("each line carries its mark, its text and whether the calculation uses it", () => {
  const view = gearTooltipView(input());
  assert.equal(view.name, "Test Robe");
  assert.equal(view.base, "INT Chest Armor");
  assert.deepEqual([view.rarity, view.rarityLabel, view.frame], ["epic", "Epic", "gear-tooltip"]);
  assert.deepEqual([view.level, view.energy], [82, 30]);
  const [implicit, prefix] = view.sections;
  assert.equal(implicit.rows[0].marker, null);
  assert.equal(implicit.rows[0].coverage.look, "calculated");
  assert.equal(prefix.rows[0].marker.text, "T1");
  assert.match(prefix.rows[0].marker.className, /\btier-t1\b.*\brotate-45\b.*\bbg-grade-legendary\b/);
  assert.deepEqual(prefix.rows[0].text, { kind: "plain", text: "+57% gear Energy Shield" });
  assert.equal(prefix.rows[1].marker.text, "");
  assert.match(prefix.rows[1].marker.className, /\bbg-grade-vorax\b/);
  assert.doesNotMatch(prefix.rows[1].marker.className, /affix-tier-badge|tier-/);
  assert.equal(prefix.rows[1].corroded, true);
  assert.deepEqual(prefix.rows[1].coverage, { status: "Not modeled", look: "pending", title: "" });
  assert.equal(view.footer, "Click to inspect · Right-click to unequip");
});

test("a legendary line without a tier takes L's orange diamond, with no tier hook", () => {
  const view = gearTooltipView(
    input({
      sections: [
        { label: "Legendary Mod", entries: [{ text: "+27% Blessing Duration", index: 0, tone: "legendary" }] },
      ],
    }),
  );
  const [row] = view.sections[0].rows;
  assert.equal(row.legendary, true);
  assert.equal(row.marker.text, "");
  assert.match(row.marker.className, /\brotate-45\b.*\bbg-grade-legendary\b/);
  assert.doesNotMatch(row.marker.className, /affix-tier-badge|tier-/);
});

test("Energy shows only where the slot takes it; an Inventory card's footer, the frame's flags", () => {
  const view = gearTooltipView(
    input({ energyAllowed: false, inventory: true, sixAffix: true, priceless: true, itemLevel100: true }),
  );
  assert.equal(view.energy, null);
  assert.equal(view.footer, "Click to manage · Right-click to equip");
  assert.equal(view.frame, "gear-tooltip six-affix priceless-item item-level-100");
});

test("a curse line the limit leaves out names why, on the item and on its badge", () => {
  const view = gearTooltipView(input({ curseReason: (line) => (line.includes("Curse") ? "curse limit reached" : "") }));
  assert.equal(view.curseNote, "curse limit reached");
  assert.equal(view.sections[1].rows[1].coverage.title, "Not modeled: curse limit reached");
  assert.equal(view.sections[1].rows[0].coverage.title, "");
});

test("a named affix keeps its keyword, and its effect lines carry their own coverage", () => {
  const view = modifierTextView("Castling", () => "In calc");
  assert.equal(view.kind, "keyword");
  assert.equal(view.keyword, "Castling");
  assert.ok(view.lines.length > 0);
  assert.deepEqual(view.lines[0].coverage, coverageView("In calc"));
  assert.equal(modifierTextView("Castling").lines, null);
});

test("a neutral status reads neutral", () => {
  assert.equal(coverageView("Counted in stats").look, "neutral");
});

// The hero trait card (src/app/bridge/trait-tooltip-view.ts): a trait's lines at its level in the build, its keywords and
// their definitions, the notes it carries, and a tree hero's extra row.
import { test } from "node:test";
import assert from "node:assert/strict";
import { allHeroTraits } from "../../packages/engine/data/heroes/all-hero-traits.generated.js";
import {
  EXTRA_ROW_CHIP,
  EXTRA_ROW_NOTE,
  heroTraitTooltipView,
  treeExtraRowTooltipView,
} from "../../src/app/bridge/trait-tooltip-view.ts";

const covered = () => ({ state: "modeled", label: "Modeled", reason: "" });
const view = (heroId, name, level, levelKey = "level45") =>
  heroTraitTooltipView({
    heroId,
    trait: allHeroTraits[heroId].traits.find((entry) => entry.name === name),
    levelKey,
    level,
    coverage: covered,
  });
const runsOf = (card) => card.paragraphs.flatMap((paragraph) => paragraph.runs);
const values = (card) =>
  runsOf(card)
    .filter((entry) => entry.look === "current" || entry.look === "other")
    .map((entry) => [entry.text, entry.look]);

test("each progression shows every value with the one at the trait's level picked out", () => {
  // Righteous Fury has two progressions: (18/23/28/33/40) and one going down from 8.
  const card = view("rehan-anger", "Righteous Fury", 3);
  assert.deepEqual(values(card), [
    ["18", "other"],
    ["23", "other"],
    ["28", "current"],
    ["33", "other"],
    ["40", "other"],
    ["8", "other"],
    ["7", "other"],
    ["6", "current"],
    ["5", "other"],
    ["4", "other"],
  ]);
  assert.equal(runsOf(card).filter((entry) => entry.look === "separator").length, 8);
  assert.deepEqual([card.title, card.chip, card.unlock], ["Righteous Fury", "Level 3", "Unlocks at hero level 45"]);
  assert.equal(card.source, "TLIDB · CURRENT TRAIT LEVEL 3");
});

test("a level past a progression's last value keeps its last value current", () => {
  assert.deepEqual(
    values(view("rehan-anger", "Righteous Fury", 9))
      .filter(([, look]) => look === "current")
      .map(([value]) => value),
    ["40", "4"],
  );
});

test("the hero's keywords are runs of their own, with their definitions; hidden lines bring none", () => {
  // Youga's base trait card leaves out its Artificial Moon lines, so their keywords are not defined on it.
  const card = view("youga-the-ultimate-one", "I Am the Ultimate One", 1, "base");
  assert.ok(runsOf(card).some((entry) => entry.look === "keyword" && entry.text === "Clockwork Core"));
  assert.equal(
    runsOf(card).some((entry) => entry.text.includes("Artificial Moon")),
    false,
  );
  assert.deepEqual(
    card.keywords.map((entry) => entry.name),
    ["Clockwork Core", "Spell Burst"],
  );
  assert.ok(card.keywords.every((entry) => entry.lines.length > 0));
});

test("a trait the calculation makes an assumption about says so; the extra tree row's trait carries the row's note", () => {
  const wave = view("selena-sing-with-the-tide", "Wave Aria", 1);
  assert.match(wave.paragraphs.at(-1).runs[0].text, /^Damage component is included in calculations/);
  const extra = view("youga-the-ultimate-one", "I Am the Ultimate One", 1, "youga:extra");
  assert.ok(extra.paragraphs.some((paragraph) => paragraph.runs[0]?.text === EXTRA_ROW_NOTE));
  assert.equal(treeExtraRowTooltipView().title, EXTRA_ROW_CHIP);
  assert.equal(treeExtraRowTooltipView().paragraphs[0].runs[0].text, EXTRA_ROW_NOTE);
});

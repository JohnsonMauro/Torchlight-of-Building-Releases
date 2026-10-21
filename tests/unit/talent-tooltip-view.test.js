// The talent trees' tooltips (src/app/bridge/talent-tooltip-view.ts): a node's effects at its rank, a core slot and an
// installed prism.
import { test } from "node:test";
import assert from "node:assert/strict";
import { coverageView } from "../../src/app/bridge/gear-item-view.ts";
import {
  coreTalentTooltipView,
  prismTooltipView,
  talentNodeTooltipView,
} from "../../src/app/bridge/talent-tooltip-view.ts";

const nodeInput = (overrides = {}) => ({
  tree: "Lich",
  node: { coordinate: [1, 1], type: "medium", effectsPerRank: { damagePercent: 4 }, maxRank: 3 },
  nodes: [],
  rankAt: () => 2,
  icon: "node.webp",
  locked: false,
  prismAffected: false,
  prism: null,
  prismCoordinate: null,
  prismName: "",
  effectCoverage: () => "In calc",
  lineCoverage: () => "Not modeled",
  prismAffixCoverage: () => "In calc",
  ...overrides,
});

test("a node shows its effects at its rank, its rank badge and its type", () => {
  const view = talentNodeTooltipView(nodeInput());
  assert.equal(view.talentType, "medium");
  assert.equal(view.kicker, "Medium Talent");
  assert.equal(view.badge, "2/3");
  assert.equal(view.effects.length, 1);
  assert.match(view.effects[0].value, /8/);
  assert.deepEqual(view.effects[0].coverage, coverageView("In calc"));
  assert.equal(view.description, null);
  assert.equal(view.prism, null);
  assert.equal(view.footer, "Allocated");
});

test("a node without effects shows its description; an empty locked node says so", () => {
  const view = talentNodeTooltipView(
    nodeInput({ node: { coordinate: [0, 0], type: "micro", placeholder: true }, rankAt: () => 0, locked: true }),
  );
  assert.deepEqual(view.description, { text: "Profession-tree node", coverage: coverageView("Not modeled") });
  assert.equal(view.title, "Micro Talent");
  assert.equal(view.footer, "Locked · prerequisites not met");
});

test("a core slot names its threshold; an empty one asks for a core, a locked one names the points it needs", () => {
  const coverage = () => coverageView("Not selected");
  const open = coreTalentTooltipView({ tree: "Lich", threshold: 24, core: null, prism: null, locked: false, coverage });
  assert.equal(open.kicker, "Core talent · 24 points");
  assert.deepEqual([open.badge, open.footer], ["Open", "Click to select a core talent"]);
  const locked = coreTalentTooltipView({
    tree: "Lich",
    threshold: 24,
    core: null,
    prism: null,
    locked: true,
    coverage,
  });
  assert.deepEqual([locked.badge, locked.footer], ["Locked", "Requires 24 points in Lich"]);
  const fueling = coreTalentTooltipView({
    tree: "Lich",
    threshold: 12,
    core: { name: "Fueling", description: "A | B", icon: null },
    prism: null,
    locked: false,
    coverage,
  });
  assert.deepEqual(fueling.lines, ["A", "B"]);
  assert.match(fueling.note, /Fire Resistance fixed at 0%/);
});

test("a prism's tooltip lists its sections with their coverage", () => {
  const view = prismTooltipView({
    name: "Ethereal Prism: Haze",
    icon: "",
    inverse: false,
    area: "1x1",
    sections: [{ className: "base", heading: "Base Affix", lines: [{ kind: "base", text: "+10 % damage" }] }],
    coverage: (kind) => coverageView(kind === "base" ? "In calc" : "Not modeled"),
  });
  assert.equal(view.kind, "Ethereal Prism");
  assert.equal(view.sections[0].lines[0].text, "+10% damage");
  assert.equal(view.sections[0].lines[0].coverage.look, "calculated");
  assert.equal(view.areaCoverage.status, "Planner only");
});

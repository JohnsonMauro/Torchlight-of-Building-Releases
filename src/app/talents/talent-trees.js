// The talent trees: layouts (an installed Inverse Image reflects nodes), the open tree, ranks a prism change clears.
import {
  allProfessionTalentCatalogue,
  inverseImageReflectedCoordinates,
  inverseImageReflectionMap,
  inverseImageTalentNodes,
  pruneInvalidTalentRanks,
  selenaScorchingBeamTalentSetup,
} from "#engine";
import { talentDisplayNodes as talentNodesOnBoard } from "../bridge/talents-view-model.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { renderHeroPanel, renderHeroTraitTree } from "../hero/hero-controller.js";
import { plannerState, talentRanks } from "../planner/session.js";
import { ui } from "../planner/ui-state.js";

const capturedTalentPanels = new Map(selenaScorchingBeamTalentSetup.panels.map((panel) => [panel.name, panel]));
export const professionTreeLayoutsAll = Object.fromEntries(
  Object.entries(allProfessionTalentCatalogue).map(([name, panel]) => [
    name,
    {
      nodes: panel.nodes,
      edges: panel.edges.filter(([x1, y1, x2, y2]) => Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1),
    },
  ]),
);
const allTalentPanels = Object.values(allProfessionTalentCatalogue).map((panel) => ({
  ...panel,
  ...(capturedTalentPanels.get(panel.name) || {}),
  coreTalents: panel.coreTalents,
  allocatedNodes: capturedTalentPanels.get(panel.name)?.allocatedNodes || [],
}));

export function currentTalentPanel() {
  return allTalentPanels.find((panel) => panel.name === ui.activeTalentPanel);
}

// The Slates tab: the slate board in place of the open tree (apps/web/src/pages/build/TalentsView.tsx, from the
// "talents" source).
export function setTalentSlateMode(enabled) {
  if (ui.talentSlateMode === enabled) return;
  ui.talentSlateMode = enabled;
  viewSourceChanged("talents");
}

export function activeTalentLayouts() {
  const layouts = { ...professionTreeLayoutsAll };
  for (const [name, id] of Object.entries(plannerState.talents.installedPrisms || {})) {
    const graph = layouts[name],
      coordinate = plannerState.talents.installedPrismNodes?.[name];
    const prism = (plannerState.talents.prismInventory || []).find((item) => item.id === id);
    if (!graph || !coordinate || prism?.type !== "inverse") continue;
    layouts[name] = { ...graph, nodes: inverseImageTalentNodes(graph.nodes, prism, coordinate) };
  }
  return layouts;
}

export function talentDisplayNodes(panel = currentTalentPanel()) {
  const prism = (plannerState.talents.prismInventory || []).find(
    (item) => item.id === plannerState.talents.installedPrisms?.[panel.name],
  );
  return talentNodesOnBoard(
    panel,
    professionTreeLayoutsAll[panel.name],
    prism,
    plannerState.talents.installedPrismNodes?.[panel.name],
  );
}

// The talent trees are React (apps/web/src/features/talents): they re-read their source. The hero panel beside them and
// the tree picker dialog are still drawn here.
export function renderTalents() {
  renderHeroTraitTree();
  renderHeroPanel();
  viewSourceChanged("talentPicker");
  viewSourceChanged("talents");
}
export function clearInverseReflectedRanks(panel, item, coordinate) {
  for (const target of inverseImageReflectionMap(professionTreeLayoutsAll[panel]?.nodes || [], item, coordinate).keys())
    talentRanks.set(`${panel}:${target}`, 0);
}
export function reconcileTalentRanksAfterPrismChange(panel) {
  const layouts = activeTalentLayouts(),
    graph = layouts[panel];
  if (!graph) return;
  const prism = (plannerState.talents.prismInventory || []).find(
    (item) => item.id === plannerState.talents.installedPrisms?.[panel],
  );
  const prismCoordinate = plannerState.talents.installedPrismNodes?.[panel];
  const result = pruneInvalidTalentRanks({
    panel,
    graph,
    layouts,
    ranks: Object.fromEntries(talentRanks),
    prismCoordinate,
    prerequisiteFreeCoordinates: inverseImageReflectedCoordinates(prism, prismCoordinate),
  });
  for (const key of result.removed) talentRanks.set(key, 0);
}

export function clearTalentTreeState(name) {
  if (!name) return;
  for (const key of [...talentRanks.keys()]) if (key.startsWith(name + ":")) talentRanks.set(key, 0);
  for (const key of Object.keys(plannerState.talents.coreSelections))
    if (key.startsWith(name + ":")) delete plannerState.talents.coreSelections[key];
}

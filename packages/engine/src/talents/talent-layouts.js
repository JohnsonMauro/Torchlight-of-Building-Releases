// The talent trees as the talent rules read them (allocation, prerequisites, points): each tree's nodes and the edges
// between neighbouring nodes, and for a tree with an installed Inverse Image, the nodes as it reflects them.
import { allProfessionTalentCatalogue } from "../../data/talents/all-profession-trees.generated.js";
import { inverseImageTalentNodes } from "./prism-crafting.js";

export const talentTreeLayouts = Object.fromEntries(
  Object.entries(allProfessionTalentCatalogue).map(([name, panel]) => [
    name,
    {
      nodes: panel.nodes,
      edges: panel.edges.filter(([x1, y1, x2, y2]) => Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1),
    },
  ]),
);

/** The layouts with each installed Inverse Image's reflection, for a build's `talents` (its prisms and where they sit). */
export function activeTalentTreeLayouts(talents = {}) {
  const layouts = { ...talentTreeLayouts };
  for (const [name, id] of Object.entries(talents.installedPrisms || {})) {
    const graph = layouts[name],
      coordinate = talents.installedPrismNodes?.[name];
    const prism = (talents.prismInventory || []).find((item) => item.id === id);
    if (!graph || !coordinate || prism?.type !== "inverse") continue;
    layouts[name] = { ...graph, nodes: inverseImageTalentNodes(graph.nodes, prism, coordinate) };
  }
  return layouts;
}

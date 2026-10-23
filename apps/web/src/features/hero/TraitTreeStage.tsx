// A tree hero's trait stage (hero-stages.ts, Youga – The Ultimate One): the game's Hero Trait screen as a decal, the trait
// tree where the game draws it (TLIDB's tree coordinates are that screen's), the links between picked traits lit, a check
// under each pick, and the three memories under the tree. A node picks or drops its trait (as on the Trait Path board); a
// memory socket works as in the rows.
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { TraitPathNodeView, TraitPathView, TraitTiersView } from "@legacy/app/bridge/hero-traits-view-model.ts";
import { Artwork } from "../../ui/Artwork";
import { HeroTraitTooltip } from "./TraitTooltip";
import { MemorySocket } from "./MemorySocket";
import { Node, PickedCheck, StageFrame } from "./TraitStage";
import {
  STAGE_BASE,
  STAGE_CAPTION,
  STAGE_MEMORY,
  STAGE_TREE_ART,
  STAGE_TREE_ART_LOCKED,
  STAGE_TREE_ART_OPEN,
  STAGE_TREE_ART_PICKED,
  STAGE_TREE_LINE,
  STAGE_TREE_NODE,
  type TreeStage,
} from "./hero-stages";

interface Point {
  x: number;
  y: number;
}
/** Two nodes this close to the same distance from the base trait are linked along the game's circle, not straight. */
const SAME_CIRCLE = 0.03;
/** Room kept right of the rightmost node (percent of the decal's width). */
const LINK_MARGIN = 2;

/** The path of a link in the lines' viewBox (percent across x the decal's ratio, percent down). */
function linkPath(from: Point, to: Point, base: Point): string {
  const radius = (point: Point) => Math.hypot(point.x - base.x, point.y - base.y);
  const [r1, r2] = [radius(from), radius(to)];
  if (Math.abs(r1 - r2) > SAME_CIRCLE * Math.max(r1, r2)) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  // The shorter way round the circle about the base trait.
  const cross = (from.x - base.x) * (to.y - base.y) - (from.y - base.y) * (to.x - base.x);
  const r = (r1 + r2) / 2;
  return `M ${from.x} ${from.y} A ${r} ${r} 0 0 ${cross > 0 ? 1 : 0} ${to.x} ${to.y}`;
}

export function TraitTreeStage({
  stage,
  tree,
}: {
  stage: TreeStage;
  tree: { tiers: TraitTiersView; path: TraitPathView };
}) {
  const { path, tiers } = tree;
  const place = (node: TraitPathNodeView): Point => ({
    x: node.screen.x * stage.screen.x[0] + stage.screen.x[1],
    y: node.screen.y * stage.screen.y[0] + stage.screen.y[1],
  });
  const at = new Map(path.nodes.map((node) => [node.name, place(node)]));
  const byName = new Map(path.nodes.map((node) => [node.name, node]));
  const base = path.nodes.find((node) => node.base);
  // The rightmost node or memory, and a margin for the circle's links, which bow out past the nodes they join.
  const right =
    (Math.max(
      ...path.nodes.map((node) => (at.get(node.name)?.x ?? 0) + stage.node / 2),
      ...stage.memories.map((memory) => memory.x + stage.memory / 2),
    ) +
      LINK_MARGIN) /
    100;
  // The lines' viewBox keeps the decal's ratio, so a circle stays round: x in percent times the ratio.
  const svg = (point: Point): Point => ({ x: point.x * stage.ratio, y: point.y });
  const basePoint = base ? svg(at.get(base.name) as Point) : { x: 0, y: 0 };
  const links = path.nodes.filter((node) => node.parent && node.selected && byName.get(node.parent)?.selected);
  return (
    <StageFrame stage={stage} right={right}>
      <svg
        className="pointer-events-none absolute inset-0 size-full overflow-visible"
        viewBox={`0 0 ${stage.ratio * 100} 100`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {links.map((node) => (
          <path
            key={node.name}
            data-trait-link=""
            className={STAGE_TREE_LINE}
            d={linkPath(svg(at.get(node.parent as string) as Point), svg(at.get(node.name) as Point), basePoint)}
          />
        ))}
      </svg>
      {path.nodes.map((node) => {
        const point = at.get(node.name) as Point;
        return (
          <Node key={node.name} x={point.x} y={point.y} size={node.base ? stage.base : stage.node}>
            <TreeNode node={node} />
            {node.selected && !node.base ? <PickedCheck /> : null}
          </Node>
        );
      })}
      {tiers.base.memory ? (
        <Node x={stage.baseMemory.x} y={stage.baseMemory.y} size={stage.memory}>
          <MemorySocket socket={tiers.base.memory} look={STAGE_MEMORY} />
        </Node>
      ) : null}
      {stage.memories.map((memory, row) =>
        tiers.tiers[row] ? (
          <Node key={row} x={memory.x} y={memory.y} size={stage.memory}>
            <MemorySocket socket={tiers.tiers[row].memory} look={STAGE_MEMORY} />
          </Node>
        ) : null,
      )}
      <span className={STAGE_CAPTION} style={{ left: `${stage.available.x}%`, top: `${stage.available.y}%` }}>
        {`Available Traits: ${Math.max(0, path.capacity - path.picked)}`}
      </span>
    </StageFrame>
  );
}

/** A node of the tree: the base trait (always on), or a trait to pick or drop; locked until its parent is picked. */
function TreeNode({ node }: { node: TraitPathNodeView }) {
  if (node.base)
    return (
      <HeroTraitTooltip name={node.name} levelKey="base" selected>
        <button
          type="button"
          className="selena-dance-node base selected size-full cursor-pointer border-0 bg-transparent p-0"
          aria-label={node.name}
          aria-pressed="true"
        >
          <Artwork src={node.art} alt={node.name} className={STAGE_BASE} />
        </button>
      </HeroTraitTooltip>
    );
  const look = node.selected ? STAGE_TREE_ART_PICKED : node.locked ? STAGE_TREE_ART_LOCKED : STAGE_TREE_ART_OPEN;
  return (
    <HeroTraitTooltip name={node.name} levelKey={node.levelKey} selected={node.selected}>
      <button
        type="button"
        className={`selena-dance-node ${node.selected ? "selected" : ""} ${node.locked ? "locked" : ""} ${STAGE_TREE_NODE}`}
        aria-label={node.name}
        aria-pressed={node.selected}
        disabled={node.locked}
        onClick={() => plannerCommands().toggleTraitPathNode(node.name)}
      >
        <Artwork src={node.art} alt={node.name} className={`${STAGE_TREE_ART} ${look}`} />
      </button>
    </HeroTraitTooltip>
  );
}

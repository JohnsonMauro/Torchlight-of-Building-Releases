// The talent trees of the Build page: the tree tabs (with the Slates tab and the total), the open tree's heading and
// actions, the prism placement prompt, the core talents and the stage of nodes with the installed prism. The data is
// the planner's "talents" source (src/app/bridge/talents-view-model.ts); every edit is a planner command, and the tree,
// core and prism dialogs stay legacy, as does the swap of the tree for the slate board (src/app/app.js
// setTalentSlateMode, which moves .slate-layout into .talent-layout and hides .talent-tree-panel). The legacy hover
// tooltip reads .talent-node with data-coordinate (and its .talent-node-art), .core-talent with data-core-slot, and
// .prism-affected-node, so they stay.
import { useEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { CoreView, TalentsView } from "@legacy/app/bridge/talents-view-model.ts";
import { Artwork } from "../../ui/Artwork";
import { usePointerDrag } from "../../ui/use-pointer-drag";
import { useViewSource } from "../../ui/use-view-source";

// The cells of the Slates tab's emblem (the statue grid).
const SLATE_EMBLEM_CELLS = [
  [24, 4],
  [34, 4],
  [14, 14],
  [24, 14],
  [34, 14],
  [44, 14],
  [4, 24],
  [14, 24],
  [24, 24],
  [34, 24],
  [44, 24],
  [54, 24],
  [4, 34],
  [14, 34],
  [24, 34],
  [34, 34],
  [44, 34],
  [54, 34],
  [14, 44],
  [24, 44],
  [34, 44],
  [44, 44],
  [24, 54],
  [34, 54],
];

/** A right-click that acted (the command says so) keeps the browser's menu closed. */
const rightClick = (event: MouseEvent, act: () => boolean) => {
  if (act()) event.preventDefault();
};

export function TalentTabs() {
  const view = useViewSource("talents");
  if (!view) return null;
  return (
    <>
      <p className="eyebrow">
        <span>Talent trees</span>
      </p>
      {view.tabs.map((tab) => (
        <button
          key={tab.slot}
          type="button"
          className={`talent-tree-slot ${tab.familyClass} ${tab.active ? "active" : ""} ${!tab.name ? "empty" : ""}`}
          data-talent-slot={tab.slot}
          disabled={tab.disabled}
          onClick={() => plannerCommands().openTalentTree(tab.slot)}
          onContextMenu={(event) => rightClick(event, () => plannerCommands().removeTalentTree(tab.slot))}
        >
          {tab.name ? (
            <Artwork src={tab.art} alt={tab.name} className="talent-panel-art" />
          ) : (
            <span className="empty-tree-art">+</span>
          )}
          <span>
            <small>{tab.label}</small>
            <strong>{tab.name || (tab.disabled ? "Select previous" : "Click to select")}</strong>
            {tab.name ? <em>{`${tab.points} pts`}</em> : null}
          </span>
        </button>
      ))}
      <button
        type="button"
        className={`talent-divinity-link ${view.slateMode ? "active" : ""}`}
        data-talent-slates=""
        onClick={() => plannerCommands().openTalentSlates()}
      >
        <span className="talent-slate-emblem" aria-hidden="true">
          <svg viewBox="0 0 64 64">
            <g>
              {SLATE_EMBLEM_CELLS.map(([x, y]) => (
                <rect key={`${x},${y}`} x={x} y={y} width="8" height="8" rx="1" />
              ))}
            </g>
          </svg>
        </span>
        <small>Divinity</small>
        <strong>Slates</strong>
      </button>
      <div className="talent-slot-total">
        <small>Total points</small>
        <strong>{`${view.totalPoints} / ${view.maxPoints}`}</strong>
      </div>
    </>
  );
}

export function TalentBoardHeading() {
  const view = useViewSource("talents");
  const heading = view?.heading;
  return (
    <div className={`talent-board-heading ${heading?.familyClass ?? ""}`}>
      <div>
        <p className="eyebrow" id="talent-board-kind">
          {heading?.kind ?? "Talent panel"}
        </p>
        <h2 id="talent-board-name">{heading ? heading.name : "—"}</h2>
      </div>
      <div className="talent-board-header-side">
        <strong id="talent-board-points" className="point-total">
          {heading?.points ?? "—"}
        </strong>
        <div className="talent-board-actions" aria-label="Talent tree actions">
          <button
            type="button"
            className="talent-action talent-action-prism"
            hidden={heading ? !heading.canInstallPrism : false}
            onClick={() => plannerCommands().openPrismInventory()}
          >
            Install Prism
          </button>{" "}
          <button
            type="button"
            className="talent-action talent-action-reselect"
            onClick={() => plannerCommands().reselectTalentTree()}
          >
            Reselect
          </button>{" "}
          <button
            type="button"
            className="talent-action talent-action-reset"
            title="Reset points on the open talent tree"
            onClick={() => plannerCommands().resetTalentTree()}
          >
            Reset
          </button>{" "}
          <button type="button" className="qol-help" data-qol-help="talents" aria-label="Talents controls">
            ?
          </button>
        </div>
      </div>
    </div>
  );
}

export function PrismPlacementPrompt() {
  const view = useViewSource("talents");
  const placing = view?.placingPrism ?? null;
  const prompt = useRef<HTMLDivElement>(null);
  // A prism picked in the inventory waits for its node: bring the prompt (and the tree under it) into view.
  useEffect(() => {
    if (placing) prompt.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [placing]);
  return (
    <div id="prism-placement-prompt" className="prism-placement-prompt" hidden={!placing} ref={prompt}>
      <span>
        {"Click a talent node to install "}
        <strong id="prism-placement-name">{placing ?? ""}</strong>.
      </span>
      <button type="button" onClick={() => plannerCommands().cancelPrismPlacement()}>
        Cancel
      </button>
    </div>
  );
}

export function CoreTalents() {
  const view = useViewSource("talents");
  return (
    <div id="core-talents" className="core-talents">
      {view?.cores.map((core) => (
        <Core key={core.kind === "slot" ? core.threshold : "prism"} core={core} />
      ))}
    </div>
  );
}

function Core({ core }: { core: CoreView }) {
  if (core.kind === "prism")
    return (
      <article className="core-talent prism">
        <Artwork src={core.art} alt={core.name} className="core-art" />
        <div>
          <span>{core.caption}</span>
          <strong>{core.name}</strong>
          <small>{core.details}</small>
        </div>
      </article>
    );
  return (
    <button
      type="button"
      className={`core-talent core-selector ${core.selected ? "selected" : ""} ${core.locked ? "locked" : ""}`}
      data-core-slot={core.threshold}
      onClick={() => plannerCommands().openCorePicker(core.threshold)}
      onContextMenu={(event) => rightClick(event, () => plannerCommands().removeCoreTalent(core.threshold))}
    >
      {core.name ? (
        <Artwork src={core.art} alt={core.name} className="core-art" />
      ) : (
        <span className="empty-core-art">+</span>
      )}
      <div>
        <span>{`${core.threshold} point core${core.locked ? " · locked" : ""}`}</span>
        <strong>{core.name || "Select core talent"}</strong>
        <small>{core.description}</small>
      </div>
    </button>
  );
}

export function TalentStage() {
  const view = useViewSource("talents");
  const prismDrag = usePointerDrag<string>({
    // Any node of the stage but the dragged prism itself (it follows the pointer until its class lets the pointer
    // through).
    targetAt: (element) =>
      element
        ?.closest("#talent-stage .talent-node[data-coordinate]:not(.installed-prism-node)")
        ?.getAttribute("data-coordinate") ?? null,
    onStart: () => plannerCommands().hideTooltip(),
    onDrop: (_origin, coordinate) => plannerCommands().dropPrism(coordinate),
    onInvalidDrop: () => plannerCommands().dropPrism(null),
  });
  return (
    <div
      id="talent-stage"
      className="talent-stage"
      role="grid"
      aria-label="Allocated talent nodes"
      onClickCapture={(event) => {
        // The click that ends a prism drag acts on nothing.
        if (prismDrag.swallowClick()) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {view ? <StageContent view={view} drag={prismDrag} /> : null}
    </div>
  );
}

function StageContent({ view, drag }: { view: TalentsView; drag: ReturnType<typeof usePointerDrag<string>> }) {
  const dragging = drag.source !== null;
  const nodeHandlers = (coordinate: string) => ({
    onClick: () => {
      plannerCommands().hideTooltip();
      plannerCommands().clickTalentNode(coordinate);
    },
    onContextMenu: (event: MouseEvent) => {
      event.preventDefault();
      plannerCommands().hideTooltip();
      plannerCommands().rightClickTalentNode(coordinate);
    },
  });
  return (
    <>
      <svg className="talent-connections" viewBox="0 0 7 5" preserveAspectRatio="none" aria-hidden="true">
        {view.connections.map((line, index) => (
          <line key={index} className={line.state} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
        ))}
      </svg>
      {view.areas.map((area) => (
        <div
          key={area.reflected ? "reflected" : "area"}
          className={`prism-area-box${area.reflected ? " inverse-reflected-area" : ""}`}
          style={{
            gridColumn: `${area.left + 1}/span ${area.width}`,
            gridRow: `${area.top + 1}/span ${area.height}`,
          }}
          aria-hidden="true"
        />
      ))}
      {view.nodes.map((node) => {
        const style = { "--column": node.column, "--row": node.row } as CSSProperties;
        const button = (
          <button
            key={node.coordinate}
            type="button"
            role="gridcell"
            className={`talent-node ${node.classes}${node.prism && dragging ? " prism-source-revealed" : ""}${drag.target === node.coordinate ? " prism-drop-target" : ""}`}
            style={style}
            data-coordinate={node.coordinate}
            data-node-type={node.type}
            aria-label={node.label}
            {...nodeHandlers(node.coordinate)}
          >
            {node.art ? (
              <img className="talent-node-art" src={node.art} alt="" />
            ) : (
              <span className="node-symbol">{node.symbol}</span>
            )}
            <span className="node-rank">{`${node.rank}/${node.max}`}</span>
          </button>
        );
        if (!node.prism) return button;
        return [
          button,
          <button
            key={`${node.coordinate}:prism`}
            type="button"
            className={`talent-node prism-node installed-prism-node${dragging ? " prism-dragging" : ""}`}
            style={style}
            data-coordinate={node.coordinate}
            data-node-type={node.type}
            aria-label={node.prism.label}
            {...nodeHandlers(node.coordinate)}
            onPointerDown={(event) => {
              if (view.placingPrism) return;
              event.preventDefault();
              drag.start(event, node.coordinate, node.coordinate);
            }}
          >
            {node.prism.art ? (
              <img className="talent-node-art" src={node.prism.art} alt="" />
            ) : (
              <span className="node-symbol">✦</span>
            )}
          </button>,
        ];
      })}
    </>
  );
}

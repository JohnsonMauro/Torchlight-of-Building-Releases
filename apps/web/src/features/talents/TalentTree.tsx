// The talent trees of the Build page: the tree tabs (with the Slates tab and the total), the open tree's heading and
// actions, the prism placement prompt, the core talents and the stage of nodes with the installed prism. The data is
// the planner's "talents" source (src/app/bridge/talents-view-model.ts); every edit is a planner command, and the tree,
// core and prism dialogs stay legacy (the Slates tab's board takes the tree's place in TalentsView). Nodes, cores and the
// installed prism show their tooltips (TalentTooltip). The state-dependent looks are in talent-classes.ts.
import { useEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { CoreView, TalentsView } from "@legacy/app/bridge/talents-view-model.ts";
import { Artwork } from "../../ui/Artwork";
import { familyTint } from "../../ui/talent-slate-styles";
import { usePointerDrag } from "../../ui/use-pointer-drag";
import { useViewSource } from "../../ui/use-view-source";
import { HelpButton } from "../../ui/HelpButton";
import { CoreTalentTooltip, TalentNodeTooltip } from "./TalentTooltip";
import { PRISM_ART, areaLook, lineLook, nodeLook, prismLook } from "./talent-classes";
import { TalentEmblem } from "./TalentEmblem";
import { hideTooltip } from "../../ui/tooltip/tooltip-store";

// Under 1100px (max-[1100px]:) the trees column narrows to 205px: smaller slots, emblems and type.
/** A tree slot: emblem beside the slot label, the tree name and its points chip. */
const TREE_SLOT_CARD =
  "cursor-pointer rounded-md border border-line bg-raised text-left text-text hover:border-line-strong on:border-accent on:bg-accent/10";
const TREE_SLOT = `talent-tree-slot group ${TREE_SLOT_CARD} border-l-2 on:border-l-accent off:cursor-not-allowed off:opacity-40 grid h-full min-h-0 grid-cols-[66px_minmax(0,1fr)] items-center gap-3 p-3.5 max-[1100px]:h-auto max-[1100px]:min-h-18 max-[1100px]:grid-cols-[48px_minmax(0,1fr)] max-[1100px]:gap-2 max-[1100px]:p-2 max-[760px]:min-h-15.5`;
const TREE_EMBLEM = "talent-panel-art size-15.5 max-[1100px]:size-10.5";
const TREE_POINTS =
  "chip mt-1 w-max px-1.5 py-0.5 text-xs leading-tight font-bold tracking-wide uppercase not-italic tabular-nums group-on:border-accent group-on:text-accent";
/** The small caps label over a slot's name. */
const SLOT_LABEL = "text-[10px] tracking-wider text-dim uppercase max-[1100px]:tracking-normal";
/** The Talent trees heading strip and the open tree's kind. */
const HEADING = "font-display text-sm font-bold tracking-wider uppercase";
/** Reselect / Reset / Install Prism. */
const TALENT_ACTION = "talent-action btn min-h-8 px-3 py-1.5 text-xs font-bold max-[760px]:px-2";
/** A node and the installed prism over it share their place and size on the stage. */
const NODE =
  "relative col-(--column) row-(--row) grid size-12 place-items-center place-self-center rounded-full p-0 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent-strong";
const NODE_SYMBOL = "node-symbol text-xl leading-none [grid-area:1/1] max-[1100px]:min-[851px]:text-base";
/** A core talent card (a core slot, or the prism's own effect). */
const CORE_CARD =
  "core-talent flex min-h-18 flex-[1_1_min(310px,100%)] items-center gap-3 rounded-md border border-l-3 px-3.5 py-2.5 text-left text-inherit";
/** A core slot: accent-edged, the accent on hover and keyboard focus. */
const CORE_SLOT =
  "core-selector cursor-pointer border-line border-l-accent bg-raised hover:border-accent focus-visible:border-accent focus-visible:outline-none";
/** A prism's own effect, in violet. */
const CORE_PRISM = "border-violet/50 border-l-violet bg-violet/10";
const CORE_ART =
  "core-art relative size-11.5 flex-[0_0_46px] overflow-hidden rounded-md border border-line-strong [&>img]:absolute [&>img]:inset-0 [&>img]:z-1 [&>img]:size-full [&>img]:object-cover [&>img+span]:invisible";
const CORE_CAPTION = "block text-xs tracking-wider uppercase";
const CORE_NAME = "mt-1 block font-display text-sm font-bold text-text";
/** The dashed "+" of an empty tree slot or core slot. */
const EMPTY_ART = "grid place-items-center border-2 border-dashed border-line-strong text-lg text-dim";

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
      <p
        className={`eyebrow col-span-full -mx-2.5 -mt-2.5 rounded-t-md border-b border-line bg-raised px-3 py-3 text-accent ${HEADING}`}
      >
        <span className="text-accent">Talent trees</span>
      </p>
      {view.tabs.map((tab) => (
        <button
          key={tab.slot}
          type="button"
          className={`${TREE_SLOT} ${familyTint(tab.familyClass)} ${tab.active ? "active" : ""} ${!tab.name ? "empty" : ""}`}
          data-talent-slot={tab.slot}
          disabled={tab.disabled}
          onClick={() => plannerCommands().openTalentTree(tab.slot)}
          onContextMenu={(event) => rightClick(event, () => plannerCommands().removeTalentTree(tab.slot))}
        >
          {tab.name ? (
            <TalentEmblem src={tab.art} alt={tab.name} className={TREE_EMBLEM} />
          ) : (
            <span className={`empty-tree-art size-10.5 ${EMPTY_ART}`}>+</span>
          )}
          <span className="min-w-0">
            <small className={`block ${SLOT_LABEL}`}>{tab.label}</small>
            <strong className="my-1 block font-display text-sm leading-tight font-bold max-[1100px]:my-0.5 max-[1100px]:font-sans max-[1100px]:text-xs max-[1100px]:leading-[normal]">
              {tab.name || (tab.disabled ? "Select previous" : "Click to select")}
            </strong>
            {tab.name ? <em className={TREE_POINTS}>{`${tab.points} pts`}</em> : null}
          </span>
        </button>
      ))}
      <button
        type="button"
        className={`talent-divinity-link group ${TREE_SLOT_CARD} grid h-full min-h-0 grid-cols-[66px_minmax(0,1fr)] grid-rows-[auto_auto] gap-x-3 p-3.5 max-[1100px]:h-auto max-[1100px]:min-h-15.5 max-[1100px]:grid-cols-[42px_minmax(0,1fr)] max-[1100px]:gap-x-0 max-[1100px]:p-2 ${view.slateMode ? "active" : ""}`}
        data-talent-slates=""
        onClick={() => plannerCommands().openTalentSlates()}
      >
        <span
          className="talent-slate-emblem row-span-2 grid size-15.5 place-items-center self-center text-accent max-[1100px]:size-10.5"
          aria-hidden="true"
        >
          <svg viewBox="0 0 64 64" className="block size-full overflow-visible fill-current">
            <g>
              {SLATE_EMBLEM_CELLS.map(([x, y]) => (
                <rect key={`${x},${y}`} x={x} y={y} width="8" height="8" rx="1" />
              ))}
            </g>
          </svg>
        </span>
        <small className={SLOT_LABEL}>Divinity</small>
        <strong className="font-display font-bold max-[1100px]:font-sans">Slates</strong>
      </button>
      <div className="talent-slot-total rounded-md bg-raised px-2.5 py-3.5 max-[1100px]:mt-auto">
        <small className="block text-sm text-accent uppercase">Total points</small>
        <strong className="mt-1 block text-lg font-bold text-accent">{`${view.totalPoints} / ${view.maxPoints}`}</strong>
      </div>
    </>
  );
}

export function TalentBoardHeading() {
  const view = useViewSource("talents");
  const heading = view?.heading;
  return (
    <div
      className={`talent-board-heading relative -mx-3.5 -mt-3.5 mb-3.5 flex items-center justify-between rounded-t-md border-b border-line bg-raised px-4 py-3.5 max-[760px]:items-start max-[760px]:gap-3 ${familyTint(heading?.familyClass ?? "", false)}`}
    >
      <div>
        <p className={`eyebrow mb-1 text-accent ${HEADING}`} id="talent-board-kind">
          {heading?.kind ?? "Talent panel"}
        </p>
        <h2
          id="talent-board-name"
          className="font-display text-xl leading-tight font-bold text-(--talent-emblem,var(--color-accent))"
        >
          {heading ? heading.name : "—"}
        </h2>
      </div>
      <div className="talent-board-header-side flex min-w-0 flex-col items-end gap-2.5 max-[760px]:gap-2">
        <strong id="talent-board-points" className="point-total font-bold text-accent">
          {heading?.points ?? "—"}
        </strong>
        <div
          className="talent-board-actions flex flex-wrap justify-end gap-2 max-[760px]:gap-1"
          aria-label="Talent tree actions"
        >
          <button
            type="button"
            className={`${TALENT_ACTION} talent-action-prism`}
            hidden={heading ? !heading.canInstallPrism : false}
            onClick={() => plannerCommands().openPrismInventory()}
          >
            Install Prism
          </button>{" "}
          <button
            type="button"
            className={`${TALENT_ACTION} talent-action-reselect`}
            onClick={() => plannerCommands().reselectTalentTree()}
          >
            Reselect
          </button>{" "}
          <button
            type="button"
            className={`${TALENT_ACTION} talent-action-reset`}
            title="Reset points on the open talent tree"
            onClick={() => plannerCommands().resetTalentTree()}
          >
            Reset
          </button>{" "}
          <HelpButton topic="talents" label="Talents" className="self-center" />
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
    <div
      id="prism-placement-prompt"
      className="prism-placement-prompt my-3 flex items-center justify-between gap-3.5 rounded-md border border-accent-strong bg-accent-strong/10 px-3.5 py-2.5 text-sm text-text"
      hidden={!placing}
      ref={prompt}
    >
      <span>
        {"Click a talent node to install "}
        <strong id="prism-placement-name">{placing ?? ""}</strong>.
      </span>
      <button
        type="button"
        className="btn h-8 px-3 text-xs font-semibold"
        onClick={() => plannerCommands().cancelPrismPlacement()}
      >
        Cancel
      </button>
    </div>
  );
}

export function CoreTalents() {
  const view = useViewSource("talents");
  return (
    <div id="core-talents" className="core-talents my-4.5 flex flex-wrap gap-2.5">
      {view?.cores.map((core) => (
        <Core key={core.kind === "slot" ? core.threshold : "prism"} core={core} />
      ))}
    </div>
  );
}

function Core({ core }: { core: CoreView }) {
  if (core.kind === "prism")
    return (
      <CoreTalentTooltip target={{ prism: true }}>
        <article className={`${CORE_CARD} ${CORE_PRISM} prism`}>
          <Artwork src={core.art} alt={core.name} className={CORE_ART} />
          <div className="min-w-0">
            <span className={`${CORE_CAPTION} text-violet`}>{core.caption}</span>
            <strong className={CORE_NAME}>{core.name}</strong>
            <small className="hidden">{core.details}</small>
          </div>
        </article>
      </CoreTalentTooltip>
    );
  return (
    <CoreTalentTooltip target={{ threshold: core.threshold, locked: core.locked }}>
      <button
        type="button"
        className={`${CORE_CARD} ${CORE_SLOT} ${core.selected ? "selected" : ""} ${core.locked ? "locked opacity-40 grayscale" : ""}`}
        data-core-slot={core.threshold}
        onClick={() => plannerCommands().openCorePicker(core.threshold)}
        onContextMenu={(event) => rightClick(event, () => plannerCommands().removeCoreTalent(core.threshold))}
      >
        {core.name ? (
          <Artwork src={core.art} alt={core.name} className={CORE_ART} />
        ) : (
          <span className={`empty-core-art size-11.5 flex-[0_0_46px] ${EMPTY_ART}`}>+</span>
        )}
        <div className="min-w-0">
          <span
            className={`${CORE_CAPTION} text-accent`}
          >{`${core.threshold} point core${core.locked ? " · locked" : ""}`}</span>
          <strong className={CORE_NAME}>{core.name || "Select core talent"}</strong>
          <small className="hidden">{core.description}</small>
        </div>
      </button>
    </CoreTalentTooltip>
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
    onStart: () => hideTooltip(),
    onDrop: (_origin, coordinate) => plannerCommands().dropPrism(coordinate),
    onInvalidDrop: () => plannerCommands().dropPrism(null),
  });
  return (
    <div
      id="talent-stage"
      className="talent-stage relative grid rounded-md border border-line bg-sunken min-h-80 min-w-125 grid-cols-7 grid-rows-[repeat(5,57px)] px-1 py-2.5 max-[1100px]:min-[851px]:min-w-105 min-[1100px]:min-h-110 min-[1100px]:flex-1 min-[1100px]:grid-rows-[repeat(5,minmax(70px,1fr))]"
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
      hideTooltip();
      plannerCommands().clickTalentNode(coordinate);
    },
    onContextMenu: (event: MouseEvent) => {
      event.preventDefault();
      hideTooltip();
      plannerCommands().rightClickTalentNode(coordinate);
    },
  });
  return (
    <>
      <svg
        className="talent-connections absolute inset-x-1 inset-y-4.5 z-0 h-[calc(100%-36px)] w-[calc(100%-8px)] overflow-visible"
        viewBox="0 0 7 5"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {view.connections.map((line, index) => (
          <line
            key={index}
            className={`${line.state} ${lineLook(line.state)}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
          />
        ))}
      </svg>
      {view.areas.map((area) => (
        <div
          key={area.reflected ? "reflected" : "area"}
          className={`prism-area-box${area.reflected ? " inverse-reflected-area" : ""} ${areaLook(area.reflected)}`}
          style={{
            gridColumn: `${area.left + 1}/span ${area.width}`,
            gridRow: `${area.top + 1}/span ${area.height}`,
          }}
          aria-hidden="true"
        />
      ))}
      {view.nodes.map((node) => {
        const style = { "--column": node.column, "--row": node.row } as CSSProperties;
        const dropTarget = drag.target === node.coordinate;
        const look = nodeLook(node.classes, dropTarget, dragging);
        const button = (
          <TalentNodeTooltip key={node.coordinate} node={node}>
            <button
              type="button"
              role="gridcell"
              className={`${NODE} talent-node ${node.classes}${dropTarget ? " prism-drop-target" : ""} ${look.node}`}
              style={style}
              data-coordinate={node.coordinate}
              data-node-type={node.type}
              aria-label={node.label}
              {...nodeHandlers(node.coordinate)}
            >
              {node.art ? (
                <img
                  className={`talent-node-art block size-9.75 object-contain [grid-area:1/1] ${look.art}`}
                  src={node.art}
                  alt=""
                />
              ) : (
                <span className={NODE_SYMBOL}>{node.symbol}</span>
              )}
              <span
                className={`node-rank absolute -right-1 -bottom-1 min-w-6 rounded-full px-1 py-0.5 text-[10px] font-bold ${look.rank}`}
              >{`${node.rank}/${node.max}`}</span>
            </button>
          </TalentNodeTooltip>
        );
        if (!node.prism) return button;
        return [
          button,
          <TalentNodeTooltip key={`${node.coordinate}:prism`} node={node}>
            <button
              type="button"
              className={`${NODE} talent-node prism-node installed-prism-node${dragging ? " prism-dragging" : ""} ${prismLook(dragging)}`}
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
                <img className={`talent-node-art ${PRISM_ART}`} src={node.prism.art} alt="" />
              ) : (
                <span className={`${NODE_SYMBOL} text-violet`}>✦</span>
              )}
            </button>
          </TalentNodeTooltip>,
        ];
      })}
    </>
  );
}

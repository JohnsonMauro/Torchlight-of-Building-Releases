// The talent trees of the Build page: the tree tabs (with the Slates tab and the total), the open tree's bar (its core
// talents, its points and actions, as the game lays them out), the prism placement prompt and the stage of nodes with
// the installed prism. The data is
// the planner's "talents" source (src/app/bridge/talents-view-model.ts); every edit is a planner command, and the tree,
// core and prism dialogs stay legacy (the Slates tab's board takes the tree's place in TalentsView). Nodes, cores and the
// installed prism show their tooltips (TalentTooltip). The state-dependent looks are in talent-classes.ts.
import { useEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { PATH_OF_PROGRESSION_TALENT_POINTS, TREASURE_TROVE_TALENT_POINTS } from "#engine";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { CoreView, TalentsView } from "@legacy/app/bridge/talents-view-model.ts";
import { Artwork } from "../../ui/Artwork";
import { CommitNumberInput } from "../../ui/CommitNumberInput";
import { familyTint } from "../../ui/talent-slate-styles";
import { usePointerDrag } from "../../ui/use-pointer-drag";
import { useViewSource } from "../../ui/use-view-source";
import { CoreTalentTooltip, TalentNodeTooltip } from "./TalentTooltip";
import { PRISM_ART, areaLook, lineLook, nodeLook, prismLook } from "./talent-classes";
import { TalentEmblem } from "./TalentEmblem";
import { hideTooltip } from "../../ui/tooltip/tooltip-store";

// Under 1100px (max-[1100px]:) the trees column narrows to 205px: smaller slots, emblems and type.
/**
 * A slot of the trees column (a tree, or the Slates tab): emblem beside the slot label and its name, an accent edge on
 * the left while open.
 */
const SLOT_BASE =
  "grid h-full min-h-0 cursor-pointer items-center gap-3 rounded-md border border-l-2 border-line bg-raised p-3.5 text-left text-text hover:border-line-strong on:border-accent on:border-l-accent on:bg-accent/10 max-[1100px]:h-auto max-[1100px]:min-h-18 max-[1100px]:gap-2 max-[1100px]:p-2 max-[760px]:min-h-15.5";
const SLOT = `${SLOT_BASE} grid-cols-[66px_minmax(0,1fr)] max-[1100px]:grid-cols-[48px_minmax(0,1fr)]`;
// A tree tab adds a column for its points.
const TREE_SLOT = `talent-tree-slot ${SLOT_BASE} grid-cols-[66px_minmax(0,1fr)_auto] max-[1100px]:grid-cols-[48px_minmax(0,1fr)_auto] off:cursor-not-allowed off:opacity-40`;
/** A slot's emblem: the tree's art, or the Slates tab's statue grid. */
const SLOT_EMBLEM = "size-15.5 max-[1100px]:size-10.5";
/** The small caps label over a slot's name. */
const SLOT_LABEL = "block text-[10px] tracking-wider text-dim uppercase max-[1100px]:tracking-normal";
/** The points spent in a tree, at the tab's right. */
const SLOT_POINTS = "shrink-0 text-lg font-bold text-accent tabular-nums max-[1100px]:text-sm";
const SLOT_NAME =
  "my-1 block text-sm leading-tight font-bold max-[1100px]:my-0.5 max-[1100px]:text-xs max-[1100px]:leading-[normal]";
/** Reselect / Reset / Install Prism. */
const TALENT_ACTION = "talent-action btn min-h-8 px-3 py-1.5 text-xs font-bold max-[760px]:px-2";
/** Install Prism's icon, the game's: its art (white on transparent) as a mask in the button's text colour. */
const PRISM_ACTION_ICON = "size-4 shrink-0 bg-current mask-contain mask-center mask-no-repeat";
const PRISM_ACTION_ICON_ART = "./src/assets/tli/install-prism-icon.webp";
/** A node and the installed prism over it share their place and size on the stage. */
const NODE =
  "relative col-(--column) row-(--row) grid size-13.25 place-items-center place-self-center rounded-full p-0 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent-strong";
const NODE_SYMBOL = "node-symbol text-xl leading-none [grid-area:1/1] max-[1100px]:min-[851px]:text-base";
/**
 * A core talent, as the game shows it: its round art with the points that unlock it in a badge at the lower left (a
 * core slot), or the prism's own effect in violet. The name and state are in the accessible name and the tooltip.
 */
const CORE_ICON = "core-talent relative grid size-16 shrink-0 place-items-center rounded-full border-2 p-0";
/** A core slot: the accent edge once chosen, the accent on hover and keyboard focus; dashed while empty. */
const coreSlotLook = (selected: boolean, locked: boolean) =>
  `core-selector cursor-pointer bg-raised hover:border-accent focus-visible:border-accent focus-visible:outline-none ${
    selected ? "border-accent" : "border-dashed border-line-strong"
  } ${locked ? "opacity-40 grayscale" : ""}`;
const CORE_PRISM = "border-violet bg-violet/10";
const CORE_ART =
  "core-art relative grid size-full place-items-center overflow-hidden rounded-full text-dim [&>img]:absolute [&>img]:inset-0 [&>img]:z-1 [&>img]:size-full [&>img]:object-cover [&>img+span]:invisible";
const CORE_BADGE =
  "absolute -bottom-1 -left-1 z-2 grid h-6 min-w-6 place-items-center rounded-full border border-line-strong bg-sunken px-1 text-xs font-bold text-text tabular-nums";
/** The dashed "+" of an empty tree slot. */
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
            <TalentEmblem src={tab.art} alt={tab.name} className={`talent-panel-art ${SLOT_EMBLEM}`} />
          ) : (
            <span className={`empty-tree-art size-10.5 ${EMPTY_ART}`}>+</span>
          )}
          <span className="min-w-0">
            <small className={SLOT_LABEL}>{tab.label}</small>
            <strong className={SLOT_NAME}>{tab.name || (tab.disabled ? "Select previous" : "Click to select")}</strong>
          </span>
          {tab.points !== null ? (
            <span className={SLOT_POINTS} aria-label={`${tab.points} points`}>
              {tab.points}
            </span>
          ) : null}
        </button>
      ))}
      <button
        type="button"
        className={`talent-divinity-link ${SLOT} ${view.slateMode ? "active" : ""}`}
        data-talent-slates=""
        onClick={() => plannerCommands().openTalentSlates()}
      >
        <span className={`talent-slate-emblem grid place-items-center text-accent ${SLOT_EMBLEM}`} aria-hidden="true">
          <svg viewBox="0 0 64 64" className="block size-full overflow-visible fill-current">
            <g>
              {SLATE_EMBLEM_CELLS.map(([x, y]) => (
                <rect key={`${x},${y}`} x={x} y={y} width="8" height="8" rx="1" />
              ))}
            </g>
          </svg>
        </span>
        <span className="min-w-0">
          <small className={SLOT_LABEL}>Divinity</small>
          <strong className={SLOT_NAME}>Slates</strong>
        </span>
      </button>
      <div className="talent-slot-total grid gap-2.5 rounded-md bg-raised p-3.5 max-[1100px]:mt-auto max-[1100px]:p-2">
        <div className="flex items-baseline justify-between gap-2">
          <small className="text-xs font-bold tracking-wider text-accent uppercase">Total points</small>
          <strong
            className="text-lg font-bold text-accent tabular-nums"
            aria-label={`${view.totalPoints} of ${view.capPoints} points spent`}
          >
            {view.totalPoints}
            <span className="text-sm font-semibold text-muted">{` / ${view.capPoints}`}</span>
          </strong>
        </div>
        {view.unusedPoints ? (
          <span className="justify-self-start rounded-sm border border-warn/50 bg-warn/10 px-2 py-0.5 text-xs font-semibold text-warn">
            {`${view.unusedPoints} unused`}
          </span>
        ) : null}
        <dl className="grid gap-1.5 border-t border-line pt-2.5 text-xs">
          <PointsRow label="Level">
            <span className="text-text tabular-nums">{view.budget.fromLevel}</span>
          </PointsRow>
          <BonusPointsField
            label="Treasure Troves"
            kind="treasureTroves"
            value={view.budget.treasureTroves}
            max={TREASURE_TROVE_TALENT_POINTS}
          />
          <BonusPointsField
            label="Path of Progression"
            kind="pathOfProgression"
            value={view.budget.pathOfProgression}
            max={PATH_OF_PROGRESSION_TALENT_POINTS}
          />
          <PointsRow label="Available" strong>
            <span className="font-bold text-text tabular-nums">{view.maxPoints}</span>
          </PointsRow>
        </dl>
      </div>
    </>
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
      className="prism-placement-prompt mb-3 flex items-center justify-between gap-3.5 rounded-md border border-accent-strong bg-accent-strong/10 px-3.5 py-2.5 text-sm text-text"
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

/**
 * The open tree's bar, after the game: its core talents, then the points spent in it with Reselect and Reset under
 * them, and Install Prism at the far end (not on the God tree).
 */
export function TalentPanelBar() {
  const view = useViewSource("talents");
  return (
    <div
      className="talent-panel-bar mb-3 flex flex-wrap items-center gap-x-4 gap-y-3"
      role="group"
      aria-label="Talent tree actions"
    >
      <div id="core-talents" className="core-talents flex flex-wrap gap-4">
        {view?.cores.map((core) => (
          <Core key={core.kind === "slot" ? core.threshold : "prism"} core={core} />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <p id="talent-panel-points" className="text-sm text-muted">
          <strong className="font-bold text-accent tabular-nums">{view?.panelPoints ?? "—"}</strong>
          {" Talent Points spent in current panel"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${TALENT_ACTION} talent-action-reselect`}
            onClick={() => plannerCommands().reselectTalentTree()}
          >
            Reselect
          </button>
          <button
            type="button"
            className={`${TALENT_ACTION} talent-action-reset`}
            title="Reset points on the open talent tree"
            onClick={() => plannerCommands().resetTalentTree()}
          >
            Reset
          </button>
        </div>
      </div>
      <button
        type="button"
        className={`${TALENT_ACTION} talent-action-prism ml-auto inline-flex items-center gap-1.5`}
        hidden={view ? !view.canInstallPrism : false}
        onClick={() => plannerCommands().openPrismInventory()}
      >
        <span
          className={PRISM_ACTION_ICON}
          style={{ maskImage: `url("${PRISM_ACTION_ICON_ART}")` }}
          aria-hidden="true"
        />
        Install Prism
      </button>
    </div>
  );
}

function Core({ core }: { core: CoreView }) {
  if (core.kind === "prism")
    return (
      <CoreTalentTooltip target={{ prism: true }}>
        <article className={`${CORE_ICON} ${CORE_PRISM} prism`} aria-label={`${core.caption}: ${core.name}`}>
          <Artwork src={core.art} alt="" className={CORE_ART} />
          <span className={`${CORE_BADGE} text-violet`} aria-hidden="true">
            ✦
          </span>
        </article>
      </CoreTalentTooltip>
    );
  return (
    <CoreTalentTooltip target={{ threshold: core.threshold, locked: core.locked }}>
      <button
        type="button"
        className={`${CORE_ICON} ${coreSlotLook(core.selected, core.locked)} ${core.selected ? "selected" : ""} ${core.locked ? "locked" : ""}`}
        aria-label={`${core.threshold} point core: ${core.name || "Select core talent"}${core.locked ? " (locked)" : ""}`}
        data-core-slot={core.threshold}
        onClick={() => plannerCommands().openCorePicker(core.threshold)}
        onContextMenu={(event) => rightClick(event, () => plannerCommands().removeCoreTalent(core.threshold))}
      >
        {core.name ? (
          <Artwork src={core.art} alt="" className={CORE_ART} />
        ) : (
          <span className="empty-core-art text-lg text-dim" aria-hidden="true">
            +
          </span>
        )}
        <span className={CORE_BADGE} aria-hidden="true">
          {core.threshold}
        </span>
      </button>
    </CoreTalentTooltip>
  );
}

/** The last column the open tree's points reach (0 when they reach only the first). */
const frontierColumn = (view: TalentsView | null) =>
  Math.max(0, (view?.thresholds.filter((threshold) => threshold.reached).length ?? 1) - 1);

/** A column's centre on a seven-column strip, from 0 (first) to 6 (last), as a share of the strip's width. */
const columnCentre = (column: number) => (column + 0.5) / 7;

const THRESHOLD_TRACK = "absolute top-1/2 left-[calc(100%/14)] h-0.5 -translate-y-1/2";
const THRESHOLD_MARK =
  "relative z-1 mx-auto min-w-7 rounded-sm border px-1 py-0.5 text-center text-xs font-bold tabular-nums";
/** The frontier: the column the points reach last, bright as in the game; others reached in the god's colour. */
const thresholdLook = (reached: boolean, frontier: boolean) =>
  frontier
    ? "border-text bg-text text-bg"
    : reached
      ? "border-(--talent-emblem) bg-raised text-text"
      : "border-line bg-sunken text-dim";

/**
 * The points each column needs, on a track lit in the god's colour up to the last column the open tree's points reach
 * (the game's threshold bar).
 */
export function TalentThresholds() {
  const view = useViewSource("talents");
  const frontier = frontierColumn(view);
  return (
    <div className="talent-thresholds relative grid grid-cols-7 pb-2" aria-hidden="true">
      <span className={`${THRESHOLD_TRACK} w-[calc(100%-100%/7)] bg-line-strong`} />
      <span
        className={`${THRESHOLD_TRACK} w-[calc((100%-100%/7)*var(--reach))] bg-(--talent-emblem)`}
        style={{ "--reach": frontier / 6 } as CSSProperties}
      />
      {(view?.thresholds ?? []).map((threshold, column) => (
        <span
          key={threshold.points}
          className={`${THRESHOLD_MARK} ${thresholdLook(threshold.reached, column === frontier && threshold.reached)}`}
        >
          {threshold.points}
        </span>
      ))}
    </div>
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
      className="talent-stage relative grid rounded-md border border-line bg-sunken/50 min-h-80 min-w-125 grid-cols-7 grid-rows-[repeat(5,57px)] px-1 py-2.5 max-[1100px]:min-[851px]:min-w-105 min-[1100px]:min-h-110 min-[1100px]:flex-1 min-[1100px]:grid-rows-[repeat(5,minmax(70px,1fr))]"
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
      <span
        className="talent-frontier pointer-events-none absolute inset-y-0 left-[calc(4px+(100%-8px)*var(--frontier))] z-0 w-0.5 -translate-x-1/2 bg-(--talent-emblem)/60"
        style={{ "--frontier": columnCentre(frontierColumn(view)) } as CSSProperties}
        aria-hidden="true"
      />
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
                  className={`talent-node-art block size-10.75 object-contain [grid-area:1/1] ${look.art}`}
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

/** A row of the Total points card: a label, its figure or field at the right. */
function PointsRow({ label, strong = false, children }: { label: string; strong?: boolean; children: ReactNode }) {
  return (
    <div className={`flex min-h-6 items-center justify-between gap-2 ${strong ? "border-t border-line pt-1.5" : ""}`}>
      <dt className={strong ? "font-bold text-text" : "text-muted"}>{label}</dt>
      <dd className="flex items-center gap-1">{children}</dd>
    </div>
  );
}

/** A source of talent points beside the level (the maps' Treasure Troves, the Path of Progression): full by default. */
function BonusPointsField({
  label,
  kind,
  value,
  max,
}: {
  label: string;
  kind: "treasureTroves" | "pathOfProgression";
  value: number;
  max: number;
}) {
  return (
    <PointsRow label={label}>
      <CommitNumberInput
        key={value}
        className="field w-11 px-1.5 py-0.5 text-right text-xs tabular-nums"
        aria-label={`${label} talent points`}
        value={value}
        min={0}
        max={max}
        step={1}
        onCommit={(text) => plannerCommands().setTalentBonusPoints(kind, text)}
      />
      <span className="text-dim tabular-nums">{`/ ${max}`}</span>
    </PointsRow>
  );
}

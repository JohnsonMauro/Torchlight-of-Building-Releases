// The talent trees of the Build page: the tree tabs (with the Slates tab and the total), the open tree's heading and
// actions, the prism placement prompt, the core talents and the stage of nodes with the installed prism. The data is
// the planner's "talents" source (src/app/bridge/talents-view-model.ts); every edit is a planner command, and the tree,
// core and prism dialogs stay legacy, as does the swap of the tree for the slate board (src/app/talents/talent-trees.js
// setTalentSlateMode, which moves .slate-layout into .talent-layout and hides .talent-tree-panel). The legacy hover
// tooltip reads .talent-node with data-coordinate (and its .talent-node-art), .core-talent with data-core-slot, and
// .prism-affected-node, so they stay. The state-dependent looks are in talent-classes.ts.
import { useEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { CoreView, TalentsView } from "@legacy/app/bridge/talents-view-model.ts";
import { Artwork } from "../../ui/Artwork";
import { usePointerDrag } from "../../ui/use-pointer-drag";
import { useViewSource } from "../../ui/use-view-source";
import { HelpButton } from "../../ui/HelpButton";
import { PRISM_ART, TREE_EMBLEM_ART, areaLook, familyTint, lineLook, nodeLook, prismLook } from "./talent-classes";

// Under 1100px (max-[1100px]:) the trees column narrows to 205px: smaller slots, emblems and type.
/** A tree slot: emblem beside the slot label, the tree name and its points chip. */
const TREE_SLOT_CARD =
  "cursor-pointer border border-[#303a47] bg-[#171e29] text-left text-[#dce4eb] on:border-[#e8ad4f] on:bg-[linear-gradient(100deg,rgb(249_202_101/0.17),#171e29_70%)] on:shadow-[inset_0_1px_rgb(255_231_165/0.12),0_0_13px_rgb(232_173_79/0.1)]";
const TREE_SLOT = `talent-tree-slot group ${TREE_SLOT_CARD} border-l-2 border-l-transparent on:border-l-gold off:cursor-not-allowed off:opacity-40 grid h-full min-h-0 grid-cols-[66px_minmax(0,1fr)] items-center gap-3.25 p-3.5 max-[1100px]:h-auto max-[1100px]:min-h-18 max-[1100px]:grid-cols-[48px_minmax(0,1fr)] max-[1100px]:gap-2.25 max-[1100px]:p-2.25 max-[760px]:min-h-15.5`;
const TREE_EMBLEM = `talent-panel-art relative grid size-15.5 place-items-center max-[1100px]:size-10.5 ${TREE_EMBLEM_ART}`;
const TREE_POINTS =
  "mt-0.75 block w-max rounded-[3px] border border-[#685537] bg-[#302718] px-1.75 py-0.75 text-[0.78rem] leading-[1.1] font-extrabold tracking-[0.035em] text-[#ffd28a] uppercase not-italic tabular-nums group-on:border-[#b97938] group-on:bg-[#513216] group-on:text-[#ffe0ab]";
/** The Talent trees heading strip and the gilded headings of the panel. */
const GILDED_HEADING = "font-display text-[0.87rem] font-black tracking-[0.07em] uppercase";
/** Reselect / Reset / Install Prism. */
const TALENT_ACTION =
  "talent-action btn-bronze min-h-8.5 px-3.25 py-1.75 text-[0.7rem] font-extrabold transition-[border-color,filter,transform] duration-160 hover:-translate-y-px hover:brightness-112 max-[760px]:px-2.25 max-[760px]:py-1.5 max-[760px]:text-[0.63rem]";
/** A node and the installed prism over it share their place and size on the stage. */
const NODE =
  "relative col-(--column) row-(--row) grid size-12 place-items-center place-self-center rounded-full p-0 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ff9636]";
const NODE_SYMBOL = "node-symbol text-[1.3rem] leading-none [grid-area:1/1] max-[1100px]:min-[851px]:text-[1.05rem]";
/** A core talent card (a core slot, or the prism's own effect). */
const CORE_CARD =
  "core-talent flex min-h-18 flex-[1_1_min(310px,100%)] items-center gap-2.75 rounded border border-l-3 px-3.5 py-2.5 text-left text-inherit shadow-[inset_0_1px_rgb(255_231_165/0.1),0_3px_10px_rgb(0_0_0/0.2)]";
/** A core slot: gold-edged, warmer on hover and keyboard focus. */
const CORE_SLOT =
  "core-selector cursor-pointer border-[#806037] border-l-[#d6a448] bg-[linear-gradient(105deg,rgb(246_193_84/0.12),rgb(206_139_50/0.05)_36%,transparent_70%),linear-gradient(180deg,#20272c,#121a23)] hover:border-[#e7b35d] hover:bg-[linear-gradient(105deg,rgb(246_193_84/0.2),rgb(206_139_50/0.07)_42%,transparent_72%),linear-gradient(180deg,#252a2c,#151d26)] focus-visible:border-[#e7b35d] focus-visible:bg-[linear-gradient(105deg,rgb(246_193_84/0.2),rgb(206_139_50/0.07)_42%,transparent_72%),linear-gradient(180deg,#252a2c,#151d26)] focus-visible:shadow-[0_0_0_2px_rgb(249_202_101/0.35)] focus-visible:outline-none";
/** A prism's own effect, in violet. */
const CORE_PRISM =
  "border-[#765389] border-l-[#b87bd3] bg-[linear-gradient(105deg,rgb(184_123_211/0.15),transparent_66%),linear-gradient(180deg,#24242d,#151b25)]";
const CORE_ART =
  "core-art relative size-11.5 flex-[0_0_46px] overflow-hidden rounded-lg border border-[#a67736] shadow-[0_1px_5px_rgb(0_0_0/0.4)] [&>img]:absolute [&>img]:inset-0 [&>img]:z-1 [&>img]:size-full [&>img]:object-cover [&>img+span]:invisible";
const CORE_CAPTION = "block text-[0.7rem] tracking-[0.08em] uppercase";
const CORE_NAME = "mt-1 block font-serif text-[0.95rem] font-bold text-[#f1e7d2]";

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
        className={`eyebrow col-span-full -mx-3 -mt-3 border-b border-[#8b6333] bg-heading px-3 py-3.25 text-gold ${GILDED_HEADING}`}
      >
        <span className="text-gilded">Talent trees</span>
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
            <Artwork src={tab.art} alt={tab.name} className={TREE_EMBLEM} />
          ) : (
            <span className="empty-tree-art grid size-10.5 place-items-center border-2 border-dashed border-[#64717e] text-[1.15rem] text-[#8b98a5]">
              +
            </span>
          )}
          <span className="min-w-0">
            <small className="block text-[0.66rem] tracking-[0.045em] text-[#84919f] uppercase max-[1100px]:text-[0.6rem] max-[1100px]:tracking-normal">
              {tab.label}
            </small>
            <strong className="mt-1.25 mb-1 block font-serif text-[0.9rem] leading-[1.15] font-bold max-[1100px]:my-0.5 max-[1100px]:font-sans max-[1100px]:text-[0.72rem] max-[1100px]:leading-[normal]">
              {tab.name || (tab.disabled ? "Select previous" : "Click to select")}
            </strong>
            {tab.name ? <em className={TREE_POINTS}>{`${tab.points} pts`}</em> : null}
          </span>
        </button>
      ))}
      <button
        type="button"
        className={`talent-divinity-link group ${TREE_SLOT_CARD} grid h-full min-h-0 grid-cols-[66px_minmax(0,1fr)] grid-rows-[auto_auto] gap-x-3.25 p-3.5 max-[1100px]:h-auto max-[1100px]:min-h-15.5 max-[1100px]:grid-cols-[42px_minmax(0,1fr)] max-[1100px]:gap-x-0 max-[1100px]:p-2.25 ${view.slateMode ? "active" : ""}`}
        data-talent-slates=""
        onClick={() => plannerCommands().openTalentSlates()}
      >
        <span
          className="talent-slate-emblem row-span-2 grid size-15.5 place-items-center self-center text-[#ffc247] drop-shadow-[0_3px_2px_#05080c] max-[1100px]:size-10.5 [&>svg]:drop-shadow-[0_0_8px_rgb(255_194_71/0.65)] group-on:[&>svg]:drop-shadow-[0_0_13px_#ffc247]"
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
        <small className="text-[0.67rem] tracking-[0.05em] text-[#84919f] uppercase max-[1100px]:text-[0.8333rem] max-[1100px]:tracking-normal">
          Divinity
        </small>
        <strong className="font-serif font-bold max-[1100px]:font-sans">Slates</strong>
      </button>
      <div className="talent-slot-total bg-[#171e29] px-2.5 py-3.75 max-[1100px]:mt-auto">
        <small className="block text-[0.8333rem] uppercase text-gilded">Total points</small>
        <strong className="mt-0.75 block text-[1.15rem] font-bold text-gilded">{`${view.totalPoints} / ${view.maxPoints}`}</strong>
      </div>
    </>
  );
}

export function TalentBoardHeading() {
  const view = useViewSource("talents");
  const heading = view?.heading;
  return (
    <div
      className={`talent-board-heading relative -mx-3.5 -mt-3.5 mb-3.5 flex items-center justify-between border-b border-[#8b6333] bg-heading px-4 pt-3.5 pb-3.75 after:absolute after:inset-x-0 after:-bottom-px after:h-px after:rule-gold after:content-[''] max-[760px]:items-start max-[760px]:gap-3 ${familyTint(heading?.familyClass ?? "", false)}`}
    >
      <div>
        <p className={`eyebrow mb-1.25 text-gilded ${GILDED_HEADING}`} id="talent-board-kind">
          {heading?.kind ?? "Talent panel"}
        </p>
        <h2
          id="talent-board-name"
          className="font-serif text-xl leading-[1.15] font-bold text-(--talent-emblem,#f9ca65) [text-shadow:0_1px_2px_#05080c,0_0_12px_color-mix(in_srgb,var(--talent-emblem,#f9ca65)_30%,transparent)]"
        >
          {heading ? heading.name : "—"}
        </h2>
      </div>
      <div className="talent-board-header-side flex min-w-0 flex-col items-end gap-2.5 max-[760px]:gap-1.75">
        <strong id="talent-board-points" className="point-total font-bold text-gilded">
          {heading?.points ?? "—"}
        </strong>
        <div
          className="talent-board-actions flex flex-wrap justify-end gap-2 max-[760px]:gap-1.25"
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
      className="prism-placement-prompt my-3 flex items-center justify-between gap-3.5 rounded-md border border-[#e87920] bg-[#2b2119] px-3.5 py-2.5 text-[13px] text-[#ffd5ae]"
      hidden={!placing}
      ref={prompt}
    >
      <span>
        {"Click a talent node to install "}
        <strong id="prism-placement-name">{placing ?? ""}</strong>.
      </span>
      <button
        type="button"
        className="cursor-pointer rounded border border-[#8a5b39] bg-[#221d1a] px-3 py-1.75 text-[#ffd5ae]"
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
      <article className={`${CORE_CARD} ${CORE_PRISM} prism`}>
        <Artwork src={core.art} alt={core.name} className={CORE_ART} />
        <div className="min-w-0">
          <span className={`${CORE_CAPTION} text-[#d6a5ec]`}>{core.caption}</span>
          <strong className={CORE_NAME}>{core.name}</strong>
          <small className="hidden">{core.details}</small>
        </div>
      </article>
    );
  return (
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
        <span className="empty-core-art grid size-11.5 flex-[0_0_46px] place-items-center border-2 border-dashed border-[#65717e] text-[1.2rem] text-[#8e99a5]">
          +
        </span>
      )}
      <div className="min-w-0">
        <span
          className={`${CORE_CAPTION} text-[#d6a448]`}
        >{`${core.threshold} point core${core.locked ? " · locked" : ""}`}</span>
        <strong className={CORE_NAME}>{core.name || "Select core talent"}</strong>
        <small className="hidden">{core.description}</small>
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
      className="talent-stage relative grid border border-[#303c49] bg-[radial-gradient(circle_at_50%_48%,rgb(72_116_139/0.13),transparent_48%),linear-gradient(180deg,#101721,#0b1118)] min-h-80 min-w-125 grid-cols-7 grid-rows-[repeat(5,57px)] px-1 py-2.5 max-[1100px]:min-[851px]:min-w-105 min-[1100px]:min-h-110 min-[1100px]:flex-1 min-[1100px]:grid-rows-[repeat(5,minmax(70px,1fr))]"
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
          <button
            key={node.coordinate}
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
              className={`node-rank absolute -right-1.25 -bottom-1.25 min-w-6 rounded-[10px] px-1 py-0.5 text-[0.65rem] font-extrabold ${look.rank}`}
            >{`${node.rank}/${node.max}`}</span>
          </button>
        );
        if (!node.prism) return button;
        return [
          button,
          <button
            key={`${node.coordinate}:prism`}
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
              <span className={`${NODE_SYMBOL} text-[#e4a6ff]`}>✦</span>
            )}
          </button>,
        ];
      })}
    </>
  );
}
